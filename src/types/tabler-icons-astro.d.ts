/**
 * Types for the per-icon modules of `@tabler/icons-astro`.
 *
 * The package only ships a type declaration for its barrel entry, and that
 * barrel is expensive to use: importing `{ IconSun }` from it makes Vite read
 * every icon module in the set (6,258 files) before tree-shaking, which measured
 * ≈ +2–7 s per build in this project. `Icon.astro` therefore imports the
 * individual modules (`.../dist/esm/icons/sun.mjs`), each of which is a tiny
 * component factory, and this file describes them.
 *
 * The shape mirrors the package's own `AstroComponent` type so the components
 * stay usable as dynamic `<Component />` targets.
 */
declare module '@tabler/icons-astro/dist/esm/icons/*.mjs' {
  export interface TablerIconProps {
    size?: string | number;
    color?: string;
    stroke?: string | number;
    strokeWidth?: string | number;
    title?: string;
    class?: string;
    [attribute: string]: unknown;
  }

  export type TablerIcon = ((result: any, props: TablerIconProps, slots: any) => any) & {
    isAstroComponentFactory: true;
  };

  const Icon: TablerIcon;
  export default Icon;
}
