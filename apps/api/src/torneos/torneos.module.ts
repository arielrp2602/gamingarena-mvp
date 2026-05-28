import { Module } from '@nestjs/common';
import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';
import { BracketsModule } from '../brackets/brackets.module';
import { EmailsModule } from '../emails/emails.module';

@Module({
  imports: [BracketsModule, EmailsModule],
  controllers: [TorneosController],
  providers: [TorneosService],
  exports: [TorneosService],
})
export class TorneosModule {}
