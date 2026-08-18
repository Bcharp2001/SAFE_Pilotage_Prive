'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Rendu Markdown des réponses du modèle.
 *
 * La version d'origine affichait le texte brut en `whitespace-pre-wrap` : les
 * astérisques et les dièses restaient visibles dans une fiche destinée à être
 * remise à un client.
 *
 * Mémoïsé : pendant le streaming le composant est re-rendu à chaque fragment.
 */
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-fiche">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: content }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {content}
            </a>
          ),
          // Les titres de niveau 1 émis par erreur sont ramenés au niveau 2 :
          // le titre de la page est déjà un h1.
          h1: ({ children: content }) => <h2>{content}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
});
