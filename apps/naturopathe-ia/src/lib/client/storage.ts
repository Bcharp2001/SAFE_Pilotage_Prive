import type { Message } from './types';

const MESSAGES_KEY = 'nio-consultation';
const CONSENT_KEY = 'nio-consent';
const PRACTITIONER_KEY = 'nio-praticien';

/**
 * Persistance locale de la consultation courante.
 *
 * Deux principes :
 * - Rien ne quitte le navigateur. Aucune consultation n'est écrite côté
 *   serveur, ce qui écarte la question de l'hébergement de données de santé.
 * - Le contenu des pièces jointes n'est jamais enregistré, seulement leur nom.
 *   Un bilan sanguin n'a rien à faire dans le `localStorage`, et il ferait
 *   sauter le quota de 5 Mo au premier PDF.
 */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function loadMessages(): Message[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMessage);
  } catch {
    return [];
  }
}

export function saveMessages(messages: Message[]): void {
  if (!isBrowser()) return;
  try {
    const stripped = messages.map(({ ...message }) => ({
      ...message,
      attachments: message.attachments?.map(({ name, mimeType }) => ({ name, mimeType })),
    }));
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(stripped));
  } catch {
    // Quota atteint ou stockage désactivé : la session reste utilisable en
    // mémoire, seule la reprise après rechargement est perdue.
  }
}

export function clearMessages(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(MESSAGES_KEY);
  } catch {
    /* stockage indisponible */
  }
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<Message>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'number'
  );
}

export interface PractitionerIdentity {
  practitioner: string;
  practice: string;
}

export function loadPractitioner(): PractitionerIdentity {
  const empty = { practitioner: '', practice: '' };
  if (!isBrowser()) return empty;
  try {
    const raw = window.localStorage.getItem(PRACTITIONER_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PractitionerIdentity>;
    return {
      practitioner: typeof parsed.practitioner === 'string' ? parsed.practitioner : '',
      practice: typeof parsed.practice === 'string' ? parsed.practice : '',
    };
  } catch {
    return empty;
  }
}

export function savePractitioner(identity: PractitionerIdentity): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PRACTITIONER_KEY, JSON.stringify(identity));
  } catch {
    /* stockage indisponible */
  }
}

/** Le consentement est lié au fournisseur : changer de moteur le réinitialise. */
export function hasConsent(providerId: string): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === providerId;
  } catch {
    return false;
  }
}

export function grantConsent(providerId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CONSENT_KEY, providerId);
  } catch {
    /* stockage indisponible */
  }
}
