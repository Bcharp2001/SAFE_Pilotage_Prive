'use client';

import { Globe, Lock, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { ProviderInfo } from '@/lib/client/types';

/**
 * Écran d'entrée en usage.
 *
 * Il énonce, avant toute utilisation, où les données sont traitées et ce que
 * l'application ne fait pas. Sur un outil qui reçoit des comptes rendus
 * médicaux, ce n'est pas une formalité : le praticien reste responsable du
 * traitement, il doit savoir ce qu'il déclenche en téléversant un document.
 */
export function ConsentDialog({
  provider,
  onAccept,
}: {
  provider: ProviderInfo;
  onAccept: () => void;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog
      open
      onClose={() => {}}
      size="md"
      title="Avant de commencer"
      description="Traitement des données et cadre d'usage"
      footer={
        <Button variant="primary" onClick={onAccept} disabled={!checked}>
          J&apos;ai compris, accéder à l&apos;outil
        </Button>
      }
    >
      <div className="space-y-4 px-5 py-5 text-[13.5px] leading-relaxed">
        <div
          className={`flex gap-3 rounded-lg border px-3.5 py-3 ${
            provider.euProcessing
              ? 'border-accent/30 bg-accent-soft'
              : 'border-caution/35 bg-caution-soft'
          }`}
        >
          {provider.euProcessing ? (
            <Lock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          ) : (
            <Globe className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
          )}
          <div>
            <p
              className={`font-semibold ${
                provider.euProcessing ? 'text-accent-ink' : 'text-caution-ink'
              }`}
            >
              Traitement : {provider.dataRegion}
            </p>
            <p className={provider.euProcessing ? 'text-accent-ink' : 'text-caution-ink'}>
              {provider.euProcessing
                ? `Le contenu que vous soumettez est traité par ${provider.label} au sein de l'Union européenne.`
                : `Le contenu que vous soumettez est transmis à ${provider.label} et traité hors de l'Union européenne. Ne téléversez pas de document de santé identifiant sans avoir vérifié votre cadre contractuel et informé la personne concernée.`}
            </p>
          </div>
        </div>

        <ul className="space-y-2.5">
          <Point icon={<ShieldAlert className="size-4 text-accent" aria-hidden />}>
            <strong>Cet outil ne pose pas de diagnostic</strong> et ne produit pas d&apos;ordonnance.
            Il assiste un conseil en hygiène de vie. Vous restez seul responsable de ce que vous
            remettez à la personne accompagnée.
          </Point>
          <Point icon={<Lock className="size-4 text-accent" aria-hidden />}>
            <strong>Aucune consultation n&apos;est enregistrée sur le serveur.</strong> Les échanges
            restent dans votre navigateur et les documents transitent sans être stockés ni
            journalisés.
          </Point>
          <Point icon={<Globe className="size-4 text-accent" aria-hidden />}>
            <strong>Minimisez les données.</strong> Anonymisez les documents avant de les
            téléverser : les nom, date de naissance et numéro de sécurité sociale ne servent pas à
            l&apos;analyse.
          </Point>
        </ul>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-sunken px-3.5 py-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            Je suis un praticien, j&apos;ai pris connaissance du lieu de traitement des données et
            je m&apos;engage à minimiser les informations que je transmets.
          </span>
        </label>
      </div>
    </Dialog>
  );
}

function Point({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="text-muted">{children}</span>
    </li>
  );
}
