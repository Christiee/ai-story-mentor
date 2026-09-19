import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * 从请求中读取已登录用户 ID，未登录则抛出 401
 * @param req Express Request 对象
 * @returns userId 登录用户 ID
 * @throws UnauthorizedException 未登录时抛出
 */
export function requireLogin(req: Request): string {
  const userId = (req as Request & { appUserId?: string }).appUserId;
  if (!userId) {
    throw new UnauthorizedException('请先登录');
  }
  return userId;
}
