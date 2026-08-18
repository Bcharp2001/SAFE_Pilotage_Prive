'use client';

import {
  Globe,
  Leaf,
  Lock,
  MessagesSquare,
  Mic,
  Monitor,
  Moon,
  Search,
  Sun,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConsentDialog } from '@/components/ConsentDialog';
import { ConsultationPanel } from '@/components/ConsultationPanel';
import { FicheDialog } from '@/components/FicheDialog';
import { SearchPanel } from '@/components/SearchPanel';
import { VoicePanel } from '@/components/VoicePanel';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { fetchConfig } from '@/lib/client/api';
import {
  clearMessages,
  grantConsent,
  hasConsent,
  loadMessages,
  saveMessages,
} from '@/lib/client/storage';
import type { AppConfig, Message, PanelId } from '@/lib/client/types';

const PANELS: { id: PanelId; label: string; icon: typeof Leaf }[] = [
  { id: 'consultation', label: 'Consultation', icon: MessagesSquare },
  { id: 'recherche', label: 'Recherche sourcée', icon: Search },
  { id: 'vocal', label: 'Échange vocal', icon: Mic },
];

type Theme = 'light' | 'dark' | 'system';

export function AppShell() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId>('consultation');
  const [consented, setConsented] = useState(true);
  const [theme, setTheme] = useState<Theme>('system');

  // L'état de la consultation vit ici, pas dans le panneau : changer d'onglet
  // ne détruit plus l'historique — c'était l'un des défauts de la version
  // d'origine, sans le moindre avertissement pour l'utilisateur.
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [ficheContent, setFicheContent] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchConfig(controller.signal)
      .then((loaded) => {
        setConfig(loaded);
        setConsented(hasConsent(loaded.provider.id));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setConfigError(
          error instanceof Error
            ? error.message
            : "La configuration du serveur n'a pas pu être chargée.",
        );
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setMessages(loadMessages());
    const stored = window.localStorage.getItem('nio-theme');
    setTheme(stored === 'dark' || stored === 'light' ? stored : 'system');
    setHydrated(true);
  }, []);

  // Écrit après hydratation seulement : sinon le premier rendu, où `messages`
  // est encore vide, écraserait la consultation enregistrée.
  useEffect(() => {
    if (hydrated) saveMessages(messages);
  }, [messages, hydrated]);

  const applyTheme = useCallback((next: Theme) => {
    setTheme(next);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (next === 'system') {
      window.localStorage.removeItem('nio-theme');
    } else {
      root.classList.add(next);
      window.localStorage.setItem('nio-theme', next);
    }
  }, []);

  function resetConsultation() {
    setMessages([]);
    clearMessages();
    setPanel('consultation');
  }

  if (configError) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-lg text-ink">Configuration indisponible</h1>
          <p className="mt-2 text-sm text-muted">{configError}</p>
          <p className="mt-3 text-[12.5px] text-subtle">
            Vérifiez que <code>AI_PROVIDER</code> et la clé correspondante sont définies dans
            l&apos;environnement du serveur.
          </p>
        </div>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6 text-accent" />
      </main>
    );
  }

  if (!consented) {
    return (
      <ConsentDialog
        provider={config.provider}
        onAccept={() => {
          grantConsent(config.provider.id);
          setConsented(true);
        }}
      />
    );
  }

  const openFiche = (content: string) => setFicheContent(content);

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <Leaf className="size-5 text-accent" aria-hidden />
          <h1 className="font-serif text-[15px] font-semibold tracking-tight text-ink">
            NaturopatheIA
          </h1>
        </div>

        <nav aria-label="Sections" className="ml-2 flex items-center gap-0.5">
          {PANELS.map((item) => {
            const Icon = item.icon;
            const current = panel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPanel(item.id)}
                aria-current={current ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  current
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted hover:bg-sunken hover:text-ink'
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ProviderBadge
            label={config.provider.label}
            region={config.provider.dataRegion}
            euProcessing={config.provider.euProcessing}
          />

          {messages.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetConsultation}
              title="Effacer la consultation enregistrée dans ce navigateur"
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="hidden md:inline">Nouvelle consultation</span>
            </Button>
          ) : null}

          <ThemeToggle theme={theme} onChange={applyTheme} />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {panel === 'consultation' ? (
          <ConsultationPanel
            config={config}
            messages={messages}
            setMessages={setMessages}
            onCreateFiche={openFiche}
          />
        ) : null}
        {panel === 'recherche' ? <SearchPanel config={config} onCreateFiche={openFiche} /> : null}
        {panel === 'vocal' ? <VoicePanel config={config} onCreateFiche={openFiche} /> : null}
      </main>

      <FicheDialog
        open={ficheContent !== null}
        onClose={() => setFicheContent(null)}
        content={ficheContent ?? ''}
        defaultTitle="Fiche de conseils naturopathiques"
      />
    </div>
  );
}

function ProviderBadge({
  label,
  region,
  euProcessing,
}: {
  label: string;
  region: string;
  euProcessing: boolean;
}) {
  return (
    <span
      title={`Traitement des données : ${region}`}
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium lg:inline-flex ${
        euProcessing
          ? 'border-accent/30 bg-accent-soft text-accent-ink'
          : 'border-caution/35 bg-caution-soft text-caution-ink'
      }`}
    >
      {euProcessing ? (
        <Lock className="size-3" aria-hidden />
      ) : (
        <Globe className="size-3" aria-hidden />
      )}
      {label}
      <span className="opacity-70">· {euProcessing ? 'UE' : 'hors UE'}</span>
    </span>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Thème clair' },
    { value: 'dark', icon: Moon, label: 'Thème sombre' },
    { value: 'system', icon: Monitor, label: 'Thème système' },
  ];

  return (
    <div
      role="group"
      aria-label="Thème"
      className="flex items-center gap-0.5 rounded-md border border-line p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={theme === option.value}
            className={`rounded p-1 transition-colors ${
              theme === option.value
                ? 'bg-accent-soft text-accent-ink'
                : 'text-subtle hover:text-ink'
            }`}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
