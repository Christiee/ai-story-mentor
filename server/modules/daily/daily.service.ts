import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, desc, count, and, lt } from 'drizzle-orm';
import {
  parentDaily,
  scriptWork,
  abilityRadar,
  childProfile,
} from '@server/database/schema';
import type {
  ParentDaily,
  AbilityGrowth,
  ListDailyResponse,
  TodayDailyResponse,
} from '@shared/api.interface';

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getTodayDaily(
    childId: string,
    userId: string,
  ): Promise<TodayDailyResponse> {
    try {
      const today = this.getTodayDateString();

      // 1. 查询孩子信息（带归属校验）
      const children = await this.db
        .select({ name: childProfile.name })
        .from(childProfile)
        .where(and(eq(childProfile.id, childId), eq(childProfile.userId, userId)))
        .limit(1);

      if (children.length === 0) {
        return { daily: undefined, childName: '' };
      }
      const childName = children[0].name;

      // 2. 查找今天的日报
      const todayReports = await this.db
        .select()
        .from(parentDaily)
        .innerJoin(childProfile, eq(parentDaily.childId, childProfile.id))
        .where(
          and(
            eq(parentDaily.childId, childId),
            eq(parentDaily.reportDate, today),
            eq(childProfile.userId, userId),
          ),
        )
        .limit(1);

      if (todayReports.length > 0) {
        return {
          daily: this.toParentDaily(todayReports[0].parent_daily),
          childName,
        };
      }

      // 3. 查找最近已完成的剧本
      const completedScripts = await this.db
        .select()
        .from(scriptWork)
        .innerJoin(childProfile, eq(scriptWork.childId, childProfile.id))
        .where(
          and(
            eq(scriptWork.childId, childId),
            eq(scriptWork.status, 'completed'),
            eq(childProfile.userId, userId),
          ),
        )
        .orderBy(desc(scriptWork.createdAt))
        .limit(1);

      if (completedScripts.length === 0) {
        return { daily: undefined, childName };
      }

      const latestScript = completedScripts[0].script_work;

      // 4. 计算能力成长增量
      const abilityGrowth = await this.calculateAbilityGrowth(
        childId,
        latestScript.id,
      );

      // 5. 提取金句
      const goldenQuote = this.extractGoldenQuote(
        latestScript.goldenQuote,
        latestScript.protagonist,
        latestScript.wish,
      );

      // 6. 生成亮点描述
      const highlight = this.generateHighlight(
        latestScript.title,
        latestScript.protagonist,
        latestScript.wish,
        latestScript.difficulty,
        latestScript.ending,
      );

      // 7. 保存日报
      const inserted = await this.db
        .insert(parentDaily)
        .values({
          childId,
          reportDate: today,
          highlight,
          goldenQuote,
          abilityGrowth: abilityGrowth as unknown as Record<string, unknown>,
          scriptId: latestScript.id,
        })
        .returning();

      this.logger.log(
        `已自动生成今日日报: childId=${childId}, scriptId=${latestScript.id}`,
      );

      return {
        daily: this.toParentDaily(inserted[0]),
        childName,
      };
    } catch (error) {
      this.logger.error(
        `获取今日日报失败: childId=${childId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async listDaily(
    childId: string,
    page: number,
    pageSize: number,
    userId: string,
  ): Promise<ListDailyResponse> {
    try {
      const safePage = Math.max(1, page);
      const safePageSize = Math.min(50, Math.max(1, pageSize));
      const offset = (safePage - 1) * safePageSize;

      const [itemsResult, countResult] = await Promise.all([
        this.db
          .select()
          .from(parentDaily)
          .innerJoin(childProfile, eq(parentDaily.childId, childProfile.id))
          .where(and(
            eq(parentDaily.childId, childId),
            eq(childProfile.userId, userId),
          ))
          .orderBy(desc(parentDaily.reportDate))
          .limit(safePageSize)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(parentDaily)
          .innerJoin(childProfile, eq(parentDaily.childId, childProfile.id))
          .where(and(
            eq(parentDaily.childId, childId),
            eq(childProfile.userId, userId),
          )),
      ]);

      const total = Number(countResult[0]?.count ?? 0);
      const items: ParentDaily[] = itemsResult.map((row) =>
        this.toParentDaily(row.parent_daily),
      );

      return {
        items,
        total,
        page: safePage,
        pageSize: safePageSize,
      };
    } catch (error) {
      this.logger.error(
        `获取日报列表失败: childId=${childId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * 计算能力成长：取最新雷达数据与上一次雷达数据的差值
   */
  private async calculateAbilityGrowth(
    childId: string,
    scriptId: string,
  ): Promise<AbilityGrowth> {
    // 查找该剧本对应的雷达记录
    const currentRadars = await this.db
      .select()
      .from(abilityRadar)
      .where(
        and(
          eq(abilityRadar.childId, childId),
          eq(abilityRadar.scriptId, scriptId),
        ),
      )
      .limit(1);

    if (currentRadars.length === 0) {
      // 如果该剧本没有雷达记录，找最新的两条雷达记录对比
      const recentRadars = await this.db
        .select()
        .from(abilityRadar)
        .where(eq(abilityRadar.childId, childId))
        .orderBy(desc(abilityRadar.recordedAt), desc(abilityRadar.createdAt))
        .limit(2);

      if (recentRadars.length < 2) {
        return {};
      }

      const current = recentRadars[0];
      const previous = recentRadars[1];
      return this.computeGrowthDiff(current, previous);
    }

    const current = currentRadars[0];

    // 查找上一条雷达记录（在当前记录之前）
    const previousRadars = await this.db
      .select()
      .from(abilityRadar)
      .where(
        and(
          eq(abilityRadar.childId, childId),
          lt(abilityRadar.recordedAt, current.recordedAt),
        ),
      )
      .orderBy(desc(abilityRadar.recordedAt), desc(abilityRadar.createdAt))
      .limit(1);

    if (previousRadars.length === 0) {
      return {};
    }

    return this.computeGrowthDiff(current, previousRadars[0]);
  }

  private computeGrowthDiff(
    current: typeof abilityRadar.$inferSelect,
    previous: typeof abilityRadar.$inferSelect,
  ): AbilityGrowth {
    const growth: AbilityGrowth = {};
    const diffImagination = current.imagination - previous.imagination;
    const diffExpression = current.expression - previous.expression;
    const diffLogic = current.logic - previous.logic;
    const diffCuriosity = current.curiosity - previous.curiosity;

    if (diffImagination !== 0) growth.imagination = diffImagination;
    if (diffExpression !== 0) growth.expression = diffExpression;
    if (diffLogic !== 0) growth.logic = diffLogic;
    if (diffCuriosity !== 0) growth.curiosity = diffCuriosity;

    return growth;
  }

  /**
   * 提取金句：优先用剧本的 golden_quote，否则从主角/愿望中构造
   */
  private extractGoldenQuote(
    scriptQuote: string | null | undefined,
    protagonist: string,
    wish: string,
  ): string {
    if (scriptQuote && scriptQuote.trim()) {
      return scriptQuote.trim();
    }
    // 从愿望中提取一句有意义的话
    if (wish && wish.trim()) {
      const shortWish = wish.trim();
      return `「${protagonist}想${shortWish.length > 30 ? shortWish.slice(0, 30) + '…' : shortWish}」`;
    }
    return `「${protagonist}的奇妙冒险开始啦！」`;
  }

  /**
   * 生成亮点描述（模板化）
   */
  private generateHighlight(
    title: string,
    protagonist: string,
    wish: string,
    difficulty: string,
    ending: string,
  ): string {
    return `今天宝贝创作了《${title}》的故事！${protagonist}想${wish}，遇到了${difficulty}，最后${ending}。宝贝的想象力真是太丰富啦！`;
  }

  private toParentDaily(row: typeof parentDaily.$inferSelect): ParentDaily {
    return {
      id: row.id,
      childId: row.childId,
      reportDate: String(row.reportDate),
      highlight: row.highlight,
      goldenQuote: row.goldenQuote ?? undefined,
      abilityGrowth:
        (row.abilityGrowth as AbilityGrowth | null) ?? undefined,
      scriptId: row.scriptId ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
