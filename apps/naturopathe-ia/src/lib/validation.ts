import { z } from 'zod';

/** Types de fichiers acceptés par l'application, avant adaptation au modèle. */
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
] as const;

/** Taille maximale d'une pièce jointe, avant encodage base64. */
export const MAX_FILE_BYTES = 12 * 1024 * 1024;
export const MAX_FILES = 3;
export const MAX_MESSAGE_CHARS = 8_000;
export const MAX_HISTORY_TURNS = 40;

/** Marge de sécurité : le base64 pèse ~4/3 de la source. */
const MAX_BASE64_CHARS = Math.ceil((MAX_FILE_BYTES * 4) / 3) + 1_024;

const documentSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.enum(ACCEPTED_MIME_TYPES),
  data: z
    .string()
    .min(1)
    .max(MAX_BASE64_CHARS, `Fichier trop volumineux (maximum ${MAX_FILE_BYTES / 1024 / 1024} Mo).`)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Encodage base64 invalide.'),
});

const turnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(50_000),
});

export const chatRequestSchema = z.object({
  message: z.string().min(1, 'Le message est vide.').max(MAX_MESSAGE_CHARS),
  history: z.array(turnSchema).max(MAX_HISTORY_TURNS).default([]),
  documents: z.array(documentSchema).max(MAX_FILES).default([]),
  deepReasoning: z.boolean().default(false),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;

export const searchRequestSchema = z.object({
  message: z.string().min(1, 'La requête est vide.').max(MAX_MESSAGE_CHARS),
});

const ficheSectionSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(50_000),
});

export const fichePdfSchema = z.object({
  title: z.string().min(1).max(200),
  practitioner: z.string().max(120).default(''),
  practice: z.string().max(160).default(''),
  recipient: z.string().max(120).default(''),
  notes: z.string().max(4_000).default(''),
  /** Date au format ISO, fournie par le client pour rester dans son fuseau. */
  date: z.iso.date(),
  sections: z.array(ficheSectionSchema).min(1).max(20),
});

export type FichePdfBody = z.infer<typeof fichePdfSchema>;

/** Première erreur de validation, formulée pour l'utilisateur final. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Requête invalide.';
  const path = issue.path.join('.');
  return path ? `${path} : ${issue.message}` : issue.message;
}
