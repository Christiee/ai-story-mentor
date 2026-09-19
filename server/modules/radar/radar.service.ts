import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { abilityRadar, childProfile } from '@server/database/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { AbilityRadarRecord, AbilityScores, LatestRadarResponse } from '@shared/api.interface';

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  /**
   * 获取最新一次能力雷达数据，以及上一次数据（用于对比成长）
   */
  async getLatest(
    childId: string,
    userId: string,
  ): Promise<LatestRadarResponse> {
    try {
      const records = await this.db
        .select({
          id: abilityRadar.id,
          childId: abilityRadar.childId,
          imagination: abilityRadar.imagination,
          expression: abilityRadar.expression,
          logic: abilityRadar.logic,
          curiosity: abilityRadar.curiosity,
          recordedAt: abilityRadar.recordedAt,
          scriptId: abilityRadar.scriptId,
        })
        .from(abilityRadar)
        .innerJoin(childProfile, eq(abilityRadar.childId, childProfile.id))
        .where(and(
          eq(abilityRadar.childId, childId),
          eq(childProfile.userId, userId),
        ))
        .orderBy(desc(abilityRadar.recordedAt), desc(abilityRadar.createdAt))
        .limit(2);

      if (records.length === 0) {
        throw new NotFoundException('暂无能力雷达数据');
      }

      const result: LatestRadarResponse = {
        current: records[0],
      };
      if (records.length > 1) {
        result.previous = records[1];
      }

      return result;
    } catch (error) {
      this.logger.error(`获取最新能力雷达失败 childId=${childId}`, error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  /**
   * 记录一次能力得分（供 scripts 模块调用）
   * @param childId 孩子ID
   * @param scriptId 关联剧本ID
   * @param scores 四项能力得分
   */
  async recordScore(childId: string, scriptId: string, scores: AbilityScores): Promise<AbilityRadarRecord> {
    try {
      const inserted: AbilityRadarRecord[] = await this.db
        .insert(abilityRadar)
        .values({
          childId,
          scriptId,
          imagination: scores.imagination,
          expression: scores.expression,
          logic: scores.logic,
          curiosity: scores.curiosity,
        })
        .returning({
          id: abilityRadar.id,
          childId: abilityRadar.childId,
          imagination: abilityRadar.imagination,
          expression: abilityRadar.expression,
          logic: abilityRadar.logic,
          curiosity: abilityRadar.curiosity,
          recordedAt: abilityRadar.recordedAt,
          scriptId: abilityRadar.scriptId,
        });

      this.logger.log(`记录能力得分成功 childId=${childId} scriptId=${scriptId}`);
      return inserted[0];
    } catch (error) {
      this.logger.error(
        `记录能力得分失败 childId=${childId} scriptId=${scriptId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
