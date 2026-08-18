import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  // `next-env.d.ts` est généré par Next.js et ne doit pas être corrigé à la main.
  { ignores: ['.next/**', 'node_modules/**', 'public/audio/*.js', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default config;
