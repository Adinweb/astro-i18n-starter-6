# راهنمای جامع Astro i18n Starter

> استارتر چندزبانهٔ تولیدی بر پایهٔ **Astro v7** با پشتیبانی بومی **RTL/LTR**،
> مسیریاب ایستا (SSG)، چندزبانه‌سازی کامل، دسته‌بندی و صفحه‌بندی وبلاگ،
> جستجوی Pagefind، و مجموعه‌ای از ۱۴ ابزار خط فرمان برای مدیریت محتوا.

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
11. [چیدمان صفحه: BaseLayout و معماری ناوبری چندمنویی](#۱۱-چیدمان-صفحه-baselayout-و-معماری-ناوبری-چندمنویی)
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
| **وبلاگ** | دسته‌بندی، برچسب، فیلتر ترکیبی در کل مجموعهٔ مقالات، صفحه‌بندی استاتیک، فهرست مطالب خودکار (TOC)، مقالات مرتبط و ناوبری مقالهٔ قبلی/بعدی، دکمهٔ کپی کد، زمان مطالعه و تاریخ به‌روزرسانی، استایل چاپ (`@media print`) |
| **حالت نمایش** | حالت روشن و تیره (Dark Mode) بدون پرش (FOUC-free) با توکن‌های معنایی `oklch` و هماهنگ با View Transitions |
| **فرمت بومی** | تقویم هجری شمسی برای فارسی (`fa-IR-u-ca-persian`) و ارقام بومی فارسی/عربی (`۰-۹` / `٠-٩`) از طریق `src/i18n/format.ts` |
| **جستجو** | Pagefind در پروداکشن + فهرست `/api/search-dev.json` به‌عنوان fallback، میان‌بر ⌘K/Ctrl+K و ناوبری صفحه‌کلید (`↑`/`↓`/`Enter`) |
| **SEO** | canonical، hreflang چندزبانه + `x-default`، Open Graph (`article:modified_time`)، Twitter Card، JSON-LD (`WebSite`, `WebPage`, `CollectionPage`, `BlogPosting`, `BreadcrumbList`)، sitemap با `lastmod` کامل، فیدهای Atom مجزا به ازای هر زبان (`/rss.xml` و `/rss/<locale>.xml`)، webmanifest آگاه از زبان و جهت |
| **۴۰۴** | صفحهٔ locale-aware با تشخیص زبان از پیشوند URL و لینک «نسخهٔ انگلیسی» |
| **ابزار CLI** | ۱۴ اسکریپت برای ساخت/حذف صفحه و مقاله، افزودن/حذف زبان، مدیریت کلید ترجمه، استخراج متن، تبدیل RTL، تولید تصاویر |
| **کیفیت** | TypeScript strict، `astro check`، تست‌های واحد Vitest، ۴۵ تست سرتاسری CLI، ممیزی i18n پنج‌مرحله‌ای، تست دود روی `dist/`، Knip، CI آمادهٔ GitHub Actions |
| **کارایی** | خروجی کاملاً استاتیک، تصاویر WebP با `srcset`، فونت‌های variable خودمیزبان، `transition:persist`، `compressHTML` |
| **دسترس‌پذیری** | لینک پرش به محتوا، `aria-current`، `aria-live`، نشانگر فوکوس، `<dialog>` بومی، `prefers-reduced-motion` |

---

## ۲. راه‌اندازی سریع

### پیش‌نیازها

- **Node.js ≥ ۲۲٫۱۲** (در `engines` تعریف شده)
- **pnpm ۱۰٫۶٫۵** (در `packageManager` قفل شده)

### نصب و اجرا

```bash
pnpm install

pnpm dev          # کامپایل پیام‌ها + سرور توسعه روی http://localhost:3000
pnpm build        # کامپایل پیام‌ها + ممیزی i18n + بیلد Astro + ایندکس Pagefind
pnpm preview      # پیش‌نمایش خروجی بیلدشده
```

> سرور توسعه روی `0.0.0.0:3000` گوش می‌دهد؛ هر دو مقدار از `app.config.json`
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
| `pnpm run check` | کامپایل پیام‌ها + `astro check` |
| `pnpm run lint` | کامپایل پیام‌ها + `astro check` + `tsc --noEmit` |
| `pnpm test` | کامپایل پیام‌ها + `vitest run` |
| `pnpm run build` | کامپایل پیام‌ها + ممیزی i18n + `astro build` + `pagefind --site dist` |
| `pnpm preview` | `astro preview` روی خروجی `dist/` |
| `pnpm run smoke` | تست دود روی `dist/` (۹۸ assertion) |
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
| `pnpm run verify:cli` | تست سرتاسری همهٔ گردش‌کارهای CLI (۴۵ ادعا) |

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
├── scripts/                 # ۱۴ اسکریپت CLI
│   └── lib/                 # کتابخانهٔ مشترک: locales, frontmatter, image-reference,
│                            # content-stub, slug, prompt
├── .github/workflows/ci.yml # CI: lint → test → audit → build → smoke → knip → verify:cli
├── .agents/skills/         # مهارت عملیاتی برای عامل‌های AI
│   └── astro-i18n-starter/SKILL.md
├── docs/                   # GUIDE-FA.md (این راهنما)، PRD.md، PLAYBOOKS.md،
│                            # SPIKE_RESULTS.md
└── src/
    ├── assets/hero/hero-0.jpg  # عکس مشترک هیرو (پس‌زمینهٔ پیش‌فرض)
    ├── components/          # Icon, IconButton, ThemeToggle, LanguageSwitcher, PageHero,
    │                        # HeroCopy, BlogPostHeroContent, PostCard, SearchModal, Seo, TopLoadingBar
    ├── content/
    │   ├── pages/<گروه>/    # صفحات ایستا: en.mdx, de.mdx, fa.mdx, … + <گروه>.png
    │   └── blog/<گروه>/     # مقالات: en.mdx, fa.mdx, … + <گروه>.png
    ├── content.config.ts    # شمای Zod هر دو کالکشن
    ├── i18n/
    │   ├── locales.ts       # SSOT زبان‌ها: LOCALES, DEFAULT_LOCALE, LOCALE_METADATA
    │   ├── format.ts        # فرمت بومی تاریخ (هجری شمسی برای fa) و اعداد (Intl)
    │   └── paths.ts         # localizeHref, localeHref, stripLocale, getPathname
    ├── layouts/BaseLayout.astro
    ├── libs/
    │   ├── config/
    │   │   ├── app.ts       # خواندن و اعتبارسنجی app.config.json
    │   │   └── navigation.ts # ساخت ناوبری هدر/منوی موبایل/فوتر
    │   └── content/         # entries, service, feed, pagination, blog, taxonomy, social
    ├── pages/               # فقط فایل‌های فیزیکی
    │   ├── [...path].astro  # دیسپچر مسیریاب
    │   ├── 404.astro        # صفحهٔ ۴۰۴ locale-aware
    │   ├── icons.svg.ts     # اسپرایت SVG
    │   ├── site.webmanifest.ts
    │   ├── rss.xml.ts       # فید Atom زبان پیش‌فرض
    │   ├── rss/[locale].xml.ts # فیدهای Atom سایر زبان‌ها
    │   ├── sitemap.xml.ts   # نقشهٔ سایت چندزبانه
    │   ├── robots.txt.ts
    │   ├── api/blog-posts.json.ts # کاتالوگ استاتیک وبلاگ برای فیلتر بین‌صفحه‌ای
    │   └── api/search-dev.json.ts
    ├── paraglide/           # ⚠️ تولیدشده — هرگز دستی ویرایش نشود
    ├── styles/              # global.css (توکن‌های روشن/تیره + سیستم شیشه‌ای)، prose.css
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
  "server": { "host": "0.0.0.0", "port": 3000 }
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
    "./node_modules/@inlang/plugin-message-format/dist/index.js",
    "./node_modules/@inlang/plugin-m-function-matcher/dist/index.js"
  ],
  "plugin.inlang.messageFormat": { "pathPattern": "./messages/{locale}.json" }
}
```

`baseLocale` باید با `DEFAULT_LOCALE` در `src/i18n/locales.ts` یکی باشد؛ ممیزی i18n
این تطابق را بررسی می‌کند.

افزونه‌های درون‌یابی از `node_modules` خوانده می‌شوند (نه از CDN)، پس نسخهٔ آن‌ها با
`pnpm-lock.yaml` قفل است و بیلد به شبکه نیاز ندارد.

### تغییر رنگ برند

دو رنگ `themeColor` و `backgroundColor` در `app.config.json` هستند، ولی رنگ اصلی
UI از توکن خام `--theme-primary` در `src/styles/global.css` می‌آید (لایهٔ
`@theme static inline` آن را به `--color-primary` و کلاس‌هایی مثل `bg-primary`
نگاشت می‌کند). برای هماهنگی کامل این دو را با هم تغییر دهید:

```css
:root {
  --theme-primary: oklch(50% 0.2 260);   /* ← رنگ اصلی */
}

