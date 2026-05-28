import { Module } from '@nestjs/common';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [DiscordModule],
  controllers: [ResultadosController],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
