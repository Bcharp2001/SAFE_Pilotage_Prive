'use client';

import { Search, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Markdown } from '@/components/Markdown';
import { MessageActions } from '@/components/MessageActions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError, streamGeneration } from '@/lib/client/api';
import type { AppConfig, Citation } from '@/lib/client/types';

interface SearchPanelProps {
  config: AppConfig;
  onCreateFiche: (content: string) => void;
}

export function SearchPanel({ config, onCreateFiche }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!config.provider.capabilities.webSearch) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="max-w-md text-center text-sm text-muted">
          La recherche sourcée n&apos;est pas disponible avec {config.provider.label}. Basculez sur
          un fournisseur qui expose un outil de recherche web pour activer cet onglet.
        </p>
      </div>
    );
  }

  async function run() {
    const trimmed = query.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setAnswer('');
    setCitations([]);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let content = '';
      for await (const event of streamGeneration(
        '/api/search',
        { message: trimmed },
        controller.signal,
      )) {
        if (event.type === 'text') {
          content += event.value;
          setAnswer(content);
        } else if (event.type === 'citations') {
          setCitations(event.value);
        } else if (event.type === 'error') {
          setError(event.message);
        }
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof ApiError ? caught.message : "La recherche n'a pas pu aboutir.",
        );
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
          <h2 className="font-serif text-xl text-ink">Recherche sourcée</h2>
          <p className="mt-1 text-sm text-muted">
            Interroge des sources à jour et cite ses références. Utile pour une monographie, une
            interaction médicamenteuse ou une publication récente.
          </p>
        </header>

        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-accent">
          <Search className="ml-1.5 size-4 shrink-0 text-subtle" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) void run();
            }}
            placeholder="Interactions du millepertuis avec les antidépresseurs…"
            aria-label="Requête de recherche"
            className="h-8 flex-1 bg-transparent text-[14.5px] text-ink placeholder:text-subtle focus:outline-none"
          />
          {busy ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => abortRef.current?.abort()}
              aria-label="Interrompre"
            >
              <Square className="size-3.5 fill-current" aria-hidden />
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => void run()} disabled={!query.trim()}>
              Rechercher
            </Button>
          )}
        </div>

        {busy && !answer ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <Spinner className="size-3.5" />
            Consultation des sources…
          </p>
        ) : null}

        {answer ? (
          <article className="animate-rise mt-5 rounded-xl border border-line bg-surface px-4 py-4 shadow-card sm:px-5">
            <Markdown>{answer}</Markdown>

            {citations.length ? (
              <div className="mt-4 border-t border-line pt-2.5">
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Sources
                </p>
                <ol className="space-y-0.5 text-[12.5px]">
                  {citations.map((citation, index) => (
                    <li key={citation.uri} className="flex gap-1.5">
                      <span className="text-subtle">{index + 1}.</span>
                      <a
                        href={citation.uri}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
                      >
                        {citation.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {!busy ? (
              <MessageActions content={answer} onCreateFiche={() => onCreateFiche(answer)} />
            ) : null}
          </article>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-[13px] text-caution-ink">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
