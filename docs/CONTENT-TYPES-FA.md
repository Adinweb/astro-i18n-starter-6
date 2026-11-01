# انواع محتوا (Content Types)

این پروژه سه نوع محتوا دارد: `pages` (صفحه‌های ثابت)، `blog` (نوشته‌ها) و `projects` (نمونه‌کارها). هر نوع یک مجموعه (collection) در `src/content/` است و قرارداد مشترک مسیر را رعایت می‌کند:

```text
src/content/<type>/<group>/<locale>.mdx
src/content/<type>/<group>/<group>.png   ← کاور، با ارجاع نسبی ./<group>.png در فرانتمتر
```

## ۱. منبع حقیقت

`app.config.json` → `content.types` تعیین می‌کند چه چیزی ساخته شود:

```json
"content": {
  "types": {
    "pages":    { "enabled": true, "base": "",         "index": false, "paginated": false, "feed": false, "nav": true },
    "blog":     { "enabled": true, "base": "blog",     "index": true,  "paginated": true,  "feed": true,  "nav": true },
    "projects": { "enabled": true, "base": "projects", "index": true,  "paginated": false, "feed": false, "nav": true }
  }
}
```

| فیلد | معنا |
| :--- | :--- |
| `enabled` | اگر `false` باشد، هیچ مسیر، ورودی sitemap یا لینک ناوبری‌ای برای این نوع ساخته نمی‌شود. فایل‌های محتوا دست‌نخورده می‌مانند. |
| `base` | بخش اول مسیر (`/projects/`). `pages` همیشه ریشه است و نمی‌تواند مقدار بگیرد. |
| `index` | آیا این نوع صفحهٔ فهرست دارد. |
| `paginated` | آیا فهرست به `/base/page/<n>/` تقسیم شود (مثل وبلاگ). |
| `feed` | آیا فید Atom مخصوص این نوع ساخته شود. |
| `nav` | آیا در هدر، دراور و فوتر لینک بگیرد. |

اعتبارسنجی در `src/libs/content/types.ts` انجام می‌شود: `base` تکراری، خالی، یا رزروشده (`page`, `api`, `rss`, `pagefind`, پیشوند زبان‌ها…) باعث خطای صریح در build می‌شود. اسکریپت‌های Node همان بلوک را از `scripts/lib/content-types.mjs` می‌خوانند، بنابراین CLI و build هرگز دو فهرست متفاوت ندارند.

## ۲. فعال و غیرفعال کردن

```bash
pnpm run content:disable projects     # مسیرها، sitemap و لینک‌ها حذف می‌شوند
pnpm run content:enable projects      # برمی‌گردند
pnpm run content:list                 # وضعیت همهٔ نوع‌ها
```

`content:disable` فقط `enabled` را در `app.config.json` عوض می‌کند (با حفظ قالب و EOL فایل)، و `pages` را رد می‌کند. بعد از تغییر:

```bash
pnpm run build && pnpm run smoke
```

نکته: خاموش‌کردن `blog` مسیرهای آن، لینک ناوبری و دکمهٔ «وبلاگ» در صفحهٔ خانه را حذف می‌کند، ولی اندپوینت‌های استاتیک `/api/blog-posts.json` و `/rss.xml` باقی می‌مانند تا مصرف‌کننده‌های بیرونی نشکنند. لینک‌های دستی داخل متن MDX با رجیستری هماهنگ نمی‌شوند؛ `pnpm run link:check` آن‌ها را پس از build پیدا می‌کند.

## ۳. دستورهای محتوا

```bash
pnpm run content:new <type> <slug> [--title="…"] [--desc="…"] [--from=<locale>] \
  [--slug:<locale>="…"] [--image=cover.png|none] [--publish]
```

- `pages` و `blog` به `new:page` و `new:post` منتقل می‌شوند (فرانتمتر و تاکسونومی مخصوص خودشان را دارند).
- برای بقیهٔ نوع‌ها، فایل هر زبان ساخته می‌شود. فقط زبان مبدأ با `--publish` منتشر می‌شود؛ بقیه عنوان `[TODO: <locale>]` و `draft: true` می‌گیرند تا محتوای ناتمام وارد سایت نشود.
- کاور Placeholder با `assets:generate` ساخته می‌شود؛ این اسکریپت فایل‌های موجود را بازنویسی نمی‌کند (برای بازتولید صریح: `--force`).
- کاور برای همهٔ مجموعه‌های تعریف‌شده تولید می‌شود، **حتی اگر نوع خاموش باشد**: ورودی ساخته‌شده به `./<group>.png` ارجاع می‌دهد و نباید با روشن‌کردن دوبارهٔ نوع، بیلد را بشکند.
- slug نامعتبر (`../blog`, `/etc`, `.`) و slug رزروشدهٔ `page` (مسیر صفحه‌بندی) قبل از هر نوشتن رد می‌شوند.

