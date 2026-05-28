import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service';

// El EmailsController queda vacío en V1 — los emails se disparan desde servicios internos
@Module({
  providers: [EmailsService],
  exports: [EmailsService],
})
export class EmailsModule {}
