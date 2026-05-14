import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';

const baseDomain = 'https://inversionesmezcola.es';

const localeMeta: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  es: {
    title: 'INVERSIONES MEZCOLÁ SL',
    description: 'Asesoría estratégica, consultoría y crecimiento empresarial desde una perspectiva de excelencia y largo plazo.',
    ogLocale: 'es_ES',
  },
  en: {
    title: 'INVERSIONES MEZCOLÁ SL',
    description: 'Strategic advisory, consulting and business growth from a long-term excellence-driven perspective.',
    ogLocale: 'en_US',
  },
};

export function getLocaleMetadata(locale: Locale): Metadata {
  const data = localeMeta[locale];
  const path = `/${locale}`;
  const canonical = `${baseDomain}${path}`;

  return {
    metadataBase: new URL(baseDomain),
    title: data.title,
    description: data.description,
    alternates: {
      canonical,
      languages: {
        es: `${baseDomain}/es`,
        en: `${baseDomain}/en`,
        'x-default': `${baseDomain}/es`,
      },
    },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'INVERSIONES MEZCOLÁ SL',
      title: data.title,
      description: data.description,
      locale: data.ogLocale,
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
    },
  };
}

export function getJsonLd(locale: Locale) {
  const inEnglish = locale === 'en';

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://inversionesmezcola.es/#organization',
        name: 'INVERSIONES MEZCOLÁ SL',
        url: 'https://inversionesmezcola.es',
        alternateName: 'Inversiones Mezcola',
        email: 'businessandmoneymanagement@gmail.com',
        areaServed: 'ES',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://inversionesmezcola.es/#website',
        url: 'https://inversionesmezcola.es',
        name: 'INVERSIONES MEZCOLÁ SL',
        inLanguage: inEnglish ? 'en' : 'es',
        publisher: {
          '@id': 'https://inversionesmezcola.es/#organization',
        },
      },
    ],
  };
}

export const productionDomain = baseDomain;
