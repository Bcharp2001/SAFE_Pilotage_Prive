import { ALERT_PREFIX, LEGAL_NOTICE } from './prompt';

export interface FicheSection {
  title: string;
  body: string;
}

export interface Fiche {
  title: string;
  practitioner: string;
  practice: string;
  recipient: string;
  notes: string;
  /** Date ISO `AAAA-MM-JJ`. */
  date: string;
  sections: FicheSection[];
}

/**
 * Découpe une réponse Markdown en sections à partir des titres de niveau 2.
 *
 * Le modèle est instruit de produire `## 1. Demande reformulée`, etc. Cette
 * structure alimente la fiche imprimable, dont chaque section est composée
 * séparément — au lieu du bloc de texte unique de la version d'origine.
 *
 * Si aucun titre n'est présent (réponse courte, question factuelle), tout le
 * contenu est retourné dans une section unique sans titre.
 */
export function parseSections(markdown: string): FicheSection[] {
  const lines = markdown.split('\n');
  const sections: FicheSection[] = [];
  let current: FicheSection | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const heading = /^##\s+(?:\d+[.)]\s*)?(.+?)\s*$/.exec(line);
    if (heading?.[1]) {
      if (current) sections.push(finalize(current));
      current = { title: heading[1], body: '' };
      continue;
    }
    if (current) {
      current.body += `${line}\n`;
    } else {
      preamble.push(line);
    }
  }
  if (current) sections.push(finalize(current));

  // Le préambule contient l'éventuelle ligne d'alerte médicale : elle doit
  // apparaître en tête de fiche, avant toute préconisation.
  const intro = preamble.join('\n').trim();
  if (intro) {
    sections.unshift({ title: '', body: intro });
  }

  return sections.filter((section) => section.title || section.body);
}

function finalize(section: FicheSection): FicheSection {
  return { title: section.title, body: section.body.trim() };
}

/** Détecte la ligne d'orientation médicale émise par le modèle. */
export function extractMedicalAlert(markdown: string): string | null {
  for (const line of markdown.split('\n')) {
    const index = line.indexOf(ALERT_PREFIX);
    if (index === -1) continue;
    const alert = line
      .slice(index + ALERT_PREFIX.length)
      .replace(/^[\s—–-]+/, '')
      .trim();
    if (alert) return alert;
  }
  return null;
}

/**
 * Retire la ligne d'alerte du corps Markdown.
 *
 * L'alerte est présentée dans son propre encadré, en tête de fiche. Sans ce
 * filtrage elle apparaîtrait deux fois : une fois dans l'encadré, une fois
 * dans la citation Markdown d'origine.
 */
export function stripAlertLine(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !line.includes(ALERT_PREFIX))
    .join('\n')
    .replace(/^\s*\n+/, '');
}

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Formate `2026-08-18` en `18 août 2026`, sans dépendre du fuseau serveur. */
export function formatFrenchDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const monthName = MONTHS[Number(month) - 1];
  if (!year || !day || !monthName) return isoDate;
  return `${Number(day)} ${monthName} ${year}`;
}

/** Retire les marques Markdown pour les exports en texte brut. */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/** Rendu texte brut, utilisé pour le presse-papiers et l'export `.txt`. */
export function ficheToPlainText(fiche: Fiche): string {
  const header = [
    fiche.title,
    fiche.practice && fiche.practice,
    `Date : ${formatFrenchDate(fiche.date)}`,
    fiche.practitioner && `Praticien : ${fiche.practitioner}`,
    fiche.recipient && `Destinataire : ${fiche.recipient}`,
  ].filter(Boolean);

  const body = fiche.sections
    .map((section) =>
      section.title
        ? `${section.title.toUpperCase()}\n${stripMarkdown(section.body)}`
        : stripMarkdown(section.body),
    )
    .join('\n\n');

  const notes = fiche.notes.trim() ? `\n\nNotes du praticien :\n${fiche.notes.trim()}` : '';
  const rule = '─'.repeat(52);

  return `${header.join('\n')}\n${rule}\n\n${body}${notes}\n\n${rule}\n${LEGAL_NOTICE}\n`;
}

/** Nom de fichier sûr et lisible pour un export. */
export function ficheFilename(fiche: Fiche, extension: string): string {
  const slug = (fiche.recipient || 'fiche')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `conseils-${slug || 'fiche'}-${fiche.date}.${extension}`;
}
