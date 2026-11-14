/**
 * Class recipe of `Button.astro`.
 *
 * The project owns one treatment per button role in `src/styles/global.css`
 * (`.cta`, `.btn-secondary`, `.btn-hero-secondary`, `.ghost-control`,
 * `.glass-control`); this module answers "which treatment, how big, and with
 * which motion" so the Astro component and the few client-side renderers (the
 * blog pager) never drift apart.
 *
 * It is deliberately free of Astro and Paraglide imports, so it can be bundled
 * into a `<script>` as well as used at build time.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'hero' | 'ghost' | 'glass';

/**
 * Height and type scale of a button. `auto` opts out of the scale: the caller
 * supplies its own sizing, which is what the consent banner needs (its buttons
 * follow a legal equal-prominence layout, not the marketing scale).
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'auto';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'cta',
  secondary: 'btn-secondary',
  hero: 'btn-hero-secondary',
  ghost: 'ghost-control',
  glass: 'glass-control',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-11 px-6 text-sm',
  auto: '',
};

/**
 * Motion shared by every button: the treatment animates its colours, this adds
 * a 2px lift and a press that returns to the surface. The transition is spelled
 * out per property so it also overrides the `transition-colors` a treatment may
 * already set (components layer loses to utilities, but two utilities for
 * `transition-property` would race).
 *
 * `translate` — not `transform` — is the property to list: Tailwind v4's
 * `translate-*` utilities write the standalone `translate` property, so a
 * `transition-transform` recipe makes the lift and the press jump instead of
 * animating.
 */
const MOTION =
  'transition-[color,background-color,border-color,opacity,translate,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:duration-75';

const BASE = `group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-center ${MOTION} disabled:pointer-events-none disabled:opacity-60`;

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the inline size of the container. */
  block?: boolean;
  /** Extra utilities of one call site (margins, widths, tone tweaks). */
  className?: string;
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
}: ButtonClassOptions = {}): string {
  return [BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className]
    .filter(Boolean)
    .join(' ');
}
