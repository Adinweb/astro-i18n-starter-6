/**
 * Schema.org structured data builders for corporate, local business,
 * service, author (`Person`), and e-commerce (`Product` / `Offer`) pages.
 */
import type { AuthorProfile, BusinessConfig, SocialConfig } from '@/libs/config/app';

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

export interface PersonSchemaInput {
  name: string;
  url?: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  sameAs?: readonly string[];
  includeContext?: boolean;
}

export type ProductAvailability =
  | 'InStock'
  | 'OutOfStock'
  | 'PreOrder'
  | 'LimitedAvailability';

export interface ProductSchemaInput {
  name: string;
  description?: string;
  price: number;
  priceCurrency?: string;
  currency?: string;
  availability?: ProductAvailability;
  url?: string;
  image?: string;
  sku?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  includeContext?: boolean;
}

const CURRENCY_SYMBOL_TO_ISO: Record<string, { currency: string; multiplier: number }> = {
  '$': { currency: 'USD', multiplier: 1 },
  US$: { currency: 'USD', multiplier: 1 },
  USD: { currency: 'USD', multiplier: 1 },
  '€': { currency: 'EUR', multiplier: 1 },
  EUR: { currency: 'EUR', multiplier: 1 },
  '£': { currency: 'GBP', multiplier: 1 },
  GBP: { currency: 'GBP', multiplier: 1 },
  '¥': { currency: 'JPY', multiplier: 1 },
  JPY: { currency: 'JPY', multiplier: 1 },
  CHF: { currency: 'CHF', multiplier: 1 },
  AED: { currency: 'AED', multiplier: 1 },
  IRR: { currency: 'IRR', multiplier: 1 },
  'ریال': { currency: 'IRR', multiplier: 1 },
  IRT: { currency: 'IRR', multiplier: 10 },
  'تومان': { currency: 'IRR', multiplier: 10 },
};

export function normalizeIsoCurrency(rawCurrency?: string): {
  currency: string;
  multiplier: number;
} {
  const cleaned = (rawCurrency ?? '').trim();
  if (!cleaned) return { currency: 'USD', multiplier: 1 };
  const exact = CURRENCY_SYMBOL_TO_ISO[cleaned] ?? CURRENCY_SYMBOL_TO_ISO[cleaned.toUpperCase()];
  if (exact) return exact;
  if (/^[A-Za-z]{3}$/.test(cleaned)) {
    return { currency: cleaned.toUpperCase(), multiplier: 1 };
  }
  return { currency: 'USD', multiplier: 1 };
}

function filterValidExternalUrls(urls?: readonly string[]): string[] {
  if (!urls || urls.length === 0) return [];
  return urls
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || /example\.com/i.test(entry)) return false;
      try {
        const parsed = new URL(entry);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
      } catch {
        return false;
      }
    });
}

export function collectSocialProfiles(social?: SocialConfig): string[] {
  if (!social) return [];
  return filterValidExternalUrls(Object.values(social));
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

export function buildPersonSchema(input: PersonSchemaInput): Record<string, unknown> {
  const sameAs = filterValidExternalUrls(input.sameAs);
  const schema: Record<string, unknown> = {
    ...(input.includeContext === false ? {} : { '@context': 'https://schema.org' }),
    '@type': 'Person',
    name: input.name.trim(),
  };

  if (input.url?.trim()) schema.url = input.url.trim();
  if (input.jobTitle?.trim()) schema.jobTitle = input.jobTitle.trim();
  if (input.description?.trim()) schema.description = input.description.trim();
  if (input.image?.trim()) schema.image = input.image.trim();
  if (sameAs.length > 0) schema.sameAs = sameAs;

  return schema;
}

export function resolveAuthorSchema(
  authorName: string | undefined,
  fallbackOrgName: string,
  authorsMap?: Record<string, AuthorProfile>,
  resolveHref?: (href: string) => string
): Record<string, unknown> {
  const trimmed = authorName?.trim();
  if (!trimmed) {
    return {
      '@type': 'Organization',
      name: fallbackOrgName,
    };
  }

  const normalized = trimmed.toLowerCase();
  const matchedProfile = authorsMap
    ? (authorsMap[trimmed] ??
        Object.entries(authorsMap).find(
          ([key, profile]) =>
            key.trim().toLowerCase() === normalized ||
            profile.name.trim().toLowerCase() === normalized
        )?.[1])
    : undefined;

  if (!matchedProfile) {
    return buildPersonSchema({ name: trimmed, includeContext: false });
  }

  const resolveOptionalUrl = (raw?: string): string | undefined => {
    const clean = raw?.trim();
    if (!clean) return undefined;
    if (clean.startsWith('/')) {
      if (clean.startsWith('//') || clean.startsWith('/\\')) return undefined;
      return resolveHref ? resolveHref(clean) : clean;
    }
    try {
      const parsed = new URL(clean);
      if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
        return parsed.href;
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  return buildPersonSchema({
    name: matchedProfile.name,
    url: resolveOptionalUrl(matchedProfile.url),
    jobTitle: matchedProfile.jobTitle,
    description: matchedProfile.description,
    image: resolveOptionalUrl(matchedProfile.image),
    sameAs: matchedProfile.sameAs,
    includeContext: false,
  });
}

export function buildProductSchema(input: ProductSchemaInput): Record<string, unknown> {
  const { currency, multiplier } = normalizeIsoCurrency(input.priceCurrency ?? input.currency);
  const numericPrice = Math.max(0, Number(input.price) * multiplier);
  const availability = input.availability ?? 'InStock';

  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    price: Number.isInteger(numericPrice) ? numericPrice : Number(numericPrice.toFixed(2)),
    priceCurrency: currency,
    availability: `https://schema.org/${availability}`,
  };
  if (input.url?.trim()) offer.url = input.url.trim();

  const schema: Record<string, unknown> = {
    ...(input.includeContext === false ? {} : { '@context': 'https://schema.org' }),
    '@type': 'Product',
    name: input.name.trim(),
    offers: offer,
  };

  if (input.description?.trim()) schema.description = input.description.trim();
  if (input.image?.trim()) schema.image = input.image.trim();
  if (input.url?.trim()) schema.url = input.url.trim();
  if (input.sku?.trim()) schema.sku = input.sku.trim();
  if (input.brand?.trim()) {
    schema.brand = {
      '@type': 'Brand',
      name: input.brand.trim(),
    };
  }
  if (input.rating !== undefined && Number.isFinite(input.rating)) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.rating,
      bestRating: 5,
      ...(input.reviewCount !== undefined && Number.isFinite(input.reviewCount)
        ? { reviewCount: Math.max(1, Math.round(input.reviewCount)) }
        : {}),
    };
  }

  return schema;
}

export function buildProductListSchema(
  items: readonly ProductSchemaInput[],
  pageUrl?: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(pageUrl?.trim() ? { url: pageUrl.trim() } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: buildProductSchema({ ...item, includeContext: false }),
    })),
  };
}

