'use client';

import { AlertTriangle, Brain, Leaf, Paperclip, Send, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { Markdown } from '@/components/Markdown';
import { MessageActions } from '@/components/MessageActions';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError, streamGeneration } from '@/lib/client/api';
import type { AppConfig, Attachment, Message } from '@/lib/client/types';
import { extractMedicalAlert } from '@/lib/fiche';

const SUGGESTIONS = [
  'Terrain inflammatoire chronique chez une femme de 45 ans, fatigue matinale et digestion lente.',
  'Analyse ce bilan sanguin et propose un accompagnement du terrain.',
  'Protocole de soutien du sommeil pour un profil stressé, sans interaction avec un ISRS.',
];

interface ConsultationPanelProps {
  config: AppConfig;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  onCreateFiche: (content: string) => void;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Lecture du fichier impossible.'));
        return;
      }
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} Ko`
    : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function ConsultationPanel({
  config,
  messages,
  setMessages,
  onCreateFiche,
}: ConsultationPanelProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [deepReasoning, setDeepReasoning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** L'auto-défilement est suspendu dès que le praticien remonte le fil. */
  const stickToBottom = useRef(true);

  useEffect(() => {
    if (stickToBottom.current) {
      endRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function onScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottom.current = distance < 80;
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);

    const accepted: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (attachments.length + accepted.length >= config.limits.maxFiles) {
        setUploadError(`${config.limits.maxFiles} documents au maximum par message.`);
        break;
      }
      if (!config.limits.acceptedMimeTypes.includes(file.type)) {
        setUploadError(`« ${file.name} » : format non pris en charge par ${config.provider.label}.`);
        continue;
      }
      if (file.size > config.limits.maxFileBytes) {
        setUploadError(
          `« ${file.name} » dépasse ${formatSize(config.limits.maxFileBytes)}.`,
        );
        continue;
      }
      try {
        accepted.push({
          id: newId(),
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: await fileToBase64(file),
        });
      } catch {
        setUploadError(`« ${file.name} » n'a pas pu être lu.`);
      }
    }

    if (accepted.length) setAttachments((previous) => [...previous, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  async function send() {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || busy) return;

    const message = trimmed || 'Analyse le ou les documents joints.';
    const sent = attachments;
    const userMessage: Message = {
      id: newId(),
      role: 'user',
      content: message,
      attachments: sent.map(({ name, mimeType }) => ({ name, mimeType })),
      createdAt: Date.now(),
    };
    const assistantId = newId();

    // L'historique envoyé exclut les tours en erreur : ils ne représentent
    // rien que le modèle puisse reprendre.
    const history = messages
      .filter((entry) => entry.content.trim() && !entry.error)
      .map((entry) => ({ role: entry.role, content: entry.content }));

    setMessages((previous) => [
      ...previous,
      userMessage,
      { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() },
    ]);
    setInput('');
    setAttachments([]);
    setUploadError(null);
    setBusy(true);
    stickToBottom.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    const patch = (update: Partial<Message>) =>
      setMessages((previous) =>
        previous.map((entry) => (entry.id === assistantId ? { ...entry, ...update } : entry)),
      );

    try {
      let content = '';
      for await (const event of streamGeneration(
        '/api/chat',
        {
          message,
          history,
          documents: sent.map(({ name, mimeType, data }) => ({ name, mimeType, data })),
          deepReasoning,
        },
        controller.signal,
      )) {
        if (event.type === 'text') {
          content += event.value;
          patch({ content });
        } else if (event.type === 'citations') {
          patch({ citations: event.value });
        } else if (event.type === 'error') {
          patch({ error: event.message });
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        patch({ error: 'Génération interrompue.' });
      } else {
        patch({
          error:
            error instanceof ApiError
              ? error.message
              : "La réponse n'a pas pu être obtenue. Vérifiez la connexion.",
        });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8"
      >
        <div className="mx-auto max-w-3xl space-y-5">
          {empty ? (
            <div className="py-10 text-center">
              <Leaf className="mx-auto size-9 text-accent" aria-hidden />
              <h2 className="mt-3 font-serif text-xl text-ink">Nouvelle consultation</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
                Décrivez un terrain, posez une question, ou joignez un compte rendu. Chaque réponse
                peut être transformée en fiche de conseils imprimable.
              </p>
              <div className="mx-auto mt-6 grid max-w-xl gap-2 text-left">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-left text-[13px] text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-sm bg-accent px-4 py-2.5 text-[14.5px] leading-relaxed text-accent-contrast">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.attachments?.length ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5 border-t border-current/25 pt-2">
                      {message.attachments.map((file) => (
                        <li
                          key={file.name}
                          className="flex items-center gap-1 rounded bg-current/12 px-1.5 py-0.5 text-[11.5px]"
                        >
                          <Paperclip className="size-3" aria-hidden />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                streaming={busy && !message.content && !message.error}
                onCreateFiche={() => onCreateFiche(message.content)}
              />
            ),
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-3xl">
          {uploadError ? (
            <p role="alert" className="mb-2 text-[12.5px] text-caution-ink">
              {uploadError}
            </p>
          ) : null}

          {attachments.length ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-1.5 rounded-md border border-line bg-sunken py-1 pr-1 pl-2 text-[12px] text-muted"
                >
                  <Paperclip className="size-3 text-accent" aria-hidden />
                  <span className="max-w-[16rem] truncate text-ink">{file.name}</span>
                  <span className="text-subtle">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((previous) => previous.filter((item) => item.id !== file.id))
                    }
                    aria-label={`Retirer ${file.name}`}
                    className="rounded p-0.5 text-subtle transition-colors hover:bg-line hover:text-ink"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-accent">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              accept={config.limits.acceptedMimeTypes.join(',')}
              onChange={(event) => void addFiles(event.target.files)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || attachments.length >= config.limits.maxFiles}
              aria-label="Joindre un document"
              title={`Joindre un document (${config.limits.acceptedMimeTypes
                .map((type) => type.split('/')[1])
                .join(', ')})`}
            >
              <Paperclip className="size-4" aria-hidden />
            </Button>

            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(event) => {
                setInput(event.target.value);
                const element = event.target;
                element.style.height = 'auto';
                element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Décrivez le terrain, ou posez votre question…"
              aria-label="Message"
              className="max-h-[200px] min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-relaxed text-ink placeholder:text-subtle focus:outline-none"
            />

            {busy ? (
              <Button variant="secondary" size="sm" onClick={stop} aria-label="Interrompre">
                <Square className="size-3.5 fill-current" aria-hidden />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => void send()}
                disabled={!input.trim() && attachments.length === 0}
                aria-label="Envoyer"
              >
                <Send className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-subtle">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={deepReasoning}
                onChange={(event) => setDeepReasoning(event.target.checked)}
                className="size-3.5 accent-[var(--accent)]"
              />
              <Brain className="size-3.5" aria-hidden />
              Analyse approfondie
              <span className="text-subtle">— plus lent, pour les bilans complexes</span>
            </label>
            <span>Entrée pour envoyer · Maj+Entrée pour un retour à la ligne</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  streaming,
  onCreateFiche,
}: {
  message: Message;
  streaming: boolean;
  onCreateFiche: () => void;
}) {
  const alert = message.content ? extractMedicalAlert(message.content) : null;

  return (
    <div className="animate-rise rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card sm:px-5">
      {alert ? (
        <div className="mb-3 flex items-start gap-2 rounded-md border-l-[3px] border-caution bg-caution-soft px-3 py-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
          <p className="text-[13px] text-caution-ink">
            <strong className="font-semibold">Orientation médicale — </strong>
            {alert}
          </p>
        </div>
      ) : null}

      {streaming ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="size-3.5" />
          Analyse en cours…
        </p>
      ) : null}

      {message.content ? <Markdown>{message.content}</Markdown> : null}

      {message.citations?.length ? (
        <div className="mt-4 border-t border-line pt-2.5">
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
            Sources
          </p>
          <ol className="space-y-0.5 text-[12.5px]">
            {message.citations.map((citation, index) => (
              <li key={citation.uri} className="flex gap-1.5">
                <span className="text-subtle">{index + 1}.</span>
                <a
                  href={citation.uri}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-accent underline decoration-line-strong underline-offset-2 hover:decoration-accent"
                >
                  {citation.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {message.error ? (
        <p role="alert" className="mt-2 text-[13px] text-caution-ink">
          {message.error}
        </p>
      ) : null}

      {message.content && !streaming ? (
        <MessageActions content={message.content} onCreateFiche={onCreateFiche} />
      ) : null}
    </div>
  );
}
