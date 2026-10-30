# ChronoTrig v5.2.0 - Comprehensive Guide & Documentation

> **Next-Generation CSS Scroll Engine & Keyframe Timeline Orchestrator**  
> Inspired by the lightweight, CSS-first philosophy of Trig.js.  
> Featuring **Pinned Sections**, **Harmonic Stagger Cascades**, and **Multi-Step Keyframe Timelines**.

---

## Table of Contents
1. [Introduction & Core Philosophy](#1-introduction--core-philosophy)
2. [Quickstart & Installation](#2-quickstart--installation)
3. [Feature 1: Pinned / Sticky Sections](#3-feature-1-pinned--sticky-sections)
4. [Feature 2: Harmonic Stagger Animations](#4-feature-2-harmonic-stagger-animations)
5. [Feature 3: Multi-Step Keyframe Timelines](#5-feature-3-multi-step-keyframe-timelines)
6. [Feature 4: Mobile & Tablet Performance Architecture](#6-feature-4-mobile--tablet-performance-architecture)
7. [Feature 5: Momentum Smoothing (Lerp) & Performance](#7-feature-5-momentum-smoothing-lerp--performance)
8. [Complete API Reference (Attributes, CSS Vars, Methods)](#8-complete-api-reference)
9. [Production-Ready Recipes](#9-production-ready-recipes)

---

## 1. Introduction & Core Philosophy

Trig.js pioneered a lightweight, dependency-free way to animate elements using element viewport position and CSS variables (`--trig`, `--trig-px`, `--trig-deg`).

**ChronoTrig (v5.2)** builds on this foundation by solving the three biggest challenges in modern web scrollytelling:
1. **Pinned Sections (`data-trig-pin`)**: Lock the viewport into sticky space for an arbitrary scroll distance (e.g. `300vh`, `400vh`), driving a normalized `0%` to `100%` timeline without jumpiness or layout shifts.
2. **Harmonic Stagger (`data-trig-stagger`)**: Automatically cascades delays across children using linear, sinusoidal wave, or center-outward mathematical distributions.
3. **Multi-Step Keyframes (`data-trig-timeline`)**: Break free from simple "fade-in" triggers. An element can have multiple keyframe waypoints (e.g. at 0%, 25%, 60%, 100%) with continuous 3D/2D interpolation.
4. **Mobile Performance Protection**: Automatically prevents mobile thermal throttling by stripping GPU blur filters, flattening 3D transforms to 2D compositor properties, and auto-unpinning tall scrolljacks into native touch carousels.

---

## 2. Quickstart & Installation

ChronoTrig is zero-dependency (~4.2 KB minified, ~1.8 KB gzipped) and works in vanilla HTML, React, Vue, Svelte, or Next.js.

### Option A: Direct HTML `<script>` Drop-In (Recommended for Vanilla Projects)
Download `chronotrig.min.js` and link it in your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Scrollytelling Page</title>
</head>
<body>

  <!-- Your animated markup -->
  <div class="card" data-trig data-trig-var="true"></div>

  <!-- Include ChronoTrig at the bottom of <body> or in <head> -->
  <script src="./chronotrig.min.js"></script>
</body>
</html>
```

### Option B: ES Module Import (Vite, Next.js, Webpack)
```javascript
import { ChronoTrig } from './chronotrig.esm.js';

const engine = new ChronoTrig({
  lerp: 0.08,                     // Silky momentum inertia (0 = instant)
  mobileBehavior: 'lightweight',  // 'disable' | 'lightweight' | 'full'
  mobileBreakpoint: 1024,         // Disable scrolljacking on phones & tablets
});
```

---

## 3. Feature 1: Pinned / Sticky Sections

A **Pinned Section** locks an element or full-screen stage in the viewport for a designated scroll distance while its internal elements animate smoothly along a `0%` to `100%` timeline.

### How It Works:
* The outer container (`[data-trig-pin]`) specifies the scroll track depth (e.g. `data-trig-pin-distance="300vh"` or `height: 400vh`).
* The inner container uses standard CSS `position: sticky; top: 0; height: 100vh;`.
* ChronoTrig observes the track and writes `--trig-pin-progress` (e.g. `45.8%`) and `--trig-pin-t` (`0.458`) continuously to the container.

### Example: 3D Product Deconstruction (Pinned)
```html
<div 
  data-trig-pin 
  data-trig-pin-distance="300vh" 
  data-trig-disable-mobile="true"
  style="height: 350vh;"
>
  <div style="position: sticky; top: 0; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden;">
    
    <!-- Outer Bezel rotates with scroll -->
    <div style="transform: rotate(var(--trig-pin-deg));">
      Bezel
    </div>

    <!-- Inner Core scales up and lifts -->
    <div style="transform: scale(calc(1 + var(--trig-pin-t) * 0.5));">
      Core
    </div>

  </div>
</div>
```

### Horizontal Pinned Tracks (Vertical Scroll translates Sideways)
When `data-trig-pin-horizontal="true"` is set, ChronoTrig converts vertical scroll distance into smooth sideways translation on `[data-trig-pin-track]`:

```html
<div 
  data-trig-pin 
  data-trig-pin-horizontal="true"
  data-trig-disable-mobile="true"
  style="height: 400vh;"
>
  <div style="position: sticky; top: 0; height: 100vh; overflow: hidden;">
    <div data-trig-pin-track style="display: flex; gap: 32px; width: max-content;">
      <div class="panel">Chapter 1</div>
      <div class="panel">Chapter 2</div>
      <div class="panel">Chapter 3</div>
      <div class="panel">Chapter 4</div>
    </div>
  </div>
</div>
```

---

## 4. Feature 2: Harmonic Stagger Animations

Instead of writing manual transition delays on every card or list item, wrap them in `[data-trig-stagger]`. ChronoTrig calculates exact delay variables (`--stagger-delay`) and normalized child progress (`--child-progress`) automatically.

### Cascade Distribution Modes:
* `linear`: Item 0 -> 1 -> 2 -> 3 (standard sequential waterfall).
* `wave`: Sinusoidal wave ripple based on $\sin\left(\frac{i}{N-1} \cdot \pi\right)$.
* `center`: Bursts outward from the middle item toward both edges.
* `reverse`: Cascades backwards from last item to first.

### Example: Kinetic Card Grid
```html
<div 
  data-trig-stagger 
  data-trig-stagger-mode="wave" 
  data-trig-stagger-delay="0.08"
  class="card-grid"
>
  <div class="card">Card #1</div>
  <div class="card">Card #2</div>
  <div class="card">Card #3</div>
  <div class="card">Card #4</div>
</div>
```

```css
.card {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.5s ease-out;
  /* Automatically injected by ChronoTrig */
  transition-delay: var(--stagger-delay);
  will-change: transform, opacity;
}

/* Added by ChronoTrig when container enters viewport */
.trig-stagger-active .card {
  opacity: 1;
  transform: translateY(0) scale(1);
}
```

---

## 5. Feature 3: Multi-Step Keyframe Timelines

Traditional scroll triggers only do a single animation (e.g. from 0 to 1).  
ChronoTrig supports **multi-step animations**: an item can have multiple distinct keyframe steps across its scroll lifecycle!

### Step Definition Schema:
```json
[
  { "at": 0, "opacity": 0, "y": 80, "scale": 0.8 },
  { "at": 35, "opacity": 1, "y": 0, "scale": 1.15, "rotate": 0, "ease": "easeInOut" },
  { "at": 75, "opacity": 1, "y": -20, "scale": 1.0, "rotate": 180, "ease": "easeInOut" },
  { "at": 100, "opacity": 0, "y": -100, "scale": 0.4, "blur": 8, "ease": "easeIn" }
]
```

### Supported Keyframe Properties:
* `at`: Scroll progress percentage (`0` to `100`).
* `x`, `y`, `z`: 3D translations (supports `px`, `%`, `vw`, `vh`).
* `scale`: Uniform scale factor (e.g. `1.2`).
* `rotate`: 2D Z-axis rotation in degrees (`deg`).
* `rotateX`, `rotateY`: 3D pitch and yaw rotations in degrees (`deg`).
* `opacity`: Transparency (`0` to `1`).
* `blur`: Gaussian blur filter in pixels (`px`).
* `ease`: Easing curve (`'linear'`, `'ease'`, `'easeIn'`, `'easeOut'`, `'easeInOut'`).

### Example: HTML Data Attribute Usage
```html
<div
  class="floating-prism"
  data-trig-timeline='[
    { "at": 0, "opacity": 0, "y": 100, "scale": 0.5, "rotate": -30 },
    { "at": 40, "opacity": 1, "y": 0, "scale": 1.2, "rotate": 0 },
    { "at": 70, "opacity": 1, "y": -10, "scale": 1.0, "rotate": 180 },
    { "at": 100, "opacity": 0, "y": -80, "scale": 0.6, "rotate": 360 }
  ]'
>
  <h3>Multi-Step Artifact</h3>
</div>
```

---

## 6. Feature 4: Mobile & Tablet Performance Architecture

Mobile devices (phones and tablets) face unique hardware constraints:
1. Pinned 350vh sections lock users in an exhausting vertical scroll trap.
2. `filter: blur()` and 3D out-of-plane rotations (`rotateX`, `rotateY`) cause GPU battery drain and thermal throttling.

ChronoTrig provides **3 global mobile strategies**:

### Configuring Mobile Behavior:
```javascript
const trig = new ChronoTrig({
  mobileBehavior: 'lightweight', // 'disable' | 'lightweight' | 'full'
  mobileBreakpoint: 1024,        // Width threshold for phones and tablets
});
```

| Strategy | Performance | Behavior on Mobile / Tablet Screens |
| :--- | :--- | :--- |
| **`'disable'`** | **0% CPU** | Shuts down all RAF loops, scroll listeners, and observer checks. Elements immediately render in their clean, natural resting state (`opacity: 1`, `transform: none`). Tall pinned containers collapse to natural `height: auto`. |
| **`'lightweight'`** *(Recommended)* | **60/120 FPS** | Flattens 3D rotations to high-speed 2D compositor properties (`translate3d(x, y, 0)`, `scale()`, `rotate()`). Strips expensive `filter: blur()`. Auto-unpins tall scrolljacks (`h-auto`). Clamps stagger delays to $\le 0.04\text{s}$. |
| **`'full'`** | Desktop | Keeps full 3D spatial motion and pinned sections (recommended only for high-end workstations). |

### Per-Element Mobile Overrides:
```html
<!-- Automatically unpins and shows natural layout on screens < 1024px -->
<div data-trig-pin data-trig-disable-mobile="true" class="h-auto lg:h-[400vh]">
  ...
</div>

<!-- Or use a custom CSS media query -->
<div data-trig-pin data-trig-pin-media="(min-width: 1024px)">
  ...
</div>
```

---

## 7. Feature 5: Momentum Smoothing (Lerp) & Performance

ChronoTrig features built-in linear interpolation (Lerp) for silky mouse-wheel inertia:

```javascript
const engine = new ChronoTrig({
  lerp: 0.08, // 0 = direct/instant, 0.08 = silky, 0.04 = ultra-fluid inertia
});
```

* **FastDOM 2-Pass Architecture**:
  * Pass 1: **MEASURE** — Gathers all bounding rect measurements in memory without mutating styles.
  * Pass 2: **MUTATE** — Applies all CSS variables and hardware transforms in a single contiguous write batch.
  * **Zero layout reflow thrashing** guaranteed.
* **IntersectionObserver Gating**:
  * Off-screen elements are bypassed during scroll ticks. Only visible in-viewport elements compute math.

---

## 8. Complete API Reference

### HTML Data Attributes
| Attribute | Description | Default |
| :--- | :--- | :--- |
| `data-trig` | Activates standard Trig viewport tracking. | — |
| `data-trig-pin` | Marks element as a pinned scroll container. | `false` |
| `data-trig-pin-distance` | Virtual scroll depth (e.g. `"300vh"`, `"2500px"`). | `"200vh"` |
| `data-trig-pin-horizontal` | Converts vertical scroll into horizontal track translation. | `false` |
| `data-trig-disable-mobile` | Disables pinned scrolljacking on screens $< 1024\text{px}$. | `false` |
| `data-trig-pin-media` | Custom media query condition to activate pin (e.g. `"(min-width: 1024px)"`). | — |
| `data-trig-stagger` | Marks container for automatic child delay calculation. | `false` |
| `data-trig-stagger-mode` | Cascade pattern: `'linear'`, `'wave'`, `'center'`, `'reverse'`. | `'linear'` |
| `data-trig-stagger-delay` | Interval delay in seconds between staggered items. | `0.08` |
| `data-trig-timeline` | JSON string of multi-step keyframe steps. | — |
| `data-trig-direct` | When `true`, ChronoTrig updates CSS transform on GPU compositor directly. | `true` |
| `data-trig-var` | Sets `--trig` and `--trig-reverse` percentage variables. | `false` |

### CSS Custom Properties
| Variable | Value Format | Description |
| :--- | :--- | :--- |
| `--trig-pin-progress` | `0%` to `100%` | Current scroll completion inside pinned section. |
| `--trig-pin-t` | `0.000` to `1.000` | Normalized float representation of pinned progress. |
| `--trig-pin-deg` | `0deg` to `360deg` | Complete 360° rotation mapped to pinned progress. |
| `--trig-horizontal-x` | `0px` to `-Xpx` | Calculated translation for horizontal scrollers. |
| `--stagger-delay` | `0.000s` | Individual transition/animation delay for child items. |
| `--child-progress` | `0.000` to `1.000` | Individual item activation window progress. |
| `--trig-x`, `--trig-y`, `--trig-z` | `<val>px` or `%` | Interpolated 3D translations from timeline steps. |
| `--trig-scale` | `<float>` | Interpolated uniform scale factor. |
| `--trig-rotate` | `<float>deg` | Interpolated 2D rotation in degrees. |
| `--trig-opacity` | `0.000` to `1.000` | Interpolated opacity value. |

### JavaScript Class API
```typescript
const engine = new ChronoTrig({
  lerp?: number;
  mobileBehavior?: 'disable' | 'lightweight' | 'full';
  mobileBreakpoint?: number;
  debugMarkers?: boolean;
});

// Rescan DOM for dynamically added elements
engine.scan();

// Subscribe to unified RAF tick
const unsubscribe = engine.subscribe(({ scrollY, direction, progress, isMobile }) => {
  console.log(progress, isMobile);
});

// Update mobile strategy at runtime
engine.setMobileBehavior('lightweight');

// Toggle debug markers
engine.setDebugMarkers(true);

// Cleanup on unmount
engine.destroy();
```

---

## 9. Production-Ready Recipes

### Recipe 1: Smart Auto-Hiding Navbar
```html
<header class="navbar">Brand · Links · CTA</header>
```
```css
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
/* ChronoTrig automatically toggles these classes on document.body */
body.trig-scroll-down .navbar { transform: translateY(-100%); }
body.trig-scroll-up .navbar   { transform: translateY(0); }
```

### Recipe 3: Trig-Animations.css Ready-Made Entrances
```html
<link rel="stylesheet" href="./trig-animations.css" />

<!-- Elements automatically animate when appearing in viewport -->
<div class="fadeInUp" data-trig>Fades in and slides up</div>
<div class="zoomIn trig-delay-200" data-trig>Zooms in with a 200ms delay</div>
<div class="flipInX trig-duration-1000" data-trig>3D card flip</div>
```

---

## 10. Default Trig.js Features & Backward Compatibility

ChronoTrig is an exact drop-in replacement for Trig.js v4.2.1. It retains 100% compatibility with all original attributes, dataset intervals, body milestones, and animations:

### 1. The 3 Standard CSS Variables
- `--trig` & `--trig-reverse`: Normalized percentage (`-100%` to `100%`).
- `--trig-px` & `--trig-px-reverse`: Offset in raw pixels.
- `--trig-deg` & `--trig-deg-reverse`: Angle in degrees (`0deg` to `360deg`).

### 2. 10-Step Dataset Increment Selectors
ChronoTrig updates `data-trig-var`, `data-trig-pixels`, and `data-trig-degrees` in intervals of 10:
```css
[data-trig-var="50"] { transform: scale(1.1); }
[data-trig-var="80"] { opacity: 0.9; }
[data-trig-var="100"] { opacity: 1; }
```

### 3. Global CSS Variables (`data-trig-global="true"`)
Sets `--trig-[id]`, `--trig-[id]-px`, `--trig-[id]-deg` on `document.documentElement.style`, allowing cross-component coordination.

### 4. Automated Body Classes
- `trig-scroll-down`, `trig-scroll-up`
- `trig-scroll-top`, `trig-scroll-bottom`
- `trig-scroll-25`, `trig-scroll-50`, `trig-scroll-75`

### 5. Trig-Animations.css Suite
Predefined hardware-accelerated animations:
- `.fadeIn`, `.fadeInUp`, `.fadeInDown`, `.fadeInLeft`, `.fadeInRight`
- `.zoomIn`, `.zoomInUp`, `.zoomInDown`, `.zoomOut`
- `.flipInX`, `.flipInY`
- `.rotateIn`, `.rotateInDownLeft`, `.rotateInDownRight`
- `.bounceIn`, `.bounceInUp`, `.bounceInDown`
- `.slideInUp`, `.slideInDown`, `.slideInLeft`, `.slideInRight`
- Delays: `.trig-delay-100` through `.trig-delay-1000`
- Durations: `.trig-duration-300` through `.trig-duration-2000`

---

## License
MIT License. Created for production web applications and modern creative scrollytelling.
