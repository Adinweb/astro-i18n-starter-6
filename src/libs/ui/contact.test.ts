import { describe, it, expect } from 'vitest';
import {
  buildNativeMapLinks,
  toTelHref,
  toTelegramHref,
  toWhatsappHref,
} from './contact';

describe('Direct Contact & Map Link Helpers (src/libs/ui/contact.ts)', () => {
  it('formats tel, WhatsApp, and Telegram links cleanly', () => {
    expect(toTelHref('+98 21 8877 6655')).toBe('tel:+982188776655');
    expect(toWhatsappHref('+49 170 123456')).toBe('https://wa.me/49170123456');
    expect(toWhatsappHref('https://wa.me/989121234567')).toBe('https://wa.me/989121234567');
    expect(toTelegramHref('@agency_support')).toBe('https://t.me/agency_support');
    expect(toTelegramHref('https://t.me/agency_support')).toBe('https://t.me/agency_support');
  });

  it('builds Google Maps, Neshan, and Balad URLs from coordinates', () => {
    const links = buildNativeMapLinks({ lat: 35.6892, lng: 51.389 });
    expect(links.google).toBe('https://maps.google.com/?q=35.6892,51.389');
    expect(links.neshan).toBe('https://neshan.org/maps/@35.6892,51.389,15z');
    expect(links.balad).toBe('https://balad.ir/location?latitude=35.6892&longitude=51.389&zoom=15');
  });
});
