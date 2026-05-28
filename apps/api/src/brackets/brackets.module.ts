import { Module } from '@nestjs/common';
import { BracketsService } from './brackets.service';

@Module({
  providers: [BracketsService],
  exports: [BracketsService],
})
export class BracketsModule {}