:root[data-theme='dark'] {
  --theme-primary: oklch(68% 0.17 260);
}
```

و `brand.themeColor` / `brand.darkThemeColor` را در `app.config.json` هم‌رنگ کنید.

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

خروجی: `src/content/pages/contact/{en,de,fr,fa,ar}.mdx` با اسلاگ هر زبان (زبان مبدأ
نام گروه؛ بقیه جای‌نگهدار تا اسلاگ بومی تعیین شود)، ثبت کلید `nav_contact` در همهٔ
فرهنگ‌ها و اشارهٔ `image` به `./contact.png`.

| گزینه | کار |
| --- | --- |
| `--title="…"` | عنوان صفحه (در زبان مبدأ) |
| `--desc="…"` / `--description="…"` | توضیح صفحه |
| `--from=<locale>` / `--source=<locale>` | زبان مبدأ (پیش‌فرض: زبان پایه) |
| `--publish` / `--draft=false` | انتشار زبان مبدأ و زبان‌هایی که عنوان/توضیح واقعی دارند (زبان‌های دارای `[TODO: …]` پیش‌نویس می‌مانند) |
| `--draft` / `--draft=true` | ساخت به‌صورت پیش‌نویس |
| `--no-draft` | معادل `--draft=false` |
| `--image=cover.png` | تصویر هیرو (نسبت به فایل محتوا) |
| `--image=none` | استفاده از artwork مشترک |
| `--slug:<locale>="…"` | اسلاگ بومی یک زبان |
| `--title:fa="…"` | عنوان مخصوص یک زبان |
| `--desc:fa="…"` | توضیح مخصوص یک زبان |
| `--data='{"fa":{"title":"…"}}'` | دادهٔ JSON برای چند زبان |
| `--file=path.json` | همان، از یک فایل |
| `--skip-nav` / `--no-nav` | ثبت نکردن در ناوبری |
| `--no-update-heading` | دست‌نخورده گذاشتن `# Title` داخل بدنه |
| `--update` | به‌روزرسانی گروه موجود بدون بازنویسی بدنه |
| `--sync-frontmatter` | هم‌تراز کردن فرانت‌متر همهٔ فایل‌های زبانی |
| `--sync-all` | راندن عنوان/توضیح مبدأ به‌عنوان الگو به همهٔ زبان‌ها |

#### وضعیت انتشار پیش‌فرض

پیش‌فرض، **فقط زبان مبدأ منتشر می‌شود** و بقیهٔ زبان‌ها `draft: true` می‌مانند
تا وقتی ترجمه شوند:

