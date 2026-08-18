import { renderToBuffer } from '@react-pdf/renderer';
import { extractText } from 'unpdf';
import { describe, expect, it } from 'vitest';

import { parseSections, type Fiche } from '@/lib/fiche';
import { FicheDocument } from '@/lib/pdf/FicheDocument';

const MARKDOWN = `> ⚠️ ALERTE MÉDICALE — Perte de poids inexpliquée, orientation médicale requise.

## 1. Demande reformulée
Fatigue matinale et **digestion lente**.

## 3. Protocole de plantes
- Chardon-Marie (*Silybum marianum*), EPS, 5 ml le matin.
- Romarin (*Rosmarinus officinalis*), infusion après le repas.`;

const FICHE: Fiche = {
  title: 'Fiche de conseils naturopathiques',
  practitioner: 'Camille Roy',
  practice: 'Cabinet des Tilleuls',
  recipient: 'Marie Dupont',
  notes: 'Réévaluation dans trois semaines.',
  date: '2026-08-18',
  sections: parseSections(MARKDOWN),
};

async function renderText(fiche: Fiche, alert: string | null): Promise<string> {
  const buffer = await renderToBuffer(FicheDocument({ fiche, alert }));
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
  return text;
}

describe('FicheDocument', () => {
  it("compose un PDF contenant l'en-tête, les sections et les notes", async () => {
    const text = await renderText(FICHE, 'Perte de poids inexpliquée, orientation médicale requise.');

    expect(text).toContain('Fiche de conseils naturopathiques');
    expect(text).toContain('Cabinet des Tilleuls');
    // Les accents doivent survivre à l'encodage WinAnsi des polices standard.
    expect(text).toContain('18 août 2026');
    expect(text).toContain('Praticien : Camille Roy');
    expect(text).toContain('PROTOCOLE DE PLANTES');
    expect(text).toContain('Chardon-Marie');
    expect(text).toContain('Réévaluation dans trois semaines.');
  });

  it("porte la mention légale et la pagination sur chaque page", async () => {
    const text = await renderText(FICHE, null);

    expect(text).toContain('ne constitue ni une ordonnance');
    expect(text).toContain("n'est pas un professionnel de santé");
    expect(text).toMatch(/\d+ \/ \d+/);
  });

  it("affiche l'encadré d'orientation médicale quand une alerte est présente", async () => {
    const withAlert = await renderText(FICHE, 'Orientation vers le médecin traitant.');
    const without = await renderText(FICHE, null);

    expect(withAlert).toContain('ORIENTATION MÉDICALE RECOMMANDÉE');
    expect(without).not.toContain('ORIENTATION MÉDICALE RECOMMANDÉE');
  });

  it("n'écrit aucune marque Markdown dans le document remis", async () => {
    const text = await renderText(FICHE, null);

    expect(text).not.toContain('**');
    expect(text).not.toContain('##');
    expect(text).not.toContain('*Silybum');
  });

  it("répète l'en-tête et le pied de page sur un document multipage", async () => {
    const long: Fiche = {
      ...FICHE,
      sections: Array.from({ length: 40 }, (_, index) => ({
        title: `Section ${index + 1}`,
        body: 'Contenu de remplissage destiné à provoquer un saut de page. '.repeat(6),
      })),
    };

    const buffer = await renderToBuffer(FicheDocument({ fiche: long, alert: null }));
    const { text, totalPages } = await extractText(new Uint8Array(buffer), { mergePages: false });

    expect(totalPages).toBeGreaterThan(1);
    for (const page of text) {
      expect(page).toContain('Fiche de conseils naturopathiques');
      expect(page).toContain('ne constitue ni une ordonnance');
    }
  });
});
