import { Module } from '@nestjs/common';
import { RondasController } from './rondas.controller';
import { RondasService } from './rondas.service';
import { BracketsModule } from '../brackets/brackets.module';

@Module({
  imports: [BracketsModule],
  controllers: [RondasController],
  providers: [RondasService],
  exports: [RondasService],
})
export class RondasModule {}