| حالت | زبان مبدأ | بقیهٔ زبان‌ها |
| --- | --- | --- |
| بدون پرچم (پیش‌فرض) | منتشر | پیش‌نویس |
| `--publish` / `--draft=false` | منتشر | منتشر — فقط اگر عنوان/توضیح واقعی داشته باشند |
| `--draft` / `--draft=true` | پیش‌نویس | پیش‌نویس |

این رفتار مانع انتشار متن انگلیسی در زبان‌های دیگر می‌شود. هر زبانی که هنوز
`[TODO: …]` در عنوان یا توضیحش دارد، حتی با `--publish` هم پیش‌نویس می‌ماند؛
برای انتشارش با `--title:<locale>` و `--desc:<locale>` متن واقعی بدهید یا
`draft` را در فرانت‌متر دستی بردارید.

#### اسلاگ هر زبان

- زبان مبدأ و زبان پیش‌فرض: نام گروه (`contact`).
- بقیهٔ زبان‌ها: یک اسلاگ موقت (`contact-fa`) تا وقتی اسلاگ بومی را با
  `--slug:fa="تماس-با ما"` تعیین کنید — چون یک اسلاگ ترجمه‌شده را نمی‌شود از
  عنوان `[TODO: fa]` حدس زد.

> اسلاگ در هر زبان یکتا است و پیشوند زبان URLها را از هم جدا می‌کند؛
> بنابراین یک اسلاگ یکسان در چند زبان مجاز است.

#### تصویر هیرو

اگر `--image` فایلی را بدهد که پیدا نشود، اسکریپت **هشدار می‌دهد** و به
artwork خود گروه (`./<page-key>.png`) برمی‌گردد؛ بیلد نمی‌شکند و هیرو بدون
تصویر نمی‌ماند.

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
| `--from=<locale>` / `--source=<locale>` | زبان مبدأ (پیش‌فرض: زبان پایه) |
| `--clone-from=<group>` | برداشتن بدنه از گروه مقالهٔ موجود |
| `--category="a,b"` / `--categories="a,b"` | دسته‌ها (قابل تکرار) |
| `--tags="x,y"` / `--tag="x,y"` | برچسب‌ها (قابل تکرار) |
| `--date="YYYY-MM-DD"` / `--publishedAt="…"` | تاریخ انتشار |
| `--image=cover.png` / `--image=none` | کاور |
| `--publish` / `--draft` / `--no-draft` | وضعیت انتشار |
| `--slug:<locale>="…"` | اسلاگ بومی یک زبان |
| `--update` / `--sync-frontmatter` / `--sync-all` | همانند `new:page` |
| `--title:fa="…"` / `--desc:fa="…"` / `--data='…'` | دادهٔ مخصوص هر زبان |
| `--no-update-heading` | دست‌نخورده گذاشتن عنوان داخل بدنه |

وضعیت انتشار، اسلاگ و رفتار تصویر دقیقاً مثل `new:page` است (بخش ۷.۱):
پیش‌فرض فقط زبان مبدأ منتشر می‌شود، بقیهٔ زبان‌ها پیش‌نویس می‌مانند، و یک
`--image` ناموجود به‌جای شکستن، هشدار می‌دهد و به کاور گروه برمی‌گردد.

> `--from` **زبان مبدأ** را مشخص می‌کند، نه اینکه بدنهٔ مقالهٔ دیگری را کپی
> کند. برای کپی‌کردن بدنه از مقاله‌ای موجود، `--clone-from=<group>` بزنید.

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

> با `--locale` فقط **فایل همان زبان** حذف می‌شود و کلید `nav_<page>` در همهٔ
> فرهنگ‌ها می‌ماند: مجموعهٔ کلیدهای فرهنگ‌ها یک invariant است و نباید بین
> زبان‌ها فرق کند. ناوبری و تعویض زبان خودشان زبانی را که ورودی ندارد
> نادیده می‌گیرند، و ممیزی i18n نبودِ آن زبان را به‌عنوان **هشدار** گزارش
> می‌کند، نه خطا.

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

رنگ هر گروه از **جایگاه آن در فهرست مرتب‌شدهٔ گروه‌ها** گرفته می‌شود، پس با
افزودن یک گروه تازه، رنگ گروه‌های دیگر هم جابه‌جا می‌شود. این رفتار قطعی و
تکرارپذیر است: اجرای دوبارهٔ `assets:generate` بدون تغییر محتوا هیچ فایلی را
عوض نمی‌کند.

دو چیز **تولید نمی‌شود**:

- عکس مشترک هیرو (`src/assets/hero/hero-0.jpg`) — یک عکس واقعی است، نه artwork کدنویسی‌شده؛
- `public/favicon.svg` و `public/favicon.ico` — دستی ساخته و در مخزن نگه‌داری می‌شوند.

> چون نام فایل artwork هر گروه همان `<group>.png` است، اگر فایل سفارشی‌ای با همین نام
> بدهید، اسکریپت آن را با نام `<group>-custom.<ext>` کپی می‌کند تا بیلد نشکند.

### ۷.۹ ممیزی و تست

```bash
pnpm run audit:i18n    # ۵ بخش: پیکربندی زبان، فرهنگ‌ها، محتوا، مسیرها، متن هاردکد
pnpm run smoke         # ۹۸ assertion روی خروجی بیلدشده
pnpm run knip          # فایل/اکسپورت/وابستگی مرده
pnpm run verify:cli    # ۴۵ ادعا دربارهٔ گردش‌کارهای CLI
```

