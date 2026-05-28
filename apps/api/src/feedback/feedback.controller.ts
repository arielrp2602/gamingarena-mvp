import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  /** Enviar feedback (cualquier usuario autenticado) */
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedback.create(userId, dto);
  }

  /** Listar feedback (admin) */
  @Roles(Role.ADMIN)
  @Get()
  findAll(
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
  ) {
    return this.feedback.findAll(tipo, status);
  }

  /** Resolver feedback (admin) */
  @Roles(Role.ADMIN)
  @Post(':id/resolver')
  resolver(
    @Param('id') id: string,
    @Body('resolucion') resolucion: string,
  ) {
    return this.feedback.resolver(id, resolucion);
  }
}
