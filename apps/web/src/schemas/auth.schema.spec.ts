import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';

// ── loginSchema ────────────────────────────────────────────────────────────────

describe('loginSchema', () => {
  it('es válido con email y contraseña correctos', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com', password: '12345' })).not.toThrow();
  });

  it('falla con email inválido', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '12345' });
    expect(result.success).toBe(false);
  });

  it('falla con contraseña vacía', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('falla si faltan campos', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

// ── registerSchema ─────────────────────────────────────────────────────────────

describe('registerSchema', () => {
  const validJugador = {
    email: 'jugador@example.com',
    password: 'Segura1abc',
    confirmPassword: 'Segura1abc',
    roles: ['JUGADOR'],
    nombre: 'Carlos López',
    ciudad: 'CDMX',
  };

  const validTienda = {
    email: 'tienda@example.com',
    password: 'Segura1abc',
    confirmPassword: 'Segura1abc',
    roles: ['TIENDA'],
    nombreTienda: 'Game Center',
    ciudadTienda: 'Guadalajara',
    telefono: '3312345678',
  };

  it('es válido para un jugador completo', () => {
    expect(() => registerSchema.parse(validJugador)).not.toThrow();
  });

  it('es válido para una tienda completa', () => {
    expect(() => registerSchema.parse(validTienda)).not.toThrow();
  });

  it('falla si la contraseña es menor a 8 caracteres', () => {
    const result = registerSchema.safeParse({ ...validJugador, password: 'Corta1', confirmPassword: 'Corta1' });
    expect(result.success).toBe(false);
  });

  it('falla si la contraseña no tiene mayúsculas', () => {
    const result = registerSchema.safeParse({
      ...validJugador,
      password: 'segura1abc',
      confirmPassword: 'segura1abc',
    });
    expect(result.success).toBe(false);
  });

  it('falla si la contraseña no tiene minúsculas', () => {
    const result = registerSchema.safeParse({
      ...validJugador,
      password: 'SEGURA1ABC',
      confirmPassword: 'SEGURA1ABC',
    });
    expect(result.success).toBe(false);
  });

  it('falla si la contraseña no tiene números', () => {
    const result = registerSchema.safeParse({
      ...validJugador,
      password: 'SegurasAbc',
      confirmPassword: 'SegurasAbc',
    });
    expect(result.success).toBe(false);
  });

  it('falla si las contraseñas no coinciden', () => {
    const result = registerSchema.safeParse({
      ...validJugador,
      confirmPassword: 'OtraSegura1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('falla si no se selecciona ningún rol', () => {
    const result = registerSchema.safeParse({ ...validJugador, roles: [] });
    expect(result.success).toBe(false);
  });

  it('falla si el rol es JUGADOR pero faltan nombre y ciudad', () => {
    const result = registerSchema.safeParse({ ...validJugador, nombre: undefined, ciudad: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('nombre');
    }
  });

  it('falla si el rol es TIENDA pero faltan datos de tienda', () => {
    const result = registerSchema.safeParse({
      ...validTienda,
      nombreTienda: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('nombreTienda');
    }
  });

  it('permite roles inválidos con error claro', () => {
    const result = registerSchema.safeParse({ ...validJugador, roles: ['ROL_INEXISTENTE'] });
    expect(result.success).toBe(false);
  });
});

// ── forgotPasswordSchema ───────────────────────────────────────────────────────

describe('forgotPasswordSchema', () => {
  it('es válido con email correcto', () => {
    expect(() => forgotPasswordSchema.parse({ email: 'user@example.com' })).not.toThrow();
  });

  it('falla con email inválido', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'invalido' }).success).toBe(false);
  });
});

// ── resetPasswordSchema ────────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  const valid = { password: 'NuevaSegura1', confirmPassword: 'NuevaSegura1' };

  it('es válido con contraseñas que coinciden', () => {
    expect(() => resetPasswordSchema.parse(valid)).not.toThrow();
  });

  it('falla si las contraseñas no coinciden', () => {
    const result = resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'Diferente1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((e) => e.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('falla si la contraseña no cumple los requisitos de complejidad', () => {
    const weak = { password: 'simple', confirmPassword: 'simple' };
    expect(resetPasswordSchema.safeParse(weak).success).toBe(false);
  });
});