`verify:cli` پروژه را در یک پوشهٔ موقت کپی می‌کند، همهٔ فرمان‌های CLI را دقیقاً
همان‌طور که در این راهنما آمده اجرا می‌کند و برای هر ادعا یک خط PASS/FAIL
چاپ می‌کند. این اسکریپت هیچ فایلی از نسخهٔ کاری شما را تغییر نمی‌دهد و
حتی `node_modules` را دست نمی‌زند (برای همین `pnpm` داخل پوشهٔ موقت اجرا
نمی‌شود).

> در بخش ۳ ممیزی، **نبودِ فایل یک زبان برای یک گروه هشدار است، نه خطا**:
> نوشتن یک مقاله فقط به انگلیسی حالت عادی است و سایت، ناوبری و تعویض زبان
> هر سه با آن کنار می‌آیند.

### ۷.۱۰ کتابخانهٔ مشترک `scripts/lib/`

| فایل | نقش |
| --- | --- |
| `locales.mjs` | خواندن `src/i18n/locales.ts` به‌عنوان منبع حقیقت: `parseLocaleConfig(source)` و `readLocaleConfig()` — ممیزی i18n و تست دود هر دو از همین پارسر استفاده می‌کنند، پس فهرست زبان‌ها و جهت آن‌ها هرگز دو بار تعریف نمی‌شود |
| `frontmatter.mjs` | `parseFrontmatter` / `stringifyFrontmatter` (بدون وابستگی) |
| `image-reference.mjs` | تبدیل `--image` به ارجاع نسبی به فایل محتوا و کپی artwork به پوشهٔ گروه |
| `content-stub.mjs` | متن جانشین هر زبان برای محتوای تولیدشده (صفحه و مقاله) |
| `slug.mjs` | `resolveSlug` — اسلاگ هر زبان در محتوای تازه‌ساخته (نام گروه برای زبان مبدأ، `<گروه>-<locale>` برای بقیه) |
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
| `--publish` / `--draft` | وضعیت انتشار محتوای تولیدشده؛ محتوای کپی‌شده عنوان `[TODO: …]` دارد، پس حتی با `--publish` هم پیش‌نویس می‌ماند. هر فایل را ترجمه کنید و `draft` را دستی بردارید |

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
| `--color-primary` / `--color-primary-fg` | رنگ اصلی و متن روی آن (CTA، لینک) |
| `--color-secondary` / `--color-secondary-fg` | نقش مکمل (بنفش) برای برجسته‌سازی دوم |
| `--color-accent` / `--color-accent-fg` | تأکید فیروزه‌ای؛ امروز نوار تزئینی هیرو |
| `--color-neutral` / `--color-neutral-fg` | سطح خنثی تیره (نوارها، برچسب‌های خنثی) |
| `--color-info` / `--color-info-fg` | اطلاع‌رسانی |
| `--color-success` / `--color-success-fg` | موفقیت |
| `--color-warning` / `--color-warning-fg` | هشدار |
| `--color-error` / `--color-error-fg` | خطا / اقدام مخرب |
| `--color-glass` / `--color-glass-hover` / `--color-glass-border` / `--color-glass-control` | پالت شیشه‌ای |
| `--shadow-glass` | سایهٔ سطوح شیشه‌ای |

پالت معنایی از **DaisyUI** الهام گرفته است — `primary`، `secondary`، `accent`،
`neutral`، `info`، `success`، `warning`، `error` — با این تفاوت که پسوند متن
هر نقش `-fg` است (به‌جای `-content` در DaisyUI). هر جفت `-fg` در هر دو حالت
روشن و تیره حداقل کنتراست **WCAG AA** (۴٫۵:۱) را دارد.

- لایهٔ خام تم `--theme-*` است و بازتنظیم کل سایت فقط با ویرایش `:root` و
  `:root[data-theme='dark']` در `src/styles/global.css` انجام می‌شود.
- `@theme static inline` همهٔ نقش‌ها را به‌صورت متغیر `--color-*` در خروجی
  نگه می‌دارد و هم‌زمان آن‌ها را به کلاس‌های Tailwind نگاشت می‌کند؛ مثلاً
  `bg-info`، `text-success-fg`، `border-error`، `bg-secondary text-secondary-fg`.
- نقش‌های وضعیت (info/success/warning/error) هنوز در هیچ کامپوننتی استفاده
  نشده‌اند و برای اعلان‌ها، برچسب‌ها و سطح‌های وضعیت آماده‌اند.

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

نمادهای موجود: `search`، `globe`، `close`، `check`، `menu`، `chevron-left`، `sun`، `moon`، `copy`.

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

## ۱۱. چیدمان صفحه: BaseLayout و معماری ناوبری چندمنویی

`src/layouts/BaseLayout.astro` پوستهٔ مشترک و هستهٔ رابط کاربری همهٔ صفحه‌هاست. این کامپوننت با هماهنگی `src/libs/config/navigation.ts` یک **سیستم ناوبری چندمنویی تفکیک‌شده و نوع‌امن (Typed Multi-Menu Navigation)** را پیاده‌سازی می‌کند.

### اجزای اصلی چیدمان

| بخش | توضیح فنی |
| --- | --- |
| `<head>` | charset، viewport، `theme-color`، `manifest`، `apple-touch-icon`، `favicon`، `<ClientRouter />` و متادیتای SEO |
| لینک پرش | `href="#main-content"` با کلاس `sr-only focus:not-sr-only` — اولین عنصر قابل فوکوس صفحه برای دسترس‌پذیری |
| هدر شیشه‌ای | `fixed inset-x-0 top-0` + `.glass-surface`؛ برند، ناوبری دسکتاپ چندسطحی، جستجو، تغییر تم، تعویض زبان، دکمهٔ CTA |
| کشوی موبایل | کشوی اسلایدی واکنشی با تب‌بندی دوگانه (تب ناوبری + تب جستجوی یکپارچه)، بخش اختصاصی زبان‌ها و تغییر تم |
| `<main id="main-content">` | محتوای صفحه؛ اسلات `hero` تمام‌عرض بیرون از ستون محتوا رندر می‌شود |
| فوتر چندستونه | شبکهٔ معنایی ۴ ستونه (برند، محصول، منابع، شرکت) + نوار پایین با سال بومی خودکار و لینک‌های حقوقی |
| نوار پیشرفت | `TopLoadingBar` با `transition:persist` و هماهنگ با انتقال‌های View Transitions |

