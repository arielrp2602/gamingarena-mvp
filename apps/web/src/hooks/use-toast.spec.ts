import { renderHook, act } from '@testing-library/react';
import { useToastState, toast } from './use-toast';

// ── useToastState ──────────────────────────────────────────────────────────────

describe('useToastState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('comienza con un array de toasts vacío', () => {
    const { result } = renderHook(() => useToastState());
    expect(result.current.toasts).toHaveLength(0);
  });

  it('addToast agrega un toast con id generado', () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.addToast({ title: 'Hola', description: 'Descripción' });
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hola');
    expect(result.current.toasts[0].id).toBeDefined();
    expect(typeof result.current.toasts[0].id).toBe('string');
  });

  it('addToast con variant destructive conserva la variant', () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.addToast({ title: 'Error', variant: 'destructive' });
    });
    expect(result.current.toasts[0].variant).toBe('destructive');
  });

  it('múltiples toasts se acumulan en el array', () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.addToast({ title: 'Toast 1' });
      result.current.addToast({ title: 'Toast 2' });
      result.current.addToast({ title: 'Toast 3' });
    });
    expect(result.current.toasts).toHaveLength(3);
  });

  it('el toast desaparece después de 4 segundos', () => {
    const { result } = renderHook(() => useToastState());
    act(() => {
      result.current.addToast({ title: 'Temporal' });
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(4001);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── toast() function ───────────────────────────────────────────────────────────

describe('toast()', () => {
  it('llama al queue registrado por useToastState', () => {
    // Primero registrar el hook para que toastQueue no sea null
    const { result } = renderHook(() => useToastState());

    act(() => {
      toast({ title: 'Desde toast()' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Desde toast()');
  });
});
