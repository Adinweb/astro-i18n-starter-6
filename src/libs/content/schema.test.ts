import { describe, it, expect } from 'vitest';
import {
  buildOrganizationSchema,
  buildServiceSchema,
  collectSocialProfiles,
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
});
