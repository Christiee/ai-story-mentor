import { Module } from '@nestjs/common';
import { ScriptsController } from './scripts.controller';
import { ScriptsService } from './scripts.service';
import { MentorService } from './mentor.service';
import { ArkTextService } from './ark-text.service';
import { BadgesModule } from '../badges/badges.module';
import { RadarModule } from '../radar/radar.module';

@Module({
  imports: [BadgesModule, RadarModule],
  controllers: [ScriptsController],
  providers: [ScriptsService, MentorService, ArkTextService],
})
export class ScriptsModule {}
