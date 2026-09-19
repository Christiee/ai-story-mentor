import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and } from 'drizzle-orm';
import { childProfile } from '@server/database/schema';
import type {
  ChildProfile,
  CreateChildRequest,
  UpdateChildRequest,
} from '@shared/api.interface';

@Injectable()
export class ChildrenService {
  private readonly logger = new Logger(ChildrenService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private toDto(row: typeof childProfile.$inferSelect): ChildProfile {
    return {
      id: row.id,
      name: row.name,
      age: row.age,
      avatar: row.avatar ?? undefined,
      interests: row.interests ?? [],
      languageStyle: row.languageStyle ?? 'normal',
      lastExcitement: row.lastExcitement ?? undefined,
      personalityNotes: row.personalityNotes ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(userId: string): Promise<ChildProfile[]> {
    try {
      const rows = await this.db
        .select()
        .from(childProfile)
        .where(eq(childProfile.userId, userId))
        .orderBy(childProfile.createdAt);

      return rows.map((row: typeof childProfile.$inferSelect) => this.toDto(row));
    } catch (error) {
      this.logger.error('获取孩子列表失败', JSON.stringify(error));
      throw error;
    }
  }

  async getById(id: string, userId: string): Promise<ChildProfile> {
    try {
      const rows = await this.db
        .select()
        .from(childProfile)
        .where(and(eq(childProfile.id, id), eq(childProfile.userId, userId)));

      if (rows.length === 0) {
        throw new NotFoundException('孩子档案不存在');
      }

      return this.toDto(rows[0]);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`获取孩子详情失败 id=${id}`, JSON.stringify(error));
      throw error;
    }
  }

  async create(dto: CreateChildRequest, userId: string): Promise<ChildProfile> {
    try {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new BadRequestException('孩子姓名不能为空');
      }
      if (dto.age === undefined || dto.age < 0 || dto.age > 18) {
        throw new BadRequestException('年龄必须在 0-18 之间');
      }

      const inserted = await this.db
        .insert(childProfile)
        .values({
          name: dto.name.trim(),
          age: dto.age,
          avatar: dto.avatar,
          interests: dto.interests ?? [],
          userId,
        })
        .returning();

      return this.toDto(inserted[0]);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('创建孩子档案失败', JSON.stringify(error));
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateChildRequest,
    userId: string,
  ): Promise<ChildProfile> {
    try {
      const patch: Partial<typeof childProfile.$inferInsert> = {};

      if (dto.name !== undefined) {
        if (dto.name.trim().length === 0) {
          throw new BadRequestException('孩子姓名不能为空');
        }
        patch.name = dto.name.trim();
      }
      if (dto.age !== undefined) {
        if (dto.age < 0 || dto.age > 18) {
          throw new BadRequestException('年龄必须在 0-18 之间');
        }
        patch.age = dto.age;
      }
      if (dto.avatar !== undefined) {
        patch.avatar = dto.avatar;
      }
      if (dto.interests !== undefined) {
        patch.interests = dto.interests;
      }
      if (dto.lastExcitement !== undefined) {
        patch.lastExcitement = dto.lastExcitement;
      }
      if (dto.personalityNotes !== undefined) {
        patch.personalityNotes = dto.personalityNotes;
      }

      if (Object.keys(patch).length === 0) {
        throw new BadRequestException('未提供可更新字段');
      }

      patch.updatedAt = new Date();

      const updated = await this.db
        .update(childProfile)
        .set(patch)
        .where(and(eq(childProfile.id, id), eq(childProfile.userId, userId)))
        .returning();

      if (updated.length === 0) {
        throw new NotFoundException('孩子档案不存在');
      }

      return this.toDto(updated[0]);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`更新孩子档案失败 id=${id}`, JSON.stringify(error));
      throw error;
    }
  }
}
