# راهنمای جامع Astro i18n Starter

> استارتر چندزبانهٔ تولیدی و **۱۰۰٪ استاتیک (Pure SSG بدون نیاز به بک‌اند)** بر پایهٔ **Astro v7**
> با پشتیبانی بومی **RTL/LTR**، ۲۲ بلوک آماده (الهام‌گرفته از PrebuiltUI) برای سایت‌های شرکتی و لندینگ، دسته‌بندی و فیلتر وبلاگ و نمونه‌کارها،
> جستجوی **Pagefind** بهینه‌شده برای زبان فارسی، آداپتور فرم‌های بدون سرور (Web3Forms، Formspree، Basin، Webhook + Turnstile)، بلوپرینت‌های صنعتی، استودیوی زندهٔ تم در DEV، معماری سه‌لایه (`Core` / `client/` / `starter-kit/`) و ۲۸ ابزار خط فرمان.

نسخهٔ ۵٫۱+ — مرجع فنی کامل و راهنمای عملیاتی.

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
| یک بخش (نوع محتوا) را روشن/خاموش کنم یا نمونه‌کار اضافه کنم | [۷. مجموعهٔ CLI](#۷-مجموعهٔ-cli) و [CONTENT-TYPES-FA.md](CONTENT-TYPES-FA.md) |
| زبان جدید اضافه یا حذف کنم | [۸. مدیریت زبان](#۸-مدیریت-زبان) |
| مشکل RTL یا فونت دارم | [۹. RTL](#۹-rtl-و-ویژگیهای-منطقی) |
| توکن‌ها و استایل‌ها را تغییر دهم | [۱۰. سیستم طراحی](#۱۰-سیستم-طراحی) |
| به عناصر صفحه انیمیشن اسکرول (ChronoTrig) بدهم | [۱۰. سیستم طراحی — انیمیشن‌های اسکرول](#scroll-motion) |
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
| **معماری Pure SSG و فرم بدون سرور** | خروجی ۱۰۰٪ استاتیک بدون سرور بک‌اند؛ فرم تماس (`ContactForm.astro`) و خبرنامه (`NewsletterBanner.astro`) از طریق `src/libs/api/client.ts` از ارائه‌دهندگان `custom`، `web3forms`، `formspree`، `basin` و `webhook` به‌همراه Cloudflare Turnstile و Honeypot پشتیبانی می‌کنند + مدیریت رضایت کوکی (`CookieConsent.astro`) |
| **زبان‌ها و حالت تک‌زبانه** | انگلیسی (`en`) و فارسی (`fa`) به‌صورت پیش‌فرض فعال + آمادگی کامل فونت/فرمت و افزودن تک‌فرمانی زبان‌های دیگر (`ar`, `de`, `fr`, …) با `i18n:add-lang`؛ برای سایت تک‌زبانه، صرفاً `ui.showLanguageSwitcher: false` (+ در صورت نیاز `i18n:set-default`) کافی است (و `i18n:solo` به‌صورت اختیاری مسیرهای اضافی را حذف می‌کند) |
| **مسیریابی** | دیسپچر تک‌فایلی `[...path].astro` — بدون هیچ فایل مسیر پویا در `src/pages/` |
| **محتوا، فیلتر نمونه‌کارها و CMS** | کالکشن‌های `pages`، `blog` و `projects` با قرارداد `گروه/زبان.mdx`؛ ۱۹ بلوک سکشن شرکتی/لندینگ + ۳ پریمیتیو رابط (`UiBadge`, `UiAlert`, `AvatarGroup`)، فیلتر دسته/پشتهٔ فنی/جستجو در `CollectionIndexView.astro` و پیکربندی آمادهٔ Pages CMS در `.pages.yml` |
| **RTL و فونت‌های تجاری فارسی** | خواص منطقی CSS (`ms-`, `pe-`, `start-`), ۵ پیش‌تنظیم فونت RTL (`vazirmatn`, `noto-arabic`, `iransans`, `yekan-bakh`, `peyda` با ساختار `@font-face` در `client/styles.css`)، جداسازی `pre/code` به LTR، چرخاندن آیکون پیجر |
| **وبلاگ** | دسته‌بندی، برچسب، فیلتر ترکیبی در کل مجموعهٔ مقالات (`/api/blog-posts/<locale>.json`)، صفحه‌بندی استاتیک، فهرست مطالب خودکار (TOC)، مقالات مرتبط و ناوبری مقالهٔ قبلی/بعدی، دکمهٔ کپی کد، زمان مطالعه و تاریخ به‌روزرسانی، استایل چاپ (`@media print`) |
| **برندینگ، لوگو، بلوپرینت و DEV Studio** | راه‌اندازی سریع با `site:init --blueprint=corporate\|agency\|portfolio\|medical`، پشتیبانی از لوگوی تصویر/SVG روشن و تیره (`brand.logo`)، ۶ پالت OKLCH آماده و فونت‌های variable نصب‌شده + **استودیوی زندهٔ تم در DEV (`DevThemePreview.astro` با خروجی صفر بایت در بیلد نهایی)** |
| **فرمت بومی** | تقویم هجری شمسی برای فارسی (`fa-IR-u-ca-persian`) و ارقام بومی فارسی/عربی (`۰-۹` / `٠-٩`) از طریق `src/i18n/format.ts` |
| **جستجوی فارسی بهینه‌شده** | ایندکس Pagefind با نرمال‌سازی حروف و علائم فارسی (`scripts/index-pagefind.mjs`) + بازسازی نیم‌فاصله، همزه و ارقام در سمت کاربر (`src/libs/search/persian.ts`) + فهرست `/api/search-dev/<locale>.json` به‌عنوان fallback، میان‌بر ⌘K/Ctrl+K |
| **SEO شرکتی و کارت OG فارسی** | canonical، hreflang چندزبانه + `x-default`، کارت PNG برنددار زمان بیلد (`/og/[...slug].png.ts` در حالت `branded`) با شکل‌دهی صحیح حروف RTL در SVG، Twitter Card، اسکیماهای `Organization` / `LocalBusiness` / `Service` / `WebSite` / `WebPage` / `CollectionPage` / `BlogPosting` / `BreadcrumbList` / `FAQPage` (`schema.ts`)، sitemap با `lastmod` کامل، فیدهای Atom مجزا |
| **۴۰۴** | صفحهٔ locale-aware با تشخیص زبان از پیشوند URL و لینک بازگشت به نسخهٔ زبان پیش‌فرض |
| **ابزار CLI** | ۲۸ اسکریپت (+ ۱۳ ماژول کمکی) برای راه‌اندازی برند و بلوپرینت (`site:init`)، ساخت/حذف صفحه و مقاله، مدیریت انواع محتوا، تزریق/پاک‌سازی دمو (`starter:seed`)، کنترل معماری (`upstream:check`)، تعویض زبان پیش‌فرض، بررسی سلامت پروژه، خزش لینک‌ها، تولید تصاویر و ایندکس Pagefind |
| **کیفیت و استقرار** | TypeScript strict، `astro check`، ۲۵ فایل تست واحد Vitest (۲۶۰ تست)، ۹۵ تست سرتاسری CLI، ممیزی i18n شش‌مرحله‌ای، تست دود روی `dist/`، Knip، Prefetch هوشمند و هدرهای آمادهٔ کش/امنیت در `public/_headers` و `docs/deploy/nginx.conf` |
| **کارایی** | خروجی کاملاً استاتیک، تصاویر WebP با `srcset`، فونت‌های variable خودمیزبان، `transition:persist`، `compressHTML` |
| **حرکت و اسکرول** | اسکرول نرم با **Lenis** + موتور **ChronoTrig** (`data-trig`) با پشتیبانی خودکار RTL (`data-trig-direction="start"`/`"end"`), پلکانی‌سازی گروهی (`data-trig-stagger`) و سازگاری کامل با View Transitions |
| **دسترس‌پذیری** | لینک پرش به محتوا، `aria-current`، `aria-live`، نشانگر فوکوس، `<dialog>` بومی، پشتیبانی یکپارچه از `prefers-reduced-motion` سیستم و کلید `data-motion` روی `<html>` |

---

## ۲. راه‌اندازی سریع

### پیش‌نیازها

- **Node.js ≥ ۲۲٫۱۲** (در `engines` تعریف شده)
- **npm** (یا **pnpm ۱۲٫۱۰٫۱** در صورت تمایل؛ همهٔ فرمان‌ها با `npm run` کار می‌کنند)

### نصب و اجرا

```bash
npm install

npm run dev           # ادغام/کامپایل پیام‌ها + سرور توسعه روی http://localhost:3000
npm run starter:seed  # (اختیاری) افزودن صفحات، ۶ مقاله و ۴ نمونه‌کار دمو از starter-kit/
npm run build         # کامپایل پیام‌ها + ممیزی i18n + بیلد Astro + ایندکس Pagefind
npm run preview       # پیش‌نمایش خروجی بیلدشده
```

> سرور توسعه روی `0.0.0.0:3000` گوش می‌دهد؛ هر دو مقدار از پیکربندی ادغام‌شده (`app.config.json` + `client/config.json`)
> خوانده می‌شوند، پس سرور و اپ همیشه روی یک پورت هستند.
>
> مخزن به‌طور پیش‌فرض در **وضعیت پایهٔ تمیز** قرار دارد تا سریع برای پروژهٔ مشتری آماده شود. برای تست یا دیدن نمونهٔ کامل کافی است `npm run starter:seed` را بزنید و هر زمان خواستید با `npm run starter:seed -- --clean --yes` به پایهٔ تمیز برگردید.

### وابستگی‌ها

| وابستگی | نقش |
| --- | --- |
| `astro` | هستهٔ SSG (نسخهٔ ۷) |
| `@astrojs/mdx` | رندر فایل‌های `.mdx` به‌عنوان محتوای کالکشن |
| `@inlang/paraglide-js` | کامپایل فرهنگ‌ها به توابع پیام در `src/paraglide/` |
| `@tailwindcss/vite` + `tailwindcss` | Tailwind v4 از طریق Vite، بدون فایل پیکربندی جدا |
| `@fontsource-variable/vazirmatn` | فونت variable فارسی |
| `@fontsource-variable/noto-sans-arabic` | فونت variable عربی |
| `@fontsource-variable/{plus-jakarta-sans,manrope,outfit,dm-sans,fraunces}` | فونت‌های variable لاتین متناظر با `brand.fontPreset` در `theme-presets.json` |
| `pagefind` | ساخت ایندکس جستجوی ایستا در مرحلهٔ بیلد |
| `lenis` | اسکرول نرم (Smooth Scroll) با اینرسی طبیعی و هماهنگ با View Transitions |
| `magic-string` | ویرایش امن کلاس‌های Tailwind در `block:adapt` |
| `sharp` (dev) | برش و رمزنگاری تصویر کارت اجتماعی |
| `vitest` (dev) | اجرای تست‌های واحد |
| `knip` (dev) | تشخیص فایل/اکسپورت/وابستگی مرده |
| `@astrojs/check` + `typescript` (dev) | `astro check` و `tsc --noEmit` |

> نسخهٔ دقیق وابستگی‌ها در `package.json` قفل شده و در CI از `npm ci` (یا lockfile) استفاده می‌شود.

### مدیریت سرور توسعه

Astro v7 سرور توسعه را می‌تواند به‌صورت پس‌زمینه اجرا کند؛ این برای محیط‌های
CI و عامل‌های خودکار ضروری است:

```bash
npx astro dev --background   # اجرا در پس‌زمینه (و قفل کردن پورت)
npx astro dev status         # وضعیت سرور در حال اجرا
npx astro dev logs --follow  # دنبال کردن لاگ همان سرور
npx astro dev stop           # توقف سرور
```

پرچم‌های مهم `astro dev`:

| پرچم | کار |
| --- | --- |
| `--background` | اجرای سرور به‌صورت پس‌زمینه |
| `--port <port>` | تغییر پورت (پیش‌فرض از `app.config.json` / `client/config.json`) |
| `--host` / `--host <address>` | گوش دادن روی همهٔ نشانی‌ها یا یک نشانی مشخص |
| `--mode <mode>` | حالت Vite (پیش‌فرض `development`) |
| `--open` | باز کردن مرورگر پس از بالا آمدن سرور |
| `--force` | پاک‌کردن کش لایهٔ محتوا و بیلد کامل |
| `--ignore-lock` | اجرا حتی اگر سرور دیگری روی همان پورت قفل دارد |
| `--allowed-hosts <list>` | فهرست hostهای مجاز (یا `all`) |

### همهٔ فرمان‌های `package.json`

| فرمان | کار |
| --- | --- |
| `npm run dev` | کامپایل پیام‌ها + `astro dev` |
| `npm run messages:compile` | ادغام `messages/core/*.json` + `client/messages/*.json` در `.paraglide-work/` و کامپایل به `src/paraglide/` |
| `npm run check` | کامپایل پیام‌ها + `astro check` |
| `npm run lint` | کامپایل پیام‌ها + `astro check` + `tsc --noEmit` |
| `npm test` | کامپایل پیام‌ها + `vitest run` (۲۵ فایل، ۲۶۰ تست) |
| `npm run build` | کامپایل پیام‌ها + ممیزی i18n + `astro build` + `node scripts/index-pagefind.mjs` |
| `npm run preview` | `astro preview` روی خروجی `dist/` |
| `npm run smoke` | تست دود روی `dist/` |
| `npm run knip` | فایل/اکسپورت/وابستگی مرده |
| `npm run assets:generate` | بازتولید آیکون‌ها، کارت OG و artwork هیرو/کاور |
| `npm run clean` | حذف `dist/`، `.astro/`، `.paraglide-work/` و `src/paraglide/` |
| `npm run new:page` | ساخت/ویرایش صفحهٔ ایستا |
| `npm run new:post` | ساخت/ویرایش مقالهٔ وبلاگ |
| `npm run remove:page` | حذف صفحه (یا فقط یک زبانش) |
| `npm run remove:post` | حذف مقاله |
| `npm run site:init` | راه‌اندازی سریع برند، پالت، فونت، ایمیل تماس و شبکه‌های اجتماعی مشتری در `client/config.json` |
| `npm run starter:seed` | تزریق یا پاک‌سازی (`--clean`) محتوای دمو از `starter-kit/` |
| `npm run upstream:check` | بررسی قرارداد معماری سه‌لایه (`Core` / `client/` / `starter-kit/`) |
| `npm run i18n:add-lang` | افزودن زبان جدید (یا بازگردانی زبان بایگانی‌شده) در `client/locales.json` |
| `npm run i18n:remove-lang` | حذف زبان |
| `npm run i18n:set-default` | تعویض زبان پیش‌فرض در `client/locales.json` |
| `npm run i18n:solo` | (اختیاری) تک‌زبانه‌کردن ساختاری با حذف مسیرهای دیگر و بایگانی در `.locale-archive/` |
| `npm run i18n:add` | افزودن یک کلید ترجمه در `client/messages/*.json` |
| `npm run i18n:add-batch` | افزودن گروهی کلیدها |
| `npm run i18n:extract` | استخراج متن سخت‌کد از قالب |
| `npm run block:adapt` | تبدیل بلوک Tailwind به خواص منطقی |
| `npm run audit:i18n` | ممیزی چندزبانه (۶ مرحله) |
| `npm run verify:cli` | تست سرتاسری همهٔ گردش‌کارهای CLI (۹۵ ادعا) |
| `npm run content:list` | فهرست انواع محتوا، مسیر و تعداد ورودی‌ها (`--json`) |
| `npm run content:new` | ساخت گروه در هر نوع محتوا |
| `npm run content:enable` / `content:disable` | روشن/خاموش کردن یک نوع محتوا در `client/config.json` (مسیرها، sitemap و ناوبری) |
| `npm run content:status` | ماتریس آمادگی هر گروه × هر زبان (`--write=docs/STATUS.md`) |
| `npm run doctor` | بررسی سلامت پروژه بدون build، با دستور رفع هر مورد |
| `npm run link:check` | خزش `dist/` و گزارش لینک‌های داخلی شکسته (از جمله لنگرهای `#anchor`) |

### ساخت برای انتشار

```bash
SITE_URL=https://example.com npm run build
```

بدون `SITE_URL` بیلد با هشدار انجام می‌شود و از مبدأ توسعه استفاده می‌کند؛
اما در **CI** (`CI=true`) یا با `ASTRO_REQUIRE_SITE_URL=1` بیلد بدون `SITE_URL`
**با خطا متوقف می‌شود** تا آدرس placeholder هرگز منتشر نشود.

---

## ۳. نقشهٔ پروژه

```text
/
├── .pages.yml               # پیکربندی آمادهٔ Pages CMS برای ویرایش محتوای صفحات، بلاگ و پروژه‌ها
├── app.config.json          # پیش‌فرض‌های هسته: سایت، برند، کسب‌وکار (business)، وبلاگ، کوکی، API خارجی و سرور
├── client/                  # لایهٔ اختصاصی پروژهٔ مشتری (از به‌روزرسانی‌های هسته در امان می‌ماند):
│   ├── config.json          # بازنویسی‌های محدود روی app.config.json
│   ├── locales.json         # SSOT زبان‌های فعال، defaultLocale و metadata (dir, font, htmlLang)
│   ├── messages/            # بازنویسی‌ها و کلیدهای ترجمهٔ اختصاصی مشتری (<locale>.json)
│   ├── navigation.ts        # CLIENT_PAGE_ITEMS، ستون‌های فوتر و لینک‌های حقوقی سفارشی
│   ├── content.ts           # کالکشن‌های اختصاصی clientCollections و متادیتای CLIENT_CONTENT_TYPES
│   ├── icons.ts / ClientIcons.astro # آیکون‌های اضافهٔ مشتری بدون تغییر هسته
│   ├── templates/index.ts   # ثبت قالب‌های صفحهٔ سفارشی CLIENT_PAGE_TEMPLATES
│   ├── LayoutHooks.astro    # قلاب‌های <head> و انتهای <body> در BaseLayout
│   └── styles.css           # توکن‌ها، بازنویسی‌های CSS مشتری و جایگاه آمادهٔ @font-face فونت‌های تجاری فارسی
├── messages/core/           # فرهنگ‌های هسته (۵۱۰ کلید پایه در en.json و fa.json)
├── starter-kit/             # بستهٔ اختیاری دمو (صفحات، مقالات، پروژه‌ها و دارایی‌ها — با starter:seed)
├── .paraglide-work/         # ⚠️ تولیدی/موقت (gitignore): حاصل ادغام core + client پیش از کامپایل
├── astro.config.mjs         # Astro: site، trailingSlash، prefetch، MDX، Tailwind، aliasهای @/* و @client/*
├── knip.json                # پیکربندی تشخیص کد مرده
├── tsconfig.json            # TypeScript strict + alias `@/*` → `src/*` و `@client/*` → `client/*`
├── vitest.config.ts         # Vitest: alias `@`/`@client` و mock ماژول `astro:content`
├── .npmrc                   # تنظیمات npm/pnpm
├── .env.example             # متغیرهای محیطی (SITE_URL, PUBLIC_API_BASE_URL, PUBLIC_CONTACT_API_URL, PUBLIC_NEWSLETTER_API_URL, PUBLIC_WEB3FORMS_KEY, PUBLIC_TURNSTILE_SITE_KEY)
├── public/                  # _headers، chronotrig.min.js، favicon، آیکون‌ها، کارت OG پیش‌فرض
├── scripts/                 # ۲۸ اسکریپت CLI، بررسی سلامت، Pagefind و upstream:check
│   └── lib/                 # ۱۳ ماژول مشترک: config, blueprints, merge-messages, locales, locale-mutations,
│                            # frontmatter, image-reference, content-stub, slug, validate, content-types, prompt
├── .github/workflows/ci.yml # CI: upstream:check → lint → test → audit → doctor → build → smoke → link:check → knip → verify:cli
├── .agents/skills/         # مهارت عملیاتی برای عامل‌های AI
│   └── astro-i18n-starter/  # SKILL.md + references/
├── docs/                    # GUIDE-FA.md، GUIDE-HOMEPAGE-FA.md، CONTENT-TYPES-FA.md، PRD.md، PLAYBOOKS.md، deploy/nginx.conf
└── src/
    ├── assets/hero/hero-0.jpg  # عکس مشترک هیرو (پس‌زمینهٔ پیش‌فرض)
    ├── components/          # کامپوننت‌های هسته (از جمله DevThemePreview.astro فقط در DEV)، ۳ پریمیتیو (UiBadge, UiAlert, AvatarGroup)
    │                        # و ۱۹ بلوک سکشن شرکتی/لندینگ
    ├── content/
    │   ├── pages/<گروه>/    # صفحات ایستا: <locale>.mdx + <گروه>.png
    │   ├── blog/<گروه>/     # مقالات: <locale>.mdx + <گروه>.png
    │   └── projects/<گروه>/ # نمونه‌کارها: <locale>.mdx + <گروه>.png
    ├── content.config.ts    # شمای Zod کالکشن‌های هسته + ادغام clientCollections
    ├── i18n/
    │   ├── locales.ts       # خواندن و صدور نوع‌امن LOCALES, DEFAULT_LOCALE, LOCALE_METADATA از client/locales.json
    │   ├── format.ts        # فرمت بومی تاریخ (هجری شمسی برای fa) و اعداد (Intl)
    │   └── paths.ts         # localizeHref, localeHref, stripLocale, getPathname
    ├── layouts/BaseLayout.astro # لوگوی Light/Dark (`brand.logo`)، اسکیمای Organization/LocalBusiness، پنل DEV Theme Studio
    ├── libs/
    │   ├── api/client.ts    # آداپتور Pure-SSG سمت کلاینت (custom, Web3Forms, Formspree, Basin, Webhook + Turnstile)
    │   ├── config/
    │   │   ├── app.ts       # ادغام و اعتبارسنجی app.config.json + client/config.json (site, brand, business, api, …)
    │   │   ├── client.ts    # خوانندهٔ پیکربندی در باندل مرورگر (بدون Zod) + defaults.ts
    │   │   ├── theme.ts     # پالت‌های OKLCH، پیش‌تنظیم فونت (از جمله ۵ پیش‌تنظیم فارسی) و کارت OG
    │   │   └── navigation.ts # ساخت ناوبری چندمنویی از client/navigation.ts
    │   ├── content/         # entries, service, types, feed, pagination, blog, blog-catalog, taxonomy, faq, social, og-card, schema
    │   ├── cookies/         # مدل رضایت کوکی و مدیریت اسکریپت‌ها (model.ts, manager.ts)
    │   ├── search/          # client.ts + persian.ts (جستجوی Pagefind و فالبک با نرمال‌سازی فارسی)
    │   └── ui/              # button.ts (کلاس دکمه‌ها) + icons.ts (۶۶ آیکون هسته + client/icons.ts) + locale.ts + initials.ts
    ├── pages/               # فقط فایل‌های فیزیکی استاتیک
    │   ├── [...path].astro  # دیسپچر مسیریاب
    │   ├── 404.astro        # صفحهٔ ۴۰۴ locale-aware
    │   ├── og/[...slug].png.ts # تولید کارت PNG برنددار در زمان بیلد (حالت socialCardMode: branded)
    │   ├── site.webmanifest.ts
    │   ├── rss.xml.ts       # فید Atom زبان پیش‌فرض
    │   ├── rss/[locale].xml.ts # فیدهای Atom سایر زبان‌ها
    │   ├── sitemap.xml.ts   # نقشهٔ سایت چندزبانه
    │   ├── robots.txt.ts
    │   ├── api/blog-posts.json.ts # کاتالوگ استاتیک ترکیبی وبلاگ
    │   ├── api/blog-posts/[locale].json.ts # کاتالوگ استاتیک تفکیک‌شده به ازای هر زبان
    │   ├── api/search-dev.json.ts # فهرست fallback جستجو (کل زبان‌ها)
    │   └── api/search-dev/[locale].json.ts # فهرست fallback جستجو به ازای هر زبان
    ├── paraglide/           # ⚠️ تولیدشده — هرگز دستی ویرایش نشود
    ├── scripts/             # lenis.ts (اسکرول نرم)، chronotrig.ts (هماهنگ‌کنندهٔ انیمیشن)
    ├── styles/              # global.css (.layout-container + پالت معنایی)، prose.css، chronotrig.css
    ├── test/                # mock ماژول astro:content برای Vitest
    └── views/               # PageView, BlogIndexView, BlogPostView, CollectionIndexView (با فیلتر تعاملی),
                             # CollectionEntryView + pages/HomePageTemplate
```

---

## ۴. منبع حقیقت واحد (SSOT)

هر مقداری فقط **یک** جا زندگی می‌کند. لایهٔ مشتری (`client/`) بر لایهٔ هسته اولویت دارد و در زمان بیلد/کامپایل با آن ترکیب می‌شود:

| مقدار | محل واحد |
| --- | --- |
| نام سایت، رنگ برند، OG، اندازهٔ آیکون | `app.config.json` + `client/config.json` → `src/libs/config/app.ts` (`siteConfig`) |
| تعداد مقالات هر صفحه | `blog.postsPerPage` (ادغام‌شده) → `POSTS_PER_PAGE` |
| میزبان/پورت سرور | `server` در config ادغام‌شده → `astro.config.mjs` |
| فهرست زبان‌ها و زبان پیش‌فرض | `client/locales.json` → بازتوزیع در `src/i18n/locales.ts` و `.paraglide-work/` |
| جهت، `lang`، فونت هر زبان | `metadata` در `client/locales.json` (`LOCALE_METADATA`) |
| مسیرها و URLها | `src/i18n/paths.ts` |
| اسلاگ‌ها و نسخه‌های جایگزین | `src/libs/content/service.ts` |
| انواع محتوا (فعال/غیرفعال، مسیر، صفحه‌بندی، ناوبری) | `content.types` + `client/content.ts` → `src/libs/content/types.ts` |
| قواعد فرانت‌متر | `src/content.config.ts` (+ `clientCollections`) |
| متن‌های رابط کاربری | `messages/core/<locale>.json` + `client/messages/<locale>.json` → کامپایل به `src/paraglide/` |
| طرح رنگ و سیستم شیشه‌ای | `src/styles/global.css` + بازنویسی‌های مشتری در `client/styles.css` |
| قواعد ساخت slug و taxonomy | `src/content.config.ts` (Zod) |

### `app.config.json` و `client/config.json`

پیش‌فرض‌های هسته در `app.config.json` نگهداری می‌شوند و پروژهٔ مشتری فقط کلیدهایی را که نیاز به تغییر دارد در `client/config.json` می‌گذارد (اسکریپت‌هایی مثل `site:init` و `content:disable` خودکار به‌صورت sparse در `client/config.json` می‌نویسند):

```json
{
  "site": {
    "name": "Astro i18n Starter",
    "shortName": "Astro i18n",
    "description": "Production-grade, multi-lingual Astro v7 starter template with native RTL and LTR support.",
    "author": "Astro Starter Team",
    "contactEmail": "",
    "socialImage": {
      "path": "/og-default.png",
      "width": 1200,
      "height": 630
    }
  },
  "brand": {
    "defaultTheme": "system",
    "preset": "indigo",
    "fontPreset": "system",
    "rtlFontPreset": "vazirmatn",
    "socialCardMode": "branded",
    "logo": {
      "light": "",
      "dark": "",
      "alt": "",
      "width": 128,
      "height": 32,
      "showText": true
    },
    "themeColor": "#4338ca",
    "darkThemeColor": "#0f172a",
    "backgroundColor": "#f8fafc",
    "appleTouchIcon": {
      "file": "apple-touch-icon.png",
      "size": 180
    },
    "icons": [
      {
        "file": "icon-192.png",
        "size": 192,
        "purpose": "any"
      },
      {
        "file": "icon-512.png",
        "size": 512,
        "purpose": "any"
      }
    ]
  },
  "business": {
    "type": "Organization",
    "legalName": "",
    "phone": "",
    "whatsapp": "",
    "telegram": "",
    "address": "",
    "city": "",
    "country": "",
    "workingHours": "",
    "mapEmbedUrl": ""
  },
  "ui": {
    "ctaPage": "pricing",
    "showSearch": true,
    "showThemeToggle": true,
    "showLanguageSwitcher": true,
    "showTopLoadingBar": true,
    "stickyHeader": true
  },
  "blog": {
    "postsPerPage": 9,
    "showReadingTime": true,
    "showTableOfContents": true,
    "showRelatedPosts": true
  },
  "content": {
    "types": {
      "pages": { "enabled": true, "base": "", "index": false, "paginated": false, "feed": false, "nav": true },
      "blog": { "enabled": true, "base": "blog", "index": true, "paginated": true, "feed": true, "nav": true },
      "projects": { "enabled": true, "base": "projects", "index": true, "paginated": false, "feed": false, "nav": true }
    }
  },
  "cookies": {
    "enabled": true,
    "consentVersion": 1,
    "storageKey": "cookie_consent",
    "expirationDays": 180
  },
  "social": {
    "github": "https://github.com",
    "twitter": "",
    "linkedin": "",
    "instagram": "",
    "telegram": ""
  },
  "api": {
    "provider": "custom",
    "baseUrl": "",
    "accessKey": "",
    "turnstileSiteKey": "",
    "timeoutMs": 10000,
    "endpoints": {
      "contact": "/contact",
      "newsletter": ""
    }
  },
  "server": {
    "host": "0.0.0.0",
    "port": 3000
  }
}
```

مقادیر با **Zod** در `src/libs/config/app.ts` اعتبارسنجی می‌شوند؛ خطای اعتبارسنجی
بیلد را متوقف می‌کند. اعتبارسنجی فقط در زمان بیلد اجرا می‌شود: اسکریپت‌های مرورگر
همان فایل را از `src/libs/config/client.ts` می‌خوانند تا موتور Zod وارد باندل
کلاینت نشود، و پیش‌فرض‌های مشترک در `defaults.ts` یک‌بار تعریف شده‌اند. قواعد:

| فیلد | قاعده |
| --- | --- |
| `site.name` / `shortName` / `description` | رشتهٔ غیرخالی |
| `site.author` | رشتهٔ اختیاری (پیش‌فرض: `'Astro Starter Team'`) |
| `site.contactEmail` | ایمیل معتبر یا رشتهٔ خالی (پیش‌فرض: `''`) — مقصد دکمهٔ `mailto:` وقتی API فرم تماس/خبرنامه تنظیم نشده است |
| `site.socialImage.path` | باید با `/` شروع شود |
| `site.socialImage.width` / `height` | عدد صحیح مثبت |
| `brand.defaultTheme` | یکی از `'system'`، `'light'` یا `'dark'` (پیش‌فرض: `'system'`) |
| `brand.preset` | یکی از ۶ پالت آماده: `'indigo'`, `'cobalt'`, `'emerald'`, `'amber'`, `'slate'`, `'rose'` (در `src/libs/config/theme.ts`) |
| `brand.primaryColor` / `accentColor` | hex شش‌رقمی اختیاری برای بازنویسی رنگ اصلی/تأکید پالت (که اتوماتیک به OKLCH تبدیل می‌شود) |
| `brand.logo` | شیء اختیاری `{ light, dark, alt, width, height, showText }` برای نمایش لوگوی تصویر/SVG روشن و تیره در هدر، کشوی موبایل و فوتر |
| `brand.fontPreset` / `rtlFontPreset` | فونت لاتین (`system`, `jakarta`, `manrope`, `outfit`, `editorial`) و ۵ پیش‌تنظیم RTL (`vazirmatn`, `noto-arabic`, `iransans`, `yekan-bakh`, `peyda`) |
| `brand.socialCardMode` | حالت کارت اجتماعی: `'branded'` (کارت PNG برنددار برای هر مسیر)، `'artwork'` (تصویر هر گروه)، `'default'` (`og-default.png`) |
| `brand.themeColor` / `backgroundColor` | hex شش‌رقمی (`#4338ca`) |
| `brand.darkThemeColor` | hex شش‌رقمی اختیاری برای تم تیره |
| `brand.icons` | آرایهٔ غیرخالی از `{ file, size, purpose }` |
| `business` | پروفایل کسب‌وکار (`type`: `Organization` \| `LocalBusiness` \| `ProfessionalService` \| `MedicalBusiness` \| `Store`, `legalName`, `phone`, `whatsapp`, `telegram`, `address`, `city`, `country`, `workingHours`, `mapEmbedUrl`, `geo?: { lat, lng }`) برای JSON-LD و دکمه‌های تماس سریع + نقشهٔ تنبل |
| `ui` | پرچم‌های بولین (`showSearch`, `showThemeToggle`, `showLanguageSwitcher`, `showTopLoadingBar`, `stickyHeader`) + `ui.ctaPage`؛ برای سایت‌های **تک‌زبانه**، تنظیم `ui.showLanguageSwitcher: false` بدون تغییر فایل‌های پروژه سوئیچر زبان را پنهان می‌کند |
| `blog.postsPerPage` | عدد صحیح مثبت |
| `blog` | پرچم‌های بولین نمایش (`showReadingTime`, `showTableOfContents`, `showRelatedPosts`) |
| `cookies` | تنظیمات رضایت کوکی (`enabled`, `consentVersion`, `storageKey`, `expirationDays`) |
| `social` | آدرس‌های اختیاری شبکه‌های اجتماعی: `github`, `twitter`, `linkedin`, `instagram`, `telegram` (در فوتر و `sameAs` اسکیما) |
| `api` | تنظیمات فرم بدون سرور (`provider`: `custom` \| `web3forms` \| `formspree` \| `basin` \| `webhook`, `accessKey` / `PUBLIC_WEB3FORMS_KEY`, `turnstileSiteKey` / `PUBLIC_TURNSTILE_SITE_KEY`, `baseUrl`, `timeoutMs`, `endpoints.contact`, `endpoints.newsletter`, `topics`) — قابل بازنویسی با `PUBLIC_API_BASE_URL`، `PUBLIC_CONTACT_API_URL` و `PUBLIC_NEWSLETTER_API_URL` |
| `server.port` | عدد صحیح بین ۱ و ۶۵۵۳۵ |
| `server.host` | رشتهٔ غیرخالی (`0.0.0.0`) |

### پیکربندی Paraglide (`.paraglide-work/project.inlang/settings.json`)

هنگام اجرای `npm run messages:compile` (توسط `scripts/messages-compile.mjs`)، لیست زبان‌ها و زبان پایه از `client/locales.json` خوانده می‌شود، دیکشنری‌های `messages/core/<locale>.json` و `client/messages/<locale>.json` ترکیب شده و فایل تنظیمات موقت `.paraglide-work/project.inlang/settings.json` به‌طور خودکار تولید می‌شود تا کامپایلر Paraglide با یک منبع حقیقت اجرا شود. افزونه‌های درون‌یابی از `node_modules` خوانده می‌شوند و بیلد به شبکه نیاز ندارد.

### تغییر رنگ، بلوپرینت صنعتی و استودیوی زندهٔ تم (`site:init` + `DevThemePreview`)

به جای تغییر دستی چندین فایل، با یک دستور تمام هویت برند، بلوپرینت صنعتی (`corporate`, `agency`, `portfolio`, `medical`)، پالت، فونت و ایمیل تماس مشتری را در `client/config.json` تنظیم کنید:

```bash
npm run site:init -- \
  --name="Acme Studio" \
  --blueprint=agency \
  --rtl-font=vazirmatn \
  --email=hello@acme.example \
  --og-mode=branded \
  --yes
```

`theme.ts` پالت انتخابی یا `brand.primaryColor`/`accentColor` را در `<head>` به متغیرهای `--theme-*` تبدیل می‌کند (و در `:root[data-theme='dark']` نسخهٔ تاریک سازگار با AA می‌سازد). همچنین در محیط توسعه (`npm run dev`), پنل شناور **استودیوی تم (`DevThemePreview.astro` فقط تحت `import.meta.env.DEV`)** اجازه می‌دهد پالت‌ها، رنگ‌های hex دلخواه و فونت‌های لاتین/RTL را زنده آزمایش و خروجی JSON آمادهٔ `client/config.json` را کپی کنید. برای سفارشی‌سازی عمیق‌تر توکن‌ها و افزودن فونت‌های تجاری فارسی، متغیرها و `@font-face`های خود را در `client/styles.css` بنویسید.

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

### عوض کردن زبان پیش‌فرض و راه‌اندازی سایت تک‌زبانه

برای عوض کردن زبان پیش‌فرض با یک دستور:

```bash
npm run i18n:set-default fa
```

(که `defaultLocale` و ترتیب `locales` را در `client/locales.json` تغییر داده و پس از ادغام فرهنگ‌ها در `.paraglide-work/` پیام‌ها را دوباره کامپایل می‌کند). سپس:

```bash
npm run messages:compile && npm test && npm run audit:i18n && npm run build && npm run smoke
```

نتیجه: فارسی به `/` و `/درباره-ما/` می‌رود و انگلیسی به `/en/`، `/en/about/`.

#### تحویل پروژهٔ تک‌زبانه بدون تغییر ساختاری (پیشنهادی)
از آن‌جا که خروجی پیش از استقرار بیلد می‌شود، برای یک سایت تک‌زبانه نیازی به تغییر ساختاری یا حذف فایل‌ها نیست:
- صرفاً `"showLanguageSwitcher": false` را در `client/config.json` → `ui` تنظیم کنید تا منو و بخش زبان در هدر و کشوی موبایل پنهان شود.
- اگر سایت مشتری فقط فارسی (یا هر زبان غیرپیش‌فرض دیگری) است، یک‌بار `npm run i18n:set-default fa` بزنید تا ریشهٔ `/` مستقیماً فارسی باشد.
- *(اختیاری)* اگر می‌خواهید مسیرهای زبان دوم به‌کل در `dist/` و `sitemap.xml` تولید نشوند، دستور `npm run i18n:solo fa` زبان‌های دیگر را بایگانی (`.locale-archive/`) و پیکربندی را تک‌زبانه می‌کند (بعداً با `i18n:add-lang` قابل بازگردانی است).

> ⚠️ تعویض زبان پیش‌فرض یک تغییر **ساختاری** در URLهاست. قبل از انجام روی سایت زنده، برای
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
├── en.mdx   fa.mdx     ← فایل هر زبان فعال (سایر زبان‌ها با i18n:add-lang اضافه می‌شوند)
└── about.png           ← artwork گروه (پس‌زمینهٔ اختیاری هیرو و کارت OG)
```

شناسهٔ (ID) هر ورودی = `<گروه>/<زبان>` — مثلاً `about/fa`. این ID منبع حقیقت
گروه و زبان است و توسط `generateId` در `src/content.config.ts` ساخته می‌شود.

### انواع محتوا (`content.types`)

سه نوع محتوای داخلی وجود دارد: `pages`، `blog` و `projects` (به علاوه هر کالکشن دلخواه مشتری در `client/content.ts`). تنظیمات ادغام‌شدهٔ `app.config.json` و `client/config.json` تعیین می‌کند کدام‌ها ساخته شوند:

```bash
npm run content:list                 # وضعیت، مسیر و تعداد ورودی هر نوع
npm run content:disable projects     # نوشتن override در client/config.json؛ مسیرها، sitemap و ناوبری حذف می‌شوند
npm run content:enable projects      # برمی‌گردند (فایل‌ها هرگز حذف نمی‌شوند)
npm run content:new projects atlas -- --title="Atlas" --publish
```

* `enabled: false` فقط روت و لینک را حذف می‌کند؛ محتوا سرجایش می‌ماند. `pages` را نمی‌توان خاموش کرد.
* `base` بخش اول مسیر است (`/projects/`). `pages` همیشه ریشه است و مقدار `base` نمی‌گیرد.
* `index` / `paginated` / `feed` / `nav` تعیین می‌کنند فهرست، صفحه‌بندی، فید و لینک ناوبری ساخته شود یا نه.
* `content:new` برای `pages` و `blog` به `new:page` / `new:post` واگذار می‌شود؛ بقیهٔ نوع‌ها فرانت‌متر مشترک، کاور تولیدی و برای زبان ترجمه‌نشده `[TODO: …]` + `draft: true` می‌گیرند.

جزئیات کامل، از جمله مراحل افزودن نوع چهارم در `client/content.ts` بدون تغییر هسته، در [CONTENT-TYPES-FA.md](CONTENT-TYPES-FA.md) آمده است.

### شمای Zod (`src/content.config.ts`)

برخلاف کالکشن `blog` که قالب یکپارچهٔ مقاله (`BlogPostView.astro`) دارد، کالکشن `pages` برای طراحی کاملاً آزاد و منعطف ساخته شده است:

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
| `hero` | `'none' \| 'minimal' \| 'default'` | — (فقط `pages`) | پیش‌فرض `'none'` (بدون هیروی تحمیلی)؛ `'minimal'` = هدر تایپوگرافیک `PageHeader.astro`؛ `'default'` = بنر اتمسفریک `PageHero.astro` |
| `container` | `'canvas' \| 'contained' \| 'prose'` | — (فقط `pages`) | پیش‌فرض `'canvas'` (تمام‌عرض آزاد)؛ `'contained'` = ظرف استاندارد `1280px` (`.layout-container` + `.prose-wide`)؛ `'prose'` = ستون خوانایی `72ch`. از نام `layout` استفاده نمی‌شود چون در `@astrojs/mdx` رزرو شده است |
| `flushTop` | boolean | — (فقط `pages`) | پیش‌فرض `false`؛ در حالت `hero: 'none'` فاصلهٔ بالای `<main>` را برمی‌دارد تا بخش سفارشی زیر هدر شیشه‌ای قرار گیرد |
| `template` | string (اختیاری) | — (فقط `pages`) | واگذاری رندر صفحه به یک نمای اختصاصی `.astro` ثبت‌شده در `CLIENT_PAGE_TEMPLATES` (`client/templates/index.ts`) یا `src/views/pages/` |

\* برای صفحهٔ `home` اسلاگ خالی مجاز است.

> تصویر با helper رسمی `image()` از `astro:content` رزولو می‌شود: مسیر را نسبت
> به فایل محتوا تفسیر می‌کند، وجود فایل را چک می‌کند و `ImageMetadata` آماده
> تحویل می‌دهد. کامپوننت‌ها هرگز خودشان مسیر تصویر را نمی‌خوانند.

### فرانت‌متر صفحات

```mdx
---
title: "درباره ما"
slug: "درباره-ما"
description: "دربارهٔ اهداف و معماری چندزبانهٔ این وب‌سایت بیشتر بدانید."
image: "./about.png"
hero: "minimal"
container: "contained"
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
- کارت‌های وبلاگ کاور را متناسب با ظرف دسکتاپ `1280px` با `sizes="(min-width: 1280px) 390px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 94vw"`
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

همهٔ اسکریپت‌ها از طریق `npm run` (یا در صورت تمایل `pnpm run`) اجرا می‌شوند. هنگام ارسال پرچم‌ها، بعد از نام دستور از `--` استفاده کنید. اسکریپت‌های مخرب قبل از حذف تأیید می‌گیرند و در محیط غیرتعاملی بدون `--force` رد می‌شوند.

### ۷.۱ ساخت صفحهٔ ایستا — `new:page`

```bash
npm run new:page contact -- --title="Contact Us" --from=en --hero=minimal --container=contained
```

خروجی: `src/content/pages/contact/<locale>.mdx` به ازای همهٔ زبان‌های فعال در `client/locales.json` با اسلاگ هر زبان (زبان مبدأ
نام گروه؛ بقیه جای‌نگهدار تا اسلاگ بومی تعیین شود)، ثبت کلید `nav_contact` در
`client/messages/*.json` و اشارهٔ `image` به `./contact.png`.

| گزینه | کار |
| --- | --- |
| `--title="…"` | عنوان صفحه (در زبان مبدأ) |
| `--desc="…"` / `--description="…"` | توضیح صفحه |
| `--from=<locale>` / `--source=<locale>` | زبان مبدأ (پیش‌فرض: زبان پایه) |
| `--preset=standard\|landing` | پیش‌تنظیم صفحه: `standard` (`hero: default`, `container: contained`) یا `landing` (`hero: none`, `container: canvas`, `flushTop: true` همراه با بلوک‌های لندینگ آماده) |
| `--hero=none\|minimal\|default` | نوع هدر صفحه (در شِمای MDX پیش‌فرض `none` و در `new:page --preset=standard` پیش‌فرض `default`) |
| `--container=canvas\|contained\|prose` | نوع ظرف چیدمان صفحه (در شِمای MDX پیش‌فرض `canvas` و در `new:page --preset=standard` پیش‌فرض `contained`) |
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
| `--sync-frontmatter` | هم‌تراز کردن فیلدهای ساختاری فرانت‌متر (`image`, `hero`, `container`, `flushTop`, `template`) در همهٔ فایل‌های زبانی |
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
npm run new:post ai-agents -- \
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
npm run new:page contact -- --update --sync-frontmatter \
  --title="Get in touch" --desc="We reply within a day."
```

`--update` فرانت‌متر را به‌روز می‌کند اما **بدنهٔ مارک‌داون را دست‌نخورده** نگه می‌دارد.

### ۷.۴ حذف صفحه و مقاله

```bash
npm run remove:page contact                     # کل گروه + پاک‌سازی nav_contact از client/messages/
npm run remove:page contact -- --locale=fa      # فقط نسخهٔ فارسی
npm run remove:page contact -- --no-clean-nav   # نگه‌داشتن کلید ناوبری
npm run remove:page contact -- --force          # بدون تأیید تعاملی
npm run remove:post ai-agents -- --collection=blog --force
npm run remove:post ai-agents -- --locale=fa --force
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
# تک کلید (در client/messages/<locale>.json نوشته می‌شود)
npm run i18n:add -- --category=contact --key=form_label \
  --en="Send message" --fa="ارسال پیام" --ar="إرسال الرسالة" \
  --de="Nachricht senden" --fr="Envoyer le message"

# گروهی از فایل JSON
npm run i18n:add-batch -- --file=translations.json --category=contact

# گروهی از JSON در خط فرمان
npm run i18n:add-batch -- --json='{"cart_checkout":{"en":"Checkout","fa":"تسویه حساب"}}'

# از STDIN
cat keys.json | npm run i18n:add-batch
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
npm run i18n:extract -- --target=src/components/Foo.astro --key=foo --auto-add --replace
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
npm run block:adapt -- --file=src/views/BlogIndexView.astro
npm run block:adapt -- --file=src/views/BlogIndexView.astro --dry-run
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
npm run assets:generate
```

خروجی‌های دقیق (اندازه‌ها از پیکربندی ادغام‌شدهٔ `app.config.json` + `client/config.json` خوانده می‌شوند):

| مسیر | اندازه | توضیح |
| --- | --- | --- |
| `public/apple-touch-icon.png` | ۱۸۰×۱۸۰ | آیکون iOS |
| `public/icon-192.png` | ۱۹۲×۱۹۲ | آیکون PWA |
| `public/icon-512.png` | ۵۱۲×۵۱۲ | آیکون PWA |
| `public/og-default.png` | ۱۲۰۰×۶۳۰ | کارت OG پیش‌فرض سایت |
| `src/content/<type>/<group>/<group>.png` | ۱۲۰۰×۶۷۵ | کاور/هیروی هر گروه از هر نوع محتوای تعریف‌شده (`pages`, `blog`, `projects`, …) |

پالت نرمال‌شده به روشنایی است، بنابراین هر رنگ با یک روشنایی ادراک‌شده دیده می‌شود.

رنگ هر گروه از **جایگاه آن در فهرست مرتب‌شدهٔ گروه‌ها** گرفته می‌شود، پس با
افزودن یک گروه تازه، رنگ گروه‌های دیگر هم جابه‌جا می‌شود. این رفتار قطعی و
تکرارپذیر است: اجرای دوبارهٔ `assets:generate` بدون تغییر محتوا هیچ فایلی را
عوض نمی‌کند.

دو چیز **تولید نمی‌شود**:

- عکس مشترک هیرو (`src/assets/hero/hero-0.jpg`) — یک عکس واقعی است، نه artwork کدنویسی‌شده؛
- `public/favicon.svg` و `public/favicon.ico` — دستی ساخته و در مخزن نگه‌داری می‌شوند.

آرتورک برای **همهٔ مجموعه‌های تعریف‌شده** ساخته می‌شود، حتی اگر نوع محتوا خاموش
باشد: ورودی ساخته‌شده به `./<group>.png` ارجاع می‌دهد و روشن‌کردن دوبارهٔ نوع
نباید بیلد را با ارجاع تصویر ناموجود بشکند.

> چون نام فایل artwork هر گروه همان `<group>.png` است، اگر فایل سفارشی‌ای با همین نام
> بدهید، اسکریپت آن را با نام `<group>-custom.<ext>` کپی می‌کند تا بیلد نشکند.

### ۷.۹ مدیریت انواع محتوا و سلامت پروژه

```bash
npm run content:list                 # نوع‌ها، مسیر، وضعیت و تعداد ورودی
npm run content:disable projects     # حذف مسیرها/sitemap/ناوبری در client/config.json (فایل‌ها می‌مانند)
npm run content:enable projects
npm run content:new projects atlas -- --title="Atlas" --publish
npm run doctor                       # سلامت بدون build، با دستور رفع
npm run content:status -- --write=docs/STATUS.md
npm run link:check                   # خزش dist/ و گزارش لینک/لنگر شکسته
npm run starter:seed -- --blueprint=corporate # (اختیاری) تزریق دمو + اعمال بلوپرینت صنعتی
npm run upstream:check               # کنترل قرارداد لایه‌های Core و client/
```

`content:new` برای `pages` و `blog` به `new:page` / `new:post` واگذار می‌شود؛
برای بقیهٔ نوع‌ها فرانت‌متر مشترک، کاور تولیدی و `[TODO: …]` + `draft: true`
برای زبان‌های ترجمه‌نشده می‌سازد. slugهای فرار (`../blog`) و slug رزروشدهٔ
`page` قبل از هر نوشتن رد می‌شوند. جزئیات کامل در
[CONTENT-TYPES-FA.md](CONTENT-TYPES-FA.md).

### ۷.۱۰ ممیزی و تست

```bash
npm run audit:i18n    # ۶ بخش: پیکربندی زبان، فرهنگ‌ها، محتوا، مسیرها، متن هاردکد، نگهبان RTL
npm run smoke         # تست دود روی خروجی بیلدشده
npm run knip          # فایل/اکسپورت/وابستگی مرده
npm run verify:cli    # ۹۵ ادعا دربارهٔ گردش‌کارهای CLI
```

`verify:cli` پروژه را در یک پوشهٔ موقت کپی می‌کند، همهٔ فرمان‌های CLI را دقیقاً
همان‌طور که در این راهنما آمده اجرا می‌کند و برای هر ادعا یک خط PASS/FAIL
چاپ می‌کند. این اسکریپت هیچ فایلی از نسخهٔ کاری شما را تغییر نمی‌دهد و
حتی `node_modules` را دست نمی‌زند (اسکریپت‌ها مستقیم با Node روی نسخهٔ موقت اجرا می‌شوند).

> در بخش ۳ ممیزی، **نبودِ فایل یک زبان برای یک گروه هشدار است، نه خطا**:
> نوشتن یک مقاله فقط به انگلیسی حالت عادی است و سایت، ناوبری و تعویض زبان
> هر سه با آن کنار می‌آیند.

### ۷.۱۱ کتابخانهٔ مشترک `scripts/lib/`

| فایل | نقش |
| --- | --- |
| `config.mjs` | ادغام `app.config.json` + `client/config.json` و نوشتن تغییرات sparse در `client/config.json` |
| `blueprints.mjs` | تعاریف بلوپرینت‌های صنعتی (`corporate`, `agency`, `portfolio`, `medical`) برای `site:init` و `starter:seed` |
| `merge-messages.mjs` / `compile-messages.mjs` | ادغام فرهنگ‌های `messages/core/` + `client/messages/` در `.paraglide-work/` و کامپایل Paraglide |
| `locales.mjs` / `locale-mutations.mjs` | خواندن/تغییر `client/locales.json` و بازتوزیع آن — ممیزی i18n و تست دود از همین منبع می‌خوانند |
| `frontmatter.mjs` | `parseFrontmatter` / `stringifyFrontmatter` (بدون وابستگی) |
| `image-reference.mjs` | تبدیل `--image` به ارجاع نسبی به فایل محتوا و کپی artwork به پوشهٔ گروه |
| `content-stub.mjs` | متن جانشین هر زبان برای محتوای تولیدشده (صفحه و مقاله) |
| `slug.mjs` | `resolveSlug` — اسلاگ هر زبان در محتوای تازه‌ساخته (نام گروه برای زبان مبدأ، `<گروه>-<locale>` برای بقیه) |
| `prompt.mjs` | `askYesNo` / `confirmDeletion` — تأیید یکسان برای اسکریپت‌های مخرب |
| `validate.mjs` | اعتبارسنجی کلید ورودی، نام مجموعه و کد زبان تا هیچ مسیری از مجموعه خارج نشود |
| `content-types.mjs` | خواندن/نوشتن `content.types` در پیکربندی کلاینت + کشف کالکشن‌های `client/content.ts` و آمار ورودی‌ها |

---

## ۸. مدیریت زبان

### افزودن زبان

```bash
npm run i18n:add-lang -- es --name="Español" --dir="ltr" --with-content --from=en
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

1. `client/locales.json` را به‌روز می‌کند (`locales` + `metadata`)
2. `client/messages/es.json` می‌سازد (کپی فرهنگ زبان مبدأ)
3. فایل `<locale>.mdx` برای همهٔ صفحات و مقالات می‌سازد
4. فرهنگ‌های هسته و کلاینت را در `.paraglide-work/` ادغام و Paraglide را کامپایل می‌کند

> اسکریپت `metadata` را در `client/locales.json` خودش می‌نویسد، ولی **آن را بررسی کنید**:
> برای هر زبان جدیدِ RTL مقدار `fontFamily` را روی `var(--font-fa)` می‌گذارد.
> اگر زبان جدید خطی است، باید `var(--font-sans)` باشد؛ اگر خطی‌نبودنِ غیرعربی
> است (مثلاً عبری)، باید فونت متناسب خودش را در `client/styles.css` تعریف
> و اینجا ارجاع دهید.

### حذف زبان

```bash
npm run i18n:remove-lang -- es --with-content --force
```

| گزینه | کار |
| --- | --- |
| `--with-content` / `--delete-content` | حذف فایل‌های محتوا |
| `--keep-content` / `--no-content` / `--without-content` | نگه‌داشتن فایل‌های محتوا |
| `--force` / `--yes` | بدون تأیید تعاملی |

حذف زبان پیش‌فرض ممکن نیست؛ ابتدا باید زبان پیش‌فرض را عوض کنید.

### گام بعدی: پیام‌ها

پس از افزودن زبان، فرهنگ جدید فقط کلیدهای زبان مبدأ را دارد. با
`npm run i18n:add-batch` یا `i18n:extract` ترجمه‌ها را کامل کنید؛
`npm run audit:i18n` هر کلید ناقص را گزارش می‌کند.

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

فونت‌های بازمتن **variable** و خودمیزبان‌اند (`@fontsource-variable/vazirmatn`، `@fontsource-variable/noto-sans-arabic` و ۵ فونت لاتین `jakarta`, `manrope`, `outfit`, `dm-sans`, `fraunces`). همچنین برای پروژه‌های ایرانی، پیش‌تنظیم‌های آمادهٔ `iransans`، `yekan-bakh` و `peyda` در `theme-presets.json` تعریف شده‌اند و بلوک آمادهٔ `@font-face` آن‌ها برای قرار دادن فایل‌های `.woff2` در `public/fonts/` درون `client/styles.css` قرار دارد.

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

- همچنین در `src/styles/global.css`، ویژگی `letter-spacing` برای `:lang(fa)` و `:lang(ar)` به‌طور خودکار `0` نگه داشته می‌شود تا کلاس‌هایی مانند `tracking-wider` باعث جداشدن حروف پیوستهٔ فارسی و عربی نشوند (جزایر صریح `dir="ltr"` و `lang="en"` حفظ می‌شوند).
- برای فیلدهای فرم دارای مقدار لاتین (`email`، `tel`، `datetime-local`) از ترکیب `dir="ltr"` همراه با `text-start rtl:text-end` استفاده کنید تا ضمن حفظ ترتیب کاراکترهای LTR، متن در فرم‌های فارسی/عربی به لبهٔ راست (inline-start) تراز شود.

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
| `--color-hero-base` / `--color-hero-fg` | پایهٔ تیرهٔ پشت هیرو و رنگ متن روی پردهٔ هیرو |
| `--color-scrim` | پردهٔ نیمه‌شفاف تیره برای پس‌زمینهٔ مودال‌ها و نشان‌های روی تصویر |
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
- هرگز از رنگ‌های خام مثل `text-white`، `bg-black` یا `gray-*` در کامپوننت‌ها استفاده نکنید؛ همیشه نقش‌های معنایی بالا را به کار ببرید.

### کلاس‌های مشترک

همهٔ سطوح شیشه‌ای، دکمه‌ها و نشان‌ها **یک بار** در `src/styles/global.css` تعریف شده‌اند.
کامپوننت‌ها فقط این کلاس‌ها را ترکیب می‌کنند:

| کلاس | کاربرد |
| --- | --- |
| `.layout-container` | عرض استاندارد دسکتاپ (`max-w-7xl` / `1280px`) با حاشیه‌های افقی منطقی واکنش‌گرا (`px-4 sm:px-6 lg:px-8`) |
| `.prose-wide` | نسخهٔ تمام‌عرض `.prose` برای صفحات `container: 'contained'` |
| `.glass-surface` | سطح شیشه‌ای (هدر، پنل‌ها) |
| `.glass-control` | کنترل داخل سطح شیشه‌ای |
| `.ghost-control` | کنترل روی سطح مات |
| `.cta` | دکمهٔ اصلی |
| `.btn-secondary` | دکمهٔ ثانویه روی سطح مات |
| `.btn-hero-secondary` | دکمهٔ ثانویهٔ شیشه‌ای روی بخش هیرو |
| `.chip` | چیپ دسته/برچسب/فیلتر/تب (حالت فعال خودکار با `aria-selected="true"` یا `aria-current`) |
| `.hero-badge` | نشان کپسولی نیمه‌شفاف روی تصویر هیرو یا کارت مقاله |
| `.section-kicker` | سوتیتر (Eyebrow) بالای تیتر بخش‌ها با ایمنی خودکار RTL |

```astro
<!-- ctaHref از `ui.ctaPage` می‌آید و اگر آن صفحه منتشر نشده باشد `null` است -->
{
  ctaHref && (
    <Button href={ctaHref} size="sm" class="hidden lg:inline-flex">
      {m.common_get_started({}, { locale })}
    </Button>
  )
}
```

### یک دکمه برای همه‌جا

هر دکمهٔ متنی از `src/components/Button.astro` می‌آید و فقط **رنگ، متن و آیکن** آن عوض می‌شود.
دستور کلاس‌ها در `src/libs/ui/button.ts` (`buttonClasses()`) است، پس رندرهای سمت کلاینت (صفحه‌بندی بلاگ) هم دقیقاً همان دکمه را می‌سازند.

| پراپ | مقدارها |
| --- | --- |
| `variant` | `primary` (`.cta`)، `secondary` (`.btn-secondary`)، `hero` (`.btn-hero-secondary`)، `ghost` (`.ghost-control`)، `glass` (`.glass-control`) |
| `size` | `sm` (`h-9`)، `md` (`h-10`)، `lg` (`h-11`)، `auto` (اندازهٔ دلخواه فراخوان) |
| `href` | اگر بدهید `<a>` و اگر نه `<button type="…">` رندر می‌شود |
| `icon` / `iconPosition` | نام آیکون از `src/libs/ui/icons.ts` و جای آن (`start`/`end`)؛ آیکون‌های جهت‌دار در RTL آینه و در هاور به سمت خواندن جلو می‌روند |
| `block` / `class` | تمام‌عرض، و کلاس‌های محلی که آخر می‌آیند و برنده‌اند |

همهٔ دکمه‌ها افکت هاور مشترک (بالا آمدن ۲ پیکسل) و هاور رنگ متناسب با نقش را از همین پراپ‌ها می‌گیرند؛ هیچ کامپوننتی کلاس دکمه را دوباره نمی‌نویسد.

### کامپوننت‌های مشترک و پراپ‌هایشان

| کامپوننت | پراپ‌ها | نقش |
| --- | --- | --- |
| `Icon.astro` | `name`, `size` (پیش‌فرض ۲۰), `class`, `aria-hidden`, `aria-label` | آیکون Tabler به‌صورت inline از رجیستری داخلی؛ نام نامعتبر به `file` برمی‌گردد |
| `Button.astro` | `href?`, `variant` (`primary`/`secondary`/`hero`/`ghost`/`glass`), `size` (`sm`/`md`/`lg`/`auto`), `block?`, `icon?`, `iconPosition?` (`start`/`end`), `flipIcon?`, `type?`, `disabled?`, `external?`, `class?` + هر `data-*`/`aria-*` | تنها دکمهٔ متنی — فقط رنگ/متن/آیکن عوض می‌شود |
| `DrawerNavLink.astro` | `item` (یک `NavItem`), `depth` (`0`/`1`/`2`) | ردیف منوی کشو: آیکن + عنوان، با حالت فعال و هاور در هر سه سطح (قاب کاشی فقط در سطح اول) |
| `IconButton.astro` | `icon`, `label`, `size` (۱۸), `variant` (`glass`/`ghost`), `class` + هر `data-*`/`aria-*` | دکمهٔ فقط-آیکون — دستی نسازید |
| `PageHeader.astro` | `title`, `description?`, `locale`, `breadcrumbs?`, `kicker?`, `align?` (`start`/`center`), `class?` | هدر تایپوگرافیک مینیمال برای صفحات `hero: 'minimal'` |
| `PageSection.astro` | `id?`, `surface?` (`default`/`surface`/`subtle`), `spacing?` (`none`/`sm`/`md`/`lg`), `bleed?` (بدون `.layout-container`), `borderTop?`, `borderBottom?`, `class?`, `containerClass?` | سکشن تمام‌عرض برای صفحات `canvas`؛ به‌طور پیش‌فرض محتوا را داخل `.layout-container` می‌گذارد و با `bleed` لبه‌به‌لبه می‌شود |
| `HeroCopy.astro` | `title`, `description?`, `size?` (`page`/`post`)؛ اسلات `prelude` و پیش‌فرض | تیتر/توضیح/اسلات‌های مشترک هیرو |
| `PageHero.astro` | `image?` | بخش هیرو؛ خودش هیچ متنی ندارد، فقط پس‌زمینه و اسلات |
| `HomeHero.astro` | `locale`, `description?`, `primaryHref`, `secondaryHref?`, `highlights` (سه اثبات کوتاه با `key`/`icon`/`title`/`description`) | هیروی اختصاصی صفحهٔ اصلی (قالب `home`): نوار تیره با نشان، تیتر دو تکه با متن گرادیانی، دو CTA و سه اثبات؛ همهٔ کلاس‌ها منطقی و رنگ‌ها از نقش‌های تم |
| `BlogPostHeroContent.astro` | `title`, `description?`, `locale`, `categories`, `author?`, `body?`, `publishedAt`, `updatedAt?`, `breadcrumbs` | محتوای هیروی مقاله (از `HeroCopy` استفاده می‌کند) |
| `PostCard.astro` | `post`, `locale`, `href`, `priority?` | کارت مقاله در فهرست |
| `LanguageSwitcher.astro` | `currentLocale`, `alternates` | تعویض زبان با بارگذاری کامل |
| `SearchModal.astro` | `locale` | مودال جستجوی دسکتاپ (Pagefind در پروداکشن / fallback استاتیک) |
| `DrawerSearch.astro` | `locale` | جستجوی درون کشوی موبایل هماهنگ با تب‌بندی کشو |
| `ContactForm.astro` | `locale` | فرم تماس Pure-SSG متصل به API خارجی از طریق `src/libs/api/client.ts` (با پشتیبانی از `api.topics`)؛ بدون نشانی، فرم رندر نمی‌شود و پنل `mailto:` (از `site.contactEmail`) جای آن را می‌گیرد |
| `SectionHeader.astro` | `eyebrow?`, `heading?`, `subheading?`, `align?`, `class?` | سرستون مشترک و DRY برای بلوک‌های سکشن |
| `UiBadge.astro` | `label?`, `locale?`, `variant?`, `size?`, `icon?`, `href?`, `external?`, `class?` | نشان معنایی وضعیتی/برچسبی در ۸ نقش رنگی |
| `UiAlert.astro` | `id?`, `locale?`, `variant?`, `title?`, `description?`, `icon?`, `action?`, `dismissible?`, `class?` | هشدار/اعلان با حاشیهٔ کامل منطقی و دکمهٔ بستن |
| `AvatarGroup.astro` | `locale?`, `items?`, `extraCount?`, `label?`, `rating?`, `size?`, `class?` | پشتهٔ آواتار هم‌پوشان با امتیاز ستاره‌ای و شمارش بومی |
| `NewsletterBanner.astro` | `id?`, `locale?`, `eyebrow?`, `title?`, `subtitle?`, `baseUrl?`, `endpoint?`, `timeoutMs?`, `source?`, `contained?`, `surface?`, `spacing?` | بنر اشتراک خبرنامه Pure-SSG متصل به `api.endpoints.newsletter` / `PUBLIC_NEWSLETTER_API_URL` یا نمایش پنل `mailto:` |
| `LandingHeroSplit.astro` | `id?`, `locale?`, `eyebrow?`, `title?`, `description?`, `primaryCta?`, `secondaryCta?`, `trustNote?`, `image?`, `imageAlt?`, `surface?` (`default`/`hero`/`subtle`) + اسلات `media` | هیروی دوتایی شرکتی/لندینگ با تصویر یا اسلات ویژوال مقابل (با پیش‌فرض‌های بومی) |
| `PromoBanner.astro` | `id?`, `locale?`, `badge?`, `message?`, `icon?`, `cta?`, `variant?`, `dismissible?`, `contained?`, `spacing?` | نوار اطلاع‌رسانی یا معرفی نسخهٔ تازه با حافظهٔ بستن در نشست |
| `PartnerLogos.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `columns?`, `contained?`, `surface?`, `spacing?` | نوار اعتماد و لوگوی مشتریان/همکاران (۴، ۵ یا ۶ ستونی) |
| `AboutSplitSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `highlights?`, `stats?`, `primaryCta?`, `secondaryCta?`, `image?`, `imageAlt?`, `mediaPosition?`, `contained?`, `surface?`, `spacing?` | بخش «درباره ما» دوستونه با فهرست نکات، آمار و جابه‌جایی جهت تصویر (`start`/`end`) |
| `BentoCapabilities.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `numbered?`, `contained?`, `surface?`, `spacing?` | شبکهٔ بنتو برای معرفی قابلیت‌ها و خدمات |
| `FeatureTabsSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `tabs?`, `variant?` (`pills`/`underline`), `contained?`, `surface?`, `spacing?` | تب‌های تعاملی دسترس‌پذیر WAI-ARIA با ناوبری صفحه‌کلید منطبق با RTL |
| `ProcessSteps.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `steps?`, `variant?` (`cards`/`timeline`), `cta?`, `contained?`, `surface?`, `spacing?` | مراحل گام‌به‌گام اجرا با شماره‌گذاری بومی |
| `FeatureCardGrid.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `columns?`, `contained?`, `surface?`, `spacing?` | گرید کارت‌های ویترینی با تصویر/آیکن، نشان، برچسب و لینک |
| `ProofStatsRow.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `contained?`, `surface?`, `spacing?` | ردیف آمار و دستاوردها با قالب‌بندی بومی اعداد |
| `ComparisonTable.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `columns?`, `rows?`, `contained?`, `surface?`, `spacing?` | جدول مقایسهٔ طرح‌ها/ویژگی‌ها با آیکن‌های بولی دسترس‌پذیر |
| `PricingSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `tiers?`, `billingToggle?`, `defaultBilling?`, `contained?`, `surface?`, `spacing?` | کارت‌های قیمت‌گذاری با سوییچ ماهانه/سالانه، پلن پیشنهادی و قیمت بومی |
| `TestimonialGrid.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `contained?`, `surface?`, `spacing?` | شبکهٔ نظرات مشتریان با امتیاز ستاره‌ای، نقل‌قول و آواتار بهینه |
| `ImageGallerySection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `columns?`, `enableFilter?`, `enableLightbox?`, `contained?`, `surface?`, `spacing?` | گالری تصاویر با فیلتر دسته‌بندی و پیش‌نمایش تمام‌صفحه (`<dialog>`) |
| `LatestPostsSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `limit?`, `category?`, `items?`, `viewAllHref?`, `contained?`, `surface?`, `spacing?` | نمایش خودکار آخرین مقاله‌های منتشرشدهٔ وبلاگ زبان جاری (با بازاستفاده از `PostCard`) |
| `TeamSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `members?`, `contained?`, `surface?`, `spacing?` | شبکهٔ اعضای تیم با تصویر/مونوگرام و لینک‌های شبکه‌های اجتماعی |
| `FaqAccordion.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `items?`, `openFirst?`, `emitSchema?`, `contained?`, `surface?`, `spacing?` | پرسش‌های متداول با پشتیبانی از `FAQPage` JSON-LD |
| `ContactSplitSection.astro` | `id?`, `locale?`, `eyebrow?`, `heading?`, `subheading?`, `channels?`, `highlights?`, `phone?`, `whatsapp?`, `telegram?`, `mapEmbedUrl?`, `showQuickActions?`, `showMap?`, `contained?`, `surface?`, `spacing?` | ترکیب اطلاعات تماس (`business`)، دکمه‌های تماس سریع (تلفن/واتساپ/تلگرام)، نقشهٔ تنبل (Click-to-Load) و فرم Pure-SSG (`ContactForm embedded`) |
| `CtaBanner.astro` | `id?`, `locale?`, `eyebrow?`, `title?`, `description?`, `primaryCta?`, `secondaryCta?`, `contained?`, `surface?` (`hero`/`surface`), `spacing?` | بنر فراخوان پایانی (CTA) پیش از فوتر |
| `CookieConsent.astro` | `locale` | بنر و مودال مدیریت رضایت کوکی و اسکریپت‌ها (TDDDG § 25 / GDPR) |
| `DevThemePreview.astro` | — | استودیوی تعاملی پیش‌نمایش پالت، رنگ hex و فونت (فقط در `import.meta.env.DEV`؛ خروجی پروداکشن = صفر بایت) |
| `Seo.astro` | `title`, `description?`, `locale`, `url`, `alternates`, `siteName?`, `image?`, `ogContext?`, `type?`, `publishedTime?`, `modifiedTime?`, `schema?`, `noindex?`, `prevUrl?`, `nextUrl?` | همهٔ متادیتای SEO |
| `TopLoadingBar.astro` | — | نوار پیشرفت ناوبری |

<a id="scroll-motion"></a>

### انیمیشن‌های اسکرول (ChronoTrig)، چیدمان پلکانی (`data-trig-stagger`) و اسکرول نرم Lenis

> **توجه:** سیستم قدیمی `.reveal` / `<Reveal>` / `initReveals` / `replayReveals` به‌طور کامل حذف شده است. موتور فعلی انیمیشن پروژه **ChronoTrig** است: `public/chronotrig.min.js` (موتور)، `src/scripts/chronotrig.ts` (هماهنگ‌کننده) و `src/styles/chronotrig.css` (استایل و زمان‌بندی).

#### ۱. معماری `.js` و چرخهٔ ورود `[data-trig]` (چرا از `hidden` / `display: none` استفاده نمی‌شود؟)

هرگز برای انیمیشن اسکرول از `hidden` (`display: none`) یا `opacity-0` بدون پیشوند استفاده نکنید؛ زیرا `display: none` ابعاد المان را صفر می‌کند، تشخیص ورود به دید در `IntersectionObserver` را از کار می‌اندازد، پرش چیدمان (`CLS`) ایجاد می‌کند و ترنزیشن CSS را می‌شکند. در عوض، این پروژه جای واقعی هر المان را در صفحه حفظ کرده و فقط ویژگی‌های سبک کارت گرافیک (`opacity` و `transform`) را مدیریت می‌کند:

```text
مرحله ۱ (<head> همگام)    : درج کلاس `js` روی `<html class="js">` پیش از اولین رسم صفحه
                            (اگر JS خاموش باشد یا صفحه پرینت شود، همه چیز ۱۰۰٪ مرئی است)
         ▼
مرحله ۲ (`.js [data-trig]`) : استایل اولیه: opacity: 0; transform: translate3d(0, 56px, 0)
                            فضای المان حفظ می‌شود (CLS = 0)
         ▼
مرحله ۳ (`.trig` توسط موتور) : هنگامی که المان وارد دید می‌شود، کلاس `.trig` اضافه می‌شود
         ▼
مرحله ۴ (`.js [data-trig].trig`) : انیمیشن `trig-reveal-up` با مدت `1.2s` و منحنی
                            `cubic-bezier(0.22, 1, 0.36, 1)` به opacity: 1 و transform: none می‌رسد
```

**مکث کوتاه پیش از شروع (`--trig-reveal-delay`):** موتور انیمیشن را به‌محض نمایان شدن لبهٔ المان فعال می‌کند؛ برای اینکه انیمیشن پیش از دیده شدن تمام نشود، در `chronotrig.css` یک متغیر سراسری تعریف شده است:

```css
:root {
  --trig-reveal-delay: 180ms;
}
```

این مکث برای همهٔ عناصر `[data-trig]` و همچنین کارت‌های پلکانی (به‌صورت `calc(var(--stagger-delay) + var(--trig-reveal-delay))`) اعمال می‌شود. برای کم/زیاد کردن آن فقط همین یک متغیر را تغییر دهید.

#### ۲. المان‌های تکی، `data-trig-once` و پریست‌های آماده (ChronoTrig v5.2.0)

کافی است صفت `data-trig` را روی هر بخش، کارت یا عنوان قرار دهید:

```astro
<!-- انیمیشن یک‌باره (پس از اجرا متوقف می‌شود و سربار اسکرول به صفر می‌رسد) -->
<div class="max-w-3xl fadeInUpSm" data-trig data-trig-once="true">
  <h1 class="text-4xl font-extrabold text-fg">عنوان اصلی</h1>
  <p class="mt-4 text-muted">متن توضیحی</p>
</div>
```

* بدون `data-trig-once="true"` انیمیشن هنگام ورود/خروج دوباره پخش می‌شود؛ با `data-trig-once="true"` یک‌بار اجرا شده، `will-change` آزاد می‌شود و از `IntersectionObserver` خارج می‌گردد.
* در فایل‌های محتوای `.mdx` عنوان‌های `.prose h2/h3/h4` به‌طور خودکار توسط `setupChronoTrig()` در `src/scripts/chronotrig.ts` علامت‌گذاری می‌شوند.
* **پریست‌ها و اصلاحگرهای آماده در `src/styles/chronotrig.css`**: کلاس‌های `.fadeInUpSm`، `.blurIn` (در موبایل به‌صورت خودکار به `.fadeInUpSm` بدون بلور تبدیل می‌شود)، `.clipUp`، `.clipStart`، `.fadeIn`، `.fadeInDown`، `.zoomIn`، `.zoomOut`، `.trig-directional` و اصلاحگرهای `.trig-delay-100..1000`، `.trig-duration-300..2000`، `.trig-ease-*` و `.trig-reactive-*` همگی زیر `.js [data-trig]` ایزوله هستند تا بدون JS یا در چاپ صفحه‌پرش (CLS) صفر باشد.

#### ۳. جهت‌های منطقی آگاه از RTL (`start` و `end`)

برای انیمیشن‌های افقی هرگز از `left` / `right` استفاده نکنید؛ از `data-trig-direction` با مقادیر منطقی یا کلاس `.clipStart` استفاده کنید تا در `fa` و `ar` به‌طور خودکار آینه شود:

```astro
<aside data-trig data-trig-direction="start" class="p-6">از ابتدای خواندن</aside>
<aside data-trig data-trig-direction="end" class="trig-delay-100 p-6">از انتهای خواندن</aside>
```

`chronotrig.css` این جهت‌ها را با `:where([dir="rtl"])` معکوس می‌کند، پس هیچ کلاس فیزیکی لازم نیست.

#### ۴. چیدمان پلکانی هماهنگ (`data-trig-stagger`)، بخش‌های پین‌شده (`data-trig-pin`) و تایم‌لاین (`data-trig-timeline`)

صفت `data-trig-stagger` را روی **ظرف والد** بگذارید و کارت‌ها را فرزند مستقیم (`:scope > *`) یا دارای `[data-trig-stagger-item]` / `.trig-stagger-item` قرار دهید:

```astro
<div
  class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
  data-trig-stagger
  data-trig-stagger-mode="center"
  data-trig-stagger-delay="0.06"
  data-trig-once="true"
>
  <div data-trig class="card">کارت ۱</div>
  <div data-trig class="card">کارت ۲</div>
  <div data-trig class="card">کارت ۳</div>
</div>
```

* ChronoTrig v5.2.0 حالت‌های `data-trig-stagger-mode` شامل `linear`، `wave`، `center` و `reverse` را پشتیبانی می‌کند و `--stagger-index`، `--stagger-delay` و `--stagger-total` را محاسبه کرده و آیتم‌ها را با `.trig-stagger-active` فعال می‌سازد (در حالت موبایل `lightweight` تأخیر به حداکثر `0.04s` محدود می‌شود). کارت‌های پلکانی از مدت `1.1s` و جابه‌جایی `44px` استفاده می‌کنند.
* **بخش‌های پین‌شده و تایم‌لاین**: با `[data-trig-pin]` (`data-trig-pin-distance`، `data-trig-pin-horizontal="true"` + `[data-trig-pin-track]`، `data-trig-pin-media`) و `[data-trig-timeline]` می‌توانید صحنه‌های چسبان و انیمیشن‌های چندمرحله‌ای بسازید. برای اینکه `position: sticky` از کار نیفتد، در `src/styles/global.css` روی `body` از `overflow-x: clip` (و نه `overflow-x: hidden`) استفاده شده است.

> **نکته:** کارت‌هایی که با `card.hidden = true` پنهان می‌شوند باید استایل `[data-post-card][hidden] { display: none !important; }` داشته باشند، چون کلاس‌های `flex` / `grid` در Tailwind رفتار پیش‌فرض `[hidden]` را خنثی می‌کنند.

#### ۵. فیلتر، تب‌بندی و تزریق پویا

دو حالت متفاوت وجود دارد:

| سناریو | کار لازم |
| :--- | :--- |
| افزودن کارت‌های **جدید** به گرید (مثلاً «نمایش بیشتر») | کافی است پس از `grid.append(...)` تابع `refreshChronoTrig()` را از `@/scripts/chronotrig` صدا بزنید. |
| **تغییر فیلتر یا تب** که فقط `card.hidden` را عوض می‌کند | باید ابتدا کلاس‌های ورود کارت‌های موجود پاک شود، سپس `refreshChronoTrig()` صدا زده شود؛ وگرنه کارت‌های قبلی بدون انیمیشن ظاهر می‌شوند. |

الگوی بازپخش فیلتر (همان `replayGridReveals()` در `src/views/BlogIndexView.astro`):

```typescript
import { refreshChronoTrig } from '@/scripts/chronotrig';

const replayGridReveals = (grid: HTMLElement) => {
  // اگر موتور بارگذاری نشده باشد، کارت‌ها نباید در حالت پنهان گیر کنند
  if (typeof window.chronoTrig === 'undefined') return;
  grid.classList.remove('trig-stagger-active');
  for (const child of Array.from(grid.children)) {
    child.classList.remove('trig', 'trig-up', 'trig-down', 'trig-stagger-active');
  }
  void grid.offsetHeight; // تثبیت حالت پنهان پیش از مشاهدهٔ مجدد
};

// فقط در تغییر واقعی فیلتر/تب، نه در رندر اولیه:
replayGridReveals(grid);
refreshChronoTrig();
```

**دو قاعدهٔ مهم:**

1. این بازپخش را در **رندر اولیه** فراخوانی نکنید؛ در غیر این صورت انیمیشن ورود صفحه از نو شروع می‌شود و پرش دیده می‌شود.
2. بازپخش را تنها زمانی انجام دهید که وضعیت فیلتر واقعاً تغییر کرده باشد (`areBlogFiltersEqual`).

#### ۶. استفاده در فایل‌های محتوای `.mdx`

در `src/content/pages/<group>/<locale>.mdx` و مقالات وبلاگ، عنوان‌ها خودکار هستند. برای بلوک‌های سفارشی کافی است صفت را مستقیم روی HTML بنویسید (بدون کامپوننت):

```mdx
## طراحی‌شده برای تیم‌های چندزبانه

<div class="not-prose my-10 grid gap-6 sm:grid-cols-3" data-trig-stagger data-trig-stagger-delay="0.08">
  <div data-trig class="rounded-2xl border border-border bg-surface p-6">کارت اول</div>
  <div data-trig class="rounded-2xl border border-border bg-surface p-6">کارت دوم</div>
  <div data-trig class="rounded-2xl border border-border bg-surface p-6">کارت سوم</div>
</div>
```

#### ۷. هماهنگی با Lenis و تنظیم حرکت

* **Lenis (`src/scripts/lenis.ts`)**: با `lerp: 0.085` و `syncTouch: false` راه‌اندازی می‌شود، در رویداد اسکرول با `window.chronoTrig.trigScroll?.()` همگام می‌شود، لینک‌های `#hash` هم‌صفحه را با آفست هدر ثابت (`-96px`) مدیریت می‌کند و در `astro:page-load` بازسازی می‌شود.
* **پنل‌های اسکرول داخلی**: روی هر مودال/کشو/پنل با `overflow-y-auto` صفت `data-lenis-prevent` بگذارید.
* **تنظیم حرکت**: تابع `resolveMotion()` در `<head>` (در `BaseLayout.astro`) مقدار `localStorage.motion` یا در صورت نبود آن تنظیم سیستمی `(prefers-reduced-motion: reduce)` را می‌خواند و `data-motion="reduced" | "full"` را روی `<html>` می‌نشاند. ChronoTrig v5.2.0 (`respectReducedMotion` + `body.chronotrig-mobile-disabled`)، `chronotrig.css`، Lenis و `[data-cookie-banner]` و `@media print` به‌صورت یکپارچه به آن احترام می‌گذارند.

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
- `src/content/**/*.mdx` (فایل‌های MDX که کامپوننت وارد می‌کنند)
- `scripts/**/*.mjs` (همهٔ اسکریپت‌های CLI)
- `src/**/*.test.ts` (فایل‌های تست)

دو افزونهٔ کامپایلر در `ignoreDependencies` هستند چون فقط از طریق تنظیمات تولیدی `.paraglide-work/project.inlang/settings.json` بارگذاری می‌شوند:
`@inlang/plugin-message-format` و `@inlang/plugin-m-function-matcher`.

### افزودن آیکون

آیکون‌ها از بستهٔ `@tabler/icons-astro` (لایسنس MIT) می‌آیند و با ۶۶ نام هسته از `src/libs/ui/icons.ts` (به همراه آیکون‌های سفارشی مشتری از `client/icons.ts`) صدا زده می‌شوند:
`search` · `globe` · `close` · `check` · `menu` · `chevron-left` · `chevron-right` · `chevron-down` · `chevron-up` · `sun` · `moon` · `copy` · `external-link` · `arrow-right` · `shield` · `mail` · `layers` · `home` · `info` · `sparkles` · `tag` · `newspaper` · `folder` · `compass` · `palette` · `book-open` · `star` · `star-filled` · `quote` · `users` · `user` · `building` · `file` · `alert-circle` · `alert-triangle` · `circle-check` · `bell` · `bolt` · `clock` · `map-pin` · `map` · `phone` · `rocket` · `code` · `award` · `layout-grid` · `calendar` · `photo` · `minus` · `eye` · `eye-off` · `shopping-bag` · `heart` · `share` · `filter` · `refresh` · `wand` · `dots-vertical` · `lock` · `adjustments-horizontal` · `brand-github` · `brand-x` · `brand-linkedin` · `brand-instagram` · `brand-telegram` · `brand-whatsapp`.

برای افزودن آیکون اختصاصی مشتری بدون دست‌زدن به هسته:

```ts
// ۱) نام تازه را به آرایهٔ مشتری اضافه کنید
// client/icons.ts
export const CLIENT_ICONS = ['my-icon'] as const;
```

```astro
<!-- ۲) فقط همان آیکون را در نگاشت کلاینت import کنید — نه از barrel بسته -->
<!-- client/ClientIcons.astro -->
import IconCustom from '@tabler/icons-astro/dist/esm/icons/star.mjs';
```

```astro
<Icon name="my-icon" size={20} class="text-primary" />
```

> هرگز `<svg>` خام با `<path>` را در قالب‌ها نچسبانید و مسیر SVG را در کد کلاینت دستی نسازید؛ آیکون‌هایی که بعد از بارگذاری لازم می‌شوند از `<template data-icon-template="…">` کلون می‌شوند (مانند صفحه‌بندی بلاگ) یا هر دو حالت رندر و با CSS جابه‌جا می‌شوند (تم و دکمهٔ کپی کد).
>
> **کارایی:** barrel بسته `@tabler/icons-astro` هر ۶٫۲۵۸ آیکون را صادر می‌کند؛ import از آن کل مجموعه را پیش از tree-shaking می‌خواند و در همین پروژه حدود ۲ تا ۷ ثانیه به هر بیلد اضافه کرد (HTML خروجی یکسان). مسیر تک‌آیکون فقط همان یک فایل را وارد گراف بیلد می‌کند.
>
> آیکون‌ها inline رندر می‌شوند (بدون درخواست sprite). در صفحهٔ خانه ۴۹ آیکون و ۲۳ آیکون یکتا حدود ۱۹KB از ۸۳KB HTML خام را می‌گیرند، اما با gzip تفاوت ناچیز است (کل صفحه ≈ ۱۴KB).

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

هدر دسکتاپ و کشوی موبایل از **یک** سازندهٔ مشترک (`buildPrimaryNavigation`) تغذیه می‌شوند تا هرگز از هم جدا نیفتند؛ فوتر و لینک‌های حقوقی ساختار و اولویت اختصاصی خود را دارند. هر چهار منو توسط تابع مرکزی `getNavigationSlots(locale, currentUrl)` ساخته و توزیع می‌شوند:

```ts
export interface NavItem {
  key: string;
  label: string;
  href?: string;
  active: boolean;
  external?: boolean;
  /** نام معنایی آیکون از `src/libs/ui/icons.ts`؛ کشو آن را رندر می‌کند. */
  icon?: string;
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
- از تابع `getHeaderNavigation(locale, currentUrl)` تأمین می‌شود؛ این تابع همان `buildPrimaryNavigation` مشترک با کشوی موبایل را برمی‌گرداند، پس یک صفحه هرگز یک بار در هدر و یک بار جداگانه در کشو تعریف نمی‌شود.
- **منوهای آبشاری چندسطحی (Dropdowns)**: از فیلد `children` در `NavItem` پشتیبانی می‌کند. روی دسکتاپ با هاور و فوکوس کیبورد (`group-hover` و `group-focus-within`) باز می‌شود. زیرمنوهای تو در تو نیز با آیکون `chevron-right` (با چرخش خودکار `rtl:rotate-180` در زبان‌های راست‌به‌چپ) به سمت جهت خواندن هدایت می‌شوند.
- **تشخیص خودکار صفحهٔ فعال**: تابع `isActive(href, currentUrl)` مسیر جاری را با لینک‌ها مقایسه کرده و کلاس `text-primary font-medium` و نشانگر `aria-current="page"` را اعمال می‌کند.
- **دکمهٔ CTA پیکربندی‌پذیر**: دکمهٔ شروع سریع (`common_get_started`) به گروه صفحهٔ تعیین‌شده در `ui.ctaPage` (`app.config.json` / `client/config.json`) می‌رود — پیش‌فرض `pricing`. اگر آن صفحه برای این زبان منتشر نشده باشد، دکمه به‌جای لینک مرده پنهان می‌شود.

#### ۲. کشوی کشویی موبایل (`drawerNav` و پنل اختصاصی)
- از تابع `getDrawerNavigation(locale, currentUrl)` تأمین می‌شود (همان فهرست هدر، از سازندهٔ مشترک) و با دکمهٔ همبرگری `data-mobile-menu-btn` باز می‌شود.
- **طراحی دوتبی (Two-Tab Interface)**:
  - **تب ناوبری (`drawer_tab_nav`)**: یک درخت پیوسته، نه کارت جداگانه. هر ردیف `DrawerNavLink.astro` است: کاشی آیکون + برچسب. شاخه (مثل «منابع») یک ردیف معمولی غیرقابل‌کلیک با آیکون و برچسب `font-semibold` است و فرزندانش زیر آن روی یک خط راهنما آویزان می‌شوند که از مرکز کاشی والد شروع می‌شود (`ms-6.5 border-s border-border/70 ps-2` و برای یک سطح پایین‌تر `ms-6 border-s border-border/60 ps-1.5`). هیچ پاپ‌آپی در کشو نیست.
  - **بخش اختصاصی زبان‌ها**: یک گرید دو ستونه از همهٔ زبان‌های فعال (`data-drawer-language-section`) با نمایش نام بومی، کد زبان و آیکون تیک برای زبان جاری، همراه با ناوبری استاتیک امن (`window.location.assign`).
  - **بخش اختصاصی تغییر تم**: کنترلگر تغییر حالت روشن/تیره درون کشو.
  - **تب جستجو (`drawer_tab_search`)**: کامپوننت `DrawerSearch.astro` مستقیماً درون کشو تعبیه شده و با انتخاب تب، فوکوس خودکار روی اینپوت جستجو قرار می‌گیرد.
- **مدیریت فوکوس و دسترس‌پذیری**: استفاده از خصوصیت `inert` روی پنل در حالت بسته، گوش دادن به کلید `Escape`، کلیک روی پس‌زمینه (Backdrop) و رویداد `app:close-drawer`.

#### ۳. فوتر چندستونهٔ پیشرفته (`footerNav` و `legalNav`)
- از توابع `getFooterNavigation(locale, currentUrl)` و `getLegalNavigation(locale)` تأمین می‌شود و فوتر قدیمی تک‌خطی را به یک شبکهٔ واکنشی استاندارد تبدیل می‌کند:
  - **ستون ۱ (برند و مأموریت)**: نام برند، توضیح بومی سایت (`site_description`).
  - **ستون ۲ (صفحات / Pages)**: دقیقاً از `CLIENT_PAGE_ITEMS` (`client/navigation.ts`) ساخته می‌شود، پس افزودن/حذف صفحه در فوتر هم اثر می‌کند. خانه تنها لینکی است که حتی بدون صفحهٔ خانهٔ همان زبان (با `getHomeHref`) زنده می‌ماند.
  - **ستون ۳ (منابع / Resources)**: فقط یک لینک برای هر نوع محتوای قابل‌ناوبری (`getContentTypeNavItems`: وبلاگ، پروژه‌ها). لنگرهای `#rtl`/`#design` و «نمای کلی» متعلق به منوی هدر/کشو هستند، نه فوتر. هیچ لینک خارجی/قالبی در فوتر نیست.
  - **ستون ۴ (شرکت / Company)**: شبکه‌های اجتماعی `social.github`، `social.twitter`، `social.linkedin`، `social.instagram` و `social.telegram` از پیکربندی ادغام‌شده؛ هر کدام فقط وقتی مقدار داشته باشند. ستون خالی کلاً حذف می‌شود.
- **نوار پایین فوتر (Bottom Bar)**:
  - درج سال کپی‌رایت خودکار با تقویم هجری شمسی برای فارسی (`formatYear(currentYear, locale)`) و متن همه‌حقوق محفوظ است (`common_all_rights_reserved`).
  - پیوندهای حقوقی ثانویه (`legalNav`) شامل حریم خصوصی (`footer_legal_privacy`) و شرایط استفاده (`footer_legal_terms`) که از `getClientLegalNavigation()` در `client/navigation.ts` خوانده می‌شوند و بدون صفحهٔ هدفِ منتشرشده لینک مرده نمی‌سازند.

#### ۴. لایهٔ سازگاری با گذشته (Backward Compatibility)
تابع قدیمی `getNavigation(locale, currentUrl)` همچنان در `src/libs/config/navigation.ts` وجود دارد و به عنوان مستعار (alias) برای `getDrawerNavigation` عمل می‌کند تا هیچ اسکریپت یا تستی دچار شکست نشود.

---

## ۱۲. صفحات، نماها و مسیریاب

تنها فایل مسیر پویا `src/pages/[...path].astro` است که همه‌چیز را به نماهای `src/views/` (`PageView`, `BlogIndexView`, `BlogPostView`, `CollectionIndexView`, `CollectionEntryView`) ارجاع می‌دهد:

```astro
---
import { getSiteRoutes } from '@/libs/content/service';
import PageView from '@/views/PageView.astro';
import BlogPostView from '@/views/BlogPostView.astro';
import BlogIndexView from '@/views/BlogIndexView.astro';
import CollectionIndexView from '@/views/CollectionIndexView.astro';
import CollectionEntryView from '@/views/CollectionEntryView.astro';

export async function getStaticPaths() {
  return await getSiteRoutes();
}
const props = Astro.props;
---
```

**قاعده:** هرگز `src/pages/[lang].astro` یا `[slug].astro` نسازید — برخورد مسیر
رخ می‌دهد. مسیرها از محتوا ساخته می‌شوند، نه دستی.

### انواع مسیر

| `routeType` | پراپ‌های ویژه | نما |
| --- | --- | --- |
| `page` | `entry` | `PageView` |
| `blog-entry` | `entry` | `BlogPostView` |
| `blog-index` | `page`, `totalPages`, `perPage` | `BlogIndexView` |
| `collection-index` | `contentType`, `page`, `totalPages`, `perPage` | `CollectionIndexView` |
| `collection-entry` | `contentType`, `entry` | `CollectionEntryView` |

### افزودن لینک به ناوبری

۱. مطمئن شوید صفحه در `src/content/pages/<page-key>/` وجود دارد (یا `npm run new:page` بزنید)
۲. یک ورودی به `CLIENT_PAGE_ITEMS` در `client/navigation.ts` اضافه کنید (ستون‌های اضافهٔ فوتر و لینک‌های حقوقی هم در همین فایل تعریف می‌شوند):

```ts
// client/navigation.ts
export const CLIENT_PAGE_ITEMS: ClientPageItemConfig[] = [
  { group: 'home', icon: 'home', label: (locale: Locale) => m.nav_home({}, { locale }) },
  { group: 'contact', icon: 'mail', label: (locale: Locale) => m.nav_contact({}, { locale }) }, // ← جدید
];
```

هدر دسکتاپ و کشوی موبایل هر دو از `buildPrimaryNavigation` (پشت `getHeaderNavigation`
و `getDrawerNavigation`) می‌خوانند و فوتر/لینک‌های حقوقی از `getFooterNavigation` و
`getLegalNavigation`؛ نیازی به ویرایش فایل‌های هسته نیست. صفحه‌ای که ترجمه‌ای برای زبانی
ندارد، خودکار از منو حذف می‌شود (`getPageUrl` مقدار `null` برمی‌گرداند).

**فیلتر تعاملی در کالکشن‌های عمومی (`CollectionIndexView.astro`)**: برای `projects` و مجموعه‌های اختصاصی، فهرست به‌صورت پیش‌رونده از فیلتر دسته‌بندی، تگ‌های فناوری (`stack`) و جستجوی متنی، شمارندهٔ زنده با `formatNumber`، دکمهٔ پاک‌سازی فیلتر و بازپخش انیمیشن‌های ChronoTrig پشتیبانی می‌کند.

**ویرایشگر Git-محور (Pages CMS)**: فایل `.pages.yml` در ریشهٔ مخزن به‌صورت آماده برای مدیریت صفحات (`pages`)، مقالات (`blog`)، پروژه‌ها (`projects`) و رسانه تنظیم شده است.

**منوی Resources**: زیرمنوها به بخش‌های صفحهٔ `features` (`#rtl` و `#design`) اشاره می‌کنند. اگر صفحهٔ features وجود نداشته باشد، این منو به یک لینک «Overview» به وبلاگ کاهش می‌یابد و اگر وبلاگ هم خاموش باشد کاملاً حذف می‌شود — هیچ لنگر مرده‌ای (`#rtl`) در منو نمی‌ماند.

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
- دکمهٔ «پاک کردن فیلتر» فقط وقتی فیلتر فعالی هست دیده می‌شود؛
- در هر تغییر واقعی وضعیت فیلتر (`!areBlogFiltersEqual(prev, next)` شامل انتخاب دسته/برچسب، پاک کردن فیلتر و `popstate`)، تابع `replayGridReveals()` کلاس‌های ورود کارت‌ها را پاک می‌کند و سپس `refreshChronoTrig()` همهٔ کارت‌های مرئی را با گام پلکانی دوباره با انیمیشن وارد تصویر می‌کند.

وقتی وبلاگ بیش از یک صفحه دارد و فیلتری فعال است، کارت‌های همان صفحه کافی
نیستند: `BlogIndexView` کاتالوگ استاتیک همان زبان (`/api/blog-posts/<locale>.json`) را یک بار
می‌گیرد و همهٔ مقالات آن زبان را که با فیلتر می‌خوانند فیلتر و صفحه‌بندی پویا می‌کند.
اگر این درخواست شکست بخورد، فیلتر به کارت‌های همان صفحه برمی‌گردد (fallback بی‌صدا). لینک‌های پیجر همیشه کوئری فیلتر فعال
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

## ۱۴. جستجو (بهینه‌شده برای فارسی) و فرم تماس Pure SSG

سیستم جستجو در کل سایت از طریق `src/libs/search/client.ts` و ماژول نرمال‌ساز فارسی `src/libs/search/persian.ts` به همراه ایندکسر مرحلهٔ بیلد `scripts/index-pagefind.mjs` پیاده‌سازی شده و در دو کامپوننت ارائه می‌شود:
۱. **مودال دسکتاپ (`SearchModal.astro`)**: با کلیک روی آیکون جستجو یا کلید میان‌بر `⌘K` / `Ctrl+K`.
۲. **تب جستجوی کشوی موبایل (`DrawerSearch.astro`)**: مستقیماً درون تب جستجوی کشوی موبایل تعبیه شده و بدون نیاز به باز کردن دیالوگ جداگانه، تجربهٔ جستجوی بومی موبایل را فراهم می‌کند.

### بهبودهای اختصاصی جستجوی فارسی در Pagefind و Fallback
موتور پیش‌فرض Pagefind فاقد ریشه‌یاب (Stemmer) فارسی است. برای حل چالش‌های واقعی تایپ فارسی، دو لایهٔ مکمل در پروژه تعبیه شده است:
1. **نرمال‌سازی زمان بیلد (`scripts/index-pagefind.mjs`)**: هنگام اجرای `npm run build`، فایل‌های HTML پوشهٔ `dist/` بدون تغییر روی دیسک، در حافظه پردازش و به API رسمی Node در Pagefind داده می‌شوند:
   - یکسان‌سازی حروف عربی به فارسی (`ي`/`ى` ← `ی`، `ك` ← `ک`) و حذف کشیده/اعراب در متن صفحات `fa`.
   - جداسازی علائم نگارشی چسبیده (`«»،؛؟٪٬` مثل `«منبع`) با فاصلهٔ مویی یونیکد (`\u200A`) بیرون از تگ‌های `<pre>`/`<code>`/`<script>`/`<style>` تا توکنایزر Rust در Pagefind کلمات فارسی را کاملاً تمیز ایندکس کند و `plainText()` آن را در خلاصه‌ها پاک کند.
2. **گسترش هوشمند عبارت جستجو در سمت کاربر (`src/libs/search/persian.ts`)**:
   - تبدیل خودکار فاصلهٔ معمولی به نیم‌فاصله (`ZWNJ`) در پسوندها، پیشوندها و ترکیب‌های رایج فارسی (`صفحه بندی` ← `صفحه‌بندی`، `راست به چپ` ← `راست‌به‌چپ`، `فاصله گذاری ها` ← `فاصله‌گذاری‌ها`) و اجرای موازی دگرسان‌های کوئری در Pagefind با حذف نتایج تکراری.
   - پوشش تفاوت‌های املایی همزه/یای میانجی (`ارایه` ↔ `ارائه`، `مساله` ↔ `مسئله`) و ارقام فارسی/لاتین/عربی (`۱۴۰۵` ↔ `1405`).
   - تطبیق بی‌حساسیت به نیم‌فاصله/فاصله در حالت توسعه و فالبک (`/api/search-dev/<locale>.json`).

| رفتار | جزئیات فنی |
| --- | --- |
| دسترسی | کلیک روی دکمهٔ جستجو، باز کردن تب جستجوی کشو در موبایل، یا میان‌بر `⌘K` / `Ctrl+K` |
| بستن | کلید `ESC`، کلیک روی پس‌زمینه (Backdrop)، دکمهٔ بستن، یا کلیک روی هر نتیجهٔ جستجو |
| موتور پروداکشن | لود تنبل (Lazy-load) ماژول Pagefind از `/pagefind/pagefind.js` همراه با گسترش کوئری‌های فارسی (`buildSearchQueryVariants`) |
| حالت بدون Pagefind (توسعه/فالبک) | فالبک آنی به `/api/search-dev/<locale>.json` (و `/api/search-dev.json`) با تطبیق نرمال‌شدهٔ `matchesFallbackSearch` |
| کنترل زمان (Debounce) | ۱۵۰ میلی‌ثانیه برای جلوگیری از ارسال درخواست‌های پیاپی |
| سقف تعداد نتایج | ۸ نتیجهٔ برتر یکتا (`slice(0, 8)`) |
| محافظت از رقابت (Race-Condition) | شناسهٔ فزایندهٔ `requestId`؛ پاسخ‌های دیررس جستجوهای قبلی نادیده گرفته می‌شوند |
| امنیت در برابر XSS | تبدیل مارک‌آپ خلاصه‌های Pagefind به متن ساده توسط `plainText()` و درج امن با `textContent` |

### فرم تماس و خبرنامه (آداپتورهای بدون سرور و Turnstile)
این استارتر **۱۰۰٪ استاتیک (SSG)** است و هیچ سرور بک‌اند داخلی ندارد. برای فرم تماس (`src/components/ContactForm.astro`) و بنر اشتراک خبرنامه (`src/components/NewsletterBanner.astro`)، داده‌ها مستقیماً از مرورگر از طریق آداپتور نوع‌امن `src/libs/api/client.ts` (`submitContactInquiry` / `submitNewsletterSubscription` و کمکی‌های `resolveFormEndpoint` / `resolveApiEndpoint` / `validateContactPayload` / `validateNewsletterPayload`) با محافظت تایم‌اوت (`AbortController`)، فیلتر ضداسپم Honeypot و پشتیبانی اختیاری از **Cloudflare Turnstile** (`turnstileSiteKey` / `PUBLIC_TURNSTILE_SITE_KEY`) ارسال می‌شوند:
- **ارائه‌دهندگان آماده (`api.provider`)**: `custom`، `web3forms` (با `accessKey` / `PUBLIC_WEB3FORMS_KEY` به‌طور خودکار به `https://api.web3forms.com/submit` وصل می‌شود)، `formspree`، `basin` و `webhook` (مانند n8n / Make).
- نشانی API را در متغیرهای محیطی `PUBLIC_CONTACT_API_URL`، `PUBLIC_NEWSLETTER_API_URL` (یا `PUBLIC_API_BASE_URL`) و یا در بخش `api` فایل `client/config.json` (`provider`, `accessKey`, `turnstileSiteKey`, `endpoints.contact`, `endpoints.newsletter`, `topics`) تنظیم کنید.
- **بخش تماس کامل (`ContactSplitSection.astro`)**: با پر کردن `business` در `client/config.json`، دکمه‌های اقدام سریع (تلفن، واتساپ، تلگرام) و باکس نقشهٔ تنبل (Click-to-Load با پشتیبانی از `mapEmbedUrl` یا مختصات `geo`) در کنار فرم تماس فعال می‌شوند.
- **بدون نشانی API، فرم اصلاً رندر نمی‌شود.** بازدیدکننده به‌جای فرم یک پنل کوتاه می‌بیند:
  - اگر `site.contactEmail` تنظیم شده باشد: پیام `contact_fallback_desc` («ایمیل بزنید…») + دکمهٔ `mailto:` (`contact_fallback_cta`).
  - اگر خالی باشد: پیام بی‌طرف `contact_unavailable_desc` / `newsletter_unavailable_desc` — بدون وعدهٔ ایمیلی که وجود ندارد و بدون دکمه.

  دلیل: کنترل بفرست‌نشدنی بدتر از یک نشانی روشن است، و متن‌هایی مثل نام متغیر محیطی هرگز نباید به بازدیدکننده نشان داده شوند.
- متن راهنمای توسعه‌دهنده فقط در حالت `import.meta.env.DEV` رندر می‌شود؛ در بیلد پروداکشن از HTML حذف می‌شود.
- `npm run doctor` اگر هیچ مقصدی (نه `api.baseUrl`/متغیرهای `PUBLIC_*` و نه `site.contactEmail`) تنظیم نشده باشد هشدار می‌دهد، چون در آن حالت سایت هیچ درخواستی دریافت نمی‌کند.

---

## ۱۵. SEO، متادیتا و endpointها

### `Seo.astro` و اسکیمای شرکتی (`src/libs/content/schema.ts`)

- `BaseLayout.astro` به‌طور خودکار اسکیمای `Organization` یا `LocalBusiness` (`ProfessionalService`, `MedicalBusiness`, `Store`) را به کمک `buildOrganizationSchema` از `business` + `social` (`sameAs`) تزریق می‌کند و `buildServiceSchema` نیز برای صفحات خدمات آماده است.
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

### تصویر اجتماعی (OG Card) و کیفیت حروف RTL

```ts
// src/libs/content/social.ts و src/libs/content/og-card.ts
// اگر brand.socialCardMode === 'branded' (پیش‌فرض app.config.json)، route استاتیک `/og/[...slug].png.ts`
// کارت ۱۲۰۰×۶۳۰ PNG برنددار هر صفحه/مقاله را در زمان بیلد تولید می‌کند (در SVG فارسی/عربی
// از direction="rtl" و unicode-bidi="embed" و مبدأ راست برای اتصال دقیق حروف در sharp استفاده می‌شود)؛
// در حالت 'artwork' تصویر گروه با getSocialCard() برش می‌خورد و در 'default' از `/og-default.png` استفاده می‌شود.
const card = await getSocialCard(entry.data.image);
// → { url: 'https://…/og-….jpg', width: 1200, height: 630 }
```

### endpointها

| مسیر | نوع | محتوا |
| --- | --- | --- |
| `/sitemap.xml` | XML | همهٔ مسیرها + `xhtml:link` برای هر زبان + `x-default` + `lastmod` + `changefreq` |
| `/rss.xml` | Atom | مقالات منتشرشدهٔ زبان پیش‌فرض با `category` |
| `/rss/<locale>.xml` | Atom | مقالات منتشرشدهٔ همان زبان (غیرپیش‌فرض) |
| `/robots.txt` | متن | `User-agent: *` / `Allow: /` / `Disallow: /api/` / `Sitemap: <مطلق>` |
| `/og/[...slug].png` | PNG | کارت‌های OG برنددار هر مسیر در حالت `brand.socialCardMode === 'branded'` |
| `/site.webmanifest` | JSON | از `app.config.json` + زبان پیش‌فرض ساخته می‌شود: نام، `short_name`، `lang`/`dir`، رنگ‌ها، آیکون‌ها، `display: standalone` |
| `/api/search-dev/<locale>.json` و `/api/search-dev.json` | JSON | فهرست استاتیک fallback جستجو به تفکیک هر زبان و کل سایت |
| `/api/blog-posts/<locale>.json` و `/api/blog-posts.json` | JSON | کاتالوگ استاتیک مقالات منتشرشده به تفکیک زبان برای فیلتر فراصفحه‌ای |

### صفحهٔ ۴۰۴

`src/pages/404.astro` زبان را از پیشوند URL تشخیص می‌دهد و `lang`، `dir`،
فونت، عنوان، توضیح، ناوبری، برچسب‌های هدر/فوتر/جستجو/تعویض زبان و لینک «نسخهٔ انگلیسی» را
در سمت کاربر بازنویسی می‌کند. چون یک سند ایستای مشترک برای همهٔ مسیرهای ناموجود است،
canonical و `hreflang` آن روی زبان پیش‌فرض (`/`) می‌مانند — نه `/404` که وجود ندارد —
و صفحه `noindex, nofollow` است.

**بدون جاوااسکریپت:** سند ایستا همیشه نسخهٔ زبان پیش‌فرض است، چون پیشوند مسیر فقط
در زمان اجرا خوانده می‌شود. برای همین یک بلوک `<noscript>` فهرست زبان‌ها را نشان
می‌دهد: هر زبان با نام بومی خودش (`LOCALE_METADATA[locale].name`) و لینکی به
همان خانه‌ای که واقعاً ساخته شده (`alternates`، بدون زبان‌های نیمه‌ترجمه). یعنی
بازدیدکنندهٔ فارسی‌زبان بدون JS با یک کلیک به `/fa/` می‌رسد. اگر می‌خواهید ۴۰۴
دقیقاً به زبان بازدیدکننده باشد، باید روی هاست برای هر پیشوند یک سند جدا سرو کنید؛
این کار خارج از خروجی استاتیک است.

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
| کاهش حرکت | `resolveMotion()` از `localStorage.motion` یا `(prefers-reduced-motion: reduce)` سیستم می‌خواند و `data-motion="reduced" \| "full"` روی `<html>` می‌گذارد؛ ChronoTrig، Lenis، بنر کوکی و نوار پیشرفت هماهنگ به آن احترام می‌گذارند |
| متن جایگزین | تصاویر تزئینی با `alt=""`؛ عنوان کارت اجتماعی = عنوان صفحه |

---

## ۱۷. تست و اعتبارسنجی

```bash
npm run upstream:check # بررسی جداسازی لایهٔ هسته و client/
npm run lint           # کامپایل پیام‌ها + astro check + tsc --noEmit
npm test               # ۲۵ فایل تست واحد Vitest (۲۶۰ تست)
npm run audit:i18n
SITE_URL=https://example.com npm run build
npm run smoke          # تست دود روی dist/
npm run link:check     # خزش dist/ و گزارش لینک‌های شکسته
npm run knip
npm run verify:cli     # ۹۵ ادعا دربارهٔ گردش‌کارهای CLI
```

### چه چیزی تست می‌شود

| فایل | پوشش |
| --- | --- |
| `src/i18n/paths.test.ts` | `localizeHref`، `stripLocale`، نرمال‌سازی مسیر، اسلش انتهایی |
| `src/i18n/icu.test.ts` | ICU جمع/ordinal برای زبان‌های فعال |
| `src/i18n/format.test.ts` | قالب‌بندی بومی اعداد و تاریخ‌ها (شمسی برای فارسی، ارقام عربی شرقی و غیره) |
| `src/libs/content/entries.test.ts` | تجزیهٔ ID، فیلتر پیش‌نویس، گروه‌بندی، مرتب‌سازی |
| `src/libs/content/service.test.ts` | ساخت مسیرها، تشخیص برخورد، صفحه‌بندی هر زبان |
| `src/libs/content/pagination.test.ts` | `paginate`، `clampPage`، `buildPageWindow` |
| `src/libs/content/blog.test.ts` | فیلترها، مقایسهٔ وضعیت فیلتر (`areBlogFiltersEqual`)، زمان مطالعه، TOC و مقالات مرتبط |
| `src/libs/content/taxonomy.test.ts` | برچسب دسته/برچسب و fallback |
| `src/libs/content/content-types.test.ts` | رجیستری انواع محتوا و مسیرهای جنریک مجموعه‌ها |
| `src/libs/content/og-card.test.ts` | رندر SVG کارت OG برنددار (از جمله `direction="rtl"` فارسی/عربی)، شکستن خطوط و فرار از XSS |
| `src/libs/content/schema.test.ts` | سازنده‌های JSON-LD شرکتی (`Organization`، `LocalBusiness`، `Service` و `sameAs`) |
| `src/libs/content/scripts.test.ts` | توابع فرانت‌متر، CLI helperها، پارسر زبان |
| `src/libs/config/app.test.ts` | اعتبارسنجی ادغام `app.config.json` + `client/config.json` و تنظیمات برند/لوگو/کسب‌وکار/وبلاگ/API/کوکی |
| `src/libs/config/theme.test.ts` | پالت‌های OKLCH، رنگ‌های hex سفارشی، ۵ پیش‌تنظیم فونت RTL و کنتراست AA |
| `src/libs/config/navigation.test.ts` | اسلات‌های ناوبری چندمنویی هدر، کشوی موبایل و فوتر |
| `src/libs/config/client.test.ts` | هم‌خوانی `CLIENT_COOKIE_CONFIG` با پیکربندی اعتبارسنجی‌شده و نبود import زمان اجرا از `app.ts` (به‌این‌ترتیب Zod به باندل مرورگر نمی‌رسد) |
| `src/libs/config/astro-config.test.ts` | alias `astro/components` در `astro.config.mjs` (رفع `Unknown file extension ".astro"`) |
| `src/libs/api/client.test.ts` | آداپتور Pure-SSG (`custom`, `web3forms`, `formspree`, `basin`, `webhook`)، Turnstile، تایم‌اوت و Honeypot |
| `src/libs/cookies/cookies.test.ts` | مدل رضایت کوکی، انقضا و مدیریت اسکریپت‌ها |
| `src/libs/search/client.test.ts` | جستجوی کلاینت، نرمال‌سازی حروف/نیم‌فاصله/ارقام فارسی و ایندکسر Pagefind |
| `src/scripts/lenis.test.ts` | اسکرول نرم، آفست لینک‌های `#hash` و ایزوله‌سازی پنل‌ها |
| `src/scripts/chronotrig.test.ts` | قرارداد `.js [data-trig]`، جهت‌های منطقی RTL، پلکانی‌سازی، مکث `--trig-reveal-delay`، `prefers-reduced-motion` و سازگاری Lenis |
| `src/libs/ui/button.test.ts` | نگاشت `variant`/`size` به کلاس‌های `global.css`، حرکت هاور/فشرده‌سازی و اولویت `className` فراخوان |
| `src/libs/ui/icons.test.ts` | یکتایی و kebab-case بودن `SITE_ICONS` (۶۶ آیکون هسته)، `resolveIconName`، آیکون‌های جهت‌دار RTL و پوشش آیکون‌های ناوبری |
| `src/libs/ui/blocks.test.ts` | بلوک‌های آمادهٔ شرکتی/لندینگ (خواص منطقی، نبود `<svg>` خام، کلیدهای Paraglide و توکن‌های معنایی) |

> **۲۵ فایل تست واحد (۲۶۰ تست).** ماژول `astro:content` در Vitest با
> `src/test/astro-content-mock.ts` جایگزین می‌شود، پس تست‌های واحد بدون بیلد
> Astro و بدون دست‌زدن به فایل‌های محتوا اجرا می‌شوند.

### ممیزی i18n — ۶ بخش

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. پیکربندی زبان | تطابق `client/locales.json` و `src/i18n/locales.ts`، وجود `dir` برای هر زبان |
| ۲. فرهنگ‌ها | کلیدها و placeholderهای ICU در فرهنگ‌های ادغام‌شدهٔ همهٔ زبان‌ها، همهٔ کلیدهای استفاده‌شده، کلیدهای بی‌استفاده |
| ۳. کالکشن محتوا | وجود فایل هر زبان برای هر گروه (نبودِ یک زبان = هشدار) |
| ۴. نگهبان slug و مسیر | فرانت‌متر معتبر، اسلاگ‌های یکتا، نبود برخورد مسیر |
| ۵. اسکنر متن هاردکد | هشدار دربارهٔ رشته‌های ترجمه‌نشده در قالب‌ها (هشدار، نه خطا) |
| ۶. نگهبان RTL | نبود کلاس جهت‌دار فیزیکی (`ml-`, `pr-`, `text-left`, `left/right`) و بردارهای فیزیکی انیمیشن |

خروجی واقعی روی وضعیت پایهٔ تمیز این مخزن: ۲ زبان (`en`, `fa`)، ۵۱۰ کلید پایه در فرهنگ‌های هسته (۵۳۱ کلید پس از ادغام با `client/messages/`) با placeholder یکسان، بدون برخورد مسیر و صفر تخلف RTL.

### تست دود — ۷ بخش روی `dist/`

| بخش | چه چیزی را بررسی می‌کند |
| --- | --- |
| ۱. زبان پیش‌فرض | ریشه بدون پیشوند، `lang`/`dir` درست |
| ۲. زبان‌های دیگر | حفظ پیشوند، زبان و جهت |
| ۳. اسلاگ مقاله | اسلاگ‌های محلی‌شده به صفحهٔ ساخته‌شدهٔ واقعی می‌رسند |
| ۴. hreflang | پوشش کامل روی صفحهٔ خانه + `x-default` |
| ۵. endpointها | `sitemap.xml`، `rss.xml`، `robots.txt`، `site.webmanifest`، کارت OG |
| ۶. یک `h1` و متن بدون placeholder | هر صفحهٔ بیلدشده دقیقاً یک `<h1>` دارد و هیچ `[TODO` منتشر نشده |
| ۷. صفحه‌بندی وبلاگ | مسیر صفحه‌ها، نشانه‌گذاری پیجر، `rel=prev/next`، نبود صفحهٔ اضافی |

نکته‌های دقت تست دود:

- `lang` و `dir` از **خودِ تگ `<html>`** خوانده می‌شوند، نه از جست‌وجوی متن کل
  سند؛ وگرنه `dir="ltr"` نوار پیشرفت باعث می‌شد بررسی جهت همیشه پاس شود.
- هر زبان باید در `client/locales.json` جهت صریح (`ltr`/`rtl`) داشته باشد؛
  نبودِ جهت یک خطای پیکربندی است، نه «پیش‌فرض ltr».
- تعداد صفحه‌های وبلاگ از خودِ کالکشن محتوا مشتق و با `blog.postsPerPage`
  سنجیده می‌شود.

### CI

`.github/workflows/ci.yml`:

- `concurrency` با `cancel-in-progress` — بیلدهای قدیمی خودکار لغو می‌شوند
- Node 22 با cache بسته، نصب وابستگی‌ها
- `SITE_URL: https://example.com` به‌عنوان env
- `timeout-minutes: 15`
- ترتیب: `upstream:check` → `lint` → `test` → `audit:i18n` → `doctor` → `build` → `smoke` → `link:check` → `knip` → `verify:cli`

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
npm run build && npm run smoke
```

### ۳. تنظیمات `astro.config.mjs`

| گزینه | مقدار | چرا |
| --- | --- | --- |
| `site` | `SITE_URL` یا مبدأ توسعه | canonical، sitemap، RSS، OG |
| `trailingSlash` | `'ignore'` | لینک‌های canonical با `withTrailingSlash` به `/` ختم می‌شوند و مسیرهای نامعتبر بدون اسلش صفحهٔ ۴۰۴ بومی را رندر می‌کنند |
| `prefetch` | `{ prefetchAll: false, defaultStrategy: 'hover' }` | پیش‌واکشی سریع لینک‌ها هنگام هاور بدون مصرف پهنای باند اضافه |
| `build.format` | `'directory'` | هر صفحه یک پوشهٔ `index.html` |
| `compressHTML` | `true` | فشرده‌سازی HTML خروجی |
| `integrations` | `[mdx()]` | پشتیبانی MDX |
| `vite.plugins` | `[tailwindcss()]` | Tailwind v4 از طریق Vite + aliasهای `@` و `@client` |
| `server.host` / `server.port` | از `app.config.json` / `client/config.json` | سرور توسعه با اپ هم‌پورت است |

### ۴. خروجی، هدرهای کش و پیکربندی سرور

پوشهٔ `dist/` یک سایت کاملاً استاتیک است و روی هر میزبانی سرو می‌شود
(Cloudflare Pages، Netlify، Vercel، S3، nginx).

به‌خاطر `build.format: 'directory'` هر صفحه
به‌شکل یک پوشه با `index.html` ساخته می‌شود:

```text
dist/
├── index.html          # صفحهٔ خانهٔ زبان پیش‌فرض
├── about/index.html    # صفحهٔ ایستا (در صورت ایجاد یا seed)
├── fa/index.html       # خانهٔ فارسی
├── blog/index.html     # ایندکس وبلاگ
├── 404.html            # صفحهٔ خطای locale-aware
├── _headers            # قوانین آمادهٔ امنیت و کش برای Cloudflare Pages / Netlify
├── sitemap.xml  rss.xml  robots.txt  site.webmanifest
├── pagefind/           # ایندکس جستجو
└── _astro/             # JS/CSS/فونت/تصویرهای بهینه‌شده
```

> میزبان باید `/about/` را از `/about/index.html` سرو کند (`public/_headers` قوانین کش و امنیت Cloudflare Pages/Netlify را به‌صورت آماده کپی می‌کند). برای **Nginx** فایل مرجع `docs/deploy/nginx.conf` همراه با `gzip`، کش بلندمدت `/_astro/*` و مدیریت `/404.html` آماده است.

### ۵. نکات

- `dist/pagefind/` باید همراه سایت منتشر شود (مرحلهٔ `node scripts/index-pagefind.mjs`).
- `robots.txt` و `sitemap.xml` با مبدأ `SITE_URL` ساخته می‌شوند.
- فایل `package-lock.json` را برای نصب تکرارپذیر در CI/CD (خصوصاً باندل `sharp`) در مخزن نگه دارید.
- `.env` در `.gitignore` است؛ `SITE_URL` را در تنظیمات محیطی CI بگذارید، نه در مخزن.
- خروجی بیلد شامل source map، فایل `.env` یا فایل `.ts`/`.mjs` نیست.

---

## ۱۹. عیب‌یابی

| نشانه | علت محتمل | راه‌حل |
| --- | --- | --- |
| صفحهٔ ۴۰۴ در یک زبان | اسلاگ با پیشوند زبان اشتباه | `npm run audit:i18n` — برخورد مسیر را گزارش می‌کند |
| متن‌ها خالی/انگلیسی مانده | فرهنگ کامپایل نشده | `npm run messages:compile` |
| بیلد با خطای تصویر | مسیر `image` نسبت به فایل محتوا نیست | مسیر را `./<group>.png` کنید و فایل را کنار محتوا بگذارید |
| `SITE_URL is required for a deployment build` | بیلد در CI بدون `SITE_URL` | متغیر محیطی را تنظیم کنید |
| `Duplicate route collision detected at URL` | دو ورودی یک URL | یکی از اسلاگ‌ها یا گروه‌ها را تغییر دهید |
| `Missing "<locale>" home page` | صفحهٔ خانهٔ زبان پیش‌فرض وجود ندارد | `src/content/pages/home/<locale>.mdx` بسازید |
| `Unknown locale "…" in content entry` | فایل محتوا برای زبان ثبت‌نشده | اول زبان را در `client/locales.json` (با `npm run i18n:add-lang`) اضافه کنید |
| فونت فارسی اعمال نمی‌شود | `fontFamily` در `client/locales.json` اشتباه | `var(--font-fa)` و `var(--font-ar)` را بررسی کنید |
| متن در RTL جابه‌جا می‌شود | استفاده از خواص فیزیکی | `npm run block:adapt -- --file=<file>` |
| کلید ترجمه گم شده | فرهنگ ناقص | `npm run audit:i18n` فهرست کلیدهای ناقص را می‌دهد |
| نوار پیشرفت دیده نمی‌شود | فقط روی ناوبری سمت کاربر اجرا می‌شود | با کلیک بین صفحه‌ها تست کنید؛ در بارگذاری کامل صفحه اجرا نمی‌شود |
| جستجو نتیجه نمی‌دهد | ایندکس Pagefind ساخته نشده | `npm run build` (مرحلهٔ `pagefind`) و منتشر کردن `dist/pagefind/` |
| `SITE_URL is not a valid absolute URL` | مقدار ناقص در `.env` | مقدار کامل با `https://` بدهید |
| `Unknown file extension ".astro"` در سرور توسعه | سرور توسعه قبل از `npm install` بالا آمده و `node_modules` عوض شده است | سرور را ری‌استارت کنید: `npx astro dev stop` و بعد `npx astro dev --background` |
| `Missing <locale>.mdx` در خروجی ممیزی | گروه محتوا در همهٔ زبان‌ها ترجمه نشده | هشدار است و بیلد را نمی‌شکند؛ با `npm run new:page <key> -- --update` یا `--slug:<locale>=…` تکمیلش کنید |
| اسکرول چرخ ماوس داخل مودال یا پنل کار نمی‌کند | Lenis رویداد چرخ ماوس را برای کل صفحه می‌گیرد | صفت `data-lenis-prevent` را به ظرف دارای `overflow-y-auto` اضافه کنید |
| آیتم‌های داخل `[data-trig-stagger]` هم‌زمان باز می‌شوند | کارت‌ها فرزند مستقیم یا دارای `[data-trig-stagger-item]` نیستند | کارت‌ها را فرزند مستقیم (`:scope > *`) قرار دهید یا صفت `data-trig-stagger-item` به آن‌ها بدهید |
| کارت‌ها پس از فیلتر شدن یا تعویض تب بدون انیمیشن ظاهر می‌شوند | کارت‌ها کلاس `.trig` را از قبل دارند | پیش از `refreshChronoTrig()` تابع `replayGridReveals()` را صدا بزنید |
| انیمیشن افقی در فارسی از جهت برعکس می‌آید | استفاده از `left` یا `right` | از جهت‌های منطقی `data-trig-direction="start"` و `"end"` استفاده کنید |

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

- **قواعد قراردادی** (معماری سه‌لایه `Core` / `client/` / `starter-kit/`، SSOT، دیسپچر مسیریاب، RTL، کد تولیدشده‌نشدنی)
- **نقشهٔ معماری** و مجموعهٔ فرمان‌های اعتبارسنجی
- **پلی‌بوک‌ها** برای کارهای پرتکرار (لینک ناوبری، تعویض زبان پیش‌فرض، هیرو، آیکون، صفحه‌بندی، انیمیشن‌های اسکرول و چیدمان پلکانی)
- **جدول ضدالگوهای ممنوع** — الگوهایی که هرگز نباید در کد ظاهر شوند

پیش از هر تغییری `AGENTS.md` را بخوانید؛ پس از هر تغییری
`npm run upstream:check && npm run lint && npm test && npm run audit:i18n` را اجرا کنید.

### ضدالگوها (خلاصه)

| ❌ ممنوع | ✅ درست |
| --- | --- |
| مسیر ثابت `/en/about` | `localizeHref('/about', locale)` |
| `ml-4`، `pr-6`، `text-left` | `ms-4`، `pe-6`، `text-start` |
| ویرایش دستی `src/paraglide/` یا `.paraglide-work/` | ویرایش `client/messages/<lang>.json` (یا `messages/core/`) + `messages:compile` |
| فراخوانی `m.key()` در سطح ماژول | فراخوانی داخل چرخهٔ رندر |
| ساخت `src/pages/[lang]/…` | استفاده از `[...path].astro` + `src/views/` |
| `navigate()` برای تعویض زبان | `window.location.assign(target)` |
| `<svg>` خام در قالب یا مسیر SVG دستی در کد کلاینت | افزودن نام به `client/icons.ts` + `client/ClientIcons.astro` (یا `src/libs/ui/icons.ts`) و استفاده از `<Icon>` |
| نوار پیشرفت بدون `dataset.bound` | `if (el.dataset.bound === 'true') return;` |
| تعریف دوبارهٔ `.cta` در کامپوننت | دکمهٔ متنی را با `<Button variant="…" size="…" icon="…">` بسازید |
| `<button>` دستی با `<Icon>` | `IconButton` |
| `hidden` / `display: none` یا `opacity-0` مستقیم برای انیمیشن اسکرول | صفت `data-trig` (محصور در `.js` روی GPU) |
| کارتِ غیرفرزند مستقیم بدون `data-trig-stagger-item` داخل `[data-trig-stagger]` | کارت‌ها را فرزند مستقیم ظرف (`:scope > *`) قرار دهید یا `data-trig-stagger-item` بگذارید |
| حذف دستی کلاس‌ها در فیلترها/تب‌ها | فراخوانی `replayGridReveals()` و سپس `refreshChronoTrig()` |
| `data-trig-direction="left"` / `"right"` در ستون‌های متقارن | `"start"` / `"end"` برای قرینه‌شدن خودکار در RTL |
| پنل اسکرول‌پذیر بدون `data-lenis-prevent` | افزودن `data-lenis-prevent` روی ظرف‌های `overflow-y-auto` |

---

## پیوست A — مرجع سریع فرمان‌ها

| فرمان | کار |
| --- | --- |
| `npm run dev` | کامپایل پیام‌ها + سرور توسعه |
| `npm run messages:compile` | ادغام `messages/core/` + `client/messages/` و کامپایل به `src/paraglide/` |
| `npm run check` | `astro check` |
| `npm run lint` | کامپایل پیام‌ها + astro check + tsc |
| `npm test` | تست‌های Vitest (۲۵ فایل، ۲۶۰ تست) |
| `npm run build` | بیلد تولیدی + Pagefind |
| `npm run preview` | پیش‌نمایش خروجی |
| `npm run smoke` | تست دود روی `dist/` |
| `npm run knip` | کد مرده |
| `npm run clean` | حذف `dist/`، `.astro/`، `.paraglide-work/`، `src/paraglide/` |
| `npm run assets:generate` | بازتولید آیکون‌ها، OG و artworkها |
| `npm run new:page` | ساخت/ویرایش صفحه |
| `npm run new:post` | ساخت/ویرایش مقاله |
| `npm run remove:page` | حذف صفحه |
| `npm run remove:post` | حذف مقاله |
| `npm run site:init` | راه‌اندازی سریع برند، `--blueprint` صنعتی، پالت، فونت و ایمیل تماس در `client/config.json` |
| `npm run starter:seed` | تزریق یا پاک‌سازی (`--clean`) محتوای دمو + `--blueprint` از `starter-kit/` |
| `npm run upstream:check` | بررسی قرارداد لایهٔ هسته و `client/` |
| `npm run i18n:add-lang` | افزودن زبان به `client/locales.json` |
| `npm run i18n:remove-lang` | حذف زبان |
| `npm run i18n:set-default` | تعویض زبان پیش‌فرض |
| `npm run i18n:solo` | (اختیاری) تک‌زبانه‌کردن ساختاری با بایگانی زبان‌های دیگر |
| `npm run i18n:add` | افزودن کلید ترجمه در `client/messages/*.json` |
| `npm run i18n:add-batch` | افزودن گروهی کلید |
| `npm run i18n:extract` | استخراج متن سخت‌کد |
| `npm run block:adapt` | تبدیل به خواص منطقی |
| `npm run audit:i18n` | ممیزی چندزبانه |
| `npm run verify:cli` | تست سرتاسری گردش‌کارهای CLI (۹۵ ادعا) |
| `npm run content:list` | فهرست انواع محتوا و وضعیت آن‌ها |
| `npm run content:new` | ساخت گروه در هر نوع محتوا |
| `npm run content:enable` / `content:disable` | روشن/خاموش کردن یک نوع محتوا |
| `npm run content:status` | ماتریس آمادگی گروه × زبان |
| `npm run doctor` | بررسی سلامت پروژه بدون build |
| `npm run link:check` | خزش `dist/` و گزارش لینک شکسته |
| `npx astro dev --background` | اجرای سرور توسعه در پس‌زمینه |
| `npx astro dev status` | وضعیت سرور توسعه |
| `npx astro dev logs --follow` | دنبال کردن لاگ سرور |
| `npx astro dev stop` | توقف سرور توسعه |

---

## پیوست B — کلیدهای ترجمه

۵۱۰ کلید ترجمهٔ هسته در `messages/core/en.json` (و `fa.json`) به‌علاوهٔ کلیدهای اختصاصی مشتری در `client/messages/<locale>.json` (جمع ۵۳۱ کلید ادغام‌شده؛ کلیدهای دمو مثل `nav_about` / دسته‌های نمونهٔ وبلاگ با `npm run starter:seed` افزوده می‌شوند). منبع دقیق خود فایل‌ها و `npm run audit:i18n` است:

### `block_*` (۳۱۳ کلید) و `doc_*` (۸ کلید)

- `block_*`: متن‌های بومی‌پیش‌فرض ۱۹ بلوک سکشن شرکتی/لندینگ و ۳ پریمیتیو رابط (`LandingHeroSplit`، `PricingSection`، `TestimonialGrid`، `FaqAccordion`، `ContactSplitSection` و…).
- `doc_*`: برچسب‌های مستندسازی درون‌خطی برای `ComponentDoc.astro`.

### `common_*` (۲۵ کلید)

`common_all_rights_reserved` · `common_back_home` · `common_back_to_blog` ·
`common_breadcrumbs` · `common_change_language` · `common_close` ·
`common_copied` · `common_copy_code` · `common_default_version_hint` ·
`common_get_started` · `common_go_default_version` · `common_menu` ·
`common_no_results` · `common_not_found_desc` · `common_not_found_title` ·
`common_press_esc` · `common_published_on` · `common_search_placeholder` ·
`common_search_results_count` · `common_skip_to_content` · `common_theme_dark` ·
`common_theme_light` · `common_theme_toggle` · `common_type_to_search` · `common_updated_on`

### `blog_*` (۲۱ کلید هسته + دسته‌ها و برچسب‌های دمو با `starter:seed`)

`blog_all_posts` · `blog_categories` · `blog_empty` ·
`blog_filter_by_category` · `blog_filter_by_tag` · `blog_filter_clear` ·
`blog_filter_empty` · `blog_filter_showing_all` · `blog_filter_showing_page` ·
`blog_index_description` · `blog_newer_post` · `blog_older_post` ·
`blog_pagination_label` · `blog_pagination_next` · `blog_pagination_page` ·
`blog_pagination_previous` · `blog_pagination_status` · `blog_read_time` ·
`blog_related_posts` · `blog_tags` · `blog_toc_title`

### `contact_*` (۳۱ کلید)، `newsletter_*` (۱۸ کلید)، `cookie_*` (۳۹ کلید) و `dev_theme_*` (۱۰ کلید)

- `contact_*`: برچسب‌ها، خطاهای اعتبارسنجی (شامل `contact_error_turnstile`)، موضوعات، پیام ارسال موفق و پنل‌های جایگزین (`contact_fallback_*`، `contact_unavailable_desc`).
- `newsletter_*`: تیتر، فیلد ایمیل، رضایت، وضعیت ارسال و خطاهای بنر خبرنامه (`NewsletterBanner.astro`).
- `cookie_*`: بنر و مودال مدیریت رضایت کوکی و دسته‌بندی اسکریپت‌ها (`CookieConsent.astro`).
- `dev_theme_*`: برچسب‌های پنل استودیوی زندهٔ تم در DEV (`DevThemePreview.astro`).

### `collection_*` (۸ کلید) و `projects_*` (۶ کلید)

- `collection_*`: فیلترهای دسته، فناوری (`stack`)، جستجو، شمارندهٔ بومی (`collection_showing_count`) و پیام حالت خالی فیلتر در `CollectionIndexView.astro`.
- `projects_*`: `projects_back` · `projects_client` · `projects_index_description` · `projects_stack` · `projects_visit` · `projects_year` (در کنار `content_empty`).

### `home_*` (۱۴ کلید)، `drawer_*` (۲ کلید) و `footer_*` (۶ کلید)

- `home_*`: متن‌های رابط صفحهٔ خانه (`home_badge`، `home_hero_*`، `home_highlight_{1..3}_{title,desc}`، `home_cta_*`).
- `drawer_*`: `drawer_tab_nav` · `drawer_tab_search`
- `footer_*`: `footer_col_pages` · `footer_col_resources` · `footer_col_company` · `footer_col_legal` · `footer_legal_privacy` · `footer_legal_terms`

### `nav_*` (۳ کلید پایه + کلیدهای صفحات مشتری در `client/messages/`)

در حالت پایهٔ تمیز: `nav_blog` · `nav_home` · `nav_projects` (با `new:page <key>` یا `starter:seed` کلیدهای صفحات جدید مثل `nav_about`، `nav_features`، `nav_pricing` به `client/messages/` اضافه می‌شوند).

### کلیدهای متفرقه و ICU (۶ کلید)

| کلید | نوع / placeholder |
| --- | --- |
| `site_description` | شرح اصلی وب‌سایت در هدر، فوتر و متادیتا |
| `content_empty` | حالت خالی فهرست یک نوع محتوا («هنوز چیزی منتشر نشده») |
| `pricing_recommended` | نشان پلن پیشنهادی در `PricingSection.astro` |
| `testimonials_rating_aria` | `{rating}` و `{max}` — برچسب دسترس‌پذیری امتیاز ستاره‌ای در `TestimonialGrid.astro` |
| `items_count` | ICU plural/select |
| `position_ordinal` | ICU ordinal |

> کلیدهای `items_count` و `position_ordinal` نمونهٔ زندهٔ قاعدهٔ ICU چندزبانه‌اند
> (تست `src/i18n/icu.test.ts` آن‌ها را برای همهٔ زبان‌ها بررسی می‌کند).

---

## پیوست C — مرجع API داخلی

### `client/locales.json` و `src/i18n/locales.ts`

| خروجی | کار |
| --- | --- |
| `LOCALES` | آرایهٔ زبان‌های فعال خوانده‌شده از `client/locales.json` |
| `Locale` | نوع استخراج‌شده از `LOCALES` |
| `DEFAULT_LOCALE` | زبان پیش‌فرض (بدون پیشوند) از `client/locales.json` |
| `isLocale(value)` | بررسی عضویت |
| `LOCALE_METADATA` | نگاشت زبان → `{ dir, htmlLang, name, fontFamily }` |
| `getLocaleMeta(locale)` | متادیتای یک زبان |
| `getOgLocale(locale)` | `language_TERRITORY` برای Open Graph |

### `src/i18n/format.ts`

`formatNumber` · `formatYear` · `formatDate` · `formatDateTime`

### `src/i18n/paths.ts`

`getPathname` · `withTrailingSlash` · `stripLocale` · `localizeHref` · `localeHref`

### `src/libs/config/app.ts`

`siteConfig` · `POSTS_PER_PAGE` · `HERO_TITLE_ID` · `DEFAULT_HERO_IMAGE` · `absoluteUrl` · `UI_CONFIG` · `BLOG_CONFIG` · `COOKIE_CONFIG` · `API_CONFIG` · `SOCIAL_CONFIG` · `BUSINESS_CONFIG`

> ⚠️ این ماژول در زمان import پیکربندی ادغام‌شده (`app.config.json` + `client/config.json`) را با Zod اعتبارسنجی می‌کند، پس فقط در کامپوننت‌ها، viewها، صفحه‌ها و اسکریپت‌های Node استفاده می‌شود. ماژولی که به مرورگر می‌رود باید از `src/libs/config/client.ts` بخواند (`CLIENT_COOKIE_CONFIG`) که بدون Zod می‌خواند و پیش‌فرض‌هایش را از `defaults.ts` می‌گیرد — یک تعریف مشترک با طرح‌واره، بدون تکرار مقدار.

### `src/libs/config/client.ts` و `defaults.ts`

`CLIENT_COOKIE_CONFIG` (پیکربندی امن برای مرورگر) · `COOKIE_CONFIG_DEFAULTS` (پیش‌فرض‌های مشترک طرح‌واره و کلاینت)

### `src/libs/config/theme.ts`

`THEME_PALETTES` · `FONT_PRESETS` · `RTL_FONT_PRESETS` · `resolveBrandTheme` · `renderThemeHeadStyle`

### `src/libs/api/client.ts` و `src/libs/search/*`

| فایل | خروجی‌ها |
| --- | --- |
| `api/client.ts` | `FormProvider` · `resolveFormEndpoint` · `resolveApiEndpoint` · `getInvalidContactFields` · `validateContactPayload` · `submitContactInquiry` · `validateNewsletterPayload` · `submitNewsletterSubscription` |
| `search/client.ts` | `executeSearch` · `getPagefindInstance` · `plainText` |
| `search/persian.ts` | `normalizePersianQuery` · `applyPersianZwnjCompounds` · `buildSearchQueryVariants` · `normalizeForFallbackMatch` · `matchesFallbackSearch` |

### `src/libs/config/navigation.ts` و `client/navigation.ts`

| خروجی | نوع / کاربرد |
| --- | --- |
| `CLIENT_PAGE_ITEMS` (`client/navigation.ts`) | فهرست یکتای صفحات مشتری در هدر، کشو و ستون صفحات فوتر |
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
| `service.ts` | `getBlogIndexHref` · `getBlogPageHref` · `getBlogPostHref` · `getPageUrl` · `getSiteRoutes` · `buildSiteRoutes` · `getBreadcrumbs` · `getRssFeedHref` |
| `pagination.ts` | `getPageCount` · `clampPage` · `paginate` · `buildPageWindow` · `PAGE_GAP` · `PageSlice` |
| `blog.ts` | `parseBlogFilters` · `buildBlogFilterQuery` · `matchesBlogFilters` · `filterBlogPosts` · `hasActiveFilters` · `areBlogFiltersEqual` · `toggleBlogTag` · `getReadingTime` · `collectTaxonomyKeys` · `humanizeKey` · `NO_FILTERS` |
| `taxonomy.ts` | `getCategoryLabel` · `getTagLabel` |
| `faq.ts` | `buildFaqSchema` |
| `schema.ts` | `buildOrganizationSchema` · `buildServiceSchema` · `collectSocialProfiles` |
| `og-card.ts` | `buildOgRouteKey` · `getBrandedOgHref` · `renderBrandedOgSvg` · `renderBrandedOgPng` |
| `social.ts` | `getSocialCard` · `SocialImage` |

### `src/scripts/*` (اسکرول نرم و انیمیشن‌های اسکرول)

| فایل | خروجی‌ها | کاربرد |
| --- | --- | --- |
| `lenis.ts` | `initLenis()` · `destroyLenis()` · `getLenis()` | راه‌اندازی، پاک‌سازی در View Transitions و دسترسی به نمونهٔ فعال `Lenis` |
| `chronotrig.ts` | `setupChronoTrig()` · `refreshChronoTrig()` | تایپ‌های ChronoTrig v5.2.0، علامت‌گذاری عنوان‌های `.prose` و `[data-trig-once]`، هماهنگی `astro:page-load` و `refresh()` پس از تزریق یا فیلتر پویا |

### `scripts/lib/locales.mjs`

| خروجی | کار |
| --- | --- |
| `readLocaleConfig(rootDir?)` | خواندن `client/locales.json` → `{ locales, defaultLocale, metadata }` |
| `parseLocaleConfig(source)` | تجزیهٔ متن JSON پیکربندی زبان‌ها |

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
