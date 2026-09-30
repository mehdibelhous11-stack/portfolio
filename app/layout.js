import { Space_Grotesk } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { site } from '@/lib/content';

import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';
import '@/styles/responsive.css';

/* One family for everything. Downloaded at build time and served from the
   site itself, so there is no request to Google at runtime. */
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-grotesk',
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  authors: [{ name: site.name }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: site.name,
    title: `${site.name} — ${site.role}`,
    description: site.description,
    url: '/',
    images: [{ url: '/og.png?v=2', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${site.name} — ${site.role}`,
    description: site.description,
    images: ['/og.png?v=2'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: '#0b0b0c',
  colorScheme: 'dark light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/* Runs before first paint so there is never a flash of the wrong palette.
   Deliberately blocking and deliberately tiny. `data-js` tells the CSS the
   opening will be driven; without it the opening is one still screen. */
const THEME_SCRIPT = `document.documentElement.dataset.js='';try{var t=localStorage.getItem('mb-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){document.documentElement.dataset.theme='dark'}`;

const personLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: site.role,
  email: 'mailto:contact@example.com',
  telephone: '+33000000000',
  url: site.url,
  address: { '@type': 'PostalAddress', addressRegion: 'Île-de-France', addressCountry: 'FR' },
  knowsAbout: ['Modélisation 3D', 'Motion design', 'Design industriel', 'Three.js', 'Blender', 'Simulation par éléments finis'],
  alumniOf: [
    { '@type': 'CollegeOrUniversity', name: 'ESD Paris' },
    { '@type': 'CollegeOrUniversity', name: 'École Polytechnique de Constantine' },
  ],
};

export default function RootLayout({ children }) {
  return (
    // THEME_SCRIPT rewrites attributes on <html> before hydration, on purpose.
    <html lang="fr" data-theme="dark" className={grotesk.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* Without script the boot overlay would never lift. */}
        <noscript>
          <style>{'.boot{display:none}'}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
