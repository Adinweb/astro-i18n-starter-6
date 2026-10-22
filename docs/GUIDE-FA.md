# راهنمای جامع Astro i18n Starter

> استارتر چندزبانهٔ تولیدی بر پایهٔ **Astro v7** با پشتیبانی بومی **RTL/LTR**،
> مسیریاب ایستا (SSG)، چندزبانه‌سازی کامل، دسته‌بندی و صفحه‌بندی وبلاگ،
> جستجوی Pagefind، و مجموعه‌ای از ۱۳ ابزار خط فرمان برای مدیریت محتوا.

نسخهٔ ۵٫۰ — مرجع فنی کامل و راهنمای عملیاتی.

---

## فهرست

1. [ویژگی‌ها](#۱-ویژگیها)
2. [راه‌اندازی سریع](#۲-راهاندازی-سریع)
3. [نقشهٔ پروژه](#۳-نقشهٔ-پروژه)
4. [منبع حقیقت واحد (SSOT)](#۴-منبع-حقیقت-واحد-ssot)
5. [سیستم مسیر و زبان](#۵-سیستم-مسیر-و-زبان)
6. [محتوا](#۶-محتوا)
7. [مجموعهٔ CLI](#۷-مجموعهٔ-cli)
8. [مدیریت زبان](#۸-مدیریت-زبان)
9. [RTL و ویژگی‌های منطقی](#۹-rtl-و-ویژگیهای-منطقی)
10. [سیستم طراحی](#۱۰-سیستم-طراحی)
11. [چیدمان صفحه: BaseLayout](#۱۱-چیدمان-صفحه-baselayout)
12. [صفحات، نماها و مسیریاب](#۱۲-صفحات-نماها-و-مسیریاب)
13. [وبلاگ](#۱۳-وبلاگ)
14. [جستجو](#۱۴-جستجو)
15. [SEO، متادیتا و endpointها](#۱۵-seo-متادیتا-و-endpointها)
16. [دسترس‌پذیری](#۱۶-دسترسپذیری)
17. [تست و اعتبارسنجی](#۱۷-تست-و-اعتبارسنجی)
18. [استقرار](#۱۸-استقرار)
19. [عیب‌یابی](#۱۹-عیبیابی)
20. [توسعه با عامل هوش مصنوعی](#۲۰-توسعه-با-عامل-هوش-مصنوعی)
21. [پیوست A — مرجع سریع فرمان‌ها](#پیوست-a--مرجع-سریع-فرمانها)
22. [پیوست B — کلیدهای ترجمه](#پیوست-b--کلیدهای-ترجمه)
23. [پیوست C — مرجع API داخلی](#پیوست-c--مرجع-api-داخلی)

### نمایهٔ کارهای پرتکرار

| می‌خواهم… | بخش |
| --- | --- |
| پروژه را نصب و اجرا کنم | [۲. راه‌اندازی سریع](#۲-راهاندازی-سریع) |
| ساختار فایل‌ها را بفهمم | [۳. نقشهٔ پروژه](#۳-نقشهٔ-پروژه) |
| رنگ، برند یا تنظیمات سایت را عوض کنم | [۴. منبع حقیقت واحد](#۴-منبع-حقیقت-واحد-ssot) |
| زبان پیش‌فرض یا پیشوندها را عوض کنم | [۵. سیستم مسیر و زبان](#۵-سیستم-مسیر-و-زبان) |
| صفحه یا مقالهٔ جدید بسازم / حذف کنم | [۷. مجموعهٔ CLI](#۷-مجموعهٔ-cli) |
| زبان جدید اضافه یا حذف کنم | [۸. مدیریت زبان](#۸-مدیریت-زبان) |
| مشکل RTL یا فونت دارم | [۹. RTL](#۹-rtl-و-ویژگیهای-منطقی) |
| توکن‌ها و استایل‌ها را تغییر دهم | [۱۰. سیستم طراحی](#۱۰-سیستم-طراحی) |
| صفحه‌بندی، فیلتر یا JSON-LD وبلاگ را تغییر دهم | [۱۳. وبلاگ](#۱۳-وبلاگ) |
| جستجو را تنظیم کنم | [۱۴. جستجو](#۱۴-جستجو) |
| متادیتای SEO و endpointها را تغییر دهم | [۱۵. SEO](#۱۵-seo-متادیتا-و-endpointها) |
| تست و ممیزی را اجرا کنم | [۱۷. تست و اعتبارسنجی](#۱۷-تست-و-اعتبارسنجی) |
| سایت را منتشر کنم | [۱۸. استقرار](#۱۸-استقرار) |
| خطا را رفع کنم | [۱۹. عیب‌یابی](#۱۹-عیبیابی) |
| فرمان یا پرچم خاصی را پیدا کنم | [پیوست A](#پیوست-a--مرجع-سریع-فرمانها) |
| کلید ترجمه را پیدا کنم | [پیوست B](#پیوست-b--کلیدهای-ترجمه) |
| تابع داخلی را پیدا کنم | [پیوست C](#پیوست-c--مرجع-api-داخلی) |

---

## ۱. ویژگی‌ها

| حوزه | قابلیت |
| --- | --- |
| **زبان‌ها** | ۵ زبان (`en`, `de`, `fr`, `fa`, `ar`)، دو زبان RTL، زبان پیش‌فرض بدون پیشوند، `og:locale` خودکار |
| **مسیریابی** | دیسپچر تک‌فایلی `[...path].astro` — بدون هیچ فایل مسیر پویا در `src/pages/` |
| **محتوا** | دو کالکشن `pages` و `blog` با قرارداد `گروه/زبان.mdx`، فیلتر پیش‌نویس، اسلاگ بومی هر زبان، تشخیص برخورد مسیر |
| **RTL** | خواص منطقی CSS (`ms-`, `pe-`, `start-`), فونت جداگانه برای فارسی/عربی، جداسازی `pre/code` به LTR، چرخاندن آیکون پیجر |
| **وبلاگ** | دسته‌بندی، برچسب، فیلتر ترکیبی سمت کاربر، صفحه‌بندی استایک، زمان مطالعه، خرده‌مسیر، JSON-LD مقاله |
| **جستجو** | Pagefind در پروداکشن + فهرست توسعه به‌عنوان fallback، میان‌بر ⌘K/Ctrl+K، بدون رفت‌وبرگشت شبکه |
| **SEO** | canonical، hreflang چندزبانه + `x-default`، Open Graph، Twitter Card، JSON-LD، sitemap، `robots.txt`، RSS/Atom، webmanifest |
| **۴۰۴** | صفحهٔ locale-aware با تشخیص زبان از پیشوند URL و لینک «نسخهٔ انگلیسی» |
| **ابزار CLI** | ۱۳ اسکریپت برای ساخت/حذف صفحه و مقاله، افزودن/حذف زبان، مدیریت کلید ترجمه، استخراج متن، تبدیل RTL، تولید تصاویر |
| **کیفیت** | TypeScript strict، `astro check`، ۹۸ تست Vitest، ممیزی i18n پنج‌مرحله‌ای، تست دود ۹۶ assertion، Knip، CI آمادهٔ GitHub Actions |
| **کارایی** | خروجی کاملاً استایک، تصاویر WebP با `srcset`، فونت‌های variable خودمیزبان، `transition:persist`، `compressHTML` |
| **دسترس‌پذیری** | لینک پرش به محتوا، `aria-current`، `aria-live`، نشانگر فوکوس، `<dialog>` بومی، `prefers-reduced-motion` |

---

## ۲. راه‌اندازی سریع

### پیش‌نیازها

- **Node.js ≥ ۲۲٫۱۲** (در `engines` تعریف شده)
- **pnpm ۱۲٫۱۰٫۱** (در `packageManager` قفل شده)

### نصب و اجرا

```bash
pnpm install

pnpm dev          # کامپایل پیام‌ها + سرور توسعه روی http://localhost:4321
pnpm build        # کامپایل پیام‌ها + ممیزی i18n + بیلد Astro + ایندکس Pagefind
pnpm preview      # پیش‌مایش خروجی بیلدشده
```

> سرور توسعه روی `0.0.0.0:4321` گوش می‌دهد؛ هر دو مقدار از `app.config.json`
> خوانده می‌شوند، پس سرور و اپ همیشه روی یک پورت هستند.

### وابستگی‌ها

| وابستگی | نقش |
| --- | --- |
| `astro` | هستهٔ SSG (نسخهٔ ۷) |
| `@astrojs/mdx` | رندر فایل‌های `.mdx` به‌عنوان محتوای کالکشن |
| `@inlang/paraglide-js` | کامپایل فرهنگ‌ها به توابع پیام در `src/paraglide/` |
| `@tailwindcss/vite` + `tailwindcss` | Tailwind v4 از طریق Vite، بدون فایل پیکربندی جدا |
| `@fontsource-variable/vazirmatn` | فونت variable فارسی |
| `@fontsource-variable/noto-sans-arabic` | فونت variable عربی |
| `pagefind` | ساخت ایندکس جستجوی ایستا در مرحلهٔ بیلد |
| `magic-string` | ویرایش امن کلاس‌های Tailwind در `block:adapt` |
| `sharp` (dev) | برش و رمزنگاری تصویر کارت اجتماعی |
| `vitest` (dev) | اجرای تست‌های واحد |
| `knip` (dev) | تشخیص فایل/اکسپورت/وابستگی مرده |
| `@astrojs/check` + `typescript` (dev) | `astro check` و `tsc --noEmit` |

> نسخهٔ دقیق وابستگی‌ها در `package.json` قفل شده و `pnpm-lock.yaml` آن‌ها را
> تثبیت می‌کند؛ در CI از `pnpm install --frozen-lockfile` استفاده می‌شود.

### مدیریت سرور توسعه

Astro v7 سرور توسعه را می‌تواند به‌صورت پس‌زمینه اجرا کند؛ این برای محیط‌های
CI و عامل‌های خودکار ضروری است:

```bash
pnpm exec astro dev --background   # اجرا در پس‌زمینه (و قفل کردن پورت)
pnpm exec astro dev status         # وضعیت سرور در حال اجرا
pnpm exec astro dev logs --follow  # دنبال کردن لاگ همان سرور
pnpm exec astro dev stop           # توقف سرور
```

پرچم‌های مهم `astro dev`:

| پرچم | کار |
| --- | --- |
| `--background` | اجرای سرور به‌صورت پس‌زمینه |
| `--port <port>` | تغییر پورت (پیش‌فرض از `app.config.json`) |
| `--host` / `--host <address>` | گوش دادن روی همهٔ نشانی‌ها یا یک نشانی مشخص |
| `--mode <mode>` | حالت Vite (پیش‌فرض `development`) |
| `--open` | باز کردن مرورگر پس از بالا آمدن سرور |
| `--force` | پاک‌کردن کش لایهٔ محتوا و بیلد کامل |
| `--ignore-lock` | اجرا حتی اگر سرور دیگری روی همان پورت قفل دارد |
| `--allowed-hosts <list>` | فهرست hostهای مجاز (یا `all`) |

### همهٔ فرمان‌های `package.json`

| فرمان | کار |
| --- | --- |
| `pnpm dev` | کامپایل پیام‌ها + `astro dev` |
| `pnpm run messages:compile` | کامپایل دستی `messages/*.json` به `src/paraglide/` |
| `pnpm run check` | فقط `astro check` |
| `pnpm run lint` | کامپایل پیام‌ها + `astro check` + `tsc --noEmit` |
| `pnpm test` | کامپایل پیام‌ها + `vitest run` |
| `pnpm run build` | کامپایل پیام‌ها + ممیزی i18n + `astro build` + `pagefind --site dist` |
| `pnpm preview` | `astro preview` روی خروجی `dist/` |
| `pnpm run smoke` | تست دود روی `dist/` (۹۶ assertion) |
| `pnpm run knip` | فایل/اکسپورت/وابستگی مرده |
| `pnpm run assets:generate` | بازتولید آیکون‌ها، کارت OG و artwork هیرو/کاور |
| `pnpm run clean` | حذف `dist/`، `.astro/` و `src/paraglide/` |
| `pnpm run new:page` | ساخت/ویرایش صفحهٔ ایستا |
| `pnpm run new:post` | ساخت/ویرایش مقالهٔ وبلاگ |
| `pnpm run remove:page` | حذف صفحه (یا فقط یک زبانش) |
| `pnpm run remove:post` | حذف مقاله |
| `pnpm run i18n:add-lang` | افزودن زبان جدید |
| `pnpm run i18n:remove-lang` | حذف زبان |
| `pnpm run i18n:add` | افزودن یک کلید ترجمه |
| `pnpm run i18n:add-batch` | افزودن گروهی کلیدها |
| `pnpm run i18n:extract` | استخراج متن سخت‌کد از قالب |
| `pnpm run block:adapt` | تبدیل بلوک Tailwind به خواص منطقی |
| `pnpm run audit:i18n` | ممیزی چندزبانه (۵ مرحله) |

### ساخت برای انتشار

```bash
SITE_URL=https://example.com pnpm run build
```

بدون `SITE_URL` بیلد با هشدار انجام می‌شود و از مبدأ توسعه استفاده می‌کند؛
اما در **CI** (`CI=true`) یا با `ASTRO_REQUIRE_SITE_URL=1` بیلد بدون `SITE_URL`
**با خطا متوقف می‌شود** تا آدرس placeholder هرگز منتشر نشود.

---

## ۳. نقشهٔ پروژه

```text
/
├── app.config.json          # SSOT: سایت، برند، صفحه‌بندی وبلاگ، سرور توسعه
├── astro.config.mjs         # Astro: site، trailingSlash، MDX، Tailwind، سرور
├── knip.json                # پیکربندی تشخیص کد مرده
├── tsconfig.json            # TypeScript strict + alias `@/*` → `src/*`
├── vitest.config.ts         # Vitest: alias `@` و mock ماژول `astro:content`
├── pnpm-workspace.yaml      # اجازهٔ build برای esbuild در pnpm
├── pnpm-lock.yaml           # قفل نسخه‌های وابستگی‌ها
├── .npmrc                   # تنظیمات npm/pnpm
├── .env.example             # نمونهٔ متغیر محیطی (SITE_URL)
├── messages/                # فرهنگ لغت‌ها: en.json, de.json, fr.json, fa.json, ar.json
├── project.inlang/          # پیکربندی کامپایلر Paraglide (settings.json)
├── public/                  # favicon، آیکون‌ها، کارت OG پیش‌فرض
├── scripts/                 # ۱۳ اسکریپت CLI
│   └── lib/                 # کتابخانهٔ مشترک: locales, frontmatter, image-reference,
│                            # content-stub, prompt
├── .github/workflows/ci.yml # CI: lint → test → audit → build → smoke → knip
├── .agents/skills/         # مهارت عملیاتی برای عامل‌های AI
│   └── astro-i18n-starter/SKILL.md
├── docs/                   # GUIDE-FA.md (این راهنما)، PRD.md، PLAYBOOKS.md،
│                         # SPIKE_RESULTS.md
└── src/
    ├── assets/hero/hero-0.jpg  # عکس مشترک هیرو (پس‌زمینهٔ پیش‌فرض)
    ├── components/          # Icon, IconButton, LanguageSwitcher, PageHero, HeroCopy,
    │                        # BlogPostHeroContent, PostCard, SearchModal, Seo, TopLoadingBar
    ├── content/
    │   ├── pages/<گروه>/    # صفحات ایستا: en.mdx, de.mdx, fa.mdx, … + <گروه>.png
    │   └── blog/<گروه>/     # مقالات: en.mdx, fa.mdx, … + <گروه>.png
    ├── content.config.ts    # شمای Zod هر دو کالکشن
    ├── i18n/
    │   ├── locales.ts       # SSOT زبان‌ها: LOCALES, DEFAULT_LOCALE, LOCALE_METADATA
    │   ├── config.ts        # barrel ساده: همهٔ ثابت‌های locales.ts
    │   └── paths.ts         # localizeHref, localeHref, stripLocale, getPathname
    ├── layouts/BaseLayout.astro
    ├── libs/
    │   ├── config/
    │   │   ├── app.ts       # خواندن و اعتبارسنجی app.config.json
    │   │   └── navigation.ts# ساخت ناوبری هدر/منوی موبایل/فوتر
    │   └── content/         # entries, service, pagination, blog, taxonomy, social
    ├── pages/               # فقط فایل‌های فیزیکی
    │   ├── [...path].astro  # دیسپچر مسیریاب (۳۹ خط)
    │   ├── 404.astro        # صفحهٔ ۴۰۴ locale-aware
    │   ├── icons.svg.ts     # اسپرایت SVG
    │   ├── site.webmanifest.ts
    │   ├── rss.xml.ts       # فید Atom
    │   ├── sitemap.xml.ts   # نقشهٔ سایت چندزبانه
    │   ├── robots.txt.ts
    │   └── api/search-dev.json.ts
    ├── paraglide/           # ⚠️ تولیدشده — هرگز دستی ویرایش نشود
    ├── styles/              # global.css (توکن‌ها + سیستم شیشه‌ای)، prose.css
    ├── test/                # mock ماژول astro:content برای Vitest
    └── views/               # PageView, BlogIndexView, BlogPostView
```

---

## ۴. منبع حقیقت واحد (SSOT)

هر مقداری فقط **یک** جا زندگی می‌کند. اگر دو جا نگه‌داری شود، آن‌ها به‌مرور از هم جدا می‌افتند.

| مقدار | محل واحد |
| --- | --- |
| نام سایت، رنگ برند، OG، اندازهٔ آیکون | `app.config.json` → `src/libs/config/app.ts` (`siteConfig`) |
| تعداد مقالات هر صفحه | `app.config.json` → `blog.postsPerPage` → `POSTS_PER_PAGE` |
| میزبان/پورت سرور | `app.config.json` → `astro.config.mjs` |
| فهرست زبان‌ها و زبان پیش‌فرض | `src/i18n/locales.ts` ↔ `project.inlang/settings.json` |
| جهت، `lang`، فونت هر زبان | `LOCALE_METADATA` در `src/i18n/locales.ts` |
| مسیرها و URLها | `src/i18n/paths.ts` |
| اسلاگ‌ها و نسخه‌های جایگزین | `src/libs/content/service.ts` |
| قواعد فرانت‌متر | `src/content.config.ts` |
| متن‌های رابط کاربری | `messages/<locale>.json` → کامپایل به `src/paraglide/` |
| طرح رنگ و سیستم شیشه‌ای | `src/styles/global.css` |
| قواعد ساخت slug و taxonomy | `src/content.config.ts` (Zod) |

### `app.config.json` — نمونهٔ کامل

```json
{
  "site": {
    "name": "Astro i18n Starter",
    "shortName": "Astro i18n",
    "description": "Production-grade, multi-lingual Astro v7 starter template with RTL support.",
    "socialImage": { "path": "/og-default.png", "width": 1200, "height": 630 }
  },
  "brand": {
    "themeColor": "#4338ca",
    "backgroundColor": "#f8fafc",
    "appleTouchIcon": { "file": "apple-touch-icon.png", "size": 180 },
    "icons": [
      { "file": "icon-192.png", "size": 192, "purpose": "any" },
      { "file": "icon-512.png", "size": 512, "purpose": "any" }
    ]
  },
  "blog": { "postsPerPage": 9 },
  "server": { "host": "0.0.0.0", "port": 4321 }
}
```

مقادیر با **Zod** در `src/libs/config/app.ts` اعتبارسنجی می‌شوند؛ خطای اعتبارسنجی
بیلد را متوقف می‌کند. قواعد:

| فیلد | قاعده |
| --- | --- |
| `site.name` / `shortName` / `description` | رشتهٔ غیرخالی |
| `site.socialImage.path` | باید با `/` شروع شود |
| `site.socialImage.width` / `height` | عدد صحیح مثبت |
| `brand.themeColor` / `backgroundColor` | hex شش‌رقمی (`#4338ca`) |
| `brand.icons` | آرایهٔ غیرخالی از `{ file, size, purpose }` |
| `blog.postsPerPage` | عدد صحیح مثبت |
| `server.port` | عدد صحیح بین ۱ و ۶۵۵۳۵ |
| `server.host` | رشتهٔ غیرخالی |

### `project.inlang/settings.json`

```json
{
  "$schema": "https://inlang.com/schema/project-settings",
  "baseLocale": "en",
  "locales": ["en", "de", "fr", "fa", "ar"],
  "modules": [
    "https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@4.4.0/dist/index.js",
    "https://cdn.jsdelivr.net/npm/@inlang/plugin-m-function-matcher@2.2.6/dist/index.js"
  ],
  "plugin.inlang.messageFormat": { "pathPattern": "./messages/{locale}.json" }
}
```

`baseLocale` باید با `DEFAULT_LOCALE` در `src/i18n/locales.ts` یکی باشد؛ ممیزی i18n
این تطابق را بررسی می‌کند.

### تغییر رنگ برند

دو رنگ `themeColor` و `backgroundColor` در `app.config.json` هستند، ولی رنگ اصلی
UI از توکن `--color-primary` در `src/styles/global.css` می‌آید. برای هماهنگی کامل
این دو را با هم تغییر دهید:

```css
@theme inline {
  --color-primary: oklch(50% 0.2 260);   /* ← رنگ اصلی */
}
```

### `tsconfig.json` و `vitest.config.ts`

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["node"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- `astro/tsconfigs/strict` حالت سخت‌گیرانهٔ TypeScript را روشن می‌کند.
- alias `@/*` → `src/*` است و همان مسیر در `astro.config.mjs` و `vitest.config.ts`
  هم تعریف شده، تا مسیرها در همه‌جا یکی باشند.
- در Vitest ماژول `astro:content` با `src/test/astro-content-mock.ts` جایگزین
  می‌شود تا تست‌های واحد بدون بیلد Astro اجرا شوند:

`vitest.config.ts`:

```ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    'astro:content': path.resolve(__dirname, './src/test/astro-content-mock.ts'),
  },
},
test: { environment: 'node' },
```

---

## ۵. سیستم مسیر و زبان

### قاعدهٔ پیشوند

- **زبان پیش‌فرض (`en`) بدون پیشوند** است: `/`، `/about/`، `/blog/first-post/`
- **سایر زبان‌ها با پیشوند**: `/de/about/`، `/fa/درباره-ما/`
- هرگز در کد مسیر ثابت ننویسید — همیشه از توابع استفاده کنید:

```ts
import { localizeHref, localeHref, stripLocale, getPathname, withTrailingSlash }
  from '@/i18n/paths';

localizeHref('/about', 'fa');     // → "/fa/about/"
localizeHref('/', 'fa');          // → "/fa/"
localeHref('/about/', 'de');      // → "/de/about/"
stripLocale('/fa/about/');        // → { locale: 'fa', pathname: '/about' }
getPathname('/blog/?x=1#y');      // → "/blog"   (بدون query و hash)
withTrailingSlash('/blog');       // → "/blog/"  (برای صفحات canonical)
```

> `localeHref(currentPath, targetLocale, alternates?)` اگر `alternates` را بگیرید،
> از نگاشت آمادهٔ همان صفحه استفاده می‌کند (اسلاگ بومی هر زبان) و در غیر این
> صورت از همان `currentPath` با پیشوند جدید می‌سازد.
>
> `getPathname()` هرگز اسلش انتهایی ندارد (جز ریشه) تا دو URL که یک مسیر را
> نشان می‌دهند برابر بمانند؛ canonicalization کارِ `withTrailingSlash()` است.
> مسیرهای فایلی (`/sitemap.xml`) اسلش انتهایی نمی‌گیرند.

### عوض کردن زبان پیش‌فرض

دو فایل را با هم عوض کنید:

```ts
// src/i18n/locales.ts
export const DEFAULT_LOCALE: Locale = 'fa';
```

```json
// project.inlang/settings.json
{ "baseLocale": "fa" }
```

سپس:

```bash
pnpm run messages:compile && pnpm test && pnpm run audit:i18n && pnpm run build && pnpm run smoke
```

نتیجه: فارسی به `/` و `/darbare-ma/` می‌رود و انگلیسی به `/en/`، `/en/about/`.

> ⚠️ تعویض زبان پیش‌فرض یک تغییر **ساختاری** در URLهاست. قبل از انجام، برای
> ریدایرکت‌های ۳۰۱ از سرور/CDN برنامه‌ریزی کنید.

### تعویض زبان در سمت کاربر

تعویض زبان **همیشه** با بارگذاری کامل صفحه انجام می‌شود، نه با ناوبری SPA:

```ts
window.location.assign(target);   // ✅
```

دلیل: `<html lang dir>`، پشتهٔ فونت و شبه‌کلاس `:lang()` باید دوباره اعمال شوند.
زبانی که ترجمه‌ای برای صفحهٔ فعلی ندارد در منو **غیرفعال** (`aria-disabled`)
نمایش داده می‌شود تا کاربر به صفحهٔ ۴۰۴ نرود.

---

## ۶. محتوا

### ساختار پوشه‌ها و شناسهٔ ورودی

هر گروه محتوا یک پوشه است و **هر زبان یک فایل** در همان پوشه:

```text
src/content/pages/about/
├── en.mdx   de.mdx   fr.mdx   fa.mdx   ar.mdx
└── about.png          ← artwork گروه (پس‌زمینهٔ هیرو)
```

شناسهٔ (ID) هر ورودی = `<گروه>/<زبان>` — مثلاً `about/fa`. این ID منبع حقیقت
گروه و زبان است و توسط `generateId` در `src/content.config.ts` ساخته می‌شود.

### شمای Zod (`src/content.config.ts`)

هر دو کالکشن یک شمای پایه دارند؛ `blog` فقط `publishedAt` را اجباری می‌کند.

| فیلد | نوع | اجباری | قاعده |
| --- | --- | --- | --- |
| `title` | string | ✅ | حداقل یک کاراکتر |
| `slug` | string | ✅* | حروف/ارقام/mark یونیکد؛ جداکننده فقط `-`، ZWNJ (`U+200C`)، ZWJ (`U+200D`)؛ بدون تکرار |
| `description` | string | — | برای SEO و کارت OG |
| `image` | image | — | مسیر **نسبت به فایل محتوا**؛ فایل باید وجود داشته باشد وگرنه بیلد شکست می‌خورد |
| `author` | string | — | نام نویسنده؛ در JSON-LD به `Person` تبدیل می‌شود |
| `publishedAt` | date | ✅ (وبلاگ) | `z.coerce.date()` — رشتهٔ ISO هم پذیرفته است |
| `updatedAt` | date | — | در `dateModified` و `lastmod` نقشهٔ سایت استفاده می‌شود |
| `categories` | string[] | — | پیش‌فرض `[]`؛ کلیدها فقط `a-z0-9` با خط تیرهٔ تک |
| `tags` | string[] | — | همان قاعده |
| `draft` | boolean | — | پیش‌فرض `false`؛ `true` یعنی منتشر نمی‌شود |

\* برای صفحهٔ `home` اسلاگ خالی مجاز است.

> تصویر با helper رسمی `image()` از `astro:content` رزولو می‌شود: مسیر را نسبت
> به فایل محتوا تفسیر می‌کند، وجود فایل را چک می‌کند و `ImageMetadata` آماده
> تحویل می‌دهد. کامپوننت‌ها هرگز خودشان مسیر تصویر را نمی‌خوانند.

### فرانت‌متر صفحات

```mdx
---
title: "درباره ما"
slug: "darbare-ma"
description: "دربارهٔ اهداف و معماری چندزبانهٔ این وب‌سایت بیشتر بدانید."
image: "./about.png"
draft: false
---
```

### فرانت‌متر مقالات

```mdx
---
title: "روندهای فناوری ۲۰۲۶"
slug: "tech-trends"
description: "روندهای نوظهور در توسعهٔ وب مدرن."
publishedAt: 2026-10-07
updatedAt: 2026-10-12
image: "./tech-trends.png"
categories: ["engineering"]
tags: ["astro", "performance"]
author: "نام نویسنده"
draft: false
---
```

### API محتوا — `src/libs/content/entries.ts`

| تابع | کار |
| --- | --- |
| `parseContentEntryId(id)` | `<گروه>/<زبان>` → `{ group, locale }`؛ برای ID بدشکل یا زبان ثبت‌نشده **خطا** می‌دهد |
| `isPublished(entry)` | تنها جایی که `draft` فیلتر می‌شود |
| `sortByPublishedAtDesc(entries)` | جدیدترین اول، بدون تغییر دادن آرایهٔ اصلی |
| `groupPublishedEntries(entries, name)` | `Map<گروه, Map<زبان, ورودی>>`؛ ورودی تکراری `گروه/زبان` خطاست |
| `getPublishedLocaleEntries(entries, locale)` | ورودی‌های منتشرشدهٔ یک زبان |
| `getSortedLocaleEntries(entries, locale)` | همان، مرتب‌شده بر اساس تاریخ |

### API مسیر — `src/libs/content/service.ts`

| تابع | کار |
| --- | --- |
| `getBlogIndexHref(locale)` | `/blog/` (محلی‌شده) |
| `getBlogPageHref(page, locale)` | صفحهٔ ۱ → ایندکس؛ صفحهٔ n → `/blog/page/n/` |
| `getBlogPostHref(slug, locale)` | `/blog/<اسلاگ>/` (محلی‌شده) |
| `getPageUrl(group, locale)` | URL صفحهٔ ایستا یا `null` اگر آن زبان ترجمه ندارد |
| `getSiteRoutes()` | همهٔ مسیرهای سایت از روی محتوا |
| `buildSiteRoutes(pages, posts)` | نسخهٔ خالص (تست‌پذیر) همان کار |
| `getBreadcrumbs(url, locale, labels)` | خرده‌مسیر `{ label, href }[]` |

قواعد سخت‌افزاری‌ای که `buildSiteRoutes` اعمال می‌کند:

- **برخورد مسیر** → خطا: `[ContentService] Duplicate route collision detected at URL: "…"`
- **نبود صفحهٔ خانهٔ زبان پیش‌فرض** → خطا
- **اسلاگ خالی در صفحه‌ای غیر از home** → خطا
- **اسلاگ خالی در مقاله** → خطا
- زبانی که مقالات کمتری دارد، در `alternates` به **آخرین صفحهٔ خودش** برمی‌گردد،
  تا تعویض زبان هرگز به URL ناموجود نرسد.

### برچسب‌های نمایشی دسته و برچسب

کلیدهای دسته/برچسب **بی‌زبان** هستند و برچسب نمایشی آن‌ها از فرهنگ لغت می‌آید:

- `blog_category_<key>` — مثلاً `blog_category_engineering`
- `blog_tag_<key>` — مثلاً `blog_tag_astro`

کلید ناشناخته خودکار به شکل انسانی نمایش داده می‌شود (`design-systems` → `Design Systems`)
و هرگز بیلد را نمی‌شکند (`src/libs/content/taxonomy.ts`).

### تصاویر

- artwork هر گروه **کنار** فایل‌های محتوای همان گروه ذخیره می‌شود، چون فرانت‌متر
  نسبت به فایل محتوا تفسیر می‌شود.
- تصویر **پس‌زمینهٔ تمام‌عرض** بخش هیرو است — نه یک کارت کنار متن.
- با `<Image />` رندر می‌شود: خروجی WebP، `srcset` واکنش‌گرا، بدون بزرگ‌نمایی.
- کارت‌های وبلاگ کاور را با `sizes="(min-width: 1024px) 310px, (min-width: 640px) 50vw, 100vw"`
  می‌دهند؛ هیرو با `sizes="100vw"`.
- مقدار `--image` می‌تواند نسبت به پوشهٔ گروه یا نسبت به ریشهٔ پروژه باشد؛
  اسکریپت آن را به ارجاعی نسبت به فایل محتوا تبدیل می‌کند و در صورت نیاز
  فایل را داخل پوشهٔ گروه کپی می‌کند. در Git Bash مسیرهای مطلق به‌هم می‌ریزند
  (`/images/x.png` → `C:/Program Files/Git/images/x.png`) و همین حالت هم اصلاح
  می‌شود.

### بخش هیرو — `src/components/PageHero.astro`

هیرو یک بخش تمام‌عرض است که **تصویر خودش پس‌زمینهٔ آن است**. یعنی یک لایهٔ
تصویر، نه یک کارت کنار متن و نه دو لایهٔ تکراری.

| لایه | کار |
| --- | --- |
| `<Image />` | خودِ artwork؛ `blur-md` + `scale-105` تا لبهٔ نرم آن پنهان بماند و عکس مثل «اتمسفر» خوانده شود نه رقیبِ متن |
| `bg-fg/35` | شست‌وشوی رنگی: عکس را به پایهٔ تیرهٔ تم نزدیک می‌کند |
| `bg-linear-to-t from-fg/95 …` | پردهٔ عمودی: کپیِ روی عکس خوانا می‌ماند |
| `h-36 bg-linear-to-b from-fg/75` | شست‌وشوی زیر هدر ثابت تا ناوبری کنتراستش را از دست ندهد |

هر سه پرده **عمودی یا تخت** هستند، پس باند هیرو در LTR و RTL یکسان دیده می‌شود؛
پردهٔ افقی به نسخهٔ `rtl:` نیاز داشت و به همین دلیل وجود ندارد.

متن هیرو از اسلات می‌آید و خود `PageHero` هیچ کپی‌ای نمی‌سازد:

```astro
<PageHero image={entry.data.image}>
  <HeroCopy title={entry.data.title} description={entry.data.description} />
</PageHero>
```

- صفحه‌ها و ایندکس وبلاگ → `HeroCopy` با `size="page"`
- مقاله → `BlogPostHeroContent` (که خودش `HeroCopy` را با `size="post"` می‌سازد)

لایهٔ تصویر با `transition:persist` و کلیدی که از **مسیر** تصویر ساخته می‌شود
حمل می‌شود (`hero-backdrop:<src>`): همان artwork دوباره رمزگشایی نمی‌شود و artwork
دیگری همیشه جایگزینش می‌شود.

> ❌ هیرو را به یک کارت کنار متن تبدیل نکنید و لایهٔ تصویر را تکرار نکنید.

---

## ۷. مجموعهٔ CLI

همهٔ اسکریپت‌ها از طریق `pnpm run` اجرا می‌شوند. اسکریپت‌های مخرب قبل از حذف
تأیید می‌گیرند؛ در محیط غیرتعاملی بدون `--force` رد می‌شوند.

### ۷.۱ ساخت صفحهٔ ایستا — `new:page`

```bash
pnpm run new:page contact --title="Contact Us" --from=en
```

خروجی: `src/content/pages/contact/{en,de,fr,fa,ar}.mdx` با اسلاگ بومی هر زبان،
ثبت کلید `nav_contact` در همهٔ فرهنگ‌ها و اشارهٔ `image` به `./contact.png`.

| گزینه | کار |
| --- | --- |
| `--title="…"` | عنوان صفحه (در زبان مبدأ) |
| `--desc="…"` / `--description="…"` | توضیح صفحه |
| `--from=<locale>` / `--source=<locale>` | زبان مبدأ (پیش‌فرض: زبان پایه) |
| `--publish` / `--draft=false` | انتشار فوری در همهٔ زبان‌ها |
| `--draft` / `--draft=true` | ساخت به‌صورت پیش‌نویس |
| `--no-draft` | معادل `--draft=false` |
| `--image=cover.png` | تصویر هیرو (نسبت به فایل محتوا) |
| `--image=none` | استفاده از artwork مشترک |
| `--title:fa="…"` | عنوان مخصوص یک زبان |
| `--desc:fa="…"` | توضیح مخصوص یک زبان |
| `--data='{"fa":{"title":"…"}}'` | دادهٔ JSON برای چند زبان |
| `--file=path.json` | همان، از یک فایل |
| `--skip-nav` / `--no-nav` | ثبت نکردن در ناوبری |
| `--no-update-heading` | دست‌نخورده گذاشتن `# Title` داخل بدنه |
| `--update` | به‌روزرسانی گروه موجود بدون بازنویسی بدنه |
| `--sync-frontmatter` | هم‌تراز کردن فرانت‌متر همهٔ فایل‌های زبانی |
| `--sync-all` | راندن عنوان/توضیح مبدأ به‌عنوان الگو به همهٔ زبان‌ها |

### ۷.۲ ساخت مقالهٔ وبلاگ — `new:post`

```bash
pnpm run new:post ai-agents \
  --from=en \
  --title="AI Coding Agents" \
  --category=engineering \
  --tags=astro,i18n \
  --image=cover.png \
  --publish
```

| گزینه | کار |
| --- | --- |
| `--collection=<name>` | نام کالکشن (پیش‌فرض `blog`) |
| `--title="…"` / `--desc="…"` | عنوان و توضیح (زبان مبدأ) |
| `--from=<locale>` / `--source=<locale>` | زبان مبدأ |
| `--category="a,b"` / `--categories="a,b"` | دسته‌ها (قابل تکرار) |
| `--tags="x,y"` / `--tag="x,y"` | برچسب‌ها (قابل تکرار) |
| `--date="YYYY-MM-DD"` / `--publishedAt="…"` | تاریخ انتشار |
| `--image=cover.png` / `--image=none` | کاور |
| `--publish` / `--draft` / `--no-draft` | وضعیت انتشار |
| `--update` / `--sync-frontmatter` / `--sync-all` | همانند `new:page` |
| `--title:fa="…"` / `--desc:fa="…"` / `--data='…'` | دادهٔ مخصوص هر زبان |
| `--no-update-heading` | دست‌نخورده گذاشتن عنوان داخل بدنه |

### ۷.۳ ویرایش بدون بازنویسی متن

```bash
pnpm run new:page contact --update --sync-frontmatter \
  --title="Get in touch" --desc="We reply within a day."
```

`--update` فرانت‌متر را به‌روز می‌کند اما **بدنهٔ مارک‌داون را دست‌نخورده** نگه می‌دارد.

### ۷.۴ حذف صفحه و مقاله

```bash
pnpm run remove:page contact                     # کل گروه + پاک‌سازی nav_contact
pnpm run remove:page contact --locale=fa         # فقط نسخهٔ فارسی
pnpm run remove:page contact --no-clean-nav      # نگه‌داشتن کلید ناوبری
pnpm run remove:page contact --force             # بدون تأیید تعاملی
pnpm run remove:post ai-agents --collection=blog --force
pnpm run remove:post ai-agents --locale=fa --force
```

| گزینهٔ `remove:page` | کار |
| --- | --- |
| `--locale=<loc>` | فقط همان زبان را حذف کن (کل گروه دست‌نخورده) |
| `--clean-nav` / `--no-clean-nav` | پاک‌سازی / نگه‌داشتن کلید `nav_<page>` در فرهنگ‌ها (پیش‌فرض: پاک‌سازی) |
| `--force` / `-y` / `--yes` | بدون پرسش تعاملی |

| گزینهٔ `remove:post` | کار |
| --- | --- |
| `--collection=<name>` | کالکشن (پیش‌فرض `blog`) |
| `--locale=<loc>` | فقط همان زبان را حذف کن |
| `--force` / `-y` / `--yes` | بدون پرسش تعاملی |

> در محیط غیرتعاملی (CI، بدون TTY) بدون `--force` (یا `-y` / `--yes`) اسکریپت‌ها
> **بدون حذف** خارج می‌شوند تا چیزی به‌اشتباه پاک نشود.
> حذف صفحهٔ `home` هم بدون `--force` رد می‌شود.
> حذف یک گروه، artwork کنار آن (`<group>.png`) را هم با خود پاک می‌کند.

### ۷.۵ مدیریت کلیدهای ترجمه

```bash
# تک کلید
pnpm run i18n:add -- --category=contact --key=form_label \
  --en="Send message" --fa="ارسال پیام" --ar="إرسال الرسالة" \
  --de="Nachricht senden" --fr="Envoyer le message"

# گروهی از فایل JSON
pnpm run i18n:add-batch -- --file=translations.json --category=contact

# گروهی از JSON در خط فرمان
pnpm run i18n:add-batch -- --json='{"cart_checkout":{"en":"Checkout","fa":"تسویه حساب"}}'

# از STDIN
cat keys.json | pnpm run i18n:add-batch
```

| گزینهٔ `i18n:add` | کار |
| --- | --- |
| `--category=<cat>` | پیشوند مشترک کلید (کلید نهایی = `<category>_<key>`) |
| `--key=<key>` | بخش دوم کلید |
| `--<locale>="…"` | ترجمهٔ همان زبان (`--en`, `--fa`, `--ar`, `--de`, `--fr`) |
| `--json='…'` / `--file=<path>` / `--batch` | واگذاری کار به `i18n:add-batch` |

اگر زبانی ترجمهٔ صریح نداشته باشد ولی کلید از قبل در فرهنگش وجود داشته باشد،
مقدار موجود **دست‌نخورده** می‌ماند؛ فقط وقتی کلید تازه باشد، جای‌نگهدار
`[TODO: <locale>] <key>` نوشته می‌شود. پس ثبت یک کلید هرگز ترجمهٔ زبان‌های
دیگر را پاک نمی‌کند.

| گزینهٔ `i18n:add-batch` | کار |
| --- | --- |
| `--file=<path>` | فایل JSON کلیدها |
| `--json='…'` | JSON در خط فرمان |
| `--data='…'` | نام دیگر `--json` |
| `--category=<cat>` | پیشوند مشترک کلیدها |
| `--locale=<loc>` | فقط یک زبان را بنویس |
| `--overwrite=false` / `--no-overwrite` | مقدار موجود را بازنویسی نکن |
| `--skip-compile` / `--no-compile` | کامپایل Paraglide را رد کن |

کلیدها به‌صورت الفبایی مرتب و فرهنگ‌ها هم‌تراز می‌شوند؛ در پایان یک بار
Paraglide کامپایل می‌شود.

### ۷.۶ استخراج متن سخت‌کد از قالب

```bash
pnpm run i18n:extract -- --target=src/components/Foo.astro --key=foo --auto-add --replace
```

| گزینه | کار |
| --- | --- |
| `--target=<file-or-dir>` | فایل یا پوشهٔ هدف |
| `--key=<namespace>` | فضای‌نام کلیدها |
| `--auto-add` | افزودن خودکار به فرهنگ‌ها |
| `--replace` | جایگزینی متن در قالب |
| `--dry-run` | فقط نمایش، بدون تغییر |

### ۷.۷ تبدیل بلوک Tailwind به RTL

```bash
pnpm run block:adapt -- --file=src/views/BlogIndexView.astro
pnpm run block:adapt -- --file=src/views/BlogIndexView.astro --dry-run
```

نگاشت‌ها (فقط داخل `class="..."` اعمال می‌شوند):

| جهت | رنگ |
| --- | --- |
| `ml- → ms-` · `mr- → me-` · `pl- → ps-` · `pr- → pe-` | `bg-white → bg-bg` · `bg-gray-50 → bg-surface` |
| `left- → start-` · `right- → end-` | `text-gray-900 → text-fg` · `text-black → text-fg` |
| `text-left → text-start` · `text-right → text-end` | `text-gray-500 / 400 → text-muted` |
| `border-l- → border-s-` · `border-r- → border-e-` | `border-gray-200 / 300 → border-border` |
| `rounded-l- → rounded-s-` · `rounded-r- → rounded-e-` | `bg-blue-600 / bg-indigo-600 → bg-primary` |
| `border-l → border-s` · `border-r → border-e` | `text-blue-600 → text-primary` |

### ۷.۸ تولید تصاویر

```bash
pnpm run assets:generate
```

خروجی‌های دقیق (اندازه‌ها از `app.config.json` خوانده می‌شوند):

| مسیر | اندازه | توضیح |
| --- | --- | --- |
| `public/apple-touch-icon.png` | ۱۸۰×۱۸۰ | آیکون iOS |
| `public/icon-192.png` | ۱۹۲×۱۹۲ | آیکون PWA |
| `public/icon-512.png` | ۵۱۲×۵۱۲ | آیکون PWA |
| `public/og-default.png` | ۱۲۰۰×۶۳۰ | کارت OG پیش‌فرض سایت |
| `src/content/blog/<group>/<group>.png` | ۱۲۰۰×۶۷۵ | کاور هر گروه مقاله |
| `src/content/pages/<group>/<group>.png` | ۱۲۰۰×۶۷۵ | پس‌زمینهٔ هیروی هر گروه صفحه |

پالت نرمال‌شده به روشنایی است، بنابراین هر رنگ با یک روشنایی ادراک‌شده دیده می‌شود.

دو چیز **تولید نمی‌شود**:

- عکس مشترک هیرو (`src/assets/hero/hero-0.jpg`) — یک عکس واقعی است، نه artwork کدنویسی‌شده؛
- `public/favicon.svg` و `public/favicon.ico` — دستی ساخته و در مخزن نگه‌داری می‌شوند.

> چون نام فایل artwork هر گروه همان `<group>.png` است، اگر فایل سفارشی‌ای با همین نام
> بدهید، اسکریپت آن را با نام `<group>-custom.<ext>` کپی می‌کند تا بیلد نشکند.

### ۷.۹ ممیزی و تست

```bash
pnpm run audit:i18n    # ۵ بخش: پیکربندی زبان، فرهنگ‌ها، محتوا، مسیرها، متن هاردکد
pnpm run smoke         # ۹۶ assertion روی خروجی بیلدشده
pnpm run knip          # فایل/اکسپورت/وابستگی مرده
```

### ۷.۱۰ کتابخانهٔ مشترک `scripts/lib/`

| فایل | نقش |
| --- | --- |
| `locales.mjs` | خواندن `src/i18n/locales.ts` به‌عنوان منبع حقیقت: `parseLocaleConfig(source)` و `readLocaleConfig()` — ممیزی i18n و تست دود هر دو از همین پارسر استفاده می‌کنند، پس فهرست زبان‌ها و جهت آن‌ها هرگز دو بار تعریف نمی‌شود |
| `frontmatter.mjs` | `parseFrontmatter` / `stringifyFrontmatter` (بدون وابستگی) |
| `image-reference.mjs` | تبدیل `--image` به ارجاع نسبی به فایل محتوا و کپی artwork به پوشهٔ گروه |
| `content-stub.mjs` | متن جانشین هر زبان برای محتوای تولیدشده |
| `prompt.mjs` | `askYesNo` / `confirmDeletion` — تأیید یکسان برای اسکریپت‌های مخرب |

---

## ۸. مدیریت زبان

### افزودن زبان

```bash
pnpm run i18n:add-lang -- es --name="Español" --dir="ltr" --with-content --from=en
```

| گزینه | کار |
| --- | --- |
| `--name="…"` | نام نمایشی زبان |
| `--dir="ltr\|rtl"` | جهت (برای `ar`, `fa`, `he`, `ur` به‌صورت خودکار `rtl`) |
| `--from=<locale>` / `--source=<locale>` / `--source-lang=<locale>` | زبانی که فرهنگ و محتوا از آن کپی می‌شود |
| `--with-content` / `--create-content` / `--content=yes` | ساخت فایل‌های محتوا برای زبان جدید |
| `--no-content` / `--without-content` / `--content=no` | ساخت‌نکردن فایل‌های محتوا |
| `--publish` / `--draft` | وضعیت انتشار محتوای تولیدشده |

این اسکریپت به‌صورت خودکار:

1. `project.inlang/settings.json` را به‌روز می‌کند
2. `messages/es.json` می‌سازد (کپی فرهنگ زبان مبدأ)
3. `src/i18n/locales.ts` را به‌روز می‌کند (فهرست + `LOCALE_METADATA`)
4. فایل `<locale>.mdx` برای همهٔ صفحات و مقالات می‌سازد
5. Paraglide را دوباره کامپایل می‌کند

> اسکریپت `LOCALE_METADATA` را هم خودش می‌نویسد، ولی **آن را بررسی کنید**:
> برای هر زبان جدیدِ RTL مقدار `fontFamily` را روی `var(--font-fa)` می‌گذارد.
> اگر زبان جدید خطی است، باید `var(--font-sans)` باشد؛ اگر خطی‌نبودنِ غیرعربی
> است (مثلاً عبری)، باید فونت متناسب خودش را در `src/styles/global.css` تعریف
> و اینجا ارجاع دهید.

### حذف زبان

```bash
pnpm run i18n:remove-lang -- es --with-content --force
```

| گزینه | کار |
| --- | --- |
| `--with-content` / `--delete-content` | حذف فایل‌های محتوا |
| `--keep-content` / `--no-content` / `--without-content` | نگه‌داشتن فایل‌های محتوا |
| `--force` / `--yes` | بدون تأیید تعاملی |

حذف زبان پیش‌فرض ممکن نیست؛ ابتدا باید زبان پیش‌فرض را عوض کنید.

### گام بعدی: پیام‌ها

پس از افزودن زبان، فرهنگ جدید فقط کلیدهای زبان مبدأ را دارد. با
`pnpm run i18n:add-batch` یا `i18n:extract` ترجمه‌ها را کامل کنید؛
`pnpm run audit:i18n` هر کلید ناقص را گزارش می‌کند.

---

## ۹. RTL و ویژگی‌های منطقی

### قاعدهٔ طلایی

هرگز از جهت فیزیکی استفاده نکنید:

| ❌ ممنوع | ✅ درست |
| --- | --- |
| `ml-4`, `mr-2` | `ms-4`, `me-2` |
| `pl-6`, `pr-3` | `ps-6`, `pe-3` |
| `left-0`, `right-0` | `start-0`, `end-0` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l-2` | `border-s-2` |
| `left: 0` در CSS | `inset-inline-start: 0` |

### فونت هر زبان

```ts
// src/i18n/locales.ts
fa: { dir: 'rtl', htmlLang: 'fa', name: 'فارسی', fontFamily: 'var(--font-fa)' },
ar: { dir: 'rtl', htmlLang: 'ar', name: 'العربية', fontFamily: 'var(--font-ar)' },
```

```css
/* src/styles/global.css */
:lang(en), :lang(de), :lang(fr) { font-family: var(--font-sans); }
:lang(fa) { font-family: var(--font-fa); }
:lang(ar) { font-family: var(--font-ar); }
```

این قاعده دوطرفه کار می‌کند: یک پاراگراف لاتین (`lang="en"`) داخل صفحهٔ فارسی
فونت لاتین می‌گیرد، و یک نقل‌قول فارسی (`lang="fa"`) داخل صفحهٔ انگلیسی فونت فارسی.

فونت‌ها **variable** و خودمیزبان‌اند (`@fontsource-variable/vazirmatn` و
`@fontsource-variable/noto-sans-arabic`) — یعنی یک فایل برای همهٔ وزن‌ها.

### جداسازی کد

بلوک‌های کد همیشه LTR می‌مانند، حتی در صفحهٔ فارسی:

```css
/* src/styles/prose.css */
pre, code, .math {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate;
}
```

### چرخاندن آیکون‌ها

آیکون «قبلی/بعدی» پیجر در RTL باید بچرخد:

```astro
<Icon name="chevron-left" size={16} class="shrink-0 rtl:rotate-180" />       <!-- قبلی -->
<Icon name="chevron-left" size={16} class="shrink-0 rotate-180 rtl:rotate-0" /> <!-- بعدی -->
```

### نوار پیشرفت

`TopLoadingBar.astro` عمداً `dir="ltr"` دارد تا جهت رشد نوار در هر دو حالت یکسان باشد.
نوار `position: fixed` و `z-index: 999999` است و فقط با رویدادهای
`astro:before-preparation` / `astro:after-preparation` کار می‌کند — یعنی روی
ناوبری سمت کاربر (ClientRouter)، نه روی بارگذاری کامل صفحه.
با `astro:page-load` پاک‌سازی می‌شود و رویداد `pagehide` نوار را به حالت پنهان
برمی‌گرداند: وقتی صفحه وارد **back/forward cache** می‌شود، تایمرها یخ می‌زنند و
نواری که در حالت «تمام‌شده» مانده باشد، با بازگشت کاربر یک نوار تمام‌عرض را
جلوی چشم او می‌گذارد.

---

## ۱۰. سیستم طراحی

### توکن‌های رنگ (`src/styles/global.css`)

| توکن | کاربرد |
| --- | --- |
| `--color-bg` | پس‌زمینهٔ صفحه |
| `--color-surface` | سطح کارت/پنل |
| `--color-surface-hover` | حالت hover سطح |
| `--color-fg` | متن اصلی |
| `--color-muted` | متن ثانویه |
| `--color-border` | خط جداکننده |
| `--color-primary` / `--color-primary-fg` | رنگ اصلی و متن روی آن |
| `--color-accent` | خط تزئینی زیر عنوان هیرو |
| `--color-glass` / `--color-glass-hover` / `--color-glass-border` / `--color-glass-control` | پالت شیشه‌ای |
| `--shadow-glass` | سایهٔ سطوح شیشه‌ای |

### کلاس‌های مشترک

همهٔ سطوح شیشه‌ای **یک بار** در `src/styles/global.css` تعریف شده‌اند.
کامپوننت‌ها فقط این کلاس‌ها را ترکیب می‌کنند:

| کلاس | کاربرد |
| --- | --- |
| `.glass-surface` | سطح شیشه‌ای (هدر، پنل‌ها) |
| `.glass-control` | کنترل داخل سطح شیشه‌ای |
| `.ghost-control` | کنترل روی سطح مات |
| `.cta` | دکمهٔ اصلی |
| `.btn-secondary` | دکمهٔ ثانویه |
| `.chip` | چیپ دسته/برچسب/فیلتر |

```astro
<a href={pricingHref} class="cta hidden h-9 text-xs lg:inline-flex">شروع کنید</a>
```

### کامپوننت‌های مشترک و پراپ‌هایشان

| کامپوننت | پراپ‌ها | نقش |
| --- | --- | --- |
| `Icon.astro` | `name`, `size` (پیش‌فرض ۲۰), `class`, `aria-hidden`, `aria-label` | نماد SVG از `/icons.svg#name` |
| `IconButton.astro` | `icon`, `label`, `size` (۱۸), `variant` (`glass`/`ghost`), `class` + هر `data-*`/`aria-*` | دکمهٔ فقط-آیکون — دستی نسازید |
| `HeroCopy.astro` | `title`, `description?`, `size?` (`page`/`post`)؛ اسلات `prelude` و پیش‌فرض | تیتر/توضیح/اسلات‌های مشترک هیرو |
| `PageHero.astro` | `image?` | بخش هیرو؛ خودش هیچ متنی ندارد، فقط پس‌زمینه و اسلات |
| `BlogPostHeroContent.astro` | `title`, `description?`, `locale`, `categories`, `author?`, `body?`, `publishedAt`, `breadcrumbs` | محتوای هیروی مقاله (از `HeroCopy` استفاده می‌کند) |
| `PostCard.astro` | `post`, `locale`, `href`, `priority?` | کارت مقاله در فهرست |
| `LanguageSwitcher.astro` | `currentLocale`, `alternates` | تعویض زبان با بارگذاری کامل |
| `SearchModal.astro` | `locale` | جستجو (Pagefind در پروداکشن) |
| `Seo.astro` | `title`, `description?`, `locale`, `url`, `alternates`, `siteName?`, `image?`, `type?`, `publishedTime?`, `schema?`, `noindex?`, `prevUrl?`, `nextUrl?` | همهٔ متادیتای SEO |
| `TopLoadingBar.astro` | — | نوار پیشرفت ناوبری |

### استایل متن محتوا — `src/styles/prose.css`

کلاس `.prose` ظاهر بدنهٔ مقاله/صفحه را می‌سازد:

- `max-width: 65ch` و `line-height: 1.75` برای خوانایی
- سرفصل‌ها با فاصله‌گذاری عمودی و وزن ۷۰۰
- لینک‌ها با رنگ `--color-primary` و `text-underline-offset`
- `pre` با پس‌زمینهٔ سطح، حاشیه و اسکرول افقی؛ `code` درون‌خطی با پس‌زمینهٔ ملایم‌تر
- فهرست‌ها با `padding-inline-start` (نه `padding-left`) تا در RTL درست بچرخند
- `blockquote` با `border-inline-start` — خط عمودی سمت شروع، در RTL سمت راست
- `pre`، `code` و `.math` همیشه LTR می‌مانند (جداسازی `unicode-bidi: isolate`)

### حذف کد مرده — `knip.json`

`knip` فایل‌ها، اکسپورت‌ها و وابستگی‌های بلااستفاده را پیدا می‌کند. نقطه‌های ورود آن:

- `src/pages/**/*.{astro,ts}` (همهٔ صفحه‌ها و endpointها)
- `scripts/**/*.mjs` (همهٔ اسکریپت‌های CLI)
- `src/**/*.test.ts` (فایل‌های تست)

سه وابستگی در `ignoreDependencies` هستند چون فقط از داخل CSS صدا زده می‌شوند
و Knip آن‌ها را در JS نمی‌بیند: `tailwindcss`، `@fontsource-variable/vazirmatn` و
`@fontsource-variable/noto-sans-arabic`.

### افزودن آیکون

نمادهای موجود: `search`، `globe`، `close`، `check`، `menu`، `chevron-left`.

```ts
// src/pages/icons.svg.ts
const icons: Record<string, string> = {
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" fill="none"/>',
};
```

```astro
<Icon name="star" size={20} class="text-primary" />
```

> هرگز `<svg>` خام با `<path>` را مستقیم در قالب‌ها نچسبانید.

---

## ۱۱. چیدمان صفحه: BaseLayout

`src/layouts/BaseLayout.astro` پوستهٔ مشترک همهٔ صفحه‌هاست:

| بخش | توضیح |
| --- | --- |
| `<head>` | charset، viewport، `theme-color`، `manifest`، `apple-touch-icon`، `favicon`، `<ClientRouter />` |
| لینک پرش | `href="#main-content"` با کلاس `sr-only focus:not-sr-only` — اولین عنصر قابل فوکوس صفحه |
| هدر شیشه‌ای | `fixed inset-x-0 top-0` + `.glass-surface`؛ برند، ناوبری دسکتاپ، جستجو، تعویض زبان، دکمهٔ CTA |
| منوی موبایل | `<dialog id="mobile-nav-menu">` با `showModal()`؛ بسته‌شدن با کلیک بیرون، کلیک روی لینک، یا `astro:before-preparation` |
| `<main id="main-content" tabindex="-1">` | محتوا؛ اسلات `hero` تمام‌عرض بیرون از ستون محتوا رندر می‌شود |
| فوتر | کپی‌رایت با **سال خودکار** (`data-current-year`) + همان ناوبری |
| نوار پیشرفت | `TopLoadingBar` با `transition:persist` |

### پراپ‌های `BaseLayout`

| پراپ | نوع | کار |
| --- | --- | --- |
| `title` / `description` | string | عنوان و توضیح (description پیش‌فرض: `siteConfig.description`) |
| `locale` | `Locale` | زبان صفحه؛ `lang`، `dir` و فونت از آن می‌آید |
| `url` | string | مسیر نسبی صفحه برای canonical |
| `alternates` | `Partial<Record<Locale, string>>` | نگاشت ترجمه‌ها (hreflang) |
| `switcherAlternates?` | همان | نگاشت جدا برای تعویض زبان، وقتی فرق دارد |
| `noindex?` | boolean | افزودن `noindex, nofollow` |
| `noPagefind?` | boolean | حذف صفحه از ایندکس Pagefind (`data-pagefind-ignore`) |
| `showSearch?` | boolean (پیش‌فرض `true`) | نمایش دکمه و مودال جستجو |
| `hero?` | boolean | حذف فاصلهٔ بالای محتوا (هیرو خودش فضا دارد) |
| `image?` | `ImageMetadata` | artwork برای کارت اجتماعی |
| `type?` | `'website' \| 'article'` | نوع Open Graph |
| `publishedTime?` | string | `article:published_time` |
| `schema?` | object \| object[] | JSON-LD؛ پیش‌فرض `WebSite` |
| `prevUrl?` / `nextUrl?` | string | `rel="prev"` / `rel="next"` برای صفحه‌بندی |

### نکات رفتاری

- `<html>` دارای `lang`، `dir`، `class="scroll-smooth scroll-pt-24"` و
  `style="font-family: …"` است — فونت زبان روی `<html>` اعمال می‌شود.
- تمام اسکریپت‌های سمت کاربر با `dataset.bound` محافظت می‌شوند تا در
  ناوبری‌های مکرر دوباره bind نشوند.
- `prefers-reduced-motion: reduce` اسکرول نرم و انیمیشن نوار پیشرفت را خاموش می‌کند.

---

## ۱۲. صفحات، نماها و مسیریاب

تنها فایل مسیر پویا `src/pages/[...path].astro` است (۳۹ خط):

```astro
---
import { getSiteRoutes } from '@/libs/content/service';
import PageView from '@/views/PageView.astro';
import BlogPostView from '@/views/BlogPostView.astro';
import BlogIndexView from '@/views/BlogIndexView.astro';

export async function getStaticPaths() {
  return await getSiteRoutes();
}
const props = Astro.props;
---
{props.routeType === 'page' && (
  <PageView entry={props.entry} locale={props.locale} alternates={props.alternates} url={props.url} />
)}
{props.routeType === 'blog-entry' && (
  <BlogPostView entry={props.entry} locale={props.locale} alternates={props.alternates} url={props.url} />
)}
{props.routeType === 'blog-index' && (
  <BlogIndexView locale={props.locale} alternates={props.alternates} url={props.url}
    page={props.page} totalPages={props.totalPages} perPage={props.perPage} />
)}
```

**قاعده:** هرگز `src/pages/[lang].astro` یا `[slug].astro` نسازید — برخورد مسیر
رخ می‌دهد. مسیرها از محتوا ساخته می‌شوند، نه دستی.

### انواع مسیر

| `routeType` | پراپ‌های ویژه | نما |
| --- | --- | --- |
| `page` | `entry` | `PageView` |
| `blog-entry` | `entry` | `BlogPostView` |
| `blog-index` | `page`, `totalPages`, `perPage` | `BlogIndexView` |

### افزودن لینک به ناوبری

۱. مطمئن شوید صفحه در `src/content/pages/<page-key>/` وجود دارد (یا `new:page` بزنید)
۲. در `src/libs/config/navigation.ts` اضافه کنید:

```ts
const PAGE_ITEMS = [
  { group: 'home', label: (locale) => m.nav_home({}, { locale }) },
  { group: 'about', label: (locale) => m.nav_about({}, { locale }) },
  { group: 'contact', label: (locale) => m.nav_contact({}, { locale }) },  // ← جدید
] as const;
```

هدر دسکتاپ، منوی موبایل و فوتر همگی از `getNavigation()` می‌خوانند؛ نیازی به
ویرایش قالب‌ها نیست. صفحه‌ای که ترجمه‌ای برای زبانی ندارد، خودکار از منو حذف
می‌شود (`getPageUrl` مقدار `null` برمی‌گرداند).

---

## ۱۳. وبلاگ

### صفحه‌بندی

```json
// app.config.json
"blog": { "postsPerPage": 9 }
```

- صفحهٔ ۱ → `/blog/`
- صفحهٔ ۲ به بعد → `/blog/page/2/` (محلی‌شده: `/fa/blog/page/2/`)

منطق خالص در `src/libs/content/pagination.ts`:

```ts
getPageCount(totalItems, perPage)   // تعداد صفحه‌ها (همیشه حداقل ۱)
clampPage(page, totalPages)         // همیشه در بازهٔ 1..totalPages
paginate(items, page, perPage)      // برش + previousPage/nextPage + totalItems
buildPageWindow(page, totalPages, radius = 1)  // پنجرهٔ شماره‌ها با PAGE_GAP
```

`paginate()` یک `PageSlice` برمی‌گرداند: `items`، `page` (کل‌شده‌شده)، `perPage`،
`totalItems`، `totalPages`، `previousPage` و `nextPage`.

یک لینک کهنه مثل `/blog/page/99/` هرگز برش خارج از محدوده تولید نمی‌کند.

> ❌ هرگز `/blog/page/2` را دستی ننویسید؛ از `getBlogPageHref(page, locale)` استفاده کنید.

پیجر در `src/views/BlogIndexView.astro` رندر می‌شود:

- فقط وقتی بیش از یک صفحه وجود دارد؛
- هر لینک پیجر **فیلتر فعال** را حمل می‌کند، پس صفحه‌بندی انتخاب را از دست نمی‌دهد؛
- `rel="prev"` / `rel="next"` در `<head>` منتشر می‌شود؛
- عنوان سند صفحهٔ ۲ به بعد `Blog — Page 2 of 3` است.

### دسته، برچسب و فیلتر

```ts
// src/libs/content/blog.ts
parseBlogFilters('?category=engineering&tag=astro,performance');
buildBlogFilterQuery(filters);   // → "?category=engineering&tag=astro%2Cperformance"
matchesBlogFilters(post, filters);
toggleBlogTag(filters, tag);
collectTaxonomyKeys(posts, 'categories');
```

یک مقاله وقتی فیلتر را پاس می‌کند که در دستهٔ انتخاب‌شده باشد **و** همهٔ
برچسب‌های انتخاب‌شده را داشته باشد.

رفتار فیلتر در سمت کاربر (بدون بارگذاری مجدد):

- چیپ‌ها از **کل کالکشن** ساخته می‌شوند، پس همهٔ صفحه‌ها فیلترهای یکسان دارند؛
- چیپ فعال با `aria-current="true"` مشخص می‌شود؛
- وضعیت «نمایش X از Y» در `role="status" aria-live="polite"` زنده می‌ماند؛
- URL با `history.replaceState` همگام می‌شود (به‌جای `pushState`، تا
  تاریخچهٔ ClientRouter نشکند)؛
- با `popstate` فیلترها دوباره از URL خوانده و بازسازی می‌شوند؛
- دکمهٔ «پاک کردن فیلتر» فقط وقتی فیلتر فعالی هست دیده می‌شود.

### زمان مطالعه

```ts
getReadingTime(body);   // ≈ ۲۰۰ کلمه بر دقیقه، حداقل ۱
```

### خرده‌مسیر و لینک‌های مقاله

- خرده‌مسیر: خانه ← وبلاگ ← عنوان مقاله (`getBreadcrumbs`)
- چیپ دستهٔ مقاله به فهرست فیلترشده لینک می‌شود
- برچسب‌های انتهای مقاله هم به فهرست فیلترشده لینک می‌شوند
- لینک «بازگشت به وبلاگ» با فلش `rtl:rotate-180`

### JSON-LD مقاله

`BlogPostView` یک شیء `BlogPosting` می‌سازد: `headline`، `description`، `image`،
`datePublished`، `dateModified` (از `updatedAt`)، `inLanguage`، `articleSection`،
`keywords`، `mainEntityOfPage`، و `author`/`publisher`.

### آرشیو (RSS/Atom)

`src/pages/rss.xml.ts` یک فید Atom شامل همهٔ مقالات منتشرشدهٔ همهٔ زبان‌ها
می‌سازد (با `hreflang` روی هر `link` و دسته/برچسب به‌عنوان `category`).
`src/pages/sitemap.xml.ts` نقشهٔ سایت چندزبانه با `x-default`، `lastmod` و
`changefreq` تولید می‌کند.

---

## ۱۴. جستجو

`src/components/SearchModal.astro`:

| رفتار | جزئیات |
| --- | --- |
| باز کردن | کلیک روی دکمهٔ جستجو (هر جای صفحه) یا میان‌بر `⌘K` / `Ctrl+K` |
| بستن | `ESC`، کلیک روی پس‌زمینه، دکمهٔ بستن، یا کلیک روی یک نتیجه |
| پروداکشن | Pagefind از `/pagefind/pagefind.js` (ایندکس ساخته‌شده در بیلد) |
| توسعه | fallback به `/api/search-dev.json` وقتی Pagefind در دسترس نباشد |
| فیلتر زبان | نتایج dev فقط برای `locale` جاری نمایش داده می‌شوند |
| debounce | ۱۵۰ میلی‌ثانیه |
| سقف نتیجه | ۶ نتیجه |
| محافظت از رقابت | هر درخواست یک `requestId` دارد؛ نتیجهٔ قدیمی نوشته نمی‌شود |
| ایمنی | `excerpt` صفحه‌کلید به متن ساده تبدیل می‌شود، سپس با `textContent` درج می‌گردد |

> `/api/search-dev.json` از همان `getSiteRoutes()` ساخته می‌شود، پس URLها،
> اسلاگ‌های محلی‌شده و فیلتر پیش‌نویس همیشه با سایت بیلدشده یکی هستند.
> این endpoint در پروداکشن هم ساخته می‌شود (fallback عمدی است) و برای هر صفحه
> فقط عنوان، توضیح، URL و زبان را برمی‌گرداند — نه متن کامل صفحه.

---

## ۱۵. SEO، متادیتا و endpointها

### `Seo.astro` چه چیزی منتشر می‌کند

- `<title>`، `description`، `canonical`
- `rel="prev"` / `rel="next"` برای صفحات صفحه‌بندی‌شده
- `rel="alternate" type="application/rss+xml"` برای فید
- `noindex, nofollow` برای صفحهٔ ۴۰۴
- `hreflang` برای هر ترجمه + `x-default`
- Open Graph کامل: `og:site_name`, `og:title`, `og:description`, `og:url`, `og:type`,
  `og:locale`, `og:locale:alternate`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`
  و `article:published_time` برای مقاله‌ها
- Twitter Card: `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
- JSON-LD با escape کردن `<` به‌صورت `\u003c` (امن در برابر XSS)

`og:locale` با `Intl.Locale(htmlLang).maximize()` خودکار ساخته می‌شود
(`en` → `en_US`، `fa` → `fa_IR`).

### تصویر اجتماعی

```ts
// src/libs/content/social.ts
const card = await getSocialCard(entry.data.image);
// → { url: 'https://…/og-….jpg', width: 1200, height: 630 }
```

`getSocialCard()` artwork را به نسبت ۱٫۹۱:۱ برش می‌دهد و JPEG رمزنگاری می‌کند
(کیفیت ۸۰) — کارتی با اندازهٔ دقیق مورد انتظار. صفحه‌های بدون artwork کارت
پیش‌فرض سایت (`public/og-default.png`) را می‌گیرند، پس فراخوانی‌کننده هرگز
لازم نیست fallback را خودش پیاده کند.

### endpointها

| مسیر | نوع | محتوا |
| --- | --- | --- |
| `/sitemap.xml` | XML | همهٔ مسیرها + `xhtml:link` برای هر زبان + `x-default` + `lastmod` + `changefreq` |
| `/rss.xml` | Atom | همهٔ مقالات منتشرشدهٔ همهٔ زبان‌ها با `category` |
| `/robots.txt` | متن | `User-agent: *` / `Allow: /` / `Sitemap: <مطلق>` |
| `/site.webmanifest` | JSON | از `app.config.json` ساخته می‌شود: نام، `short_name`، رنگ‌ها، آیکون‌ها، `display: standalone` |
| `/icons.svg` | SVG | اسپرایت نمادها؛ هر نماد یک `<symbol id="name">` |
| `/api/search-dev.json` | JSON | فهرست fallback جستجو (عنوان، توضیح، URL، زبان) |

### صفحهٔ ۴۰۴

`src/pages/404.astro` زبان را از پیشوند URL تشخیص می‌دهد و `lang`، `dir`،
فونت، عنوان، توضیح، ناوبری و لینک «نسخهٔ انگلیسی» را در سمت کاربر بازنویسی می‌کند.
canonical آن به صفحهٔ خانهٔ همان زبان اشاره می‌کند (نه به `/404` که وجود ندارد)
و صفحه `noindex, nofollow` است.

---

## ۱۶. دسترس‌پذیری

| ویژگی | پیاده‌سازی |
| --- | --- |
| پرش به محتوا | لینک `sr-only focus:not-sr-only` به `#main-content` |
| ناحیهٔ اصلی | `<main id="main-content" tabindex="-1">` |
| ناوبری فعال | `aria-current="page"` روی لینک فعال هدر/منو/فوتر |
| برچسب ناحیه‌ها | `aria-label` روی `<nav>` و `<dialog>` |
| وضعیت زنده | `role="status" aria-live="polite"` روی شمارندهٔ فیلتر |
| آیکون‌ها | `aria-hidden` برای تزئینی؛ `role="img"` + `aria-label` وقتی برچسب دارد |
| هیرو | `aria-labelledby` به `h1` (شناسهٔ مشترک `HERO_TITLE_ID`) |
| دیالوگ‌ها | `<dialog>` بومی با `showModal()`، بستن با ESC و کلیک بیرون |
| فوکوس | `:focus-visible` با `outline: 2px solid var(--color-primary)` |
| زبان و جهت | `lang` و `dir` روی `<html>`، `htmlLang` از `LOCALE_METADATA` |
| کاهش حرکت | `prefers-reduced-motion` اسکرول نرم و انیمیشن نوار را خاموش می‌کند |
| متن جایگزین | تصاویر تزئینی با `alt=""`؛ عنوان کارت اجتماعی = عنوان صفحه |

---

## ۱۷. تست و اعتبارسنجی

```bash
pnpm run lint     # کامپایل پیام‌ها + astro check + tsc --noEmit
pnpm test         # ۹۸ تست Vitest
pnpm run audit:i18n
SITE_URL=https://example.com pnpm run build
pnpm run smoke    # ۹۶ assertion روی dist/
pnpm run knip
```

### چه چیزی تست می‌شود

| فایل | پوشش |
| --- | --- |
| `src/i18n/paths.test.ts` | `localizeHref`، `stripLocale`، نرمال‌سازی مسیر، اسلش انتهایی |
| `src/i18n/icu.test.ts` | ICU جمع/ordinal برای همهٔ زبان‌ها |
| `src/libs/content/entries.test.ts` | تجزیهٔ ID، فیلتر پیش‌نویس، گروه‌بندی، مرتب‌سازی |
| `src/libs/content/service.test.ts` | ساخت مسیرها، تشخیص برخورد، صفحه‌بندی هر زبان |
| `src/libs/content/pagination.test.ts` | `paginate`، `clampPage`، `buildPageWindow` |
| `src/libs/content/blog.test.ts` | فیلترها، زمان مطالعه، `humanizeKey` |
| `src/libs/content/taxonomy.test.ts` | برچسب دسته/برچسب و fallback |
| `src/libs/content/scripts.test.ts` | توابع فرانت‌متر، CLI helperها، پارسر زبان |

> **۸ فایل تست، ۹۸ تست.** ماژول `astro:content` در Vitest با
> `src/test/astro-content-mock.ts` جایگزین می‌شود، پس تست‌های واحد بدون بیلد
> Astro و بدون دست‌زدن به فایل‌های محتوا اجرا می‌شوند.

### ممیزی i18n — ۵ بخش

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. پیکربندی زبان | تطابق `locales.ts` و `project.inlang/settings.json`، وجود `dir` برای هر زبان |
| ۲. فرهنگ‌ها | کلیدها و placeholderهای ICU در همهٔ زبان‌ها، وجود همهٔ کلیدهای استفاده‌شده |
| ۳. کالکشن محتوا | وجود فایل هر زبان برای هر گروه |
| ۴. نگهبان slug و مسیر | فرانت‌متر معتبر، اسلاگ‌های یکتا، نبود برخورد مسیر |
| ۵. اسکنر متن هاردکد | هشدار دربارهٔ رشته‌های ترجمه‌نشده در قالب‌ها (هشدار، نه خطا) |

خروجی واقعی روی این مخزن: ۵ زبان، ۵۲ کلید در همهٔ فرهنگ‌ها با placeholder
یکسان، ۴۱ کلید استفاده‌شدهٔ ایستا، ۷ گروه محتوا، بدون برخورد مسیر و بدون
هشدار متن هاردکد.

### تست دود — ۶ بخش روی `dist/`

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. زبان پیش‌فرض | ریشه بدون پیشوند، `lang`/`dir` درست |
| ۲. زبان‌های دیگر | حفظ پیشوند، زبان و جهت |
| ۳. اسلاگ مقاله | اسلاگ‌های محلی‌شده به صفحهٔ ساخته‌شدهٔ واقعی می‌رسند |
| ۴. hreflang | پوشش کامل روی صفحهٔ خانه + `x-default` |
| ۵. endpointها | `sitemap.xml`، `rss.xml`، `robots.txt`، `site.webmanifest`، `icons.svg`، کارت OG |
| ۶. صفحه‌بندی وبلاگ | مسیر صفحه‌ها، نشانه‌گذاری پیجر، `rel=prev/next`، نبود صفحهٔ اضافی |

نکته‌های دقت تست دود:

- `lang` و `dir` از **خودِ تگ `<html>`** خوانده می‌شوند، نه از جست‌وجوی متن کل
  سند؛ وگرنه `dir="ltr"` نوار پیشرفت باعث می‌شد بررسی جهت همیشه پاس شود.
- هر زبان باید در `src/i18n/locales.ts` جهت صریح (`ltr`/`rtl`) داشته باشد؛
  نبودِ جهت یک خطای پیکربندی است، نه «پیش‌فرض ltr».
- تعداد صفحه‌های وبلاگ از خودِ کالکشن محتوا مشتق و با `blog.postsPerPage`
  سنجیده می‌شود.

### CI

`.github/workflows/ci.yml`:

- `concurrency` با `cancel-in-progress` — بیلدهای قدیمی خودکار لغو می‌شوند
- Node 22 با cache pnpm، `pnpm install --frozen-lockfile`
- `SITE_URL: https://example.com` به‌عنوان env
- `timeout-minutes: 15`
- ترتیب: lint → test → audit → build → smoke → knip

---

## ۱۸. استقرار

### ۱. مقدار `SITE_URL` را تعیین کنید

```bash
cp .env.example .env
# .env
SITE_URL="https://your-domain.com"
```

ترتیب اولویت (از بیشترین به کمترین): متغیر محیطی ← `.env.<mode>.local` ←
`.env.<mode>` ← `.env.local` ← `.env`.
(درون یک فایل، **آخرین** تعریف برنده است — هم‌رفتار با Vite.)

خوانندهٔ `.env` در `astro.config.mjs` کوچک و بدون وابستگی است: کوتیشن‌ها
برداشته می‌شوند، مقدار بدون کوتیشن تا اولین کامنتِ ` #` بریده می‌شود (تا `#`
داخل URL سالم بماند) و کلید ناشناخته نادیده گرفته می‌شود.

### ۲. بیلد

```bash
pnpm run build && pnpm run smoke
```

### ۳. تنظیمات `astro.config.mjs`

| گزینه | مقدار | چرا |
| --- | --- | --- |
| `site` | `SITE_URL` یا مبدأ توسعه | canonical، sitemap، RSS، OG |
| `trailingSlash` | `'always'` | مسیرها با `/` تمام می‌شوند |
| `build.format` | `'directory'` | هر صفحه یک پوشهٔ `index.html` |
| `compressHTML` | `true` | فشرده‌سازی HTML خروجی |
| `integrations` | `[mdx()]` | پشتیبانی MDX |
| `vite.plugins` | `[tailwindcss()]` | Tailwind v4 از طریق Vite |
| `server.host` / `server.port` | از `app.config.json` | سرور توسعه با اپ هم‌پورت است |

### ۴. خروجی

پوشهٔ `dist/` یک سایت کاملاً استایک است و روی هر میزبانی سرو می‌شود
(Cloudflare Pages، Netlify، Vercel، S3، nginx).

به‌خاطر `trailingSlash: 'always'` و `build.format: 'directory'` هر صفحه
به‌شکل یک پوشه با `index.html` ساخته می‌شود:

```text
dist/
├── index.html          # صفحهٔ خانهٔ زبان پیش‌فرض
├── about/index.html    # صفحهٔ ایستا
├── fa/index.html       # خانهٔ فارسی
├── blog/index.html     # ایندکس وبلاگ
├── 404.html            # صفحهٔ خطای locale-aware
├── sitemap.xml  rss.xml  robots.txt  site.webmanifest  icons.svg
├── pagefind/           # ایندکس جستجو
└── _astro/             # JS/CSS/فونت/تصویرهای بهینه‌شده
```

> میزبان باید `/about/` را از `/about/index.html` سرو کند (پیش‌فرض
> Cloudflare Pages، Netlify و Vercel این کار را می‌کنند) و در صورت خطا `404.html` را
> نشان دهد. برای nginx یک `try_files $uri $uri/ $uri/index.html =404` کافی است.

### ۵. نکات

- `dist/pagefind/` باید همراه سایت منتشر شود (مرحلهٔ `pagefind --site dist`).
- `robots.txt` و `sitemap.xml` با مبدأ `SITE_URL` ساخته می‌شوند.
- `.env` در `.gitignore` است؛ `SITE_URL` را در تنظیمات محیطی CI بگذارید، نه در مخزن.
- خروجی بیلد شامل source map، فایل `.env` یا فایل `.ts`/`.mjs` نیست.

---

## ۱۹. عیب‌یابی

| نشانه | علت محتمل | راه‌حل |
| --- | --- | --- |
| صفحهٔ ۴۰۴ در یک زبان | اسلاگ با پیشوند زبان اشتباه | `pnpm run audit:i18n` — برخورد مسیر را گزارش می‌کند |
| متن‌ها خالی/انگلیسی مانده | فرهنگ کامپایل نشده | `pnpm run messages:compile` |
| بیلد با خطای تصویر | مسیر `image` نسبت به فایل محتوا نیست | مسیر را `./<group>.png` کنید و فایل را کنار محتوا بگذارید |
| `SITE_URL is required for a deployment build` | بیلد در CI بدون `SITE_URL` | متغیر محیطی را تنظیم کنید |
| `Duplicate route collision detected at URL` | دو ورودی یک URL | یکی از اسلاگ‌ها یا گروه‌ها را تغییر دهید |
| `Missing "<locale>" home page` | صفحهٔ خانهٔ زبان پیش‌فرض وجود ندارد | `src/content/pages/home/<locale>.mdx` بسازید |
| `Unknown locale "…" in content entry` | فایل محتوا برای زبان ثبت‌نشده | اول زبان را در `locales.ts` و `settings.json` اضافه کنید |
| فونت فارسی اعمال نمی‌شود | `fontFamily` در `LOCALE_METADATA` اشتباه | `var(--font-fa)` و `var(--font-ar)` را بررسی کنید |
| متن در RTL جابه‌جا می‌شود | استفاده از خواص فیزیکی | `pnpm run block:adapt -- --file=<file>` |
| کلید ترجمه گم شده | فرهنگ ناقص | `pnpm run audit:i18n` فهرست کلیدهای ناقص را می‌دهد |
| نوار پیشرفت دیده نمی‌شود | فقط روی ناوبری سمت کاربر اجرا می‌شود | با کلیک بین صفحه‌ها تست کنید؛ در بارگذاری کامل صفحه اجرا نمی‌شود |
| جستجو نتیجه نمی‌دهد | ایندکس Pagefind ساخته نشده | `pnpm run build` (مرحلهٔ `pagefind`) و منتشر کردن `dist/pagefind/` |
| `SITE_URL is not a valid absolute URL` | مقدار ناقص در `.env` | مقدار کامل با `https://` بدهید |

---

## ۲۰. توسعه با عامل هوش مصنوعی

### نقشهٔ مستندات مخزن

| سند | نقش |
| --- | --- |
| `docs/GUIDE-FA.md` | همین راهنما — مرجع کامل کاربر (فارسی) |
| `README.md` | نمای کلی، نصب سریع و راهنمای عملیاتی (انگلیسی) |
| `AGENTS.md` | قواعد قراردادی و پلی‌بوک‌ها برای عامل‌های AI (انگلیسی) |
| `docs/PRD.md` | پرامپت مادر: اهداف، معماری و تعریف «انجام‌شده» (انگلیسی) |
| `docs/PLAYBOOKS.md` | پلی‌بوک‌های گام‌به‌گام برای تغییرات پرتکرار (انگلیسی) |
| `docs/SPIKE_RESULTS.md` | نتیجهٔ تحقیق/نمونه‌سازی ابزارها (انگلیسی) |
| `.agents/skills/astro-i18n-starter/SKILL.md` | مهارت عملیاتی برای عامل‌های AI |


`AGENTS.md` راهنمای عملیاتی کامل برای عامل‌های AI است و شامل موارد زیر است:

- **قواعد قراردادی** (SSOT، دیسپچر مسیریاب، RTL، کد تولیدشده‌نشدنی)
- **نقشهٔ معماری** و مجموعهٔ فرمان‌های اعتبارسنجی
- **پلی‌بوک‌ها** برای کارهای پرتکرار (لینک ناوبری، تعویض زبان پیش‌فرض، هیرو، آیکون، صفحه‌بندی)
- **جدول ضدالگوهای ممنوع** — الگوهایی که هرگز نباید در کد ظاهر شوند

پیش از هر تغییری `AGENTS.md` را بخوانید؛ پس از هر تغییری
`pnpm run lint && pnpm test && pnpm run audit:i18n` را اجرا کنید.

### ضدالگوها (خلاصه)

| ❌ ممنوع | ✅ درست |
| --- | --- |
| مسیر ثابت `/en/about` | `localizeHref('/about', locale)` |
| `ml-4`، `pr-6`، `text-left` | `ms-4`، `pe-6`، `text-start` |
| ویرایش دستی `src/paraglide/` | ویرایش `messages/<lang>.json` + `messages:compile` |
| فراخوانی `m.key()` در سطح ماژول | فراخوانی داخل چرخهٔ رندر |
| ساخت `src/pages/[lang]/…` | استفاده از `[...path].astro` + `src/views/` |
| `navigate()` برای تعویض زبان | `window.location.assign(target)` |
| `<svg>` خام در قالب | افزودن نماد به `icons.svg.ts` + `<Icon>` |
| نوار پیشرفت بدون `dataset.bound` | `if (el.dataset.bound === 'true') return;` |
| تعریف دوبارهٔ `.cta` در کامپوننت | ترکیب کلاس از `src/styles/global.css` |
| `<button>` دستی با `<Icon>` | `IconButton` |

---

## پیوست A — مرجع سریع فرمان‌ها

| فرمان | کار |
| --- | --- |
| `pnpm dev` | کامپایل پیام‌ها + سرور توسعه |
| `pnpm run messages:compile` | کامپایل دستی پیام‌ها |
| `pnpm run check` | `astro check` |
| `pnpm run lint` | کامپایل پیام‌ها + astro check + tsc |
| `pnpm test` | تست‌های Vitest |
| `pnpm run build` | بیلد تولیدی + Pagefind |
| `pnpm preview` | پیش‌مایش خروجی |
| `pnpm run smoke` | تست دود روی `dist/` |
| `pnpm run knip` | کد مرده |
| `pnpm run clean` | حذف `dist/`، `.astro/`، `src/paraglide/` |
| `pnpm run assets:generate` | بازتولید آیکون‌ها، OG و artworkها |
| `pnpm run new:page` | ساخت/ویرایش صفحه |
| `pnpm run new:post` | ساخت/ویرایش مقاله |
| `pnpm run remove:page` | حذف صفحه |
| `pnpm run remove:post` | حذف مقاله |
| `pnpm run i18n:add-lang` | افزودن زبان |
| `pnpm run i18n:remove-lang` | حذف زبان |
| `pnpm run i18n:add` | افزودن کلید ترجمه |
| `pnpm run i18n:add-batch` | افزودن گروهی کلید |
| `pnpm run i18n:extract` | استخراج متن سخت‌کد |
| `pnpm run block:adapt` | تبدیل به خواص منطقی |
| `pnpm run audit:i18n` | ممیزی چندزبانه |
| `pnpm exec astro dev --background` | اجرای سرور توسعه در پس‌زمینه |
| `pnpm exec astro dev status` | وضعیت سرور توسعه |
| `pnpm exec astro dev logs --follow` | دنبال کردن لاگ سرور |
| `pnpm exec astro dev stop` | توقف سرور توسعه |

---

## پیوست B — کلیدهای ترجمه

۵۲ کلید ترجمه در `messages/en.json` (و یک کلید `$schema` که فقط متادیتای
JSON Schema است):

### `common_*` (۱۸ کلید)

`common_all_rights_reserved` · `common_back_home` · `common_back_to_blog` ·
`common_breadcrumbs` · `common_change_language` · `common_close` ·
`common_english_version_hint` · `common_get_started` · `common_go_english_version` ·
`common_menu` · `common_no_results` · `common_not_found_desc` ·
`common_not_found_title` · `common_press_esc` · `common_published_on` ·
`common_search_placeholder` · `common_skip_to_content` · `common_type_to_search`

### `blog_*` (۲۷ کلید)

عمومی: `blog_all_posts` · `blog_categories` · `blog_empty` ·
`blog_filter_by_category` · `blog_filter_by_tag` · `blog_filter_clear` ·
`blog_filter_empty` · `blog_filter_showing_page` · `blog_index_description` ·
`blog_pagination_label` · `blog_pagination_next` · `blog_pagination_page` ·
`blog_pagination_previous` · `blog_pagination_status` · `blog_read_time` · `blog_tags`

دسته‌ها: `blog_category_announcements` · `blog_category_design` ·
`blog_category_engineering` · `blog_category_guides` · `blog_category_product`

برچسب‌ها: `blog_tag_architecture` · `blog_tag_astro` · `blog_tag_i18n` ·
`blog_tag_performance` · `blog_tag_release` · `blog_tag_rtl`

### `nav_*` (۵ کلید)

`nav_about` · `nav_blog` · `nav_features` · `nav_home` · `nav_pricing`

### کلیدهای ICU

| کلید | placeholder |
| --- | --- |
| `blog_read_time` | `{count}` — زمان مطالعه (ICU plural) |
| `blog_filter_showing_page` | `{visible}` و `{total}` — «نمایش X از Y» |
| `blog_pagination_page` | `{page}` — برچسب شمارهٔ صفحه |
| `blog_pagination_status` | `{page}` و `{totalPages}` — «صفحهٔ ۲ از ۳» |
| `items_count` | ICU plural/select |
| `position_ordinal` | ICU ordinal |

> کلیدهای `items_count` و `position_ordinal` نمونهٔ زندهٔ قاعدهٔ ICU چندزبانه‌اند
> (تست `src/i18n/icu.test.ts` آن‌ها را برای همهٔ زبان‌ها بررسی می‌کند).

---

## پیوست C — مرجع API داخلی

### `src/i18n/locales.ts`

| خروجی | کار |
| --- | --- |
| `LOCALES` | آرایهٔ ثابت زبان‌ها |
| `Locale` | نوع استخراج‌شده از `LOCALES` |
| `DEFAULT_LOCALE` | زبان پیش‌فرض (بدون پیشوند) |
| `isLocale(value)` | بررسی عضویت |
| `LOCALE_METADATA` | نگاشت زبان → `{ dir, htmlLang, name, fontFamily }` |
| `getLocaleMeta(locale)` | متادیتای یک زبان |
| `getOgLocale(locale)` | `language_TERRITORY` برای Open Graph |

> `src/i18n/config.ts` یک barrel ساده است که همه‌چیزِ `src/i18n/locales.ts` را
> دوباره صادر می‌کند؛ برای وارد کردن یک‌جای همهٔ ثابت‌های زبان استفاده می‌شود.

### `src/i18n/paths.ts`

`getPathname` · `withTrailingSlash` · `stripLocale` · `localizeHref` · `localeHref`

### `src/libs/config/app.ts`

`siteConfig` · `POSTS_PER_PAGE` · `HERO_TITLE_ID` · `DEFAULT_HERO_IMAGE` · `absoluteUrl`

### `src/libs/config/navigation.ts`

`NavItem` · `getNavigation(locale, currentUrl?)`

### `src/libs/content/*`

| فایل | خروجی‌ها |
| --- | --- |
| `entries.ts` | `parseContentEntryId` · `isPublished` · `sortByPublishedAtDesc` · `groupPublishedEntries` · `getPublishedLocaleEntries` · `getSortedLocaleEntries` |
| `service.ts` | `getBlogIndexHref` · `getBlogPageHref` · `getBlogPostHref` · `getPageUrl` · `getSiteRoutes` · `buildSiteRoutes` · `getBreadcrumbs` |
| `pagination.ts` | `getPageCount` · `clampPage` · `paginate` · `buildPageWindow` · `PAGE_GAP` · `PageSlice` |
| `blog.ts` | `parseBlogFilters` · `buildBlogFilterQuery` · `matchesBlogFilters` · `filterBlogPosts` · `hasActiveFilters` · `toggleBlogTag` · `getReadingTime` · `collectTaxonomyKeys` · `humanizeKey` · `NO_FILTERS` |
| `taxonomy.ts` | `getCategoryLabel` · `getTagLabel` |
| `social.ts` | `getSocialCard` · `SocialImage` |

### `scripts/lib/locales.mjs`

| خروجی | کار |
| --- | --- |
| `LOCALES_SOURCE_PATH` | مسیر مطلق `src/i18n/locales.ts` |
| `parseLocaleConfig(source)` | تجزیهٔ متن `locales.ts` → `{ locales, defaultLocale, metadata }` |
| `readLocaleConfig()` | همان، با خواندن مستقیم فایل |

### انواع TypeScript

| نوع | محل |
| --- | --- |
| `Locale` · `LocaleMeta` | `src/i18n/locales.ts` |
| `NavItem` | `src/libs/config/navigation.ts` |
| `SiteRoute` · `SiteRouteProps` · `BreadcrumbItem` · `BreadcrumbLabels` | `src/libs/content/service.ts` |
| `ContentEntryId` · `ContentEntryLike` · `DatedContentEntry` | `src/libs/content/entries.ts` |
| `PageSlice` · `PageWindowEntry` | `src/libs/content/pagination.ts` |
| `BlogFilters` · `BlogTaxonomy` | `src/libs/content/blog.ts` |
| `SocialImage` | `src/libs/content/social.ts` |
