import type { Citation, ProviderInfo } from '@/lib/ai/types';

export type { Citation, ProviderInfo };

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  /** Base64 sans préfixe `data:`. Jamais écrit dans le stockage local. */
  data: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Conservé sous forme de noms seuls une fois la consultation enregistrée. */
  attachments?: { name: string; mimeType: string }[];
  citations?: Citation[];
  /** Message d'erreur affiché à la place ou à la suite du contenu. */
  error?: string;
  createdAt: number;
}

export interface AppConfig {
  provider: ProviderInfo;
  limits: {
    acceptedMimeTypes: string[];
    maxFiles: number;
    maxFileBytes: number;
  };
}

export type PanelId = 'consultation' | 'recherche' | 'vocal';
