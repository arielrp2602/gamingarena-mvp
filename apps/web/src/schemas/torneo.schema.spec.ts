import { createTorneoSchema } from './torneo.schema';

const validTorneo = {
  nombre: 'Gran Torneo de Otoño',
  juegoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  formatoId: 'b2c3d4e5-f6a7-8901-bcde-f01234567891',
  tipoTorneo: 'COMPETITIVO' as const,
  cupoMaximo: 16,
  fechaInicio: '2025-09-01T10:00',
};

// ── createTorneoSchema ─────────────────────────────────────────────────────────

describe('createTorneoSchema', () => {
  describe('objeto válido', () => {
    it('acepta un objeto completo y válido', () => {
      expect(() => createTorneoSchema.parse(validTorneo)).not.toThrow();
    });
  });

  describe('nombre', () => {
    it('falla cuando nombre tiene menos de 3 caracteres', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, nombre: 'AB' });
      expect(result.success).toBe(false);
    });

    it('acepta nombre con exactamente 3 caracteres', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, nombre: 'ABC' });
      expect(result.success).toBe(true);
    });
  });

  describe('juegoId', () => {
    it('falla cuando juegoId no es un UUID válido', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, juegoId: 'no-es-uuid' });
      expect(result.success).toBe(false);
    });

    it('acepta un UUID válido en juegoId', () => {
      const result = createTorneoSchema.safeParse(validTorneo);
      expect(result.success).toBe(true);
    });
  });

  describe('tipoTorneo', () => {
    it('falla cuando tipoTorneo no es un valor válido del enum', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, tipoTorneo: 'INVALIDO' });
      expect(result.success).toBe(false);
    });

    it('acepta COMPETITIVO como tipoTorneo', () => {
      expect(createTorneoSchema.safeParse({ ...validTorneo, tipoTorneo: 'COMPETITIVO' }).success).toBe(true);
    });

    it('acepta CASUAL como tipoTorneo', () => {
      expect(createTorneoSchema.safeParse({ ...validTorneo, tipoTorneo: 'CASUAL' }).success).toBe(true);
    });
  });

  describe('cupoMaximo', () => {
    it('falla cuando cupoMaximo es menor a 4', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, cupoMaximo: 3 });
      expect(result.success).toBe(false);
    });

    it('falla cuando cupoMaximo es mayor a 256', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, cupoMaximo: 257 });
      expect(result.success).toBe(false);
    });

    it('acepta cupoMaximo de exactamente 4', () => {
      expect(createTorneoSchema.safeParse({ ...validTorneo, cupoMaximo: 4 }).success).toBe(true);
    });

    it('acepta cupoMaximo de exactamente 256', () => {
      expect(createTorneoSchema.safeParse({ ...validTorneo, cupoMaximo: 256 }).success).toBe(true);
    });
  });

  describe('inscripcionPrecio', () => {
    it('es opcional — acepta undefined sin error', () => {
      const { inscripcionPrecio: _, ...withoutPrecio } = { ...validTorneo, inscripcionPrecio: undefined };
      expect(createTorneoSchema.safeParse(withoutPrecio).success).toBe(true);
    });

    it('acepta un precio válido', () => {
      expect(createTorneoSchema.safeParse({ ...validTorneo, inscripcionPrecio: 150 }).success).toBe(true);
    });
  });

  describe('fechaInicio', () => {
    it('falla cuando fechaInicio es cadena vacía', () => {
      const result = createTorneoSchema.safeParse({ ...validTorneo, fechaInicio: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('valores por defecto', () => {
    it('pctTienda tiene valor por defecto de 10', () => {
      const result = createTorneoSchema.parse(validTorneo);
      expect(result.pctTienda).toBe(10);
    });

    it('pctJuez tiene valor por defecto de 5', () => {
      const result = createTorneoSchema.parse(validTorneo);
      expect(result.pctJuez).toBe(5);
    });

    it('deckListObligatoria tiene valor por defecto de false', () => {
      const result = createTorneoSchema.parse(validTorneo);
      expect(result.deckListObligatoria).toBe(false);
    });
  });
});