---

### معماری ناوبری چندمنویی (`src/libs/config/navigation.ts`)

در معماری جدید، هدر دسکتاپ، منوی موبایل و فوتر دیگر یک لیست مسطح مشترک را به اشتراک نمی‌گذارند؛ بلکه هر بخش دارای ساختار، اولویت و سلسله‌مراتب اختصاصی است که توسط تابع مرکزی `getNavigationSlots(locale, currentUrl)` ساخته و توزیع می‌شود:

```ts
export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  external?: boolean;
  children?: NavItem[];
}

export interface FooterColumn {
  key: string;
  title: string;
  items: NavItem[];
}

export interface NavigationSlots {
  header: NavItem[];
  drawer: NavItem[];
  footer: FooterColumn[];
  legal: NavItem[];
}
```

#### ۱. ناوبری هدر دسکتاپ (`headerNav`)
- از تابع `getHeaderNavigation(locale, currentUrl)` تأمین می‌شود.
- **منوهای آبشاری چندسطحی (Dropdowns)**: از فیلد `children` در `NavItem` پشتیبانی می‌کند. روی دسکتاپ با هاور و فوکوس کیبورد (`group-hover` و `group-focus-within`) باز می‌شود. زیرمنوهای تو در تو نیز با آیکون `chevron-right` (با چرخش خودکار `rtl:rotate-180` در زبان‌های راست‌به‌چپ) به سمت جهت خواندن هدایت می‌شوند.
- **تشخیص خودکار صفحهٔ فعال**: تابع `isActive(href, currentUrl)` مسیر جاری را با لینک‌ها مقایسه کرده و کلاس `text-primary font-medium` و نشانگر `aria-current="page"` را اعمال می‌کند.
- **دکمهٔ CTA مستقیم**: دکمهٔ شروع سریع (`common_get_started`) به صفحهٔ قیمت‌گذاری هدایت می‌کند.

#### ۲. کشوی کشویی موبایل (`drawerNav` و پنل اختصاصی)
- از تابع `getDrawerNavigation(locale, currentUrl)` تأمین می‌شود و با دکمهٔ همبرگری `data-mobile-menu-btn` باز می‌شود.
- **طراحی دوتبی (Two-Tab Interface)**:
  - **تب ناوبری (`drawer_tab_nav`)**: شامل سلسله‌مراتب کامل صفحات سایت با زیرمنوهای تو در توی درون‌خطی (Inline Nested Lists با حاشیهٔ منطقی `border-s-2 border-primary/30 ps-3`) بدون پاپ‌آپ‌های آزاردهنده.
  - **بخش اختصاصی زبان‌ها**: یک گرید دو ستونه از همهٔ زبان‌های فعال (`data-drawer-language-section`) با نمایش نام بومی، کد زبان و آیکون تیک برای زبان جاری، همراه با ناوبری استاتیک امن (`window.location.assign`).
  - **بخش اختصاصی تغییر تم**: کنترلگر تغییر حالت روشن/تیره درون کشو.
  - **تب جستجو (`drawer_tab_search`)**: کامپوننت `DrawerSearch.astro` مستقیماً درون کشو تعبیه شده و با انتخاب تب، فوکوس خودکار روی اینپوت جستجو قرار می‌گیرد.
- **مدیریت فوکوس و دسترس‌پذیری**: استفاده از خصوصیت `inert` روی پنل در حالت بسته، گوش دادن به کلید `Escape`، کلیک روی پس‌زمینه (Backdrop) و رویداد `app:close-drawer`.

#### ۳. فوتر چندستونهٔ پیشرفته (`footerNav` و `legalNav`)
- از توابع `getFooterNavigation(locale, currentUrl)` و `getLegalNavigation(locale)` تأمین می‌شود و فوتر قدیمی تک‌خطی را به یک شبکهٔ واکنشی استاندارد تبدیل می‌کند:
  - **ستون ۱ (برند و مأموریت)**: نام برند، توضیح بومی سایت (`site_description`).
  - **ستون ۲ (محصول / Product)**: خانه، امکانات، قیمت‌گذاری و ارجاع به بخش سیستم طراحی.
  - **ستون ۳ (منابع / Resources)**: وبلاگ، راهنمای پشتیبانی RTL، نمای کلی، و پیوند مستندات خارجی (همراه با آیکون `external-link` و `rel="noopener noreferrer"`).
  - **ستون ۴ (شرکت / Company)**: درباره ما و پیوند مخزن گیت‌هاب (در صورت تنظیم در `socialConfig`).
- **نوار پایین فوتر (Bottom Bar)**:
  - درج سال کپی‌رایت خودکار با تقویم هجری شمسی برای فارسی (`formatYear(currentYear, locale)`) و متن همه‌حقوق محفوظ است (`common_all_rights_reserved`).
  - پیوندهای حقوقی ثانویه (`legalNav`) شامل حریم خصوصی (`footer_legal_privacy`) و شرایط استفاده (`footer_legal_terms`).

