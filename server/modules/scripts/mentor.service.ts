import { Injectable, Logger } from '@nestjs/common';
import type {
  NarrativeStep,
  AbilityScores,
} from '@shared/api.interface';
import { ArkTextService } from './ark-text.service';

interface ModerationResult {
  approved: boolean;
  reason?: string;
}

interface CollectedFields {
  protagonist?: string;
  wish?: string;
  difficulty?: string;
  solution?: string;
  ending?: string;
}

interface MentorGuidanceResult {
  mentorReply: string;
  currentStep: NarrativeStep;
  stepNumber: number;
  isComplete: boolean;
  updatedFields: CollectedFields;
  goldenQuoteCandidate?: string;
}

const STEP_ORDER: NarrativeStep[] = [
  'protagonist',
  'wish',
  'difficulty',
  'solution',
  'ending',
];

const STEP_TO_NUMBER: Record<NarrativeStep, number> = {
  protagonist: 1,
  wish: 2,
  difficulty: 3,
  solution: 4,
  ending: 5,
};

// 内容安全敏感关键词（暴力、危险、敏感）
const SENSITIVE_KEYWORDS: string[] = [
  '打', '杀', '死', '血', '刀', '枪', '炸弹', '爆炸',
  '自杀', '跳楼', '上吊', '割腕', '毒品', '吸毒',
  '色情', '性', '强奸', '猥琐', '变态',
  '鬼', '恐怖', '吓死',
];

// 创意/想象力关键词
const IMAGINATION_KEYWORDS: string[] = [
  '会飞', '魔法', '神奇', '穿越', '太空', '宇宙',
  '龙', '独角兽', '精灵', '仙子', '公主', '王子',
  '超级', '变身', '隐身', '时光机', '彩虹', '星星',
  '巨人', '小人', '会说话', '变成', '假如', '如果',
];

// 好奇心关键词
const CURIOSITY_KEYWORDS: string[] = [
  '为什么', '怎么', '什么', '哪里', '谁', '呢',
  '会不会', '能不能', '也许', '可能', '说不定',
];

@Injectable()
export class MentorService {
  private readonly logger = new Logger(MentorService.name);

  constructor(private readonly arkTextService: ArkTextService) {}

  /**
   * 内容安全过滤：检查输入是否包含敏感关键词
   */
  containsSensitiveContent(input: string): boolean {
    const normalized = input.trim().toLowerCase();
    return SENSITIVE_KEYWORDS.some((kw: string) => normalized.includes(kw));
  }

  /**
   * 敏感内容的温柔引导回复（不给具体答案，引导孩子自己想）
   */
  getSensitiveRedirectReply(): string {
    return '嗯～这个想法好像不太适合当故事的主角呢。你能想到一个更温暖、更有趣的主角吗？什么都可以哦～';
  }

  /**
   * 根据已收集的字段判断当前在第几步
   */
  determineCurrentStep(collected: CollectedFields): NarrativeStep {
    if (!collected.protagonist) return 'protagonist';
    if (!collected.wish) return 'wish';
    if (!collected.difficulty) return 'difficulty';
    if (!collected.solution) return 'solution';
    if (!collected.ending) return 'ending';
    return 'ending';
  }

  /**
   * 检测孩子输入是否卡住/简短
   */
  isInputBrief(input: string): boolean {
    const trimmed = input.trim();
    return trimmed.length <= 3 || trimmed === '不知道' || trimmed === '没想好';
  }

  /**
   * 检测是否是"设定"类输入（陈述事实而非叙事元素）
   */
  isSettingInput(input: string): boolean {
    // 简单判断：如果包含"是"、"叫"等定义性词汇，且内容较短
    return /^(它|他|她|这)是/.test(input.trim()) || /叫(.+)$/.test(input.trim());
  }

  /**
   * 检测是否跑题（天马行空）
   * 简单启发：输入内容较长且包含多个无关话题元素
   */
  isOffTopic(input: string, currentStep: NarrativeStep): boolean {
    const trimmed = input.trim();
    if (trimmed.length < 15) return false;
    // 粗略判断：如果句子中有多个"然后"、"还有"且与当前步骤关联度低
    const thenCount = (trimmed.match(/然后/g) || []).length;
    return thenCount >= 3;
  }

