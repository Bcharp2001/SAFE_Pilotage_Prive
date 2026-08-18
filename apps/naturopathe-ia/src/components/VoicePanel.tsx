'use client';

import { Mic, MicOff } from 'lucide-react';

import { MessageActions } from '@/components/MessageActions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useVoiceSession } from '@/hooks/useVoiceSession';
import type { AppConfig } from '@/lib/client/types';

interface VoicePanelProps {
  config: AppConfig;
  onCreateFiche: (content: string) => void;
}

export function VoicePanel({ config, onCreateFiche }: VoicePanelProps) {
  const session = useVoiceSession();

  if (!config.provider.capabilities.realtimeVoice) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="max-w-md text-center text-sm text-muted">
          La conversation vocale n&apos;est pas disponible avec {config.provider.label}. Elle
          requiert un fournisseur exposant une API audio temps réel.
        </p>
      </div>
    );
  }

  const active = session.status === 'listening';
  const connecting = session.status === 'connecting';

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-ink">Échange vocal</h2>
              <p className="mt-1 max-w-lg text-sm text-muted">
                Dictez pendant la consultation. La transcription des deux voix s&apos;affiche au fil
                de l&apos;échange et chaque réponse peut devenir une fiche.
              </p>
            </div>

            <Button
              variant={active ? 'secondary' : 'primary'}
              onClick={active || connecting ? session.stop : () => void session.start()}
              disabled={connecting}
            >
              {connecting ? (
                <Spinner className="size-4" />
              ) : active ? (
                <MicOff className="size-4" aria-hidden />
              ) : (
                <Mic className="size-4" aria-hidden />
              )}
              {connecting ? 'Connexion…' : active ? 'Terminer' : 'Démarrer la session'}
            </Button>
          </header>

          {active ? <LevelMeter level={session.level} /> : null}

          {session.error ? (
            <p role="alert" className="mb-4 text-[13px] text-caution-ink">
              {session.error}
            </p>
          ) : null}

          {session.exchanges.length === 0 && !active && !session.error ? (
            <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
              <Mic className="mx-auto size-8 text-subtle" aria-hidden />
              <p className="mt-3 text-sm text-muted">
                Aucun échange pour le moment. Un casque est recommandé pour éviter que le micro ne
                capte la réponse.
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {session.exchanges.map((exchange) => (
              <article
                key={exchange.id}
                className="animate-rise rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card"
              >
                {exchange.practitioner ? (
                  <p className="mb-2 border-l-2 border-line-strong pl-2.5 text-[13.5px] text-muted">
                    <span className="font-semibold text-ink">Vous — </span>
                    {exchange.practitioner}
                  </p>
                ) : null}
                {exchange.assistant ? (
                  <>
                    <p className="text-[14.5px] leading-relaxed">{exchange.assistant}</p>
                    <MessageActions
                      content={exchange.assistant}
                      onCreateFiche={() => onCreateFiche(exchange.assistant)}
                    />
                  </>
                ) : null}
              </article>
            ))}

            {session.speaking ? (
              <p className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-[14px] text-accent-ink italic">
                {session.speaking}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Indicateur de niveau micro — confirme que la captation fonctionne. */
function LevelMeter({ level }: { level: number }) {
  const bars = 24;
  const active = Math.min(bars, Math.round(level * 3.2 * bars));

  return (
    <div
      className="mb-5 flex h-8 items-end gap-[3px]"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(level * 100)}
      aria-label="Niveau du microphone"
    >
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          className={`w-1 rounded-full transition-all duration-100 ${
            index < active ? 'bg-accent' : 'bg-line'
          }`}
          style={{ height: `${index < active ? 28 - Math.abs(index - active) * 1.4 : 5}px` }}
        />
      ))}
    </div>
  );
}