#### ۴. لایهٔ سازگاری با گذشته (Backward Compatibility)
تابع قدیمی `getNavigation(locale, currentUrl)` همچنان در `src/libs/config/navigation.ts` وجود دارد و به عنوان مستعار (alias) برای `getDrawerNavigation` عمل می‌کند تا هیچ اسکریپت یا تستی دچار شکست نشود.

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
  { group: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'about', label: (locale: Locale) => m.nav_about({}, { locale }) },
  { group: 'features', label: (locale: Locale) => m.nav_features({}, { locale }) },
  { group: 'pricing', label: (locale: Locale) => m.nav_pricing({}, { locale }) },
  { group: 'contact', label: (locale: Locale) => m.nav_contact({}, { locale }) },  // ← جدید
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

وقتی وبلاگ بیش از یک صفحه دارد و فیلتری فعال است، کارت‌های همان صفحه کافی
نیستند: `BlogIndexView` کاتالوگ استاتیک `/api/blog-posts.json` را یک بار
(`catalogPromise`) می‌گیرد و همهٔ مقالات آن زبان را که با فیلتر می‌خوانند
به‌صورت کارت‌های پویا رندر می‌کند؛ در این حالت پیجر پنهان می‌شود، چون نتیجه
دیگر به یک صفحه محدود نیست. اگر این درخواست شکست بخورد، فیلتر به کارت‌های
همان صفحه برمی‌گردد (fallback بی‌صدا). لینک‌های پیجر همیشه کوئری فیلتر فعال
را حمل می‌کنند.

### زمان مطالعه

```ts
getReadingTime(body);   // ≈ ۲۰۰ کلمه بر دقیقه، حداقل ۱
```

### خرده‌مسیر و لینک‌های مقاله

- خرده‌مسیر: خانه ← وبلاگ ← عنوان مقاله (`getBreadcrumbs`)
- چیپ دستهٔ مقاله به فهرست فیلترشده لینک می‌شود
- برچسب‌های انتهای مقاله هم به فهرست فیلترشده لینک می‌شوند
- لینک «بازگشت به وبلاگ» با فلش `rtl:rotate-180`

### تجربهٔ خواندن مقاله

| ویژگی | رفتار |
| --- | --- |
| فهرست مطالب | از `headings` خود Astro؛ فقط `h2`/`h3` و تنها وقتی حداقل دو سرتیتر وجود دارد. در دسکتاپ `lg:sticky` و در موبایل `<details>` جمع‌شو |
| هایلایت TOC | `IntersectionObserver` با `rootMargin` منفی زیر هدر؛ لینک فعال `data-active="true"` می‌گیرد |
| مقالات مرتبط | دو مقالهٔ اول بر اساس امتیاز دستهٔ مشترک (+۲) و برچسب مشترک (+۱)؛ در تساوی، ترتیب تازگی |
| ناوبری جدیدتر/قدیمی‌تر | بر پایهٔ فهرست مرتب‌شدهٔ همان زبان (`getAdjacentPosts`) |
| تاریخ به‌روزرسانی | فقط وقتی `updatedAt` از `publishedAt` جدیدتر باشد، هم در هیرو و هم در `article:modified_time` |
| کپی کد | اسکریپت `BaseLayout` برای هر `pre` یک دکمه تزریق می‌کند؛ برچسب‌ها از دیکشنری، آیکن `copy` → `check` و بازگشت پس از ۱٫۸ ثانیه |
| چاپ | `@media print` در `global.css`: حذف هدر/فوتر-ناوبری/جستجو/فیلتر/پیجر/TOC/مقاله‌های مرتبط/دکمهٔ کپی، هیرو مسطح با متن تیره، و `break-inside: avoid` برای کد و تصویر |

همهٔ این ویجت‌ها (`[data-toc]`, `[data-related-posts]`, `[data-post-nav]`, `.code-copy-btn`)
با `data-pagefind-ignore` از ایندکس جستجو بیرون می‌مانند.

### JSON-LD مقاله

`BlogPostView` یک شیء `BlogPosting` می‌سازد: `headline`، `description`، `image`،
`datePublished`، `dateModified` (از `updatedAt`)، `inLanguage`، `articleSection`،
`keywords`، `mainEntityOfPage`، و `author`/`publisher`.

### آرشیو (RSS/Atom)

`src/libs/content/feed.ts` سازندهٔ فید Atom تک‌زبانه است و هر زبان فقط
مقالات منتشرشدهٔ خودش را منتشر می‌کند (با `xml:lang` روی فید و هر `entry`،
`hreflang` روی هر `link` و دسته/برچسب بومی‌شده به‌عنوان `category`):

| مسیر | زبان |
| --- | --- |
| `/rss.xml` | زبان پیش‌فرض (`DEFAULT_LOCALE`) |
| `/rss/<locale>.xml` | هر زبان غیرپیش‌فرض (`/rss/fa.xml`, `/rss/de.xml`, …) |

هر صفحه لینک `rel="alternate" type="application/rss+xml"` را به فید زبان
خودش می‌دهد (`getRssFeedHref(locale)`)، پس خوانندهٔ فید فقط مقالات زبان
خودش را می‌گیرد.
`src/pages/sitemap.xml.ts` نقشهٔ سایت چندزبانه با `x-default`، `lastmod` و
`changefreq` تولید می‌کند (صفحهٔ فهرست وبلاگ `lastmod` را از آخرین مقالهٔ
منتشرشدهٔ همان زبان می‌گیرد).

---

## ۱۴. جستجو

`src/components/SearchModal.astro`:

