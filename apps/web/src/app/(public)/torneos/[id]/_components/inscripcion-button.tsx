'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { getErrorMessage, formatCurrency } from '@/lib/utils';
import type { Torneo } from '@/types';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '14px',
      color: 'hsl(0 0% 95%)',
      '::placeholder': { color: 'hsl(0 0% 45%)' },
      fontFamily: 'inherit',
    },
  },
};

interface InscripcionButtonProps {
  torneo: Torneo;
}

export function InscripcionButton({ torneo }: InscripcionButtonProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (torneo.status !== 'ABIERTO') {
    return (
      <Button disabled className="w-full">
        {torneo.status === 'EN_CURSO' ? 'Torneo en curso' :
         torneo.status === 'FINALIZADO' ? 'Torneo finalizado' : 'Inscripciones cerradas'}
      </Button>
    );
  }

  if (!user) {
    return (
      <Button
        className="w-full"
        onClick={() => router.push(`/login?redirect=/torneos/${torneo.id}`)}
      >
        Iniciar sesión para inscribirse
      </Button>
    );
  }

  if (user.activeRole !== 'JUGADOR') {
    return (
      <Button disabled className="w-full" variant="outline">
        Cambia a rol Jugador para inscribirte
      </Button>
    );
  }

  return (
    <>
      <Button className="w-full glow-purple" onClick={() => setOpen(true)}>
        {torneo.tipoTorneo === 'CASUAL' ? 'Inscribirse gratis' : `Inscribirse · ${formatCurrency(torneo.inscripcionPrecio ?? 0)}`}
      </Button>

      {torneo.tipoTorneo === 'CASUAL' ? (
        <CasualInscripcionDialog
          torneo={torneo}
          open={open}
          onOpenChange={setOpen}
        />
      ) : (
        <Elements stripe={stripePromise}>
          <CompetitivoInscripcionDialog
            torneo={torneo}
            open={open}
            onOpenChange={setOpen}
          />
        </Elements>
      )}
    </>
  );
}

// ── Casual ────────────────────────────────────────────────────────────────────

function CasualInscripcionDialog({
  torneo,
  open,
  onOpenChange,
}: {
  torneo: Torneo;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inscripciones', { torneoId: torneo.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['torneos'] });
      qc.invalidateQueries({ queryKey: ['mis-torneos'] });
      onOpenChange(false);
      router.push('/mis-torneos');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar inscripción</DialogTitle>
          <DialogDescription>
            ¿Quieres inscribirte a <strong>{torneo.nombre}</strong>? Es un torneo gratuito.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner className="mr-2" />}
            Confirmar inscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Competitivo (Stripe) ──────────────────────────────────────────────────────

function CompetitivoInscripcionDialog({
  torneo,
  open,
  onOpenChange,
}: {
  torneo: Torneo;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const qc = useQueryClient();
  const router = useRouter();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const createIntentMutation = useMutation({
    mutationFn: () =>
      api.post<{ clientSecret: string; pagoId: string }>(
        '/inscripciones',
        { torneoId: torneo.id },
      ),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError('');
    setProcessing(true);

    try {
      const { data } = await createIntentMutation.mutateAsync();
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Elemento de tarjeta no encontrado');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        { payment_method: { card } },
      );

      if (stripeError) {
        setError(stripeError.message ?? 'Error al procesar el pago');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        qc.invalidateQueries({ queryKey: ['torneos'] });
        qc.invalidateQueries({ queryKey: ['mis-torneos'] });
        onOpenChange(false);
        router.push('/mis-torneos');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscripción · {formatCurrency(torneo.inscripcionPrecio ?? 0)}</DialogTitle>
          <DialogDescription>
            Ingresa tus datos de pago para inscribirte a <strong>{torneo.nombre}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-input bg-input/30 px-3 py-3">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground">
            El pago se reserva ahora. Si el torneo se cancela, recibirás el reembolso automáticamente.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={processing || !stripe}>
              {processing && <Spinner className="mr-2" />}
              Pagar {formatCurrency(torneo.inscripcionPrecio ?? 0)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
