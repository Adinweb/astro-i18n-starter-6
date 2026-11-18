/**
 * Schema.org structured data builders for corporate, local business, and
 * service pages (`Organization`, `LocalBusiness`, `Service`).
 */
import type { BusinessConfig, SocialConfig } from '@/libs/config/app';

export interface OrganizationSchemaInput {
  name: string;
  url: string;
  description?: string;
  email?: string;
  logoUrl?: string;
  inLanguage?: string;
  business?: BusinessConfig;
  social?: SocialConfig;
}

export interface ServiceSchemaInput {
  name: string;
  description?: string;
  url: string;
  serviceType?: string;
  areaServed?: string;
  inLanguage?: string;
  providerName: string;
  providerUrl: string;
}

export function collectSocialProfiles(social?: SocialConfig): string[] {
  if (!social) return [];
  return Object.values(social)
    .map((entry) => entry.trim())
    .filter((entry) => /^https?:\/\//i.test(entry) && !/example\.com/i.test(entry));
}

export function buildOrganizationSchema(
  input: OrganizationSchemaInput
): Record<string, unknown> {
  const business = input.business;
  const schemaType = business?.type || 'Organization';
  const sameAs = collectSocialProfiles(input.social);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: input.name,
    url: input.url,
  };

  if (business?.legalName?.trim()) schema.legalName = business.legalName.trim();
  if (input.description?.trim()) schema.description = input.description.trim();
  if (input.logoUrl?.trim()) schema.logo = input.logoUrl.trim();
  if (input.email?.trim()) schema.email = input.email.trim();
  if (business?.phone?.trim()) schema.telephone = business.phone.trim();
  if (business?.workingHours?.trim()) schema.openingHours = business.workingHours.trim();

  if (business && (business.address?.trim() || business.city?.trim() || business.country?.trim())) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(business.address?.trim() ? { streetAddress: business.address.trim() } : {}),
      ...(business.city?.trim() ? { addressLocality: business.city.trim() } : {}),
      ...(business.country?.trim() ? { addressCountry: business.country.trim() } : {}),
    };
  }

  if (business?.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.geo.lat,
      longitude: business.geo.lng,
    };
  }

  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
}

export function buildServiceSchema(input: ServiceSchemaInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    url: input.url,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.serviceType?.trim() ? { serviceType: input.serviceType.trim() } : {}),
    ...(input.areaServed?.trim() ? { areaServed: input.areaServed.trim() } : {}),
    ...(input.inLanguage ? { inLanguage: input.inLanguage } : {}),
    provider: {
      '@type': 'Organization',
      name: input.providerName,
      url: input.providerUrl,
    },
  };
}
