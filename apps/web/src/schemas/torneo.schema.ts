import { z } from 'zod';

export const createTorneoSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(80),
  descripcion: z.string().max(500).optional(),
  juegoId: z.string().uuid('Selecciona un juego'),
  formatoId: z.string().uuid('Selecciona un formato'),
  tipoTorneo: z.enum(['COMPETITIVO', 'CASUAL']),
  cupoMaximo: z.coerce.number().min(4).max(256),
  inscripcionPrecio: z.coerce.number().min(0).optional(),
  fechaInicio: z.string().min(1, 'Selecciona una fecha'),
  fechaFin: z.string().optional(),
  deckListObligatoria: z.boolean().default(false),
  juezRequerido: z.boolean().default(false),
  tiempoPorRondaMinutos: z.coerce.number().min(10).max(120).optional(),
  rondasTotales: z.coerce.number().min(1).max(15).optional(),
  pctTienda: z.coerce.number().min(0).max(100).default(10),
  pctJuez: z.coerce.number().min(0).max(100).default(5),
});

export type CreateTorneoFormData = z.infer<typeof createTorneoSchema>;
