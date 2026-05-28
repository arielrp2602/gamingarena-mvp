import { Module } from '@nestjs/common';
import { PartidasController } from './partidas.controller';
import { PartidasService } from './partidas.service';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [DiscordModule],
  controllers: [PartidasController],
  providers: [PartidasService],
  exports: [PartidasService],
})
export class PartidasModule {}
