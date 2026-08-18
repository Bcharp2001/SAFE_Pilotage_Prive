import { readStreamEvents, type StreamEvent } from '@/lib/stream';

import type { AppConfig } from './types';

/** Erreur portant un message déjà rédigé pour l'utilisateur. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = `Le serveur a répondu ${response.status}.`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) message = body.error;
  } catch {
    // Réponse non JSON : on conserve le message générique.
  }
  return new ApiError(message, response.status);
}

/**
 * Ouvre un flux SSE vers une route de génération.
 *
 * Les erreurs survenues avant le premier octet arrivent en JSON avec un code
 * HTTP ; celles survenues pendant le flux arrivent comme événement `error`.
 * Les deux cas sont traités par l'appelant de la même façon.
 */
export async function* streamGeneration(
  path: string,
  body: unknown,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) throw await toApiError(response);
  yield* readStreamEvents(response, signal);
}

export async function fetchConfig(signal?: AbortSignal): Promise<AppConfig> {
  const response = await fetch('/api/config', { signal });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as AppConfig;
}

export interface RealtimeCredentialsResponse {
  token: string;
  model: string;
  expiresAt: string;
  apiVersion: string;
}

export async function fetchRealtimeToken(
  signal?: AbortSignal,
): Promise<RealtimeCredentialsResponse> {
  const response = await fetch('/api/realtime/token', { method: 'POST', signal });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as RealtimeCredentialsResponse;
}

/** Demande la composition du PDF et déclenche le téléchargement. */
export async function downloadFichePdf(payload: unknown): Promise<void> {
  const response = await fetch('/api/fiche/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw await toApiError(response);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'fiche-conseils.pdf';
  const blob = await response.blob();
  triggerDownload(blob, filename);
}

/** Déclenche un téléchargement et libère l'URL objet — jamais laissée fuir. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
