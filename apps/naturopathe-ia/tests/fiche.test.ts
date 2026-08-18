import { describe, expect, it } from 'vitest';

import {
  extractMedicalAlert,
  ficheFilename,
  ficheToPlainText,
  formatFrenchDate,
  parseSections,
  stripAlertLine,
  stripMarkdown,
  type Fiche,
} from '@/lib/fiche';

const PROTOCOL = `> ⚠️ ALERTE MÉDICALE — Perte de poids inexpliquée de 8 kg, orientation vers le médecin traitant.

## 1. Demande reformulée
Accompagnement d'un terrain fatigué.

## 2. Lecture du terrain
Signes de **charge hépatique**.

## 3. Protocole de plantes
- Chardon-Marie (*Silybum marianum*), graines, EPS, 5 ml matin.
- Romarin (*Rosmarinus officinalis*), sommités, infusion.

## 6. Précautions et interactions
Prudence avec les anticoagulants.`;

describe('parseSections', () => {
  it('découpe les titres numérotés et conserve le préambule en tête', () => {
    const sections = parseSections(PROTOCOL);

    expect(sections[0]?.title).toBe('');
    expect(sections[0]?.body).toContain('ALERTE MÉDICALE');
    expect(sections.map((section) => section.title)).toEqual([
      '',
      'Demande reformulée',
      'Lecture du terrain',
      'Protocole de plantes',
      'Précautions et interactions',
    ]);
  });

  it('conserve le corps de chaque section sans le titre', () => {
    const sections = parseSections(PROTOCOL);
    const plants = sections.find((section) => section.title === 'Protocole de plantes');

    expect(plants?.body).toContain('Chardon-Marie');
    expect(plants?.body).not.toContain('##');
  });

  it('retourne une section unique quand la réponse est libre', () => {
    const sections = parseSections('Une réponse courte, sans plan.');

    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual({ title: '', body: 'Une réponse courte, sans plan.' });
  });

  it('ne produit aucune section pour un contenu vide', () => {
    expect(parseSections('   \n  ')).toEqual([]);
  });
});

describe('extractMedicalAlert', () => {
  it("isole le motif d'orientation", () => {
    expect(extractMedicalAlert(PROTOCOL)).toBe(
      'Perte de poids inexpliquée de 8 kg, orientation vers le médecin traitant.',
    );
  });

  it('retourne null en absence de marqueur', () => {
    expect(extractMedicalAlert('## 1. Demande reformulée\nRien de particulier.')).toBeNull();
  });
});

describe('formatFrenchDate', () => {
  it('formate une date ISO en toutes lettres', () => {
    expect(formatFrenchDate('2026-08-18')).toBe('18 août 2026');
    expect(formatFrenchDate('2026-01-01')).toBe('1 janvier 2026');
  });

  it("laisse la valeur inchangée si elle n'est pas exploitable", () => {
    expect(formatFrenchDate('date-invalide')).toBe('date-invalide');
  });
});

describe('stripMarkdown', () => {
  it('retire les marques sans toucher au texte', () => {
    expect(stripMarkdown('**Gras** et *italique*')).toBe('Gras et italique');
    expect(stripMarkdown('- Premier point')).toBe('• Premier point');
    expect(stripMarkdown('## Titre')).toBe('Titre');
    expect(stripMarkdown('[Étude](https://exemple.fr)')).toBe('Étude');
  });
});

const FICHE: Fiche = {
  title: 'Fiche de conseils',
  practitioner: 'Camille Roy',
  practice: 'Cabinet des Tilleuls',
  recipient: 'Marie Dupont',
  notes: 'Revoir dans trois semaines.',
  date: '2026-08-18',
  sections: parseSections(PROTOCOL),
};

describe('ficheToPlainText', () => {
  it("compose un document lisible avec en-tête, corps et mention légale", () => {
    const text = ficheToPlainText(FICHE);

    expect(text).toContain('Cabinet des Tilleuls');
    expect(text).toContain('Praticien : Camille Roy');
    expect(text).toContain('Destinataire : Marie Dupont');
    expect(text).toContain('PROTOCOLE DE PLANTES');
    expect(text).toContain('• Chardon-Marie');
    expect(text).toContain('Notes du praticien');
    expect(text).toContain("ne constitue ni une ordonnance");
    // Les marques Markdown ne doivent jamais atteindre le document remis.
    expect(text).not.toContain('**');
    expect(text).not.toContain('##');
  });

  it('omet les lignes non renseignées', () => {
    const text = ficheToPlainText({ ...FICHE, recipient: '', practitioner: '', notes: '' });

    expect(text).not.toContain('Destinataire');
    expect(text).not.toContain('Praticien :');
    expect(text).not.toContain('Notes du praticien');
  });
});

describe('ficheFilename', () => {
  it('translittère et assainit le nom du destinataire', () => {
    expect(ficheFilename(FICHE, 'pdf')).toBe('conseils-marie-dupont-2026-08-18.pdf');
  });

  it('supprime accents et caractères de chemin', () => {
    const fiche = { ...FICHE, recipient: '../Élodie Ré/mi' };
    expect(ficheFilename(fiche, 'txt')).toBe('conseils-elodie-re-mi-2026-08-18.txt');
  });

  it('retombe sur un nom générique sans destinataire', () => {
    expect(ficheFilename({ ...FICHE, recipient: '' }, 'pdf')).toBe('conseils-fiche-2026-08-18.pdf');
  });
});

describe('stripAlertLine', () => {
  it("retire la ligne d'alerte, qui est rendue dans son propre encadré", () => {
    const body = stripAlertLine(PROTOCOL);

    expect(body).not.toContain('ALERTE MÉDICALE');
    expect(body.startsWith('## 1. Demande reformulée')).toBe(true);
    expect(body).toContain('Chardon-Marie');
  });

  it('laisse un contenu sans alerte intact', () => {
    const source = '## 1. Demande reformulée\nRien de particulier.';
    expect(stripAlertLine(source)).toBe(source);
  });
});
