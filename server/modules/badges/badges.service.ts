import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { achievementBadge, scriptWork, childProfile } from '@server/database/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import type { AchievementBadge, AbilityScores } from '@shared/api.interface';

interface BadgeDefinition {
  badgeType: string;
  badgeName: string;
  description: string;
  icon?: string;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    badgeType: 'first_story',
    badgeName: '初出茅庐',
    description: '完成第一个剧本',
    icon: 'sparkles',
  },
  {
    badgeType: 'imagination_star',
    badgeName: '想象力之星',
    description: '剧本充满奇思妙想',
    icon: 'star',
  },
  {
    badgeType: 'brave_expression',
    badgeName: '勇敢表达',
    description: '敢于说出自己的想法',
    icon: 'mic',
  },
  {
    badgeType: 'good_question',
    badgeName: '会提问',
    description: '主动提出有趣的问题',
    icon: 'help-circle',
  },
  {
    badgeType: 'story_master',
    badgeName: '故事大师',
    description: '完成5个剧本',
    icon: 'crown',
  },
  {
    badgeType: 'happy_ending',
    badgeName: '完美结局',
    description: '每个故事都有美好结局',
    icon: 'heart',
  },
];

const POSITIVE_KEYWORDS = [
  '快乐', '幸福', '美好', '成功', '胜利', '团圆', '温馨',
  '开心', '高兴', '欢喜', '喜悦', '和平', '友爱', '温暖',
  '希望', '梦想成真', '圆满', '完美', 'happy', 'wonderful',
];

const QUESTION_KEYWORDS = [
  '为什么', '怎么', '如何', '什么', '哪里', '谁', '？',
  '为什么呢', '怎么回事', '新奇', '奇怪', '神奇',
];

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 获取指定孩子的所有徽章
   */
  async listBadges(
    childId: string,
    userId: string,
  ): Promise<AchievementBadge[]> {
    try {
      const rows = await this.db
        .select()
        .from(achievementBadge)
        .innerJoin(childProfile, eq(achievementBadge.childId, childProfile.id))
        .where(and(
          eq(achievementBadge.childId, childId),
          eq(childProfile.userId, userId),
        ))
        .orderBy(desc(achievementBadge.unlockedAt));

      return rows.map((row) => this.mapToBadge(row.achievement_badge));
    } catch (error) {
      this.logger.error(`获取孩子徽章失败 childId=${childId}`, error as Error);
      throw error;
    }
  }

  /**
   * 检查并解锁满足条件的徽章
   * @param childId 孩子 ID
   * @param scriptId 刚完成的剧本 ID
   * @param abilityScores 能力评分（可选）
   * @returns 新解锁的徽章列表
   */
  async checkAndUnlockBadges(
    childId: string,
    scriptId: string,
    abilityScores?: AbilityScores,
  ): Promise<AchievementBadge[]> {
    try {
      this.logger.log(`检查徽章解锁 childId=${childId} scriptId=${scriptId}`);

      // 查询孩子已完成的剧本数量
      const completedCountResult = await this.db
        .select({ count: count() })
        .from(scriptWork)
        .where(and(
          eq(scriptWork.childId, childId),
          eq(scriptWork.status, 'completed'),
        ));
      const completedCount = Number(completedCountResult[0]?.count ?? 0);

      // 查询当前剧本信息
      const scriptRows = await this.db
        .select()
        .from(scriptWork)
        .where(eq(scriptWork.id, scriptId));
      const script = scriptRows[0];

      // 查询孩子已有的徽章类型
      const existingBadges = await this.db
        .select({ badgeType: achievementBadge.badgeType })
        .from(achievementBadge)
        .where(eq(achievementBadge.childId, childId));
      const existingTypes = new Set(existingBadges.map((b) => b.badgeType));

      const newBadges: BadgeDefinition[] = [];

      // 1. 初出茅庐：完成第 1 个剧本
      if (completedCount >= 1 && !existingTypes.has('first_story')) {
        newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'first_story')!);
      }

      // 2. 想象力之星：想象力评分 ≥ 80
      if (
        abilityScores?.imagination !== undefined &&
        abilityScores.imagination >= 80 &&
        !existingTypes.has('imagination_star')
      ) {
        newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'imagination_star')!);
      }

      // 3. 勇敢表达：完成 3 个剧本
      if (completedCount >= 3 && !existingTypes.has('brave_expression')) {
        newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'brave_expression')!);
      }

      // 4. 会提问：剧本内容中包含"为什么"或新奇设定
      if (script && !existingTypes.has('good_question')) {
        const contentToCheck = [script.wish, script.solution, script.difficulty].join(' ');
        const hasQuestion = QUESTION_KEYWORDS.some((kw) => contentToCheck.includes(kw));
        if (hasQuestion) {
          newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'good_question')!);
        }
      }

      // 5. 故事大师：完成 5 个剧本
      if (completedCount >= 5 && !existingTypes.has('story_master')) {
        newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'story_master')!);
      }

      // 6. 完美结局：结局中包含积极正面的内容
      if (script && !existingTypes.has('happy_ending')) {
        const hasPositive = POSITIVE_KEYWORDS.some((kw) =>
          script.ending.toLowerCase().includes(kw.toLowerCase()),
        );
        if (hasPositive) {
          newBadges.push(BADGE_DEFINITIONS.find((b) => b.badgeType === 'happy_ending')!);
        }
      }

      if (newBadges.length === 0) {
        this.logger.log(`没有新解锁的徽章 childId=${childId}`);
        return [];
      }

      // 批量插入新解锁的徽章
      const inserted = await this.db
        .insert(achievementBadge)
        .values(
          newBadges.map((badge) => ({
            childId,
            badgeType: badge.badgeType,
            badgeName: badge.badgeName,
            description: badge.description,
            icon: badge.icon,
            scriptId,
          })),
        )
        .returning();

      this.logger.log(`新解锁 ${inserted.length} 个徽章 childId=${childId}`);
      return inserted.map((row) => this.mapToBadge(row));
    } catch (error) {
      this.logger.error(`检查并解锁徽章失败 childId=${childId}`, error as Error);
      throw error;
    }
  }

  private mapToBadge(row: typeof achievementBadge.$inferSelect): AchievementBadge {
    return {
      id: row.id,
      childId: row.childId,
      badgeType: row.badgeType,
      badgeName: row.badgeName,
      description: row.description,
      icon: row.icon ?? undefined,
      unlockedAt: row.unlockedAt.toISOString(),
      scriptId: row.scriptId ?? undefined,
    };
  }
}
