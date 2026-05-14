import type { MetadataRoute } from 'next';
import { productionDomain } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${productionDomain}/es`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${productionDomain}/en`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
  ];
}
