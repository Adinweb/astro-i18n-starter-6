/**
 * Shared avatar initials generator for testimonial cards, team profiles, and
 * overlapping avatar stacks. Supports Latin, Persian/Arabic, and multi-word
 * names without per-component duplication.
 */
export function getInitials(name: string, fallback = 'A'): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}
