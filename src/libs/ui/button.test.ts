import { describe, it, expect } from 'vitest';
import { buttonClasses } from './button';

describe('src/libs/ui/button.ts', () => {
  describe('buttonClasses()', () => {
    it('maps every variant to its global.css treatment', () => {
      expect(buttonClasses({ variant: 'primary' })).toContain('cta');
      expect(buttonClasses({ variant: 'secondary' })).toContain('btn-secondary');
      expect(buttonClasses({ variant: 'hero' })).toContain('btn-hero-secondary');
      expect(buttonClasses({ variant: 'ghost' })).toContain('ghost-control');
      expect(buttonClasses({ variant: 'glass' })).toContain('glass-control');
    });

    it('defaults to the primary treatment at the medium scale', () => {
      const classes = buttonClasses();
      expect(classes).toContain('cta');
      expect(classes).toContain('h-10 px-5 text-sm');
    });

    it('applies the requested size and lets `auto` opt out of the scale', () => {
      expect(buttonClasses({ size: 'sm' })).toContain('h-9 px-3.5 text-xs');
      expect(buttonClasses({ size: 'lg' })).toContain('h-11 px-6 text-sm');

      const auto = buttonClasses({ size: 'auto' });
      expect(auto).not.toMatch(/\bh-(9|10|11)\b/);
      expect(auto).not.toContain('text-xs');
    });

    it('stretches only when `block` is set', () => {
      expect(buttonClasses()).not.toContain('w-full');
      expect(buttonClasses({ block: true })).toContain('w-full');
    });

    it('always carries the shared hover lift and press motion', () => {
      const classes = buttonClasses();
      expect(classes).toContain('hover:-translate-y-0.5');
      expect(classes).toContain('active:translate-y-0');
      expect(classes).toContain('transition-[');
    });

    it('keeps call-site utilities last so they win over the recipe', () => {
      const classes = buttonClasses({ className: 'mt-5 shadow-xs' });
      expect(classes.endsWith('mt-5 shadow-xs')).toBe(true);
    });

    it('never leaves a double space when an option is empty', () => {
      expect(buttonClasses({ size: 'auto' })).not.toMatch(/ {2}/);
    });
  });

});
