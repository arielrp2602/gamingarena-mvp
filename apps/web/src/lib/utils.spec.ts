import { cn, formatCurrency, formatDate, formatDateTime, getErrorMessage, getInitials, truncate } from './utils';

describe('cn', () => {
  it('combina clases sin duplicados', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('omite valores falsy', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'extra')).toBe('base extra');
  });

  it('soporta objetos condicionales', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});

describe('formatCurrency', () => {
  it('formatea valores en MXN', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1');
    expect(result).toContain('500');
    // Verifica que contiene símbolo de peso o código MXN
    expect(result).toMatch(/\$|MXN/);
  });

  it('formatea cero correctamente', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('no incluye decimales en valores enteros', () => {
    const result = formatCurrency(100);
    expect(result).not.toContain('.00');
  });
});

describe('formatDate', () => {
  it('formatea una fecha ISO en español', () => {
    const result = formatDate('2025-01-15T00:00:00.000Z');
    // Verifica que contiene el año 2025
    expect(result).toContain('2025');
    // Verifica que no incluye hora
    expect(result).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('usa nombres de mes en español', () => {
    const result = formatDate('2025-03-01T00:00:00.000Z');
    expect(result.toLowerCase()).toMatch(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/);
  });
});

describe('formatDateTime', () => {
  it('incluye hora y minutos', () => {
    const result = formatDateTime('2025-06-15T14:30:00.000Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).toContain('2025');
  });
});

describe('getErrorMessage', () => {
  it('extrae el mensaje de un error de Axios con string', () => {
    const error = { response: { data: { message: 'Email inválido' } } };
    expect(getErrorMessage(error)).toBe('Email inválido');
  });

  it('une mensajes cuando son un array (errores de validación)', () => {
    const error = { response: { data: { message: ['Campo requerido', 'Email inválido'] } } };
    expect(getErrorMessage(error)).toBe('Campo requerido, Email inválido');
  });

  it('retorna error.message para instancias de Error', () => {
    expect(getErrorMessage(new Error('Algo falló'))).toBe('Algo falló');
  });

  it('retorna mensaje genérico para valores desconocidos', () => {
    expect(getErrorMessage(null)).toBe('Ocurrió un error inesperado');
    expect(getErrorMessage(42)).toBe('Ocurrió un error inesperado');
    expect(getErrorMessage(undefined)).toBe('Ocurrió un error inesperado');
  });

  it('retorna mensaje genérico cuando response.data.message no es string ni array', () => {
    const error = { response: { data: { message: { nested: 'obj' } } } };
    expect(getErrorMessage(error)).toBe('Ocurrió un error inesperado');
  });
});

describe('getInitials', () => {
  it('retorna las iniciales de un nombre compuesto', () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
  });

  it('toma solo las dos primeras palabras', () => {
    expect(getInitials('Juan Carlos García López')).toBe('JC');
  });

  it('maneja un nombre de una sola palabra', () => {
    expect(getInitials('Admin')).toBe('A');
  });

  it('retorna mayúsculas', () => {
    expect(getInitials('ana lima')).toBe('AL');
  });
});

describe('truncate', () => {
  it('no trunca textos más cortos que n', () => {
    expect(truncate('Hola', 10)).toBe('Hola');
  });

  it('no trunca textos con exactamente n caracteres', () => {
    expect(truncate('Hola Mundo', 10)).toBe('Hola Mundo');
  });

  it('trunca y agrega ellipsis cuando el texto supera n', () => {
    const result = truncate('Este texto es demasiado largo', 15);
    expect(result).toHaveLength(15);
    expect(result.endsWith('…')).toBe(true);
  });

  it('trunca correctamente en el límite exacto', () => {
    expect(truncate('ABCDE', 4)).toBe('ABC…');
  });
});
