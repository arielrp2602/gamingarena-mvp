import { Module } from '@nestjs/common';
import { DeckCheckController } from './deck-check.controller';
import { DeckCheckService } from './deck-check.service';

@Module({
  controllers: [DeckCheckController],
  providers: [DeckCheckService],
  exports: [DeckCheckService],
})
export class DeckCheckModule {}
