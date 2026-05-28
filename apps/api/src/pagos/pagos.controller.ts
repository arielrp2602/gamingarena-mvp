import {
  Controller, Headers, HttpCode, HttpStatus, Param,
  Post, RawBodyRequest, Req
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { PagosService } from './pagos.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /**
   * Webhook de Stripe — debe ser @Public y recibir rawBody sin parsear.
   * Stripe verifica la autenticidad con la firma del header.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.pagosService.handleWebhook(req.rawBody!, sig);
  }

  /** Reembolso manual (solo ADMIN) */
  @Roles(Role.ADMIN)
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @Param('id') id: string,
    @CurrentUser('id') _adminId: string,
  ) {
    return this.pagosService.refundPayment(id);
  }
}
