import type { ButtonVariant } from '@/libs/ui/button';

export interface HeroCtaAction {
  label: string;
  href: string;
  icon?: string;
  variant?: ButtonVariant;
  external?: boolean;
}

export interface HeroTopBanner {
  badge?: string;
  label: string;
  href?: string;
  ctaLabel?: string;
}

export interface HeroAnnouncement {
  badge?: string;
  badgeVariant?: 'primary' | 'accent' | 'success' | 'neutral';
  label: string;
  href?: string;
  ctaLabel?: string;
  pulse?: boolean;
}

export interface HeroPartnerPill {
  icon?: string;
  name: string;
  tag?: string;
}
