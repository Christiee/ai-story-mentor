import { APP_FILTER } from '@nestjs/core';
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PlatformModule } from '@lark-apaas/fullstack-nestjs-core';

import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { ViewModule } from './modules/view/view.module';
import { ChildrenModule } from './modules/children/children.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { BadgesModule } from './modules/badges/badges.module';
import { RadarModule } from './modules/radar/radar.module';
import { DailyModule } from './modules/daily/daily.module';
import { AuthModule } from './modules/auth/auth.module';
import { VoiceModule } from './modules/voice/voice.module';
import { AuthMiddleware } from './modules/auth/auth.middleware';

@Module({
  imports: [
    // 平台 Module，提供平台能力
    PlatformModule.forRoot(),
    // ====== @route-section: business-modules START ======
    ChildrenModule,
    ScriptsModule,
    BadgesModule,
    RadarModule,
    DailyModule,
    AuthModule,
    VoiceModule,
    // ====== @route-section: business-modules END ======

    // ⚠️ @route-order: last
    // ViewModule is the fallback route module, must be registered last.
    ViewModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
