import React from 'react';
import { render, screen } from '@testing-library/react';
import { TorneoCard } from './torneo-card';
import type { Torneo } from '@/types';

// Mock UI primitives that use Base UI internals (avoid JSDOM issues)
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ children?: React.ReactNode; [key: string]: unknown }>;
      return React.cloneElement(child, { ...child.props });
    }
    return React.createElement('button', props, children);
  },
  buttonVariants: jest.fn(),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardContent: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardFooter: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
}));

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeTorneo(overrides: Partial<Torneo> = {}): Torneo {
  return {
    id: 'torneo-abc-123',
    nombre: 'Torneo de Prueba',
    descripcion: 'Descripción del torneo de prueba',
    bannerUrl: null,
    tipoTorneo: 'COMPETITIVO',
    status: 'ABIERTO',
    cupoMaximo: 16,
    inscripcionPrecio: 200,
    fechaInicio: '2025-09-01T10:00:00.000Z',
    fechaFin: null,
    deckListObligatoria: false,
    juezRequerido: false,
    reglasPartida: [],
    tiempoPorRondaMinutos: null,
    tienda: {
      id: 'tienda-001',
      nombre: 'Tienda Gamer Central',
      logo: null,
      ciudad: 'Guadalajara',
    },
    juego: {
      id: 'juego-001',
      nombre: 'Magic: The Gathering',
      tipo: 'TCG',
      iconoUrl: null,
      activo: true,
    },
    formatoTienda: {
      id: 'formato-tienda-001',
      tiendaId: 'tienda-001',
      formatoJuegoId: 'formato-001',
      formatoJuego: {
        id: 'formato-001',
        juegoId: 'juego-001',
        nombre: 'Standard',
        descripcion: null,
      },
      activo: true,
    },
    premios: [],
    _count: { inscripciones: 5 },
    ...overrides,
  };
}

// ── TorneoCard ─────────────────────────────────────────────────────────────────

describe('TorneoCard', () => {
  it('renderiza el nombre del torneo', () => {
    render(<TorneoCard torneo={makeTorneo()} />);
    expect(screen.getByText('Torneo de Prueba')).toBeInTheDocument();
  });

  it('renderiza el nombre del juego', () => {
    render(<TorneoCard torneo={makeTorneo()} />);
    expect(screen.getByText('Magic: The Gathering')).toBeInTheDocument();
  });

  it('muestra la ciudad de la tienda', () => {
    render(<TorneoCard torneo={makeTorneo()} />);
    expect(screen.getByText('Guadalajara')).toBeInTheDocument();
  });

  it('muestra la capacidad en formato X/Y', () => {
    render(<TorneoCard torneo={makeTorneo({ _count: { inscripciones: 5 }, cupoMaximo: 16 })} />);
    expect(screen.getByText(/5\/16/)).toBeInTheDocument();
  });

  it('muestra "Gratuito" para torneos CASUAL con precio null', () => {
    render(
      <TorneoCard
        torneo={makeTorneo({ tipoTorneo: 'CASUAL', inscripcionPrecio: null })}
      />,
    );
    expect(screen.getByText('Gratuito')).toBeInTheDocument();
  });

  it('muestra el precio formateado para torneos COMPETITIVO', () => {
    render(<TorneoCard torneo={makeTorneo({ tipoTorneo: 'COMPETITIVO', inscripcionPrecio: 200 })} />);
    // El precio formateado debe contener el valor numérico 200
    const priceEl = screen.getByText(/200/);
    expect(priceEl).toBeInTheDocument();
  });

  it('muestra "Ver e inscribirse" cuando el status es ABIERTO', () => {
    render(<TorneoCard torneo={makeTorneo({ status: 'ABIERTO' })} />);
    expect(screen.getByText('Ver e inscribirse')).toBeInTheDocument();
  });

  it('muestra "Ver torneo" cuando el status no es ABIERTO (EN_CURSO)', () => {
    render(<TorneoCard torneo={makeTorneo({ status: 'EN_CURSO' })} />);
    expect(screen.getByText('Ver torneo')).toBeInTheDocument();
  });

  it('el enlace apunta a /torneos/:id', () => {
    const torneo = makeTorneo({ id: 'torneo-abc-123' });
    render(<TorneoCard torneo={torneo} />);
    // El botón asChild renderiza un <a> cuyo href apunta al torneo
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/torneos/torneo-abc-123');
  });

  it('renderiza el TorneoStatusBadge con la etiqueta "Inscripciones abiertas"', () => {
    render(<TorneoCard torneo={makeTorneo({ status: 'ABIERTO' })} />);
    expect(screen.getByText('Inscripciones abiertas')).toBeInTheDocument();
  });

  it('no renderiza una imagen de banner cuando bannerUrl es null', () => {
    render(<TorneoCard torneo={makeTorneo({ bannerUrl: null })} />);
    const imgs = document.querySelectorAll('img');
    imgs.forEach((img) => {
      expect(img.getAttribute('src')).not.toBeNull();
      // ninguna imagen apunta a una URL de banner nulo
    });
    // No debe existir ningún img cuyo src sea null o relacionado con el banner
    expect(screen.queryByRole('img', { name: 'Torneo de Prueba' })).toBeNull();
  });

  it('renderiza una imagen cuando bannerUrl está definida', () => {
    const bannerUrl = 'https://example.com/banner.jpg';
    render(<TorneoCard torneo={makeTorneo({ bannerUrl })} />);
    const bannerImg = screen.getByAltText('Torneo de Prueba');
    expect(bannerImg).toBeInTheDocument();
    expect(bannerImg).toHaveAttribute('src', bannerUrl);
  });
});
