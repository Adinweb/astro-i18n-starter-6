# انواع محتوا (Content Types)

این پروژه سه نوع محتوا دارد: `pages` (صفحه‌های ثابت)، `blog` (نوشته‌ها) و `projects` (نمونه‌کارها). هر نوع یک مجموعه (collection) در `src/content/` است و قرارداد مشترک مسیر را رعایت می‌کند:

```text
src/content/<type>/<group>/<locale>.mdx
src/content/<type>/<group>/<group>.png   ← کاور، با ارجاع نسبی ./<group>.png در فرانتمتر
```

## ۱. منبع حقیقت

تنظیمات هسته در `app.config.json` با بازنویسی‌های پروژهٔ مشتری در `client/config.json` ادغام می‌شود و بخش `content.types` تعیین می‌کند چه چیزی ساخته شود:

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
npm run content:disable projects     # مسیرها، sitemap و لینک‌ها حذف می‌شوند
npm run content:enable projects      # برمی‌گردند
npm run content:list                 # وضعیت همهٔ نوع‌ها
```

`content:disable` فقط `content.types.<type>.enabled` را در `client/config.json` به‌صورت sparse می‌نویسد/تغییر می‌دهد (بدون دست‌زدن به `app.config.json` هسته)، و `pages` را رد می‌کند. بعد از تغییر:

```bash
npm run build && npm run smoke
```

نکته: خاموش‌کردن `blog` مسیرهای آن، لینک ناوبری و دکمهٔ «وبلاگ» در صفحهٔ خانه را حذف می‌کند، ولی اندپوینت‌های استاتیک `/api/blog-posts.json` و `/rss.xml` باقی می‌مانند تا مصرف‌کننده‌های بیرونی نشکنند. لینک‌های دستی داخل متن MDX با رجیستری هماهنگ نمی‌شوند؛ `npm run link:check` آن‌ها را پس از build پیدا می‌کند.

## ۳. دستورهای محتوا

```bash
npm run content:new <type> <slug> -- [--title="…"] [--desc="…"] [--from=<locale>] \
  [--slug:<locale>="…"] [--image=cover.png|none] [--publish]
