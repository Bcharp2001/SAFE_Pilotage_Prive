'use client';

import { Check, Copy, FileText } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { stripMarkdown } from '@/lib/fiche';

export function MessageActions({
  content,
  onCreateFiche,
}: {
  content: string;
  onCreateFiche: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(stripMarkdown(content));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      /* presse-papiers indisponible : le bouton de fiche reste utilisable */
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
      <Button size="sm" variant="ghost" onClick={copy} aria-label="Copier la réponse">
        {copied ? (
          <Check className="size-3.5 text-accent" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? 'Copié' : 'Copier'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCreateFiche}>
        <FileText className="size-3.5" aria-hidden />
        Mettre en fiche
      </Button>
    </div>
  );
}
