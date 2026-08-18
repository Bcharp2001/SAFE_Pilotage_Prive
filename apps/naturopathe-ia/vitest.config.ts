import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // `tsconfig.json` laisse le JSX à Next (`jsx: "preserve"`) ; le transformeur
  // de Vitest doit donc le compiler lui-même pour charger les composants de
  // composition PDF.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