```

- `pages` و `blog` به `new:page` و `new:post` منتقل می‌شوند (فرانتمتر و تاکسونومی مخصوص خودشان را دارند).
- برای بقیهٔ نوع‌ها، فایل هر زبان ساخته می‌شود. فقط زبان مبدأ با `--publish` منتشر می‌شود؛ بقیه عنوان `[TODO: <locale>]` و `draft: true` می‌گیرند تا محتوای ناتمام وارد سایت نشود.
- کاور Placeholder با `assets:generate` ساخته می‌شود؛ این اسکریپت فایل‌های موجود را بازنویسی نمی‌کند (برای بازتولید صریح: `--force`).
- کاور برای همهٔ مجموعه‌های تعریف‌شده تولید می‌شود، **حتی اگر نوع خاموش باشد**: ورودی ساخته‌شده به `./<group>.png` ارجاع می‌دهد و نباید با روشن‌کردن دوبارهٔ نوع، بیلد را بشکند.
- slug نامعتبر (`../blog`, `/etc`, `.`) و slug رزروشدهٔ `page` (مسیر صفحه‌بندی) قبل از هر نوشتن رد می‌شوند.

## ۴. ابزارهای بررسی

```bash
npm run doctor            # سلامت پروژه بدون build؛ با دستور رفع هر مورد
npm run doctor -- --json  # خروجی ماشین‌خوان (exit 1 فقط برای خطاها)
npm run content:status    # ماتریس آمادگی: هر گروه × هر زبان
npm run content:status -- --write=docs/STATUS.md
npm run link:check        # خزش dist/ و گزارش لینک‌ها و لنگرهای شکسته
npm run upstream:check    # بررسی قرارداد لایهٔ هسته و client/
```

`doctor` این‌ها را می‌سنجد: نسخهٔ Node در برابر `engines`، pin بودن package manager، اعتبار پیکربندی ادغام‌شده (`app.config.json` + `client/config.json`) و نوع‌های محتوا، جای‌نگهدارهای برند، `SITE_URL`، هم‌ارزی کلیدهای دیکشنری و `[TODO: …]`ها، تازگی `src/paraglide/`، فایل‌های غایب هر گروه، تصویر فرانتمتر ناموجود و نبود `dist/`.

## ۵. افزودن یک نوع محتوای تازه (بدون ویرایش هسته)

مثال: `services`. به لطف معماری لایه‌بندی‌شدهٔ `client/`، افزودن یک مجموعهٔ جدید نیازی به تغییر فایل‌های هسته (`src/content.config.ts`، `types.ts` یا `service.ts`) ندارد:

1. **مجموعه و متادیتای رابط در `client/content.ts`** — در `clientCollections` یک `defineCollection` با loader `glob` در `./src/content/services` اضافه کنید و در `CLIENT_CONTENT_TYPES.services` برچسب/توضیح/آیکون (`label`، `description`، `icon`) آن را بدهید.
2. **پیکربندی در `client/config.json`** — بلوک `content.types.services` (`enabled: true`, `base: "services"`, `index: true`, `nav: true`) را اضافه کنید.
3. **برچسب ترجمه‌شده در `client/messages/<locale>.json`** — کلید `nav_services` را در فرهنگ‌های کلاینت قرار دهید تا در ناوبری و بردکرامب استفاده شود (و در `CLIENT_CONTENT_TYPES` با `m.nav_services({}, { locale })` بخوانید).
4. **مسیرسازی خودکار** — هسته (`src/content.config.ts`، `src/libs/content/types.ts`، `src/libs/content/service.ts` و `scripts/lib/content-types.mjs`) به‌طور خودکار مجموعه، مسیرهای لیست/ورودی، sitemap، بردکرامب و ناوبری را از `client/content.ts` می‌خواند و `assets:generate` برای آن کاور می‌سازد.

سپس:

```bash
npm run content:new services web-design -- --title="Web Design" --publish
npm run assets:generate
npm run upstream:check && npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke
```

## ۶. محدودیت‌های آگاهانه و امکانات نمای عمومی

- **وبلاگ نمای اختصاصی دارد.** `BlogIndexView` و `BlogPostView` فیلتر فراصفحه‌ای (`/api/blog-posts/<locale>.json`)، تاکسونومی، فهرست مطالب، نوشته‌های مرتبط و فید را در خود دارند. نوع‌های دیگر از `CollectionIndexView` و `CollectionEntryView` استفاده می‌کنند که علاوه بر قرارداد مشترک ورودی، دارای **فیلتر تعاملی سمت کلاینت** (دسته‌بندی، فناوری‌های `stack` و جستجوی متنی همراه با شمارندهٔ بومی `formatNumber` و بازپخش انیمیشن ChronoTrig) و اسکیمای JSON-LD (`CreativeWork` + `BreadcrumbList`) هستند.
- **schemaها ایستا هستند.** Astro مجموعه‌ها را در زمان build می‌خواهد، پس افزودن نوع تازه مستلزم ثبت آن در `client/content.ts` است (و برای ویرایش بصری در Git می‌توانید همان کالکشن را به `.pages.yml` هم اضافه کنید)؛ فعال/غیرفعال کردن اما فقط یک خط در `client/config.json` است.
- **`pages` خاموش‌شدنی نیست** چون مالک صفحهٔ خانه و ریشهٔ سایت است.
- **بلوپرینت‌های آماده هنگام شروع پروژه:** هنگام تزریق دمو با `npm run starter:seed -- --blueprint=<corporate|agency|portfolio|medical>` یا راه‌اندازی اولیه با `site:init --blueprint=...`، فعال/غیرفعال بودن `blog` و `projects` متناسب با نوع کسب‌وکار مشتری تنظیم می‌شود.

## ۷. تأیید

`npm run verify:cli` (۹۵ ادعا) گردش‌کارهای CLI را در یک مخزن موقت می‌آزماید: فهرست نوع‌ها، خاموش/روشن کردن در `client/config.json`، رد شدن خاموش‌کردن `pages`، ساخت گروه در `projects` (انتشار فقط زبان مبدأ) و در نوع خاموش (تولید کاور)، رد شدن slug فرار، واگذاری `pages`/`blog` به فرمان‌های خودشان، خروجی JSON `doctor` و `content:status`، اینکه `link:check` لینک و لنگر (`#section`) شکسته را می‌گیرد ولی مسیرهای بدون اسلش پایانی، بدون پسوند و لنگرهای موجود را می‌پذیرد، و گردش‌کارهای `--preset=landing`، `site:init`، `starter:seed`، `upstream:check` و `i18n:solo`.

> نمای فهرست و نمای ورودی هر دو بردکرامب زبان‌مقصد را نشان می‌دهند («خانه → پروژه‌ها → داشبورد …»)، با همان `BreadcrumbList` که در JSON-LD اعلام می‌شود؛ فهرست خالی هم پیام `content_empty` و حالت بدون نتیجهٔ فیلتر پیام `collection_filter_empty` را نشان می‌دهد.
