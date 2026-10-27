import type { MetadataRoute } from 'next';

// Crawlers may read the public site and its media, not the CMS, the Patreon sign-in routes or the boot data.
// robots.txt is advice to well-behaved crawlers, not access control.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/api/media/file/'], disallow: ['/admin', '/api/', '/auth/', '/boot-status'] },
  };
}
