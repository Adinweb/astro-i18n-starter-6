import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { buildLocaleAtomFeed } from '@/libs/content/feed';
import { isBlogFeedEnabled } from '@/libs/content/service';

export const GET: APIRoute = () =>
  isBlogFeedEnabled()
    ? buildLocaleAtomFeed(DEFAULT_LOCALE)
    : new Response(null, { status: 404 });
