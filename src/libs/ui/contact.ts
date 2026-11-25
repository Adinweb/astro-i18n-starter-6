/**
 * Shared direct contact and regional map URL builders for `ContactSplitSection`,
 * `QuickContactWidget`, and unit tests.
 */

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface NativeMapLinks {
  google: string;
  neshan: string;
  balad: string;
}

export function toTelHref(value: string): string {
  const cleaned = value.trim().replace(/[^+\d]/g, '');
  return `tel:${cleaned || value.trim()}`;
}

export function toWhatsappHref(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : trimmed;
}

export function toTelegramHref(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://t.me/${trimmed.replace(/^@/, '')}`;
}

export function buildNativeMapLinks(geo: GeoCoordinates): NativeMapLinks {
  const lat = Number(geo.lat);
  const lng = Number(geo.lng);
  return {
    google: `https://maps.google.com/?q=${lat},${lng}`,
    neshan: `https://neshan.org/maps/@${lat},${lng},15z`,
    balad: `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=15`,
  };
}
