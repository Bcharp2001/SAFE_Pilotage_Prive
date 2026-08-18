'use client';

import type { LiveServerMessage, Session } from '@google/genai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRealtimeToken } from '@/lib/client/api';
import {
  INPUT_SAMPLE_RATE,
  OUTPUT_SAMPLE_RATE,
  decodeBase64,
  encodeBase64,
  pcmToAudioBuffer,
} from '@/lib/client/audio';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'error';

export interface VoiceExchange {
  id: string;
  practitioner: string;
  assistant: string;
}

interface VoiceState {
  status: VoiceStatus;
  error: string | null;
  /** Niveau d'entrée micro, entre 0 et 1, pour l'indicateur visuel. */
  level: number;
  exchanges: VoiceExchange[];
  /** Transcription de la réponse en cours d'énonciation. */
  speaking: string;
}

const INITIAL: VoiceState = {
  status: 'idle',
  error: null,
  level: 0,
  exchanges: [],
  speaking: '',
};

/**
 * Session vocale temps réel.
 *
 * Le navigateur ne détient jamais la clé API : il demande au serveur un jeton
 * éphémère à usage unique, dont le périmètre est verrouillé côté serveur, puis
 * ouvre le WebSocket avec ce jeton.
 */
export function useVoiceSession() {
  const [state, setState] = useState<VoiceState>(INITIAL);

  const sessionRef = useRef<Session | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartRef = useRef(0);
  /** Évite qu'un `onclose` tardif ne rouvre le cycle de nettoyage. */
  const stoppingRef = useRef(false);

  const teardown = useCallback(() => {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        /* source déjà terminée */
      }
    }
    sourcesRef.current.clear();
    nextStartRef.current = 0;

    workletRef.current?.port.postMessage('stop');
    workletRef.current?.disconnect();
    workletRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    void inputContextRef.current?.close().catch(() => {});
    void outputContextRef.current?.close().catch(() => {});
    inputContextRef.current = null;
    outputContextRef.current = null;

    try {
      sessionRef.current?.close();
    } catch {
      /* session déjà fermée */
    }
    sessionRef.current = null;
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    teardown();
    setState((previous) => ({ ...INITIAL, exchanges: previous.exchanges }));
  }, [teardown]);

  // Le nettoyage doit aussi avoir lieu si le composant est démonté pendant une
  // session : sans cela le micro resterait actif.
  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    stoppingRef.current = false;
    setState({ ...INITIAL, status: 'connecting' });

    const fail = (message: string) => {
      teardown();
      setState({ ...INITIAL, status: 'error', error: message });
    };

    let credentials;
    try {
      credentials = await fetchRealtimeToken();
    } catch (error) {
      fail(error instanceof Error ? error.message : "Le jeton de session n'a pas pu être obtenu.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      fail(
        "L'accès au microphone a été refusé. Autorisez-le dans les réglages du navigateur, puis relancez la session.",
      );
      return;
    }
    streamRef.current = stream;

    // Le SDK n'est chargé qu'ici : il ne pèse pas sur le bundle initial des
    // praticiens qui n'utilisent jamais la dictée.
    const { GoogleGenAI, Modality } = await import('@google/genai');

    let currentPractitioner = '';
    let currentAssistant = '';

    try {
      const client = new GoogleGenAI({
        apiKey: credentials.token,
        httpOptions: { apiVersion: credentials.apiVersion },
      });

      const session = await client.live.connect({
        model: credentials.model,
        // L'instruction système et la voix sont verrouillées par le jeton :
        // ce que l'on passe ici ne peut pas élargir le périmètre accordé.
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => setState((previous) => ({ ...previous, status: 'listening' })),

          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (!content) return;

            const audio = content.modelTurn?.parts?.[0]?.inlineData?.data;
            const output = outputContextRef.current;
            if (audio && output) {
              const buffer = pcmToAudioBuffer(decodeBase64(audio), output);
              const source = output.createBufferSource();
              source.buffer = buffer;
              source.connect(output.destination);
              // Les blocs sont enchaînés bout à bout : les planifier au temps
              // courant produirait des chevauchements et un son haché.
              nextStartRef.current = Math.max(nextStartRef.current, output.currentTime);
              source.start(nextStartRef.current);
              nextStartRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
            }

            if (content.inputTranscription?.text) {
              currentPractitioner += content.inputTranscription.text;
            }
            if (content.outputTranscription?.text) {
              currentAssistant += content.outputTranscription.text;
              const speaking = currentAssistant;
              setState((previous) => ({ ...previous, speaking }));
            }

            if (content.interrupted) {
              for (const source of sourcesRef.current) {
                try {
                  source.stop();
                } catch {
                  /* source déjà terminée */
                }
              }
              sourcesRef.current.clear();
              nextStartRef.current = 0;
            }

            if (content.turnComplete) {
              const exchange: VoiceExchange = {
                id: `${Date.now()}-${sourcesRef.current.size}`,
                practitioner: currentPractitioner.trim(),
                assistant: currentAssistant.trim(),
              };
              currentPractitioner = '';
              currentAssistant = '';
              setState((previous) => ({
                ...previous,
                speaking: '',
                exchanges:
                  exchange.practitioner || exchange.assistant
                    ? [...previous.exchanges, exchange]
                    : previous.exchanges,
              }));
            }
          },

          onerror: () =>
            setState((previous) => ({
              ...previous,
              status: 'error',
              error: 'La connexion temps réel a été interrompue.',
            })),

          onclose: () => {
            if (stoppingRef.current) return;
            teardown();
            setState((previous) => ({ ...previous, status: 'idle', level: 0, speaking: '' }));
          },
        },
      });

      sessionRef.current = session;

      const inputContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      const outputContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      inputContextRef.current = inputContext;
      outputContextRef.current = outputContext;

      await inputContext.audioWorklet.addModule('/audio/pcm-recorder.js');
      const worklet = new AudioWorkletNode(inputContext, 'pcm-recorder');
      workletRef.current = worklet;

      worklet.port.onmessage = (event: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
        const { pcm, level } = event.data;
        setState((previous) =>
          Math.abs(previous.level - level) > 0.01 ? { ...previous, level } : previous,
        );
        try {
          session.sendRealtimeInput({
            media: {
              data: encodeBase64(new Uint8Array(pcm)),
              mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
            },
          });
        } catch {
          // Session fermée entre deux blocs : le `onclose` gère la reprise.
        }
      };

      // Le nœud n'est volontairement PAS relié à `destination` : le micro ne
      // doit pas être renvoyé vers les haut-parleurs.
      inputContext.createMediaStreamSource(stream).connect(worklet);
    } catch (error) {
      fail(
        error instanceof Error
          ? `La session vocale n'a pas pu démarrer : ${error.message}`
          : "La session vocale n'a pas pu démarrer.",
      );
    }
  }, [teardown]);

  return { ...state, start, stop };
}
