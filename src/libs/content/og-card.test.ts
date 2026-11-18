import { describe, it, expect } from 'vitest';
import {
  buildOgRouteKey,
  escapeXml,
  getBrandedOgHref,
  renderBrandedOgPng,
  renderBrandedOgSvg,
  wrapTextLines,
} from './og-card';
import { buildFaqSchema } from './faq';

describe('src/libs/content/og-card.ts & faq.ts', () => {
  it('builds deterministic ASCII route keys and /og/*.png hrefs', () => {
    const key = buildOgRouteKey('page', { group: 'about', locale: 'fa' });
    expect(key).toBe('pages/about/fa');
    expect(getBrandedOgHref(key)).toBe('/og/pages/about/fa.png');
    expect(buildOgRouteKey('blog-index', { locale: 'en', page: 2 })).toBe('blog/index-en-p2');
    expect(
      buildOgRouteKey('collection-entry', { contentType: 'projects', group: 'atlas', locale: 'en' })
    ).toBe('projects/atlas/en');
  });

  it('escapes XML special characters and strips ASCII control characters', () => {
    expect(escapeXml('<script attr="x">&\'test\u0007')).toBe(
      '&lt;script attr=&quot;x&quot;&gt;&amp;&apos;test'
    );
  });

  it('wraps long headlines cleanly within maxLines with ellipsis overflow', () => {
    const lines = wrapTextLines(
      'Production-grade multi-lingual Astro starter architecture with native RTL and LTR support',
      24,
      3
    );
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.length <= 25)).toBe(true);
    expect(lines[2].endsWith('…')).toBe(true);
  });

  it('renders LTR SVG with start anchoring and RTL SVG with end anchoring', () => {
    const ltrSvg = renderBrandedOgSvg({
      routeKey: 'pages/home/en',
      title: 'Fast Client <Starter> & Kit',
      subtitle: 'Zero runtime bloat.',
      kicker: 'Overview',
      locale: 'en',
    });
    expect(ltrSvg).toContain('text-anchor="start"');
    expect(ltrSvg).toContain('&lt;Starter&gt; &amp;');
    expect(ltrSvg).toContain('>Kit</tspan>');
    expect(ltrSvg).not.toContain('<script>');

    const rtlSvg = renderBrandedOgSvg({
      routeKey: 'pages/home/fa',
      title: 'معماری سریع برای وب‌سایت‌های مدرن',
      subtitle: 'پشتیبانی کامل از فارسی و راست‌به‌چپ',
      kicker: 'معرفی',
      locale: 'fa',
    });
    expect(rtlSvg).toContain('text-anchor="start"');
    expect(rtlSvg).toContain('direction="rtl"');
    expect(rtlSvg).toContain('unicode-bidi="embed"');
    expect(rtlSvg).toContain('Noto Naskh Arabic');
  });

  it('rasterizes branded OG cards to genuine 1200x630 PNG buffers', async () => {
    const png = await renderBrandedOgPng({
      routeKey: 'blog/first-post/en',
      title: 'Shipping Multilingual Sites in Hours',
      subtitle: 'SSOT configuration, RTL parity, and automated OG generation.',
      kicker: 'Journal',
      locale: 'en',
    });
    expect(png.length).toBeGreaterThan(1024);
    expect(png.toString('ascii', 1, 4)).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });

  it('builds valid Schema.org FAQPage JSON-LD', () => {
    const schema = buildFaqSchema([
      { question: 'How fast is the build?', answer: 'Static HTML ships in milliseconds.' },
    ]);
    expect(schema['@type']).toBe('FAQPage');
    expect(Array.isArray(schema.mainEntity)).toBe(true);
    expect((schema.mainEntity as Array<{ name: string }>)[0].name).toBe('How fast is the build?');
  });
});
