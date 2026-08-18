/**
 * TypeScript 5.7+ signale les imports d'effet de bord vers un fichier sans
 * déclaration (TS2882). Next.js gère les feuilles de style globales via son
 * pipeline de build, mais ne fournit pas cette déclaration.
 */
declare module '*.css';