  /**
   * 提取金句候选：找输入中有创意、有哲理的句子
   */
  extractGoldenQuoteCandidate(input: string): string | undefined {
    const trimmed = input.trim();
    // 优先选包含创意关键词且长度适中的句子
    const hasCreative = IMAGINATION_KEYWORDS.some((kw: string) => trimmed.includes(kw));
    if (hasCreative && trimmed.length >= 8 && trimmed.length <= 50) {
      return trimmed;
    }
    if (trimmed.length >= 10 && trimmed.length <= 40) {
      return trimmed;
    }
    return undefined;
  }

  /**
   * 生成开放式想象提示（孩子卡住时用，不给具体答案，只给想象方向）
   * 原则：用"如果…会怎样"当想象引擎，选择权永远还给孩子
   */
  getHypotheticalOptions(step: NarrativeStep, collected: CollectedFields): string {
    const protag = collected.protagonist || '它';
    switch (step) {
      case 'protagonist':
        return '你想想看哦——如果它特别特别小，会是什么呢？如果它特别特别厉害，又会是什么呢？';
      case 'wish':
        return `想想看哦——如果${protag}可以做一件以前从来没做过的事，会是什么呢？如果它可以去一个从没去过的地方，又会是哪里呢？`;
      case 'difficulty':
        return `想想看哦——如果${protag}走着走着，突然发现了一件很意外的事，会是什么呢？如果有什么东西让它觉得好难好难，又会是什么呢？`;
      case 'solution':
        return `想想看哦——如果${protag}可以用一个特别的本领来解决，会是什么本领呢？如果有谁可以帮它，又会是谁呢？`;
      case 'ending':
        return `想想看哦——如果${protag}最后变成了一个全新的样子，会是什么样子呢？如果它发现了一个大秘密，又会是什么秘密呢？`;
      default:
        return '';
    }
  }

  /**
   * 生成下一步引导问题（开放式，留白给孩子想象）
   */
  getNextStepQuestion(nextStep: NarrativeStep, collected: CollectedFields): string {
    const protag = collected.protagonist || '主角';
    switch (nextStep) {
      case 'protagonist':
        return '我们的故事里，是谁当主角呀？';
      case 'wish':
        return `那你告诉我，${protag}心里最想做的事情是什么呢？`;
      case 'difficulty':
        return `可是，在${protag}实现愿望的路上，发生了什么意想不到的事呢？`;
      case 'solution':
        return `那${protag}想到了什么好主意来面对呢？`;
      case 'ending':
        return `最后，${protag}的故事变成了什么样子呢？`;
      default:
        return '';
    }
  }

  /**
   * 生成镜像式肯定回复（重复孩子的具体想法 + 点出妙在哪里，不给评价等级）
   * 原则：具体肯定，点出"你这个想法妙在哪"，让孩子感到自己的想法被看见了
   */
  getAffirmation(step: NarrativeStep, value: string, collected: CollectedFields): string {
    const protag = collected.protagonist || '它';
    switch (step) {
      case 'protagonist':
        return `哇，你选了${value}当主角！我都能想象到${value}站在故事里的样子了，好有意思～`;
      case 'wish':
        return `原来${protag}想${value}呀！这个愿望里藏着好多好多想象，我都想跟着一起去了～`;
      case 'difficulty':
        return `${value}——真的吗？那${protag}一定感觉好难啊。你是怎么想到这个的呀？`;
      case 'solution':
        return `${value}，这个主意好特别！是${protag}自己想到的吗？你怎么想到的呀～`;
      case 'ending':
        return `哇，原来结局是这样的！${value}——我觉得这个结局里有你自己的味道，独一无二～`;
      default:
        return '你这个想法好有意思！';
    }
  }