| رفتار | جزئیات |
| --- | --- |
| باز کردن | کلیک روی دکمهٔ جستجو (هر جای صفحه) یا میان‌بر `⌘K` / `Ctrl+K` |
| بستن | `ESC`، کلیک روی پس‌زمینه، دکمهٔ بستن، یا کلیک روی یک نتیجه |
| پروداکشن | ابتدا Pagefind از `/pagefind/pagefind.js` (ایندکس ساخته‌شده در بیلد) |
| نبود Pagefind | fallback به `/api/search-dev.json` — هم در توسعه و هم در بیلد تولیدی |
| فیلتر زبان | نتایج فهرست fallback فقط برای `locale` جاری نمایش داده می‌شوند |
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
- `rel="alternate" type="application/rss+xml"` برای فید همان زبان (با عنوان زبان)
- `noindex, nofollow` برای صفحهٔ ۴۰۴
- `hreflang` برای هر ترجمه + `x-default`
- Open Graph کامل: `og:site_name`, `og:title`, `og:description`, `og:url`, `og:type`,
  `og:locale`, `og:locale:alternate`, `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`
  و `article:published_time` / `article:modified_time` برای مقاله‌ها
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
| `/rss.xml` | Atom | مقالات منتشرشدهٔ زبان پیش‌فرض با `category` |
| `/rss/<locale>.xml` | Atom | مقالات منتشرشدهٔ همان زبان (غیرپیش‌فرض) |
| `/robots.txt` | متن | `User-agent: *` / `Allow: /` / `Disallow: /api/` / `Sitemap: <مطلق>` |
| `/site.webmanifest` | JSON | از `app.config.json` + زبان پیش‌فرض ساخته می‌شود: نام، `short_name`، `lang`/`dir`، رنگ‌ها، آیکون‌ها، `display: standalone` |
| `/icons.svg` | SVG | اسپرایت نمادها؛ هر نماد یک `<symbol id="name">` |
| `/api/search-dev.json` | JSON | فهرست fallback جستجو (عنوان، توضیح، URL، زبان) |
| `/api/blog-posts.json` | JSON | کاتالوگ استاتیک مقالات منتشرشدهٔ همهٔ زبان‌ها برای فیلتر فراصفحه‌ای |

### صفحهٔ ۴۰۴

`src/pages/404.astro` زبان را از پیشوند URL تشخیص می‌دهد و `lang`، `dir`،
فونت، عنوان، توضیح، ناوبری، برچسب‌های هدر/فوتر/جستجو/تعویض زبان و لینک «نسخهٔ انگلیسی» را
در سمت کاربر بازنویسی می‌کند. چون یک سند ایستای مشترک برای همهٔ مسیرهای ناموجود است،
canonical و `hreflang` آن روی زبان پیش‌فرض (`/`) می‌مانند — نه `/404` که وجود ندارد —
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
pnpm test         # ۱۰۱ تست Vitest
pnpm run audit:i18n
SITE_URL=https://example.com pnpm run build
pnpm run smoke    # ۹۸ assertion روی dist/
pnpm run knip
pnpm run verify:cli  # ۴۵ ادعا دربارهٔ گردش‌کارهای CLI
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
| `src/libs/config/astro-config.test.ts` | alias `astro/components` در `astro.config.mjs` (رفع `Unknown file extension ".astro"`) |

> **۹ فایل تست، ۱۰۱ تست.** ماژول `astro:content` در Vitest با
> `src/test/astro-content-mock.ts` جایگزین می‌شود، پس تست‌های واحد بدون بیلد
> Astro و بدون دست‌زدن به فایل‌های محتوا اجرا می‌شوند.

### ممیزی i18n — ۵ بخش

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. پیکربندی زبان | تطابق `locales.ts` و `project.inlang/settings.json`، وجود `dir` برای هر زبان |
| ۲. فرهنگ‌ها | کلیدها و placeholderهای ICU در همهٔ زبان‌ها، وجود همهٔ کلیدهای استفاده‌شده |
| ۳. کالکشن محتوا | وجود فایل هر زبان برای هر گروه (نبودِ یک زبان = هشدار) |
| ۴. نگهبان slug و مسیر | فرانت‌متر معتبر، اسلاگ‌های یکتا، نبود برخورد مسیر |
| ۵. اسکنر متن هاردکد | هشدار دربارهٔ رشته‌های ترجمه‌نشده در قالب‌ها (هشدار، نه خطا) |

خروجی واقعی روی این مخزن: ۵ زبان، ۵۲ کلید در همهٔ فرهنگ‌ها با placeholder
یکسان، ۴۱ کلید استفاده‌شدهٔ ایستا، ۷ گروه محتوا، بدون برخورد مسیر و بدون
هشدار متن هاردکد.

### تست دود — ۷ بخش روی `dist/`

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. زبان پیش‌فرض | ریشه بدون پیشوند، `lang`/`dir` درست |
| ۲. زبان‌های دیگر | حفظ پیشوند، زبان و جهت |
| ۳. اسلاگ مقاله | اسلاگ‌های محلی‌شده به صفحهٔ ساخته‌شدهٔ واقعی می‌رسند |
| ۴. hreflang | پوشش کامل روی صفحهٔ خانه + `x-default` |
| ۵. endpointها | `sitemap.xml`، `rss.xml`، `robots.txt`، `site.webmanifest`، `icons.svg`، کارت OG |
| ۶. یک `h1` و متن بدون placeholder | هر صفحهٔ بیلدشده دقیقاً یک `<h1>` دارد و هیچ `[TODO` منتشر نشده |
| ۷. صفحه‌بندی وبلاگ | مسیر صفحه‌ها، نشانه‌گذاری پیجر، `rel=prev/next`، نبود صفحهٔ اضافی |

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
- ترتیب: lint → test → audit → build → smoke → knip → verify:cli

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

