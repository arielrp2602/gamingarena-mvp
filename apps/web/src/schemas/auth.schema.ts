import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

export const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener una mayúscula')
      .regex(/[a-z]/, 'Debe contener una minúscula')
      .regex(/[0-9]/, 'Debe contener un número'),
    confirmPassword: z.string(),
    roles: z
      .array(z.enum(['JUGADOR', 'TIENDA', 'JUEZ']))
      .min(1, 'Selecciona al menos un rol'),
    // JUGADOR/JUEZ
    nombre: z.string().optional(),
    ciudad: z.string().optional(),
    // TIENDA
    nombreTienda: z.string().optional(),
    ciudadTienda: z.string().optional(),
    telefono: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine(
    (d) => {
      if (d.roles.includes('JUGADOR') || d.roles.includes('JUEZ')) {
        return !!d.nombre && !!d.ciudad;
      }
      return true;
    },
    { message: 'Nombre y ciudad son requeridos', path: ['nombre'] },
  )
  .refine(
    (d) => {
      if (d.roles.includes('TIENDA')) {
        return !!d.nombreTienda && !!d.ciudadTienda && !!d.telefono;
      }
      return true;
    },
    { message: 'Datos de tienda requeridos', path: ['nombreTienda'] },
  );

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener una mayúscula')
      .regex(/[a-z]/, 'Debe contener una minúscula')
      .regex(/[0-9]/, 'Debe contener un número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
