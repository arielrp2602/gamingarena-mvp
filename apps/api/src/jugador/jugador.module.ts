import { Module } from '@nestjs/common';
import { JugadorController } from './jugador.controller';
import { JugadorService } from './jugador.service';

@Module({
  controllers: [JugadorController],
  providers: [JugadorService],
  exports: [JugadorService],
})
export class JugadorModule {}