## ۴. ابزارهای بررسی

```bash
pnpm run doctor            # سلامت پروژه بدون build؛ با دستور رفع هر مورد
pnpm run doctor -- --json  # خروجی ماشین‌خوان (exit 1 فقط برای خطاها)
pnpm run content:status    # ماتریس آمادگی: هر گروه × هر زبان
pnpm run content:status -- --write=docs/STATUS.md
pnpm run link:check        # خزش dist/ و گزارش لینک‌های داخلی شکسته
```

`doctor` این‌ها را می‌سنجد: نسخهٔ Node در برابر `engines`، pin بودن package manager، اعتبار `app.config.json` و نوع‌های محتوا، جای‌نگهدارهای برند، `SITE_URL`، هم‌ارزی کلیدهای دیکشنری و `[TODO: …]`ها، تازگی `src/paraglide/`، فایل‌های غایب هر گروه، تصویر فرانتمتر ناموجود و نبود `dist/`.

## ۵. افزودن یک نوع محتوای تازه

مثال: `services`.

1. **مجموعه و schema** — در `src/content.config.ts` یک `defineCollection` با `baseSchema` اضافه کنید (slug اجباری، فیلدهای اختصاصی خودش).
2. **کلید رجیستری** — `CONTENT_TYPE_KEYS` در `src/libs/content/types.ts` و `KNOWN_TYPES` در `scripts/lib/content-types.mjs` را به‌روز کنید.
3. **پیکربندی** — بلوک `content.types.services` را در `app.config.json` اضافه کنید.
4. **برچسب ترجمه‌شده** — کلید `nav_services` را در همهٔ `messages/<locale>.json`ها بگذارید و در `getContentTypeLabel`/`getContentTypeDescription` یک `case` اضافه کنید.
5. **بارگذاری و مسیر** — در `src/libs/content/service.ts`، `loadExtraEntries` و اتحاد نوع `SiteRouteProps` (`CollectionEntry<'services'>`) را گسترش دهید. مسیرها، sitemap، بردکرامب و ناوبری خودکار از رجیستری تغذیه می‌شوند.
6. **آرتورک (اختیاری)** — در `scripts/generate-assets.mjs` یک ردیف رنگ به `TYPE_HUES` اضافه کنید.

سپس:

```bash
pnpm run content:new services web-design --title="Web Design" --publish
pnpm run assets:generate
pnpm run lint && pnpm test && pnpm run audit:i18n && pnpm run build && pnpm run smoke
```

## ۶. محدودیت‌های آگاهانه

- **وبلاگ نمای اختصاصی دارد.** `BlogIndexView` و `BlogPostView` فیلتر، تاکسونومی، فهرست مطالب، نوشته‌های مرتبط و فید را در خود دارند. نوع‌های دیگر از `CollectionIndexView` و `CollectionEntryView` استفاده می‌کنند که فقط قرارداد مشترک ورودی را می‌شناسند. ادغام این دو، پیچیدگی وبلاگ را به همهٔ نوع‌ها تحمیل می‌کند.
- **schemaها ایستا هستند.** Astro مجموعه‌ها را در زمان build می‌خواهد، پس افزودن نوع تازه یک تغییر کد است؛ فعال/غیرفعال کردن اما فقط یک خط در `app.config.json` است.
- **`pages` خاموش‌شدنی نیست** چون مالک صفحهٔ خانه و ریشهٔ سایت است.

## ۷. تأیید

`pnpm run verify:cli` (۸۲ ادعا) بخش‌های ۸ و ۹ را به این‌ها اختصاص می‌دهد: فهرست نوع‌ها، خاموش/روشن کردن، رد شدن خاموش‌کردن `pages`، ساخت گروه در `projects` (انتشار فقط زبان مبدأ) و در نوع خاموش (تولید کاور)، رد شدن slug فرار، واگذاری `pages`/`blog` به فرمان‌های خودشان، خروجی JSON `doctor` و `content:status`، و اینکه `link:check` لینک شکسته را می‌گیرد ولی مسیرهای بدون اسلش پایانی و بدون پسوند را می‌پذیرد.

> نمای فهرست و نمای ورودی هر دو بردکرامب زبان‌مقصد را نشان می‌دهند («خانه → پروژه‌ها → داشبورد …»)، با همان `BreadcrumbList` که در JSON-LD اعلام می‌شود؛ فهرست خالی هم پیام `content_empty` را نشان می‌دهد.
