'use client';

import { AlertTriangle, Copy, Download, FileDown, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Markdown } from '@/components/Markdown';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError, downloadFichePdf, triggerDownload } from '@/lib/client/api';
import { loadPractitioner, savePractitioner } from '@/lib/client/storage';
import {
  extractMedicalAlert,
  ficheFilename,
  ficheToPlainText,
  formatFrenchDate,
  parseSections,
  stripAlertLine,
  type Fiche,
} from '@/lib/fiche';
import { LEGAL_NOTICE } from '@/lib/prompt';

interface FicheDialogProps {
  open: boolean;
  onClose: () => void;
  content: string;
  defaultTitle: string;
}

/** Date du jour au format ISO, dans le fuseau du praticien. */
function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

type Feedback = { kind: 'ok' | 'error'; message: string } | null;

export function FicheDialog({ open, onClose, content, defaultTitle }: FicheDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [practitioner, setPractitioner] = useState('');
  const [practice, setPractice] = useState('');
  const [recipient, setRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(todayISO);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // L'identité du praticien est saisie une fois puis mémorisée localement.
  // Le champ n'est jamais prérempli avec « NaturopatheIA » : une fiche remise
  // à une personne accompagnée ne peut pas être signée par un modèle.
  useEffect(() => {
    if (!open) return;
    const identity = loadPractitioner();
    setPractitioner(identity.practitioner);
    setPractice(identity.practice);
    setTitle(defaultTitle);
    setDate(todayISO());
    setFeedback(null);
  }, [open, defaultTitle]);

  const sections = useMemo(() => parseSections(content), [content]);
  const alert = useMemo(() => extractMedicalAlert(content), [content]);
  // L'alerte a son propre encadré : la laisser dans le corps la ferait
  // apparaître deux fois.
  const body = useMemo(() => (alert ? stripAlertLine(content) : content), [content, alert]);

  const fiche: Fiche = useMemo(
    () => ({ title, practitioner, practice, recipient, notes, date, sections }),
    [title, practitioner, practice, recipient, notes, date, sections],
  );

  const plainText = useMemo(() => ficheToPlainText(fiche), [fiche]);

  function persistIdentity() {
    savePractitioner({ practitioner, practice });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setFeedback({ kind: 'ok', message: 'Fiche copiée dans le presse-papiers.' });
    } catch {
      setFeedback({
        kind: 'error',
        message: "Le presse-papiers est inaccessible. Utilisez le téléchargement.",
      });
    }
  }

  function handleDownloadText() {
    persistIdentity();
    triggerDownload(
      new Blob([plainText], { type: 'text/plain;charset=utf-8' }),
      ficheFilename(fiche, 'txt'),
    );
  }

  async function handleDownloadPdf() {
    persistIdentity();
    setPending(true);
    setFeedback(null);
    try {
      await downloadFichePdf(fiche);
      setFeedback({ kind: 'ok', message: 'PDF téléchargé.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message:
          error instanceof ApiError ? error.message : "Le PDF n'a pas pu être composé.",
      });
    } finally {
      setPending(false);
    }
  }

  /**
   * Le corps d'un `mailto:` est plafonné par le système et par le client de
   * messagerie. Plutôt que de tronquer la fiche — ce que faisait la version
   * d'origine —, on ouvre un message court et on met le texte intégral dans le
   * presse-papiers, en le disant explicitement.
   */
  async function handleEmail() {
    persistIdentity();
    let copied = true;
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      copied = false;
    }

    const subject = encodeURIComponent(`${title} — ${formatFrenchDate(date)}`);
    const intro = [
      'Bonjour,',
      '',
      `Vous trouverez ci-dessous la fiche de conseils du ${formatFrenchDate(date)}.`,
      '',
      '[Collez ici la fiche — Ctrl+V / Cmd+V — ou joignez le PDF téléchargé.]',
      '',
      practitioner || practice || '',
    ].join('\n');

    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(intro)}`;
    setFeedback({
      kind: copied ? 'ok' : 'error',
      message: copied
        ? 'Message ouvert. La fiche complète est dans le presse-papiers, collez-la dans le corps du message.'
        : "Message ouvert, mais la copie automatique a échoué. Utilisez le bouton « Copier ».",
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Fiche de conseils"
      description="Personnalisez l'en-tête, puis exportez. Rien n'est enregistré sur le serveur."
      footer={
        <>
          {feedback ? (
            <p
              role="status"
              className={`mr-auto text-[12.5px] ${
                feedback.kind === 'ok' ? 'text-accent' : 'text-caution-ink'
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
          <Button size="sm" onClick={handleCopy}>
            <Copy className="size-3.5" aria-hidden />
            Copier
          </Button>
          <Button size="sm" onClick={handleEmail}>
            <Mail className="size-3.5" aria-hidden />
            E-mail
          </Button>
          <Button size="sm" onClick={handleDownloadText}>
            <Download className="size-3.5" aria-hidden />
            .txt
          </Button>
          <Button size="sm" variant="primary" onClick={handleDownloadPdf} disabled={pending}>
            {pending ? <Spinner className="size-3.5" /> : <FileDown className="size-3.5" aria-hidden />}
            Télécharger le PDF
          </Button>
        </>
      }
    >
      <div className="grid gap-4 border-b border-line bg-sunken px-5 py-4 sm:grid-cols-2">
        <Field label="Titre de la fiche" value={title} onChange={setTitle} />
        <Field
          label="Personne accompagnée"
          value={recipient}
          onChange={setRecipient}
          placeholder="Facultatif"
        />
        <Field
          label="Praticien"
          value={practitioner}
          onChange={setPractitioner}
          placeholder="Votre nom"
        />
        <Field
          label="Cabinet"
          value={practice}
          onChange={setPractice}
          placeholder="Nom du cabinet, adresse"
        />
        <Field label="Date" type="date" value={date} onChange={setDate} />
        <Field
          label="Note du praticien"
          value={notes}
          onChange={setNotes}
          placeholder="Ajoutée en encadré en fin de fiche"
        />
      </div>

      <div className="bg-surface px-5 py-6 sm:px-8">
        <article className="mx-auto max-w-2xl">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-accent pb-3">
            <div>
              <h3 className="font-serif text-xl font-semibold text-accent-ink">
                {title || 'Fiche de conseils'}
              </h3>
              {practice ? <p className="mt-0.5 text-xs text-muted">{practice}</p> : null}
            </div>
            <dl className="text-right text-[11.5px] leading-relaxed text-muted">
              <div>
                <dt className="inline font-semibold text-ink">Date : </dt>
                <dd className="inline">{formatFrenchDate(date)}</dd>
              </div>
              {practitioner ? (
                <div>
                  <dt className="inline font-semibold text-ink">Praticien : </dt>
                  <dd className="inline">{practitioner}</dd>
                </div>
              ) : null}
              {recipient ? (
                <div>
                  <dt className="inline font-semibold text-ink">Destinataire : </dt>
                  <dd className="inline">{recipient}</dd>
                </div>
              ) : null}
            </dl>
          </header>

          {alert ? (
            <div className="mb-5 flex gap-2.5 border-l-[3px] border-caution bg-caution-soft px-3.5 py-2.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
              <div>
                <p className="text-[11px] font-bold tracking-wide text-caution-ink uppercase">
                  Orientation médicale recommandée
                </p>
                <p className="mt-0.5 text-[13px] text-caution-ink">{alert}</p>
              </div>
            </div>
          ) : null}

          <Markdown>{body}</Markdown>

          {notes.trim() ? (
            <div className="mt-6 border border-note/40 bg-note-soft px-4 py-3">
              <p className="text-[11px] font-bold tracking-wide text-note uppercase">
                Notes du praticien
              </p>
              <p className="mt-1 text-[13px] whitespace-pre-wrap">{notes.trim()}</p>
            </div>
          ) : null}

          <p className="mt-8 border-t border-line pt-3 text-[11px] leading-relaxed text-subtle">
            {LEGAL_NOTICE}
          </p>
        </article>
      </div>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-line bg-surface px-2.5 text-sm text-ink transition-colors placeholder:text-subtle focus:border-accent focus:outline-none"
      />
    </label>
  );
}
