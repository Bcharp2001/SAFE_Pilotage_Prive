import { geminiProvider } from './gemini';
import { mistralProvider } from './mistral';
import { ProviderError, type LLMProvider, type ProviderInfo } from './types';

const PROVIDERS: Record<string, LLMProvider> = {
  gemini: geminiProvider,
  mistral: mistralProvider,
};

/**
 * Fournisseur actif, choisi par `AI_PROVIDER`.
 *
 * Résolu à chaque appel plutôt que mémorisé au chargement du module : sur
 * plateforme serverless une instance peut survivre à un changement de
 * configuration, et on préfère refléter la variable courante.
 */
export function getProvider(): LLMProvider {
  const id = (process.env.AI_PROVIDER ?? 'gemini').toLowerCase();
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new ProviderError(
      `Fournisseur « ${id} » inconnu. Valeurs acceptées : ${Object.keys(PROVIDERS).join(', ')}.`,
      500,
    );
  }
  return provider;
}

/** Métadonnées exposables au client — sans secret ni détail d'implémentation. */
export function getProviderInfo(): ProviderInfo {
  const { id, label, dataRegion, euProcessing, capabilities } = getProvider();
  return { id, label, dataRegion, euProcessing, capabilities };
}

export * from './types';
