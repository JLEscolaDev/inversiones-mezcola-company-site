import { notFound } from 'next/navigation';
import { CinematicExperience } from '@/components/CinematicExperience';
import { SeoJsonLd } from '@/components/SeoJsonLd';
import { getLocaleContent } from '@/lib/content';
import { isLocale } from '@/lib/i18n';
import { getJsonLd } from '@/lib/seo';

export default async function LocalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const content = getLocaleContent(locale);

  return (
    <>
      <SeoJsonLd data={getJsonLd(locale)} />
      <main>
        <CinematicExperience
          locale={locale}
          languageLabel={content.navLabel}
          switchToText={content.switchTo}
          switchToHref={content.switchToHref}
          ui={content.ui}
          hero={content.hero}
          scenes={content.scenes}
          transitions={content.transitions}
          contact={content.contact}
        />
      </main>
    </>
  );
}
