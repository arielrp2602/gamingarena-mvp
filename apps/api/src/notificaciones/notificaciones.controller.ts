import {
  Controller, Get, HttpCode, HttpStatus, Param, Patch, Query
} from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificacionesService.findAll(userId, page, limit);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificacionesService.getUnreadCount(userId).then((count) => ({ count }));
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificacionesService.markAllRead(userId);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificacionesService.markRead(id, userId);
  }
}
