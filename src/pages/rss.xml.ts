import type { APIRoute } from 'astro';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { buildLocaleAtomFeed } from '@/libs/content/feed';

export const GET: APIRoute = () => buildLocaleAtomFeed(DEFAULT_LOCALE);
