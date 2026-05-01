import { Module } from '@nestjs/common';
import { PlateAiController } from './plate-ai.controller';
import { PlateAiService } from './services/plate-ai.service';

@Module({
  controllers: [PlateAiController],
  providers: [PlateAiService],
  exports: [PlateAiService],
})
export class PlateAiModule {}