  /**
   * 核心引导逻辑：处理孩子输入，返回导师回复和当前步骤
   */
  processChildInput(
    childInput: string,
    collected: CollectedFields,
  ): MentorGuidanceResult {
    const trimmedInput = childInput.trim();
    const currentStep = this.determineCurrentStep(collected);

    // 内容安全检查
    if (this.containsSensitiveContent(trimmedInput)) {
      this.logger.log('检测到敏感内容，进行温柔引导');
      return {
        mentorReply: this.getSensitiveRedirectReply(),
        currentStep,
        stepNumber: STEP_TO_NUMBER[currentStep],
        isComplete: false,
        updatedFields: { ...collected },
      };
    }

    const updatedFields: CollectedFields = { ...collected };
    let mentorReply = '';
    let nextStep: NarrativeStep = currentStep;
    let isComplete = false;

    // 如果已经全部完成，不再推进
    if (
      collected.protagonist &&
      collected.wish &&
      collected.difficulty &&
      collected.solution &&
      collected.ending
    ) {
      return {
        mentorReply: '我们的故事已经完成啦！你可以点击"生成分页内容"来看看完整的绘本哦～',
        currentStep: 'ending',
        stepNumber: 5,
        isComplete: true,
        updatedFields,
      };
    }

    // 检测输入类型，应用对应规则
    const isBrief = this.isInputBrief(trimmedInput);
    const isSetting = this.isSettingInput(trimmedInput);
    const isOff = this.isOffTopic(trimmedInput, currentStep);

    if (isBrief) {
      // R3: 孩子卡住 → 给假设选项
      const options = this.getHypotheticalOptions(currentStep, collected);
      mentorReply = `没关系，我们可以慢慢想～${options}`;
    } else if (isSetting && !collected[currentStep]) {
      // R2: 孩子给的是"设定" → 追问"为什么"
      mentorReply = `嗯，我听到啦～那你能说说为什么${this.getSettingWhyPhrase(currentStep, trimmedInput)}吗？`;
      // 同时也记录设定值（不推进步骤，等进一步回答）
      updatedFields[currentStep] = trimmedInput;
    } else if (isOff) {
      // R4: 跑题 → 接住并结构化回叙事线
      mentorReply = `哈哈，你说得好有趣！我们先把${this.getStepName(currentStep)}这部分想清楚好不好？${this.getNextStepQuestion(currentStep, collected)}`;
    } else {
      // R1: 正常回答 → 接住并肯定，再推进下一步
      const affirmation = this.getAffirmation(currentStep, trimmedInput, collected);
      updatedFields[currentStep] = trimmedInput;

      // 推进到下一步
      const currentIdx = STEP_ORDER.indexOf(currentStep);
      if (currentIdx < STEP_ORDER.length - 1) {
        nextStep = STEP_ORDER[currentIdx + 1];
        const nextQuestion = this.getNextStepQuestion(nextStep, updatedFields);
        mentorReply = `${affirmation}\n${nextQuestion}`;
      } else {
        // 已经是最后一步
        nextStep = 'ending';
        isComplete = true;
        mentorReply = affirmation;
      }
    }

    const goldenQuoteCandidate = this.extractGoldenQuoteCandidate(trimmedInput);

    return {
      mentorReply,
      currentStep: nextStep,
      stepNumber: STEP_TO_NUMBER[nextStep],
      isComplete,
      updatedFields,
      goldenQuoteCandidate,
    };
  }

  private getSettingWhyPhrase(step: NarrativeStep, _input: string): string {
    switch (step) {
      case 'protagonist':
        return '选它当主角';
      case 'wish':
        return '有这个愿望';
      case 'difficulty':
        return '会遇到这个麻烦';
      case 'solution':
        return '想到这个办法';
      case 'ending':
        return '是这样的结局';
      default:
        return '';
    }
  }

  private getStepName(step: NarrativeStep): string {
    const names: Record<NarrativeStep, string> = {
      protagonist: '主角',
      wish: '愿望',
      difficulty: '困难',
      solution: '办法',
      ending: '结局',
    };
    return names[step];
  }

