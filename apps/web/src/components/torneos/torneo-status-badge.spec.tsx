import React from 'react';
import { render, screen } from '@testing-library/react';
import { TorneoStatusBadge, TorneoTipoBadge } from './torneo-status-badge';
import type { TorneoStatus, TipoTorneo } from '@/types';

// ── TorneoStatusBadge ──────────────────────────────────────────────────────────

describe('TorneoStatusBadge', () => {
  const cases: { status: TorneoStatus; label: string }[] = [
    { status: 'BORRADOR', label: 'Borrador' },
    { status: 'ABIERTO', label: 'Inscripciones abiertas' },
    { status: 'EN_CURSO', label: 'En curso' },
    { status: 'FINALIZADO', label: 'Finalizado' },
    { status: 'CANCELADO', label: 'Cancelado' },
  ];

  cases.forEach(({ status, label }) => {
    it(`muestra la etiqueta correcta para status "${status}"`, () => {
      render(<TorneoStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});

// ── TorneoTipoBadge ────────────────────────────────────────────────────────────

describe('TorneoTipoBadge', () => {
  const cases: { tipo: TipoTorneo; label: string }[] = [
    { tipo: 'COMPETITIVO', label: 'Competitivo' },
    { tipo: 'CASUAL', label: 'Casual' },
  ];

  cases.forEach(({ tipo, label }) => {
    it(`muestra la etiqueta correcta para tipo "${tipo}"`, () => {
      render(<TorneoTipoBadge tipo={tipo} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
