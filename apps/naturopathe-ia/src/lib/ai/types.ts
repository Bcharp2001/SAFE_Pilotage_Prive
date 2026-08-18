/**
 * Contrat commun à tous les fournisseurs de modèle.
 *
 * L'application ne connaît que cette interface : basculer de Gemini vers un
 * modèle européen se fait par la variable d'environnement `AI_PROVIDER`, sans
 * toucher aux routes API ni à l'interface.
 */

export type ChatRole = 'user' | 'assistant';

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

/** Pièce jointe déjà validée et normalisée par la route API. */
export interface DocumentPart {
  name: string;
  mimeType: string;
  /** Contenu encodé en base64, sans le préfixe `data:`. */
  data: string;
}

export interface Citation {
  uri: string;
  title: string;
}

/** Fragment émis par un flux de génération. */
export interface StreamChunk {
  /** Texte incrémental à concaténer. */
  text?: string;
  /** Sources, émises une seule fois en fin de flux. */
  citations?: Citation[];
}

export interface ChatRequest {
  system: string;
  history: ChatTurn[];
  message: string;
  documents?: DocumentPart[];
  /** Bascule vers le modèle de raisonnement, plus lent mais plus rigoureux. */
  deepReasoning?: boolean;
  signal?: AbortSignal;
}

export interface ProviderCapabilities {
  /** Types MIME que le modèle ingère nativement, sans extraction préalable. */
  nativeDocumentTypes: readonly string[];
  /** Recherche web sourcée disponible. */
  webSearch: boolean;
  /** Conversation vocale temps réel disponible. */
  realtimeVoice: boolean;
}

export interface ProviderInfo {
  id: string;
  label: string;
  /** Où les données sont traitées — affiché à l'utilisateur, sans détour. */
  dataRegion: string;
  /** `true` si le traitement a lieu dans l'Union européenne. */
  euProcessing: boolean;
  capabilities: ProviderCapabilities;
}

export interface LLMProvider extends ProviderInfo {
  streamChat(request: ChatRequest): AsyncIterable<StreamChunk>;
  /** Absent si `capabilities.webSearch` vaut `false`. */
  streamGroundedSearch?(request: ChatRequest): AsyncIterable<StreamChunk>;
  /**
   * Émet un jeton éphémère à usage unique pour la session vocale.
   * Absent si `capabilities.realtimeVoice` vaut `false`.
   */
  createRealtimeToken?(system: string): Promise<RealtimeCredentials>;
}

export interface RealtimeCredentials {
  token: string;
  model: string;
  expiresAt: string;
  apiVersion: string;
}

/** Erreur métier dont le message peut être affiché tel quel à l'utilisateur. */
export class ProviderError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}
