import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase, CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, isNotNull } from 'drizzle-orm';
import type {
  ScriptWork,
  ScriptPage,
  ListScriptsResponse,
  ScriptDetailResponse,
  MentorChatResponse,
  GeneratePagesResponse,
  GenerateAudioResponse,
  AbilityScores,
  NarrativeStep,
} from '@shared/api.interface';
import { scriptWork, scriptPage, conversationLog, childProfile } from '@server/database/schema';
import { MentorService } from './mentor.service';
import { ArkTextService } from './ark-text.service';
import { BadgesService } from '../badges/badges.service';
import { RadarService } from '../radar/radar.service';

@Injectable()
export class ScriptsService {
  private readonly logger = new Logger(ScriptsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    @Inject(CapabilityService) private readonly capabilityService: CapabilityService,
    private readonly mentorService: MentorService,
    private readonly arkTextService: ArkTextService,
    private readonly badgesService: BadgesService,
    private readonly radarService: RadarService,
  ) {}

  private mapScriptWork(row: typeof scriptWork.$inferSelect): ScriptWork {
    return {
      id: row.id,
      childId: row.childId,
      title: row.title,
      protagonist: row.protagonist,
      wish: row.wish,
      difficulty: row.difficulty,
      solution: row.solution,
      ending: row.ending,
      goldenQuote: row.goldenQuote ?? undefined,
      status: row.status as 'draft' | 'completed',
      totalPages: row.totalPages,
      coverImage: row.coverImage ?? undefined,
      audioUrl: row.audioUrl ?? undefined,
      abilityScores: (row.abilityScores as AbilityScores | null) ?? undefined,
      isPublic: row.isPublic,
      reviewStatus: row.reviewStatus as 'pending' | 'approved' | 'rejected',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapScriptPage(row: typeof scriptPage.$inferSelect): ScriptPage {
    return {
      id: row.id,
      scriptId: row.scriptId,
      pageNumber: row.pageNumber,
      content: row.content,
      imageUrl: row.imageUrl ?? undefined,
      narration: row.narration ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * 构建用户归属条件（孩子归属于指定 userId）
   */
  private buildOwnershipCondition(
    childIdColumn: typeof scriptWork.childId | typeof childProfile.id,
    userId: string,
  ) {
    return and(
      eq(childIdColumn, childProfile.id),
      eq(childProfile.userId, userId),
    );
  }

  /**
   * 获取示例作品列表（公开，无需登录）
   */
  async listExampleScripts(): Promise<ListScriptsResponse> {
    const rows = await this.db
      .select()
      .from(scriptWork)
      .where(and(
        eq(scriptWork.status, 'completed'),
        eq(scriptWork.isPublic, true),
        eq(scriptWork.reviewStatus, 'approved'),
        isNotNull(scriptWork.coverImage),
      ))
      .orderBy(desc(scriptWork.createdAt))
      .limit(12);

    const items = rows.map((row) => this.mapScriptWork(row));

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: 12,
    };
  }

  /**
   * 获取示例作品详情（公开，无需登录）
   */
  async getExampleScriptDetail(
    id: string,
  ): Promise<ScriptDetailResponse | null> {
    const scriptRows = await this.db
      .select()
      .from(scriptWork)
      .where(and(
        eq(scriptWork.id, id),
        eq(scriptWork.status, 'completed'),
      ))
      .limit(1);

    if (scriptRows.length === 0) {
      return null;
    }

    // 未公开的作品，游客访问时返回 null（避免泄露）
    if (!scriptRows[0].isPublic) {
      return null;
    }

    const pageRows = await this.db
      .select()
      .from(scriptPage)
      .where(eq(scriptPage.scriptId, id))
      .orderBy(scriptPage.pageNumber);

    return {
      script: this.mapScriptWork(scriptRows[0]),
      pages: pageRows.map((row) => this.mapScriptPage(row)),
    };
  }

  /**
   * 公开精选列表（分页，无需登录）
   */
  async listShowcaseScripts(
    page: number = 1,
    pageSize: number = 12,
  ): Promise<ListScriptsResponse> {
    const pageNum = Math.max(1, page);
    const size = Math.min(24, Math.max(1, pageSize));
    const offset = (pageNum - 1) * size;

    const baseConditions = [
      eq(scriptWork.status, 'completed'),
      eq(scriptWork.isPublic, true),
      eq(scriptWork.reviewStatus, 'approved'),
      isNotNull(scriptWork.coverImage),
    ];
    const whereClause = and(...baseConditions);

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(scriptWork)
        .where(whereClause),
      this.db
        .select()
        .from(scriptWork)
        .where(whereClause)
        .orderBy(desc(scriptWork.createdAt))
        .limit(size)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ? Number(totalResult[0].count) : 0;
    const items = rows.map((row) => this.mapScriptWork(row));

    return {
      items,
      total,
      page: pageNum,
      pageSize: size,
    };
  }

  /**
   * 获取剧本列表
   */
  async listScripts(
    childId: string,
    userId: string,
    status?: 'draft' | 'completed',
    page: number = 1,
    pageSize: number = 10,
  ): Promise<ListScriptsResponse> {
    const pageNum = Math.max(1, page);
    const size = Math.min(50, Math.max(1, pageSize));
    const offset = (pageNum - 1) * size;

    const ownership = this.buildOwnershipCondition(scriptWork.childId, userId);
    const baseConditions = [ownership, eq(scriptWork.childId, childId)];
    if (status) {
      baseConditions.push(eq(scriptWork.status, status));
    }
    const whereClause = and(...baseConditions);

    const [totalResult, rows] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(scriptWork)
        .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
        .where(whereClause),
      this.db
        .select()
        .from(scriptWork)
        .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
        .where(whereClause)
        .orderBy(desc(scriptWork.createdAt))
        .limit(size)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ? Number(totalResult[0].count) : 0;
    const items = rows.map((row) => this.mapScriptWork(row.script_work));

    return {
      items,
      total,
      page: pageNum,
      pageSize: size,
    };
  }

  /**
   * 获取剧本详情（含分页内容）
   */
  async getScriptDetail(
    id: string,
    userId: string,
  ): Promise<ScriptDetailResponse> {
    const ownership = this.buildOwnershipCondition(scriptWork.childId, userId);

    const scriptRows = await this.db
      .select()
      .from(scriptWork)
      .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
      .where(and(eq(scriptWork.id, id), ownership))
      .limit(1);

    if (scriptRows.length === 0) {
      throw new NotFoundException('剧本不存在');
    }

    const pageRows = await this.db
      .select()
      .from(scriptPage)
      .where(eq(scriptPage.scriptId, id))
      .orderBy(scriptPage.pageNumber);

    return {
      script: this.mapScriptWork(scriptRows[0].script_work),
      pages: pageRows.map((row) => this.mapScriptPage(row)),
    };
  }

  /**
   * 开始新剧本创作
   */
  async startScript(
    childId: string,
    userId: string,
  ): Promise<ScriptWork> {
    // 验证孩子归属
    const childRows = await this.db
      .select({ id: childProfile.id })
      .from(childProfile)
      .where(and(eq(childProfile.id, childId), eq(childProfile.userId, userId)))
      .limit(1);

    if (childRows.length === 0) {
      throw new NotFoundException('孩子档案不存在');
    }

    const defaultTitle = '我的故事';

    const inserted = await this.db
      .insert(scriptWork)
      .values({
        childId,
        title: defaultTitle,
        protagonist: '',
        wish: '',
        difficulty: '',
        solution: '',
        ending: '',
        status: 'draft',
        totalPages: 0,
      })
      .returning();

    const newScript = this.mapScriptWork(inserted[0]);

    // 记录导师初始引导消息
    await this.db.insert(conversationLog).values({
      childId,
      scriptId: newScript.id,
      role: 'mentor',
      content: '嗨～今天我们一起来造一个属于你自己的故事好不好？故事里的主角是谁呀？',
      stepNumber: 1,
    });

    this.logger.log(`创建新剧本: ${newScript.id}, childId: ${childId}`);
    return newScript;
  }

  /**
   * 用AI润色导师回复，让语气更自然、更有童趣
   */
  private async enhanceReplyWithAI(
    skeletonReply: string,
    currentStep: NarrativeStep,
    isComplete: boolean,
    childInput: string,
    collected: { protagonist?: string; wish?: string; difficulty?: string; solution?: string; ending?: string },
  ): Promise<string> {
    const stepNames: Record<NarrativeStep, string> = {
      protagonist: '主角',
      wish: '愿望',
      difficulty: '困难',
      solution: '办法',
      ending: '结局',
    };

    const contextParts: string[] = [];
    if (collected.protagonist) contextParts.push(`主角：${collected.protagonist}`);
    if (collected.wish) contextParts.push(`愿望：${collected.wish}`);
    if (collected.difficulty) contextParts.push(`困难：${collected.difficulty}`);
    if (collected.solution) contextParts.push(`办法：${collected.solution}`);

    const userInput = `【创作阶段】${stepNames[currentStep]}阶段
【已收集信息】${contextParts.join('；') || '暂无'}
【孩子刚说的】${childInput}
【导师骨架回复】${skeletonReply}
【是否最后一步】${isComplete ? '是，故事已完成' : '否，还需要继续引导'}`;

    const additionalReq = `你是一个温暖有爱的儿童剧本导师，正在引导一个6-7岁的孩子创作故事。请基于导师的骨架回复，用更自然、更有童趣、更温柔的语气重新组织语言。

【核心身份】守护者·导师·镜子——孩子是导演，你只引导不代劳，不评判任何想法。

【教育原则（必须严格遵守）】
1. 开放式提问：永远不要给封闭式选项（二选一、是不是、对不对），永远问"什么""怎么""为什么"，留白给孩子自己想
2. 镜像式肯定：先重复孩子说过的具体内容（不是"太棒了"这种空话），让孩子感到"我的想法被看见了"，再点出这个想法里有趣/特别的地方
3. 追问"为什么"：如果孩子只给了一个答案，可以追问一句"为什么呢"引导深入思考，但不要追问太多次（最多一次）
4. "如果…会怎样"当想象引擎：孩子卡住时，用假设性的"如果"打开想象空间，而不是给具体答案
5. 选择权永远还给孩子：不要替孩子编情节、不要给具体的故事走向建议、不要把想法塞进孩子嘴里
6. 不评判：绝对不说"不对""不好""不太合理"，也不说"最棒""最聪明"这种评级式的话——每个想法都有它的价值

【表达要求】
- 用孩子听得懂的简单语言，句子短一些
- 语气温柔、充满鼓励和好奇心
- 2-3句话就够了，不要太长
- 不要用书面语，像聊天一样
- 绝对不要出现暴力、危险、恐怖的内容`;

    // 优先走火山方舟豆包直连，失败/未配置时回退到平台插件
    const arkResult = await this.arkTextService.generateText(
      additionalReq,
      userInput,
    );

    if (arkResult) {
      this.logger.log(`AI导师回复走火山方舟通道，模型=${this.arkTextService.modelId}`);
      return arkResult.content.trim() || skeletonReply;
    }

    this.logger.warn('ARK_API_KEY 未配置或调用失败，走回退通道（ai-text-generate 插件）');

    const result = await this.capabilityService
      .load('ai_script_tutor_generate_1')
      .call('textGenerate', {
        user_input: userInput,
        additional_requirements: additionalReq,
        scene_type: '引导式对话',
      });

    const content = (result as { content?: string }).content || skeletonReply;
    return content.trim() || skeletonReply;
  }

  /**
   * 导师对话
   */
  async mentorChat(
    scriptId: string,
    childId: string,
    childInput: string,
    userId: string,
  ): Promise<MentorChatResponse> {
    const ownership = this.buildOwnershipCondition(scriptWork.childId, userId);

    // 读取当前剧本（带归属校验）
    const scriptRows = await this.db
      .select()
      .from(scriptWork)
      .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
      .where(and(eq(scriptWork.id, scriptId), ownership))
      .limit(1);

    if (scriptRows.length === 0) {
      throw new NotFoundException('剧本不存在');
    }

    const script = scriptRows[0].script_work;

    // 收集已有的五要素
    const collected = {
      protagonist: script.protagonist || undefined,
      wish: script.wish || undefined,
      difficulty: script.difficulty || undefined,
      solution: script.solution || undefined,
      ending: script.ending || undefined,
    };

    // 调用导师逻辑（规则引擎做流程控制和要素提取）
    const result = this.mentorService.processChildInput(childInput, collected);

    // 用AI润色导师回复，让语气更自然童趣
    let aiEnhancedReply = result.mentorReply;
    try {
      aiEnhancedReply = await this.enhanceReplyWithAI(
        result.mentorReply,
        result.currentStep,
        result.isComplete,
        childInput,
        collected,
      );
    } catch (err) {
      this.logger.warn('AI润色失败，使用本地模板回复: ' + JSON.stringify({ error: String(err) }));
    }
    result.mentorReply = aiEnhancedReply;

    // 记录孩子的消息到对话日志
    const currentStepNum = this.getStepNumber(result.currentStep);
    await this.db.insert(conversationLog).values({
      childId,
      scriptId,
      role: 'child',
      content: childInput,
      stepNumber: currentStepNum,
    });

    // 记录导师回复到对话日志
    await this.db.insert(conversationLog).values({
      childId,
      scriptId,
      role: 'mentor',
      content: result.mentorReply,
      stepNumber: currentStepNum,
    });

    // 更新剧本字段
    const patch: Partial<typeof scriptWork.$inferInsert> = {};

    if (result.updatedFields.protagonist !== undefined) {
      patch.protagonist = result.updatedFields.protagonist;
    }
    if (result.updatedFields.wish !== undefined) {
      patch.wish = result.updatedFields.wish;
    }
    if (result.updatedFields.difficulty !== undefined) {
      patch.difficulty = result.updatedFields.difficulty;
    }
    if (result.updatedFields.solution !== undefined) {
      patch.solution = result.updatedFields.solution;
    }
    if (result.updatedFields.ending !== undefined) {
      patch.ending = result.updatedFields.ending;
    }

    let scores: AbilityScores | null = null;

    // 如果完成了，更新状态和能力评分
    if (result.isComplete) {
      patch.status = 'completed';
      scores = this.mentorService.calculateAbilityScores(result.updatedFields);
      patch.abilityScores = scores as unknown as Record<string, unknown>;

      // 提取金句
      if (result.goldenQuoteCandidate) {
        patch.goldenQuote = result.goldenQuoteCandidate;
      } else if (result.updatedFields.ending) {
        patch.goldenQuote = result.updatedFields.ending.slice(0, 50);
      }

      // 生成标题（用主角+愿望）
      if (result.updatedFields.protagonist && result.updatedFields.wish) {
        patch.title = `${result.updatedFields.protagonist}的${result.updatedFields.wish.slice(0, 8)}故事`;
      }
    }

    if (Object.keys(patch).length > 0) {
      await this.db
        .update(scriptWork)
        .set(patch)
        .where(eq(scriptWork.id, scriptId));
    }

    // 剧本完成时，同步触发徽章解锁和雷达记录
    if (result.isComplete && scores) {
      try {
        await this.badgesService.checkAndUnlockBadges(childId, scriptId, scores);
      } catch (err) {
        this.logger.error('徽章解锁失败', JSON.stringify({ error: String(err) }));
      }
      try {
        await this.radarService.recordScore(childId, scriptId, scores);
      } catch (err) {
        this.logger.error('能力雷达记录失败', JSON.stringify({ error: String(err) }));
      }
    }

    this.logger.log(
      `导师对话: scriptId=${scriptId}, step=${result.currentStep}, complete=${result.isComplete}`,
    );

    return {
      mentorReply: result.mentorReply,
      currentStep: result.currentStep,
      stepNumber: result.stepNumber,
      isComplete: result.isComplete,
      scriptId,
    };
  }

  /**
   * 生成分页内容
   */
  async generatePages(
    scriptId: string,
    userId: string,
  ): Promise<GeneratePagesResponse> {
    const ownership = this.buildOwnershipCondition(scriptWork.childId, userId);

    const scriptRows = await this.db
      .select()
      .from(scriptWork)
      .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
      .where(and(eq(scriptWork.id, scriptId), ownership))
      .limit(1);

    if (scriptRows.length === 0) {
      throw new NotFoundException('剧本不存在');
    }

    const script = scriptRows[0].script_work;

    if (!script.protagonist || !script.wish || !script.difficulty || !script.solution || !script.ending) {
      throw new BadRequestException('剧本五步要素未完成，无法生成分页内容');
    }

    const collected = {
      protagonist: script.protagonist,
      wish: script.wish,
      difficulty: script.difficulty,
      solution: script.solution,
      ending: script.ending,
    };

    const pagesContent = this.mentorService.generatePagesContent(collected, script.title);

    // 删除已有的分页（重新生成）
    await this.db.delete(scriptPage).where(eq(scriptPage.scriptId, scriptId));

    // 生成封面图（AI绘本风格）
    let coverImageUrl: string | undefined = undefined;
    try {
      const coverPrompt = `绘本风格的封面插图，温暖明亮的色彩，${collected.protagonist}作为主角，${collected.wish}的主题场景，儿童绘本画风，圆润可爱，治愈系，无文字`;
      const imgResult = await this.capabilityService
        .load('script_picture_book_illustration_generator_1')
        .call('textToImage', {
          script_content: coverPrompt,
          image_ratio: '3:4',
        });
      const images = (imgResult as { images?: string[] }).images || [];
      if (images.length > 0) {
        coverImageUrl = images[0];
      }
    } catch (err) {
      this.logger.warn('封面图生成失败: ' + JSON.stringify({ error: String(err) }));
    }

    // 插入新分页（先不带图）
    let insertedPages = await this.db
      .insert(scriptPage)
      .values(
        pagesContent.map((p) => ({
          scriptId,
          pageNumber: p.pageNumber,
          content: p.content,
          narration: p.narration,
        })),
      )
      .returning();

    // 为每一页生成绘本插图
    const pageImagePromises = pagesContent.map(async (page, index) => {
      try {
        const imgResult = await this.capabilityService
          .load('script_picture_book_illustration_generator_1')
          .call('textToImage', {
            script_content: page.imagePrompt,
            image_ratio: '4:3',
          });
        const images = (imgResult as { images?: string[] }).images || [];
        if (images.length > 0 && insertedPages[index]) {
          await this.db
            .update(scriptPage)
            .set({ imageUrl: images[0] })
            .where(eq(scriptPage.id, insertedPages[index].id));
          insertedPages[index] = { ...insertedPages[index], imageUrl: images[0] };
        }
      } catch (err) {
        this.logger.warn(
          `第${page.pageNumber}页插图生成失败: ` + JSON.stringify({ error: String(err) }),
        );
      }
    });

    await Promise.all(pageImagePromises);

    // 更新剧本状态、总页数和封面图
    await this.db
      .update(scriptWork)
      .set({
        totalPages: pagesContent.length,
        status: 'completed',
        ...(coverImageUrl ? { coverImage: coverImageUrl } : {}),
      })
      .where(eq(scriptWork.id, scriptId));

    // AI 内容审核：拼接完整故事文本进行审核
    const fullStoryText = pagesContent
      .map((p) => p.content)
      .join('\n\n');

    try {
      const moderation = await this.mentorService.moderateStoryContent(fullStoryText);
      const reviewPatch: Partial<typeof scriptWork.$inferInsert> = {};

      if (moderation.approved) {
        reviewPatch.reviewStatus = 'approved';
        reviewPatch.isPublic = true;
        this.logger.log(
          `内容审核通过，加入精选池: scriptId=${scriptId}`,
        );
      } else {
        reviewPatch.reviewStatus = 'rejected';
        reviewPatch.isPublic = false;
        this.logger.log(
          `内容审核不通过: scriptId=${scriptId}, reason=${moderation.reason || ''}`,
        );
      }

      await this.db
        .update(scriptWork)
        .set(reviewPatch)
        .where(eq(scriptWork.id, scriptId));
    } catch (err) {
      this.logger.error(
        '内容审核流程异常: ' + JSON.stringify({ error: String(err) }),
      );
    }

    this.logger.log(`生成分页内容: scriptId=${scriptId}, pages=${pagesContent.length}`);

    return {
      scriptId,
      pages: insertedPages.map((row) => this.mapScriptPage(row)),
      status: 'completed',
    };
  }

  /**
   * 生成配音（TTS）
   */
  async generateAudio(
    scriptId: string,
    voiceGender: 'female' | 'male' | undefined,
    playbackSpeed: string | undefined,
    userId: string,
  ): Promise<GenerateAudioResponse> {
    const ownership = this.buildOwnershipCondition(scriptWork.childId, userId as string);

    const scriptRows = await this.db
      .select()
      .from(scriptWork)
      .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
      .where(and(eq(scriptWork.id, scriptId), ownership))
      .limit(1);

    if (scriptRows.length === 0) {
      throw new NotFoundException('剧本不存在');
    }

    const script = scriptRows[0].script_work;

    // 获取分页内容用于拼接完整文本
    const pageRows = await this.db
      .select()
      .from(scriptPage)
      .where(eq(scriptPage.scriptId, scriptId))
      .orderBy(scriptPage.pageNumber);

    const collected = {
      protagonist: script.protagonist,
      wish: script.wish,
      difficulty: script.difficulty,
      solution: script.solution,
      ending: script.ending,
    };

    const fullText = this.mentorService.buildFullScriptText(
      collected,
      script.title,
      pageRows.map((r) => ({ narration: r.narration ?? undefined, content: r.content })),
    );

    this.logger.log(`调用 TTS 插件生成配音: scriptId=${scriptId}, length=${fullText.length}`);

    // 调用 TTS 插件
    const result = await this.capabilityService
      .load('child_script_voice_synthesis_1')
      .call('speechSynthesis', {
        script_content: fullText,
        voice_gender: voiceGender || 'female',
        playback_speed: playbackSpeed || '1.0',
      });

    const audioUrl = (result as { audioUrl?: string })?.audioUrl || '';

    // 更新剧本的 audioUrl
    if (audioUrl) {
      await this.db
        .update(scriptWork)
        .set({ audioUrl })
        .where(eq(scriptWork.id, scriptId));
    }

    this.logger.log(`TTS 配音生成完成: scriptId=${scriptId}`);

    return {
      scriptId,
      audioUrl,
    };
  }

  private getStepNumber(step: NarrativeStep): number {
    const map: Record<NarrativeStep, number> = {
      protagonist: 1,
      wish: 2,
      difficulty: 3,
      solution: 4,
      ending: 5,
    };
    return map[step];
  }
}
