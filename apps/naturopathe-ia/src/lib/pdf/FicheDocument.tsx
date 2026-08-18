import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { formatFrenchDate, stripMarkdown, type Fiche } from '@/lib/fiche';
import { ALERT_PREFIX, LEGAL_NOTICE } from '@/lib/prompt';

/**
 * Composition du PDF exporté.
 *
 * La version d'origine ouvrait une fenêtre et appelait `window.print()` : le
 * résultat dépendait du navigateur, des marges système et du blocage des
 * fenêtres surgissantes. Ici le PDF est composé côté serveur — pagination,
 * césures et numérotation sont identiques partout, et le praticien reçoit un
 * fichier, pas une boîte de dialogue.
 *
 * Les polices sont les Type 1 standard du format PDF (Helvetica, Times) :
 * aucune police n'est téléchargée, et l'encodage WinAnsi couvre les accents
 * français.
 *
 * ATTENTION : ne pas remettre `lineHeight` sur le style de `Page`. Le moteur
 * de mise en page cesse alors d'émettre les enfants `position: absolute` +
 * `fixed`, et le pied de page — mention légale et pagination — disparaît
 * silencieusement du PDF. L'interlignage est donc porté par les styles de
 * texte. Le test `tests/pdf.test.ts` verrouille ce comportement.
 */

const INK = '#1C1E1A';
const MUTED = '#6B7268';
const ACCENT = '#2F5D50';
const RULE = '#D8DDD5';

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 52,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 10,
    marginBottom: 22,
  },
  headerLeft: { flexGrow: 1, paddingRight: 16 },
  title: { fontFamily: 'Times-Bold', fontSize: 17, color: ACCENT, marginBottom: 3 },
  practice: { fontSize: 9, color: MUTED },
  meta: { fontSize: 8.5, color: MUTED, textAlign: 'right', lineHeight: 1.6 },
  metaLabel: { fontFamily: 'Helvetica-Bold', color: INK },

  alert: {
    borderLeftWidth: 3,
    borderLeftColor: '#B4623A',
    backgroundColor: '#FBF1EC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  alertTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#8C4526', marginBottom: 2 },
  alertBody: { fontSize: 9.5, color: '#6F3A20', lineHeight: 1.5 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.7,
    color: ACCENT,
    textTransform: 'uppercase',
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  paragraph: { marginBottom: 5, textAlign: 'justify', lineHeight: 1.55 },
  bulletRow: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
  bulletMark: { width: 11, color: ACCENT },
  bulletText: { flex: 1, lineHeight: 1.55 },

  notes: {
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: '#E4D9BE',
    backgroundColor: '#FCF8EE',
    padding: 11,
  },
  notesTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: '#7A6420', marginBottom: 3 },
  notesBody: { lineHeight: 1.5 },

  footer: {
    position: 'absolute',
    bottom: 28,
    left: 52,
    right: 52,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    paddingTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footerText: { flex: 1, fontSize: 6.8, color: MUTED, lineHeight: 1.45, paddingRight: 12 },
  pageNumber: { fontSize: 7, color: MUTED },
});

/** Une ligne de contenu, déjà débarrassée de ses marques Markdown. */
type Line = { kind: 'bullet' | 'text'; value: string };

function toLines(body: string): Line[] {
  const lines: Line[] = [];
  for (const raw of body.split('\n')) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    // La ligne d'alerte est rendue séparément, en tête de document.
    if (trimmed.includes(ALERT_PREFIX)) continue;

    const isBullet = /^([-*+•]|\d+[.)])\s+/.test(trimmed);
    const value = stripMarkdown(trimmed).replace(/^•\s*/, '').trim();
    if (value) lines.push({ kind: isBullet ? 'bullet' : 'text', value });
  }
  return lines;
}

export function FicheDocument({ fiche, alert }: { fiche: Fiche; alert: string | null }) {
  return (
    <Document
      title={fiche.title}
      author={fiche.practitioner || fiche.practice || 'NaturopatheIA'}
      creator="NaturopatheIA"
      producer="NaturopatheIA"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{fiche.title}</Text>
            {fiche.practice ? <Text style={styles.practice}>{fiche.practice}</Text> : null}
          </View>
          <View style={styles.meta}>
            <Text>
              <Text style={styles.metaLabel}>Date : </Text>
              {formatFrenchDate(fiche.date)}
            </Text>
            {fiche.practitioner ? (
              <Text>
                <Text style={styles.metaLabel}>Praticien : </Text>
                {fiche.practitioner}
              </Text>
            ) : null}
            {fiche.recipient ? (
              <Text>
                <Text style={styles.metaLabel}>Destinataire : </Text>
                {fiche.recipient}
              </Text>
            ) : null}
          </View>
        </View>

        {alert ? (
          <View style={styles.alert} wrap={false}>
            <Text style={styles.alertTitle}>ORIENTATION MÉDICALE RECOMMANDÉE</Text>
            <Text style={styles.alertBody}>{alert}</Text>
          </View>
        ) : null}

        {fiche.sections.map((section, index) => {
          const lines = toLines(section.body);
          if (lines.length === 0 && !section.title) return null;

          return (
            <View key={`${section.title}-${index}`} style={styles.section}>
              {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
              {lines.map((line, lineIndex) =>
                line.kind === 'bullet' ? (
                  <View key={lineIndex} style={styles.bulletRow} wrap={false}>
                    <Text style={styles.bulletMark}>—</Text>
                    <Text style={styles.bulletText}>{line.value}</Text>
                  </View>
                ) : (
                  <Text key={lineIndex} style={styles.paragraph}>
                    {line.value}
                  </Text>
                ),
              )}
            </View>
          );
        })}

        {fiche.notes.trim() ? (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>NOTES DU PRATICIEN</Text>
            <Text style={styles.notesBody}>{fiche.notes.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{LEGAL_NOTICE}</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
