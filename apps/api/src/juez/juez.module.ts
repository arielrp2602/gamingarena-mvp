import { Module } from '@nestjs/common';
import { JuezController } from './juez.controller';
import { JuezService } from './juez.service';

@Module({
  controllers: [JuezController],
  providers: [JuezService],
  exports: [JuezService],
})
export class JuezModule {}
