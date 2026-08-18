import type { Metadata, Viewport } from 'next';
import { Inter, Lora } from 'next/font/google';

import './globals.css';

// `next/font` télécharge et auto-héberge les polices au build : aucune requête
// vers un domaine tiers au moment de l'exécution, ce que la CSP interdit
// d'ailleurs explicitement.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NaturopatheIA — Assistant de consultation',
  description:
    "Assistant documentaire pour naturopathes : analyse de documents, protocoles de phytothérapie et fiches de conseils imprimables.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#131512' },
  ],
};

/**
 * Applique le thème enregistré avant la première peinture.
 * Sans cela, un utilisateur en mode sombre voit un flash blanc au chargement.
 */
const themeScript = `(function(){try{var t=localStorage.getItem('nio-theme');if(t==='dark'||t==='light'){document.documentElement.classList.add(t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