  /**
   * 计算四维能力评分（启发式规则）
   */
  calculateAbilityScores(collected: CollectedFields): AbilityScores {
    const allAnswers: string[] = [
      collected.protagonist || '',
      collected.wish || '',
      collected.difficulty || '',
      collected.solution || '',
      collected.ending || '',
    ].filter(Boolean);

    const totalLength = allAnswers.reduce((sum: number, ans: string) => sum + ans.length, 0);
    const avgLength = allAnswers.length > 0 ? totalLength / allAnswers.length : 0;

    // 想象力：创意关键词数量 + 回答中比喻/拟人元素
    let imaginationScore = 40;
    const imagHits = allAnswers.filter((ans: string) =>
      IMAGINATION_KEYWORDS.some((kw: string) => ans.includes(kw)),
    ).length;
    imaginationScore += imagHits * 12;
    imaginationScore = Math.min(100, Math.max(0, imaginationScore));

    // 表达力：平均回答长度
    let expressionScore = 40;
    if (avgLength >= 5) expressionScore += 10;
    if (avgLength >= 10) expressionScore += 15;
    if (avgLength >= 20) expressionScore += 15;
    if (avgLength >= 30) expressionScore += 10;
    if (avgLength >= 50) expressionScore += 10;
    expressionScore = Math.min(100, Math.max(0, expressionScore));

    // 逻辑力：回答是否完整覆盖五步、是否有因果关系
    let logicScore = 30;
    const answeredSteps = allAnswers.length;
    logicScore += answeredSteps * 10; // 每完成一步加10分
    // 检查是否有因果连接词
    const hasCauseEffect = allAnswers.some((ans: string) =>
      /因为|所以|于是|就|然后|因此/.test(ans),
    );
    if (hasCauseEffect) logicScore += 15;
    logicScore = Math.min(100, Math.max(0, logicScore));

    // 好奇心：是否主动提出新可能性、提问
    let curiosityScore = 35;
    const curiosityHits = allAnswers.filter((ans: string) =>
      CURIOSITY_KEYWORDS.some((kw: string) => ans.includes(kw)),
    ).length;
    curiosityScore += curiosityHits * 15;
    // 回答越多步，好奇心基础分越高
    curiosityScore += answeredSteps * 5;
    curiosityScore = Math.min(100, Math.max(0, curiosityScore));

    return {
      imagination: Math.round(imaginationScore),
      expression: Math.round(expressionScore),
      logic: Math.round(logicScore),
      curiosity: Math.round(curiosityScore),
    };
  }

  /**
   * 生成分页内容（模板化生成，MVP 阶段）
   */
  generatePagesContent(collected: CollectedFields, title: string): Array<{
    pageNumber: number;
    content: string;
    narration: string;
    imagePrompt: string;
  }> {
    const protag = collected.protagonist || '小主角';
    const wish = collected.wish || '实现一个美好的愿望';
    const difficulty = collected.difficulty || '遇到了一些挑战';
    const solution = collected.solution || '想到了一个好办法';
    const ending = collected.ending || '过上了幸福的生活';

    const style = '儿童绘本画风，温暖明亮的色彩，圆润可爱，治愈系，柔和水彩质感，无文字';

    return [
      {
        pageNumber: 1,
        content: `《${title}》\n\n主角：${protag}\n\n${protag}是一个非常特别的小伙伴。它有一双亮晶晶的眼睛，对世界充满了好奇。`,
        narration: `在很久很久以前，有一个${protag}。它的故事就要开始啦～`,
        imagePrompt: `${protag}的肖像，${protag}站在阳光明媚的森林里，好奇地望着远方，${style}`,
      },
      {
        pageNumber: 2,
        content: `${protag}的愿望\n\n${protag}心里有一个大大的愿望：${wish}。\n\n每天早上醒来，${protag}都会想："什么时候才能实现呢？"`,
        narration: `${protag}最想做的事情，就是${wish}。为了这个愿望，它一直在努力着。`,
        imagePrompt: `${protag}抬头仰望星空，眼里闪着光芒，心中想着${wish}，梦幻般的云朵背景，${style}`,
      },
      {
        pageNumber: 3,
        content: `遇到了大麻烦\n\n可是，在实现愿望的路上，${protag}遇到了一个大麻烦：${difficulty}。\n\n${protag}有点难过，但它没有放弃。`,
        narration: `就在${protag}以为快要成功的时候，${difficulty}。这可怎么办才好呢？`,
        imagePrompt: `${protag}遇到了困难，表情有点难过但很坚强，周围是挑战性的场景，乌云中有阳光透出，${style}`,
      },
      {
        pageNumber: 4,
        content: `聪明的办法\n\n${protag}想了又想，终于想到了一个好办法：${solution}。\n\n它决定试试看！`,
        narration: `${protag}动了动脑筋，${solution}。这个办法能行吗？让我们继续看下去～`,
        imagePrompt: `${protag}眼睛发亮，灵光一闪想到了好主意，周围有闪亮的星星和小灯泡表示灵感，${style}`,
      },
      {
        pageNumber: 5,
        content: `美好的结局\n\n最后，${ending}。\n\n${protag}开心地笑了，它知道，只要不放弃，愿望总有一天会实现的。`,
        narration: `故事的最后，${ending}。${protag}的愿望实现了，这真是太棒了！`,
        imagePrompt: `${protag}开心地笑着，彩虹和阳光洒在身上，周围是美丽的花朵和小伙伴们在庆祝，温暖幸福的场景，${style}`,
      },
    ];
  }

