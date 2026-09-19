import {
  Inject,
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DRIZZLE_DATABASE,
  type PostgresJsDatabase,
} from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, gt, isNull } from 'drizzle-orm';
import * as crypto from 'node:crypto';
import { appUser, smsCode, childProfile } from '@server/database/schema';
import type { AppUser, SendCodeResponse, LoginResponse } from '@shared/api.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresInMs: number;
  private readonly codeTtlMs = 5 * 60 * 1000;
  private readonly rateLimitMs = 60 * 1000;
  private readonly scryptKeylen = 64;
  private readonly scryptSaltLen = 16;

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'storymentor-dev-secret';
    this.jwtExpiresInMs = 30 * 24 * 60 * 60 * 1000;
  }

  private toAppUserDto(row: typeof appUser.$inferSelect): AppUser {
    return {
      id: row.id,
      phone: row.phone,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private generateRandomCode(): string {
    const buf: Buffer = crypto.randomBytes(3);
    const num: number = buf.readUIntBE(0, 3) % 1_000_000;
    return num.toString().padStart(6, '0');
  }

  private hashPassword(password: string): string {
    const salt: string = crypto
      .randomBytes(this.scryptSaltLen)
      .toString('hex');
    const derivedKey: Buffer = crypto.scryptSync(
      password,
      salt,
      this.scryptKeylen,
    );
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  private comparePassword(password: string, hash: string): boolean {
    try {
      const [salt, keyHex]: string[] = hash.split(':');
      if (!salt || !keyHex) return false;
      const derivedKey: Buffer = crypto.scryptSync(
        password,
        salt,
        this.scryptKeylen,
      );
      const target: Buffer = Buffer.from(keyHex, 'hex');
      return crypto.timingSafeEqual(derivedKey, target);
    } catch {
      return false;
    }
  }

  private base64UrlEncode(buf: Buffer): string {
    return buf
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private base64UrlDecode(str: string): Buffer {
    const padded: string =
      str + '='.repeat((4 - (str.length % 4)) % 4);
    return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  private signJwt(payload: Record<string, unknown>): string {
    const header: string = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
    const now: number = Math.floor(Date.now() / 1000);
    const fullPayload: Record<string, unknown> = {
      ...payload,
      iat: now,
      exp: now + Math.floor(this.jwtExpiresInMs / 1000),
    };
    const payloadStr: string = JSON.stringify(fullPayload);

    const headerB64: string = this.base64UrlEncode(
      Buffer.from(header, 'utf8'),
    );
    const payloadB64: string = this.base64UrlEncode(
      Buffer.from(payloadStr, 'utf8'),
    );
    const signatureInput: string = `${headerB64}.${payloadB64}`;
    const signature: string = this.base64UrlEncode(
      crypto.createHmac('sha256', this.jwtSecret).update(signatureInput).digest(),
    );

    return `${signatureInput}.${signature}`;
  }

  private verifyJwt(token: string): Record<string, unknown> | null {
    try {
      const parts: string[] = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signatureB64]: string[] = parts;
      const signatureInput: string = `${headerB64}.${payloadB64}`;
      const expectedSignature: string = this.base64UrlEncode(
        crypto
          .createHmac('sha256', this.jwtSecret)
          .update(signatureInput)
          .digest(),
      );

      const sigBuf: Buffer = this.base64UrlDecode(signatureB64);
      const expectedBuf: Buffer = this.base64UrlDecode(expectedSignature);

      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
      }

      const payload: Record<string, unknown> = JSON.parse(
        this.base64UrlDecode(payloadB64).toString('utf8'),
      );

      const exp: number = Number(payload.exp);
      if (exp && exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private generateToken(user: typeof appUser.$inferSelect): string {
    return this.signJwt({ userId: user.id });
  }

  private async mergeVisitorData(
    userId: string,
    visitorId: string,
  ): Promise<number> {
    if (!visitorId) return 0;
    const updated = await this.db
      .update(childProfile)
      .set({ userId })
      .where(
        and(
          eq(childProfile.visitorId, visitorId),
          isNull(childProfile.userId),
        ),
      )
      .returning({ id: childProfile.id });
    return updated.length;
  }

  async sendCode(phone: string): Promise<SendCodeResponse> {
    try {
      const now: Date = new Date();
      const rateLimitSince: Date = new Date(now.getTime() - this.rateLimitMs);

      const recentCodes: typeof smsCode.$inferSelect[] = await this.db
        .select()
        .from(smsCode)
        .where(
          and(
            eq(smsCode.phone, phone),
            gt(smsCode.createdAt, rateLimitSince),
          ),
        )
        .orderBy(desc(smsCode.createdAt))
        .limit(1);

      if (recentCodes.length > 0) {
        throw new BadRequestException('验证码发送过于频繁，请稍后再试');
      }

      const code: string = this.generateRandomCode();
      const expiresAt: Date = new Date(now.getTime() + this.codeTtlMs);

      await this.db.insert(smsCode).values({
        phone,
        code,
        expiresAt,
        used: false,
      });

      const isDev: boolean = process.env.NODE_ENV !== 'production';

      this.logger.log(`验证码已发送 phone=${phone} devMode=${isDev}`);

      return {
        success: true,
        devMode: isDev,
        devCode: isDev ? code : undefined,
        message: isDev
          ? `验证码已发送（开发模式）`
          : '验证码已发送，请注意查收',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`发送验证码失败 phone=${phone}`, JSON.stringify(error));
      throw error;
    }
  }

  async smsLogin(
    phone: string,
    code: string,
  ): Promise<LoginResponse> {
    try {
      const now: Date = new Date();

      const latestCodes: typeof smsCode.$inferSelect[] = await this.db
        .select()
        .from(smsCode)
        .where(eq(smsCode.phone, phone))
        .orderBy(desc(smsCode.createdAt))
        .limit(1);

      if (latestCodes.length === 0) {
        throw new BadRequestException('请先获取验证码');
      }

      const record: typeof smsCode.$inferSelect = latestCodes[0];

      if (record.used) {
        throw new BadRequestException('验证码已使用，请重新获取');
      }

      if (record.expiresAt < now) {
        throw new BadRequestException('验证码已过期，请重新获取');
      }

      if (record.code !== code) {
        throw new BadRequestException('验证码错误');
      }

      await this.db
        .update(smsCode)
        .set({ used: true })
        .where(eq(smsCode.id, record.id));

      const existingUsers: typeof appUser.$inferSelect[] = await this.db
        .select()
        .from(appUser)
        .where(eq(appUser.phone, phone))
        .limit(1);

      let user: typeof appUser.$inferSelect;

      if (existingUsers.length > 0) {
        user = existingUsers[0];
      } else {
        const passwordHash: string = this.hashPassword('123456');
        const inserted = await this.db
          .insert(appUser)
          .values({ phone, passwordHash })
          .returning();
        user = inserted[0];
      }

      const mergedChildrenCount = 0;

      const token: string = this.generateToken(user);

      this.logger.log(
        `验证码登录成功 phone=${phone}`,
      );

      return {
        token,
        user: this.toAppUserDto(user),
        mergedChildrenCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`验证码登录失败 phone=${phone}`, JSON.stringify(error));
      throw error;
    }
  }

  async passwordLogin(
    phone: string,
    password: string,
  ): Promise<LoginResponse> {
    try {
      const users: typeof appUser.$inferSelect[] = await this.db
        .select()
        .from(appUser)
        .where(eq(appUser.phone, phone))
        .limit(1);

      if (users.length === 0) {
        throw new UnauthorizedException('手机号或密码错误');
      }

      const user: typeof appUser.$inferSelect = users[0];

      if (!this.comparePassword(password, user.passwordHash)) {
        throw new UnauthorizedException('手机号或密码错误');
      }

      const mergedChildrenCount = 0;

      const token: string = this.generateToken(user);

      this.logger.log(
        `密码登录成功 phone=${phone}`,
      );

      return {
        token,
        user: this.toAppUserDto(user),
        mergedChildrenCount,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`密码登录失败 phone=${phone}`, JSON.stringify(error));
      throw error;
    }
  }

  verifyToken(token: string): { userId: string } | null {
    const payload: Record<string, unknown> | null = this.verifyJwt(token);
    if (!payload || !payload.userId || typeof payload.userId !== 'string') {
      return null;
    }
    return { userId: payload.userId };
  }

  async getUserFromToken(token: string): Promise<AppUser | null> {
    const payload: Record<string, unknown> | null = this.verifyJwt(token);
    if (!payload || !payload.userId || typeof payload.userId !== 'string') {
      return null;
    }

    const users: typeof appUser.$inferSelect[] = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, payload.userId))
      .limit(1);

    if (users.length === 0) {
      return null;
    }

    return this.toAppUserDto(users[0]);
  }
}
