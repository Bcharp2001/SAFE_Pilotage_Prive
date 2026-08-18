/** Fréquences imposées par l'API temps réel Gemini. */
export const INPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_SAMPLE_RATE = 24_000;

export function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  // Par blocs : `String.fromCharCode(...bytes)` dépasse la taille de pile
  // autorisée au-delà de quelques dizaines de milliers d'échantillons.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convertit un bloc PCM 16 bits mono en `AudioBuffer`.
 *
 * `new Int16Array(bytes.buffer)` serait faux si la vue ne commençait pas à
 * l'offset zéro ou si la longueur était impaire : on passe explicitement
 * l'offset et le nombre d'échantillons.
 */
export function pcmToAudioBuffer(bytes: Uint8Array, context: AudioContext): AudioBuffer {
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);

  const buffer = context.createBuffer(1, Math.max(sampleCount, 1), OUTPUT_SAMPLE_RATE);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i += 1) {
    channel[i] = (samples[i] ?? 0) / 32_768;
  }
  return buffer;
}
