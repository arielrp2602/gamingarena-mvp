import { Module } from '@nestjs/common';
import { DisputasController } from './disputas.controller';
import { DisputasService } from './disputas.service';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [DiscordModule],
  controllers: [DisputasController],
  providers: [DisputasService],
  exports: [DisputasService],
})
export class DisputasModule {}
