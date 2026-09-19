import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  SendCodeRequest,
  SendCodeResponse,
  SmsCodeLoginRequest,
  PasswordLoginRequest,
  LoginResponse,
  LogoutResponse,
  CurrentUserResponse,
} from '@shared/api.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeRequest): Promise<SendCodeResponse> {
    if (!dto.phone || dto.phone.trim().length === 0) {
      throw new BadRequestException('手机号不能为空');
    }
    return this.authService.sendCode(dto.phone.trim());
  }

  @Post('sms-login')
  async smsLogin(@Body() dto: SmsCodeLoginRequest): Promise<LoginResponse> {
    if (!dto.phone || dto.phone.trim().length === 0) {
      throw new BadRequestException('手机号不能为空');
    }
    if (!dto.code || dto.code.trim().length === 0) {
      throw new BadRequestException('验证码不能为空');
    }
    return this.authService.smsLogin(
      dto.phone.trim(),
      dto.code.trim(),
    );
  }

  @Post('password-login')
  async passwordLogin(
    @Body() dto: PasswordLoginRequest,
  ): Promise<LoginResponse> {
    if (!dto.phone || dto.phone.trim().length === 0) {
      throw new BadRequestException('手机号不能为空');
    }
    if (!dto.password) {
      throw new BadRequestException('密码不能为空');
    }
    return this.authService.passwordLogin(
      dto.phone.trim(),
      dto.password,
    );
  }

  @Post('logout')
  async logout(): Promise<LogoutResponse> {
    return { success: true };
  }

  @Get('me')
  async me(
    @Headers('x-auth-token') token: string | undefined,
  ): Promise<CurrentUserResponse> {
    if (!token) {
      return { user: null };
    }
    try {
      const user = await this.authService.getUserFromToken(token);
      return { user };
    } catch {
      return { user: null };
    }
  }
}
