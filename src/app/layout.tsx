import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import '../../styles/globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://inversionesmezcola.es'),
  title: {
    default: 'INVERSIONES MEZCOLÁ SL',
    template: '%s | INVERSIONES MEZCOLÁ SL',
  },
  description:
    'Asesoría estratégica, consultoría y crecimiento empresarial con una dirección cinematográfica centrada en excelencia y largo plazo.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
