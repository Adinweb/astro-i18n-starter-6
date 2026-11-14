import type { APIRoute, GetStaticPaths } from 'astro';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/locales';
import { buildLocaleAtomFeed } from '@/libs/content/feed';
import { isBlogFeedEnabled } from '@/libs/content/service';

export const getStaticPaths: GetStaticPaths = () =>
  isBlogFeedEnabled()
    ? LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => ({
        params: { locale },
        props: { locale },
      }))
    : [];

export const GET: APIRoute = ({ props }) => buildLocaleAtomFeed(props.locale as Locale);
