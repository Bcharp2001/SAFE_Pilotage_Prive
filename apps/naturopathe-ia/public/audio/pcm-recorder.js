/**
 * Capture micro pour l'API temps réel.
 *
 * Remplace le `ScriptProcessorNode` de la version d'origine, déprécié et
 * exécuté sur le thread principal. Deux conséquences directes :
 *  - la conversion PCM ne bloque plus le rendu de l'interface ;
 *  - le nœud n'a pas besoin d'être relié à `destination`, ce qui supprime le
 *    retour du micro dans les haut-parleurs (effet Larsen sans casque).
 *
 * Émet des blocs Int16 little-endian à 16 kHz, accompagnés du niveau sonore
 * utilisé par l'indicateur visuel.
 */
class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.closed = false;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') this.closed = true;
    };
  }

  process(inputs) {
    if (this.closed) return false;

    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    const pcm = new Int16Array(channel.length);
    let sumOfSquares = 0;

    for (let i = 0; i < channel.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, channel[i]));
      sumOfSquares += sample * sample;
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    const level = Math.sqrt(sumOfSquares / channel.length);
    this.port.postMessage({ pcm: pcm.buffer, level }, [pcm.buffer]);
    return true;
  }
}

registerProcessor('pcm-recorder', PcmRecorderProcessor);
