import { describe, it, expect } from 'vitest';
import {
  buildOrganizationSchema,
  buildPersonSchema,
  buildProductListSchema,
  buildProductSchema,
  buildServiceSchema,
  collectSocialProfiles,
  normalizeIsoCurrency,
  resolveAuthorSchema,
} from './schema';

describe('src/libs/content/schema.ts', () => {
  it('collects non-placeholder HTTPS social profile URLs', () => {
    expect(
      collectSocialProfiles({
        github: 'https://github.com/acme',
        twitter: 'https://x.com/example.com-placeholder',
        linkedin: 'https://linkedin.com/company/acme',
        instagram: '',
        telegram: 'not-a-url',
      })
    ).toEqual(['https://github.com/acme', 'https://linkedin.com/company/acme']);
  });

  it('builds LocalBusiness schema with PostalAddress and GeoCoordinates', () => {
    const schema = buildOrganizationSchema({
      name: 'Acme Studio',
      url: 'https://acme.example.org/',
      description: 'Digital product studio',
      email: 'hello@acme.example.org',
      logoUrl: 'https://acme.example.org/logo.svg',
      business: {
        type: 'LocalBusiness',
        legalName: 'Acme Studio Ltd.',
        phone: '+98 21 8888 0000',
        whatsapp: '',
        telegram: '',
        address: 'Valiasr St 120',
        city: 'Tehran',
        country: 'IR',
        workingHours: 'Sat-Wed 09:00-18:00',
        mapEmbedUrl: '',
        geo: { lat: 35.7219, lng: 51.3347 },
      },
      social: {
        github: 'https://github.com/acme-studio',
        twitter: '',
        linkedin: '',
        instagram: '',
        telegram: '',
      },
    });

    expect(schema['@type']).toBe('LocalBusiness');
    expect(schema.legalName).toBe('Acme Studio Ltd.');
    expect(schema.telephone).toBe('+98 21 8888 0000');
    expect(schema.address).toMatchObject({
      '@type': 'PostalAddress',
      streetAddress: 'Valiasr St 120',
      addressLocality: 'Tehran',
      addressCountry: 'IR',
    });
    expect(schema.geo).toMatchObject({
      '@type': 'GeoCoordinates',
      latitude: 35.7219,
      longitude: 51.3347,
    });
    expect(schema.sameAs).toEqual(['https://github.com/acme-studio']);
  });

  it('builds Service schema with Organization provider', () => {
    const service = buildServiceSchema({
      name: 'ISO 9001 Certification Audit',
      description: 'Independent management system auditing.',
      url: 'https://cert.example.org/iso-9001/',
      serviceType: 'Certification',
      areaServed: 'Europe',
      inLanguage: 'en-US',
      providerName: 'Cert GmbH',
      providerUrl: 'https://cert.example.org/',
    });

    expect(service['@type']).toBe('Service');
    expect(service.serviceType).toBe('Certification');
    expect(service.provider).toEqual({
      '@type': 'Organization',
      name: 'Cert GmbH',
      url: 'https://cert.example.org/',
    });
  });

  it('builds rich Person and resolved author schemas for BlogPosting E-E-A-T', () => {
    const person = buildPersonSchema({
      name: 'Nadia Karimi',
      url: 'https://studio.example.org/authors/nadia/',
      jobTitle: 'Principal Architect',
      description: 'Writes about Astro architecture and RTL typography.',
      sameAs: ['https://linkedin.com/in/nadia', 'https://x.com/example.com-bad'],
    });
    expect(person['@context']).toBe('https://schema.org');
    expect(person['@type']).toBe('Person');
    expect(person.jobTitle).toBe('Principal Architect');
    expect(person.sameAs).toEqual(['https://linkedin.com/in/nadia']);

    const resolved = resolveAuthorSchema(
      'Nadia Karimi',
      'Acme Studio',
      {
        nadia: {
          name: 'Nadia Karimi',
          url: '/fa/درباره-ما/',
          jobTitle: 'Principal Architect',
          description: '',
          image: '/images/nadia.jpg',
          sameAs: ['https://github.com/nadiakarimi'],
        },
      },
      (href) => `https://studio.example.org${href}`
    );
    expect(resolved['@type']).toBe('Person');
    expect(resolved.url).toBe('https://studio.example.org/fa/درباره-ما/');
    expect(resolved.image).toBe('https://studio.example.org/images/nadia.jpg');
    expect(resolved).not.toHaveProperty('@context');

    expect(resolveAuthorSchema(undefined, 'Acme Studio')).toEqual({
      '@type': 'Organization',
      name: 'Acme Studio',
    });

    const sanitizedAuthor = resolveAuthorSchema(
      'Unsafe Author',
      'Acme Studio',
      {
        unsafe: {
          name: 'Unsafe Author',
          url: 'javascript:alert(1)',
          jobTitle: '',
          description: '',
          image: '//evil.example/avatar.png',
          sameAs: ['ftp://files.example.org/me', 'https://mastodon.social/@author'],
        },
      }
    );
    expect(sanitizedAuthor.url).toBeUndefined();
    expect(sanitizedAuthor.image).toBeUndefined();
    expect(sanitizedAuthor.sameAs).toEqual(['https://mastodon.social/@author']);
  });

  it('normalizes currency codes (including IRT Toman -> IRR) and builds Product/ItemList schemas', () => {
    expect(normalizeIsoCurrency('$')).toEqual({ currency: 'USD', multiplier: 1 });
    expect(normalizeIsoCurrency('IRT')).toEqual({ currency: 'IRR', multiplier: 10 });
    expect(normalizeIsoCurrency('تومان')).toEqual({ currency: 'IRR', multiplier: 10 });

    const product = buildProductSchema({
      name: 'Pro Design System',
      description: 'Tokenized UI library with Figma kit.',
      price: 1500000,
      currency: 'IRT',
      availability: 'InStock',
      sku: 'PDS-01',
      brand: 'Acme',
      rating: 4.9,
      reviewCount: 42,
      url: 'https://shop.example.org/pro-design/',
    });

    expect(product['@type']).toBe('Product');
    expect(product.sku).toBe('PDS-01');
    expect(product.brand).toEqual({ '@type': 'Brand', name: 'Acme' });
    expect(product.offers).toMatchObject({
      '@type': 'Offer',
      price: 15000000,
      priceCurrency: 'IRR',
      availability: 'https://schema.org/InStock',
    });
    expect(product.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: 4.9,
      reviewCount: 42,
    });

    const list = buildProductListSchema([
      { name: 'Starter Kit', price: 79, currency: '$', url: 'https://shop.example.org/starter/' },
    ]);
    expect(list['@type']).toBe('ItemList');
    expect(list.numberOfItems).toBe(1);
  });
});

