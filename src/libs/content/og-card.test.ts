import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import {
  buildOgRouteKey,
  escapeXml,
  getBrandedOgHref,
  loadDeterministicOgFonts,
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

  it('renders LTR SVG with start anchoring, RTL SVG with end anchoring, and optional logo badge', () => {
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
    expect(ltrSvg).toContain('Plus Jakarta Sans');
    expect(ltrSvg).not.toContain('<script>');

    const rtlSvg = renderBrandedOgSvg(
      {
        routeKey: 'pages/home/fa',
        title: 'معماری سریع برای وب‌سایت‌های مدرن',
        subtitle: 'پشتیبانی کامل از فارسی و راست‌به‌چپ',
        kicker: 'معرفی',
        locale: 'fa',
      },
      { logoDataUri: 'data:image/png;base64,iVBORw0KGgo=' }
    );
    expect(rtlSvg).toContain('text-anchor="end"');
    expect(rtlSvg).toContain('direction="rtl"');
    expect(rtlSvg).toContain('unicode-bidi="embed"');
    expect(rtlSvg).toContain('Vazirmatn');
    expect(rtlSvg).toContain('<image href="data:image/png;base64,iVBORw0KGgo="');
  });

  it('loads bundled Vazirmatn/Jakarta TTF font buffers and rasterizes both LTR and RTL Persian 1200x630 PNGs', async () => {
    const fonts = await loadDeterministicOgFonts();
    expect(fonts.length).toBeGreaterThanOrEqual(2);

    const pngEn = await renderBrandedOgPng({
      routeKey: 'blog/first-post/en',
      title: 'Shipping Multilingual Sites in Hours',
      subtitle: 'SSOT configuration, RTL parity, and automated OG generation.',
      kicker: 'Journal',
      locale: 'en',
    });
    expect(pngEn.length).toBeGreaterThan(1024);
    expect(pngEn.toString('ascii', 1, 4)).toBe('PNG');
    expect(pngEn.readUInt32BE(16)).toBe(1200);
    expect(pngEn.readUInt32BE(20)).toBe(630);

    const tinyLogo = await sharp({
      create: { width: 24, height: 24, channels: 4, background: { r: 245, g: 158, b: 11, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const pngFa = await renderBrandedOgPng(
      {
        routeKey: 'pages/home/fa',
        title: 'معماری سریع برای وب‌سایت‌های دو‌زبانه',
        subtitle: 'تولید تصویر اجتماعی قطعی با فونت وزیرمتن',
        kicker: 'مقاله',
        locale: 'fa',
      },
      { logoDataUri: `data:image/png;base64,${tinyLogo.toString('base64')}` }
    );
    expect(pngFa.length).toBeGreaterThan(1024);
    expect(pngFa.readUInt32BE(16)).toBe(1200);
    expect(pngFa.readUInt32BE(20)).toBe(630);
    expect(pngFa.equals(pngEn)).toBe(false);

    // Ensure embedded Persian copy actually draws bright glyphs near the RTL start edge (right side)
    const { data, info } = await sharp(pngFa).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let rightSideBrightPixels = 0;
    for (let y = 180; y < 380; y += 1) {
      for (let x = 700; x < 1120; x += 1) {
        const idx = (y * info.width + x) * info.channels;
        if (data[idx] > 210 && data[idx + 1] > 210 && data[idx + 2] > 210) {
          rightSideBrightPixels += 1;
        }
      }
    }
    expect(rightSideBrightPixels).toBeGreaterThan(150);
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