  /**
   * AI 内容审核：判断故事内容是否适合儿童
   * 检查是否有暴力、色情、恐怖、血腥、歧视、违法等不适宜儿童的内容
   * 失败时安全降级为 approved: false（宁可错杀也不放过）
   */
  async moderateStoryContent(scriptContent: string): Promise<ModerationResult> {
    const systemPrompt = `你是一个严格的儿童内容审核员，负责判断故事内容是否适合6-7岁儿童阅读。

【审核标准】
严格检查故事中是否包含以下不适宜儿童的内容：
1. 暴力内容：打斗、伤害、虐待、武器、杀戮等
2. 色情内容：性暗示、裸露、低俗用语等
3. 恐怖内容：鬼怪、惊吓、血腥、残忍场面等
4. 歧视内容：种族、性别、残疾、地域歧视等
5. 违法内容：吸毒、盗窃、诈骗、自杀自残等
6. 其他不良引导：危险行为模仿、负面价值观等

【输出要求】
- 只输出一个 JSON 对象，不要有任何其他文字
- JSON 格式：{"approved": true/false, "reason": "不超过30字的简短原因"}
- approved 为 true 表示内容适合儿童，为 false 表示不适合
- 如果内容安全适合儿童，reason 可以省略或写"内容健康适合儿童"
- 用中文回答`;

    try {
      const result = await this.arkTextService.generateText(
        systemPrompt,
        `【待审核故事内容】\n${scriptContent}`,
      );

      if (!result) {
        this.logger.warn('内容审核：Ark 服务不可用，安全降级为不通过');
        return { approved: false, reason: '审核服务暂不可用' };
      }

      const content = result.content.trim();
      // 尝试解析 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('内容审核：返回格式无法解析，安全降级为不通过');
        return { approved: false, reason: '审核结果解析失败' };
      }

      const parsed = JSON.parse(jsonMatch[0]) as ModerationResult;
      const approved = Boolean(parsed.approved);
      const reason = typeof parsed.reason === 'string' ? parsed.reason : undefined;

      this.logger.log(
        `内容审核完成: approved=${approved}, reason=${reason || ''}`,
      );

      return {
        approved,
        reason: approved ? undefined : (reason || '包含不适宜儿童的内容'),
      };
    } catch (err) {
      this.logger.error(
        '内容审核异常，安全降级为不通过: ' + JSON.stringify({ error: String(err) }),
      );
      return { approved: false, reason: '审核服务异常' };
    }
  }

  /**
   * 拼接完整剧本文本（用于 TTS 配音）
   */
  buildFullScriptText(
    collected: CollectedFields,
    title: string,
    pages: Array<{ narration?: string; content: string }>,
  ): string {
    const parts: string[] = [];
    parts.push(`今天的故事名字叫《${title}》。`);

    for (const page of pages) {
      if (page.narration) {
        parts.push(page.narration);
      }
    }

    parts.push('故事讲完啦，好听吗？');
    return parts.join('\n\n');
  }
}
