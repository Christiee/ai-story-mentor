import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = req.header('x-auth-token');
    if (token) {
      const payload = this.authService.verifyToken(token);
      if (payload) {
        (req as Request & { appUserId?: string }).appUserId = payload.userId;
      }
    }
    next();
  }
}