پوشهٔ `dist/` یک سایت کاملاً استاتیک است و روی هر میزبانی سرو می‌شود
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
| `Unknown file extension ".astro"` در سرور توسعه | سرور توسعه قبل از `pnpm install` بالا آمده و `node_modules` عوض شده است | سرور را ری‌استارت کنید: `pnpm exec astro dev stop` و بعد `pnpm exec astro dev --background` |
| `Missing <locale>.mdx` در خروجی ممیزی | گروه محتوا در همهٔ زبان‌ها ترجمه نشده | هشدار است و بیلد را نمی‌شکند؛ با `pnpm run new:page <key> --update` یا `--slug:<locale>=…` تکمیلش کنید |

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
| `pnpm run verify:cli` | تست سرتاسری گردش‌کارهای CLI |
| `pnpm exec astro dev --background` | اجرای سرور توسعه در پس‌زمینه |
| `pnpm exec astro dev status` | وضعیت سرور توسعه |
| `pnpm exec astro dev logs --follow` | دنبال کردن لاگ سرور |
| `pnpm exec astro dev stop` | توقف سرور توسعه |

---

## پیوست B — کلیدهای ترجمه

۷۸ کلید ترجمه در `messages/en.json` (و یک کلید `$schema` که فقط متادیتای JSON Schema است):

### `common_*` (۲۴ کلید)

`common_all_rights_reserved` · `common_back_home` · `common_back_to_blog` ·
`common_breadcrumbs` · `common_change_language` · `common_close` ·
`common_copied` · `common_copy_code` · `common_english_version_hint` ·
`common_get_started` · `common_go_english_version` · `common_menu` ·
`common_no_results` · `common_not_found_desc` · `common_not_found_title` ·
`common_press_esc` · `common_published_on` · `common_search_placeholder` ·
`common_skip_to_content` · `common_theme_dark` · `common_theme_light` ·
`common_theme_toggle` · `common_type_to_search` · `common_updated_on`

### `blog_*` (۳۰ کلید)

عمومی: `blog_all_posts` · `blog_categories` · `blog_empty` ·
`blog_filter_by_category` · `blog_filter_by_tag` · `blog_filter_clear` ·
`blog_filter_empty` · `blog_filter_showing_all` · `blog_filter_showing_page` ·
`blog_index_description` · `blog_newer_post` · `blog_older_post` ·
`blog_pagination_label` · `blog_pagination_next` · `blog_pagination_page` ·
`blog_pagination_previous` · `blog_pagination_status` · `blog_read_time` ·
`blog_related_posts` · `blog_tags` · `blog_toc_title`

دسته‌ها: `blog_category_announcements` · `blog_category_design` ·
`blog_category_engineering` · `blog_category_guides` · `blog_category_product`

برچسب‌ها: `blog_tag_architecture` · `blog_tag_astro` · `blog_tag_i18n` ·
`blog_tag_performance` · `blog_tag_release` · `blog_tag_rtl`

### `drawer_*` (۲ کلید)

`drawer_tab_nav` (ناوبری در تب کشوی موبایل) · `drawer_tab_search` (جستجو در تب کشوی موبایل)

### `footer_*` (۶ کلید)

`footer_col_product` · `footer_col_resources` · `footer_col_company` ·
`footer_col_legal` · `footer_legal_privacy` · `footer_legal_terms`

### `nav_*` (۱۱ کلید)

`nav_about` · `nav_blog` · `nav_design_system` · `nav_documentation` ·
`nav_explore` · `nav_features` · `nav_home` · `nav_overview` ·
`nav_pricing` · `nav_resources` · `nav_rtl_support`

### کلیدهای متفرقه و ICU

| کلید | نوع / placeholder |
| --- | --- |
| `site_description` | شرح اصلی وب‌سایت در هدر، فوتر و متادیتا |
| `blog_read_time` | `{count}` — زمان مطالعه (ICU plural) |
| `blog_filter_showing_page` | `{visible}` و `{total}` — «نمایش X از Y مقاله در این صفحه» |
| `blog_filter_showing_all` | `{visible}` و `{total}` — «نمایش X از Y مقاله» |
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

### `src/i18n/paths.ts`

`getPathname` · `withTrailingSlash` · `stripLocale` · `localizeHref` · `localeHref`

### `src/libs/config/app.ts`

`siteConfig` · `POSTS_PER_PAGE` · `HERO_TITLE_ID` · `DEFAULT_HERO_IMAGE` · `absoluteUrl` · `UI_CONFIG` · `BLOG_CONFIG` · `SOCIAL_CONFIG`

### `src/libs/config/navigation.ts`

| خروجی | نوع / کاربرد |
| --- | --- |
| `getNavigationSlots(locale, currentUrl?)` | خروجی تفکیک‌شدهٔ اسلات‌ها `{ header, drawer, footer, legal }` |
| `getHeaderNavigation(locale, currentUrl?)` | لیست اقلام هدر دسکتاپ با پشتیبانی زیرمنوهای آبشاری |
| `getDrawerNavigation(locale, currentUrl?)` | لیست اقلام کشوی موبایل با زیرمنوهای درون‌خطی |
| `getFooterNavigation(locale, currentUrl?)` | لیست ستون‌های معنایی فوتر چندستونه (`FooterColumn[]`) |
| `getLegalNavigation(locale, currentUrl?)` | لینک‌های حقوقی نوار پایین فوتر |
| `isActive(href, currentUrl)` | اعتبارسنجی وضعیت فعال صفحه نسبت به URL جاری |
| `getNavigation(locale, currentUrl?)` | تابع سازگار با گذشته (alias به `getDrawerNavigation`) |

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
| `NavItem` · `FooterColumn` · `NavigationSlots` | `src/libs/config/navigation.ts` |
| `SiteRoute` · `SiteRouteProps` · `BreadcrumbItem` · `BreadcrumbLabels` | `src/libs/content/service.ts` |
| `ContentEntryId` · `ContentEntryLike` · `DatedContentEntry` | `src/libs/content/entries.ts` |
| `PageSlice` · `PageWindowEntry` | `src/libs/content/pagination.ts` |
| `BlogFilters` · `BlogTaxonomy` | `src/libs/content/blog.ts` |
| `SocialImage` | `src/libs/content/social.ts` |
