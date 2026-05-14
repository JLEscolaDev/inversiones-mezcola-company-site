import Script from 'next/script';

type Props = {
  data: object;
};

export function SeoJsonLd({ data }: Props) {
  return (
    <Script
      id="seo-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
