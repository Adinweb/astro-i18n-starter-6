# انواع محتوا و مجموعه‌های اعلان‌محور (Declarative Content Types)

این پروژه علاوه بر سه مجموعهٔ پیش‌فرض `pages` (صفحه‌های ثابت)، `blog` (نوشته‌ها) و `projects` (نمونه‌کارها)، امکان تعریف **انواع محتوای سفارشی (مانند `gallery`، `products`، `services` و …)** را به‌صورت کاملاً اعلان‌محور در فایل پیکربندی (`client/config.json`) و CMS دارد؛ به‌طوری که اسکیمای Astro Zod، فرم ویرایش `.pages.yml` و **فرم فیلتر و جستجوی کامپوننت `<CollectionBrowser />`** به‌طور خودکار از روی همان تعریف ساخته می‌شوند.

همهٔ مجموعه‌ها قرارداد مشترک پوشه‌ای را رعایت می‌کنند:

```text
src/content/<type>/<group>/<locale>.mdx
src/content/<type>/<group>/<group>.png   ← کاور، با ارجاع نسبی ./<group>.png در فرانتمتر
```

---

## ۱. منبع حقیقت و پیکربندی پیشرفتهٔ `content.types`

تنظیمات هسته در `app.config.json` با بازنویسی‌های پروژهٔ مشتری در `client/config.json` و تنظیمات غیرفنی `client/cms.json` ادغام می‌شود و بخش `content.types` علاوه بر مسیریابی، فیلدهای فرانت‌متر، فیلترها، جستجو و ظاهر کارت‌ها را نیز تعریف می‌کند:

```json
"content": {
  "types": {
    "pages":    { "enabled": true, "base": "",         "index": false, "paginated": false, "feed": false, "nav": true },
    "blog":     { "enabled": true, "base": "blog",     "index": true,  "paginated": true,  "feed": true,  "nav": true },
    "projects": { "enabled": true, "base": "projects", "index": true,  "paginated": false, "feed": false, "nav": true }
  }
}
```

### فیلدهای سطح کلکشن

| فیلد | معنا |
| :--- | :--- |
| `enabled` | اگر `false` باشد، هیچ مسیر، ورودی sitemap یا لینک ناوبری‌ای ساخته نمی‌شود. فایل‌های محتوا دست‌نخورده می‌مانند. |
| `base` | بخش اول مسیر (`/projects/`). `pages` همیشه ریشه است و مقدار `""` می‌گیرد. |
| `index` | آیا صفحهٔ فهرست عمومی برای این مجموعه ساخته شود. |
| `paginated` | آیا فهرست به `/<base>/page/<n>/` تقسیم شود (مثل وبلاگ). |
| `perPage` | تعداد کارت در هر صفحه (در صورت `paginated: true`، مقدار پیش‌فرض را از `blog.postsPerPage` بازنویسی می‌کند). |
| `feed` | آیا فید Atom مخصوص این نوع ساخته شود. |
| `nav` | آیا در هدر، دراور و فوتر لینک بگیرد. |
| `icon` | نام آیکون Tabler (اختیاری، مثلاً `"photo"` یا `"briefcase"`). |
| `labels` / `descriptions` | عنوان و توضیح چندزبانه (`{ "en": "Gallery", "fa": "گالری" }`). در صورت نبودن، از کلیدهای `nav_<key>` و `<key>_index_description` در Paraglide خوانده می‌شود. |
| `sortBy` / `sortOrder` | مرتب‌سازی پیش‌فرض ورودی‌ها (مثلاً `"year"`, `"publishedAt"`, `"title"`, یا هر فیلد سفارشی) به همراه `"asc"` یا `"desc"`. |
| `fields` | آرایهٔ فیلدهای فرانت‌متر + تنظیمات اسکیما، CMS و فیلتر خودکار (بخش ۲). |
| `search` | `{ "enabled": true, "placeholder": { "fa": "جستجو..." }, "fields": ["title", "description", ...] }`. |
| `card` | ظاهر کارت‌ها در فهرست و `<CollectionBrowser />`: `{ "layout": "grid" \| "gallery" \| "compact", "aspectRatio": "video" \| "square" \| "portrait" \| "auto", "badgeField": "...", "badgeLimit": 3, "metaFields": ["..."] }`. |

اعتبارسنجی در `src/libs/config/app.ts` و `src/libs/content/types.ts` انجام می‌شود: `base` تکراری/خالی/رزروشده (`page`, `api`, `rss`, `pagefind`, پیشوند زبان‌ها…)، فیلد `enum` بدون `options`، یا نام پارامتر فیلتر (`filter.param`) تکراری در یک مجموعه باعث خطای صریح در build می‌شود. اسکریپت‌های Node نیز همان منبع را از `scripts/lib/config.mjs` و `scripts/lib/content-types.mjs` می‌خوانند.

---

## ۲. تعریف خودکار فیلدها و فیلترها (`fields[]`)

هر عضو آرایهٔ `fields` هم‌زمان چهار کار را انجام می‌دهد:
1. ساخت خودکار اسکیمای Astro Zod (`src/libs/content/zod-schema.ts` -> `src/content.config.ts`)
2. ساخت فیلد متناظر در `.pages.yml` هنگام اجرای `npm run content:sync`
3. ساخت خودکار کنترل فیلتر در `<CollectionBrowser />` و `CollectionIndexView.astro`
4. نمایش متادیتا روی کارت و صفحهٔ تکی ورودی (`CollectionEntryView.astro`)

### انواع فیلد پشتیبانی‌شده (`type`)
- `'string'` · `'text'` · `'number'` (`min` / `max`) · `'boolean'` · `'date'` · `'url'` · `'image'`
- `'enum'` (نیازمند `options: [...]` + اختیاری `optionLabels` چندزبانه)
- `'string[]'` (لیست رشته‌ها مانند تگ‌ها یا پشتهٔ فنی `stack`)
- `'taxonomy[]'` (دسته/برچسب ASCII hyphenated استاندارد مانند `categories`)

### گزینهٔ `filter` و ۵ حالت فیلتر خودکار
اگر برای یک فیلد شیء `filter` تعریف کنید، کنترل فیلتر متناظر به‌صورت خودکار ساخته و به پارامتر URL (`?param=...`) متصل می‌شود:

| `filter.mode` | رابط کاربری تولیدشده | مثال پارامتر URL |
| :--- | :--- | :--- |
| `'single'` | دکمه‌های چیپ تک‌انتخابی + گزینهٔ «همه» | `?medium=editorial` |
| `'multi'` | دکمه‌های چیپ چندانتخابی با منطق `AND` | `?stack=astro,tailwind` |
| `'select'` | منوی بازشو (`<select>`) دسترس‌پذیر | `?city=tehran` |
| `'toggle'` | کلید روشن/خاموش برای فیلدهای `boolean` | `?featured=true` |
| `'range'` | فیلدهای عددی `حداقل` و `حداکثر` | `?year_min=2024&year_max=2026` |

سایر تنظیمات فیلد:
- `required`, `default`, `searchable` (تعیین حضور فیلد در جستجوی متنی)، `showOnCard` (`true | false | 'badge' | 'meta' | 'subtitle'`)، `showOnEntry` (پیش‌فرض `true`) و `cms: false` (حذف از `.pages.yml`).
- `filter`: `enabled`, `param` (در هر مجموعه باید یکتا باشد)، `label` / `labels`, `allLabel` (`{ "fa": "همه موارد" }`) و `sort` (`'alpha' | 'count' | 'config'`).

---

## ۳. استفاده از کامپوننت `<CollectionBrowser />`

کامپوننت `src/components/CollectionBrowser.astro` شناسهٔ هر مجموعه (`collection`) را می‌گیرد و فرم فیلتر، جستجوی سازگار با فارسی/عربی (حذف/نرمال‌سازی نیم‌فاصله و حروف عربی)، گرید کارت‌ها، شمارندهٔ بومی (`formatNumber`)، صفحه‌بندی و بازپخش انیمیشن ChronoTrig (`replayStaggerGrid`) را به‌طور خودکار رندر می‌کند.

نمای فهرست هر مجموعه (`CollectionIndexView.astro`) به‌طور پیش‌فرض از همین کامپوننت استفاده می‌کند؛ اما شما می‌توانید آن را مستقیماً درون هر صفحهٔ دلخواه (`.mdx` یا `.astro`) نیز جاسازی کنید:

```astro
---
import CollectionBrowser from '@/components/CollectionBrowser.astro';
---

<CollectionBrowser
  collection="gallery"
  columns={3}
  syncUrl={false}
  contained
/>
```

### پراپ‌های `<CollectionBrowser />`

| پراپ | نوع / پیش‌فرض | کاربرد |
| :--- | :--- | :--- |
| `collection` | `ContentTypeKey` *(اجباری)* | شناسهٔ مجموعهٔ تعریف‌شده در `content.types` (`blog`, `projects`, `gallery`, …) |
| `locale` | خودکار از URL | زبان رندر |
| `columns` | `2 \| 3 \| 4` | تعداد ستون‌های گرید کارت |
| `showSearch` | از `typeConfig.search.enabled` | نمایش یا پنهان کردن باکس جستجو |
| `showFilters` | `true` | نمایش یا پنهان کردن نوار فیلترهای خودکار |
| `showPagination` | `true` | نمایش صفحه‌بندی استاتیک/کلاینتی |
| `perPage` | از کانفیگ | تعداد آیتم در هر صفحه |
| `syncUrl` | `true` | همگام‌سازی پارامترهای فیلتر با نوار آدرس مرورگر (برای جاسازی در لندینگ‌ها می‌توانید `false` بگذارید) |
| `contained` | `false` | پیچیدن داخل `.layout-container` در صفحه‌های `canvas` |

در فهرست‌های چندصفحه‌ای، کاتالوگ JSON استاتیک از مسیر `/api/collections/<type>/<locale>.json` خوانده می‌شود تا فیلتر و جستجو روی **همهٔ صفحات مجموعه** بدون هیچ سرور بک‌اند کار کند و تصاویر بهینهٔ Astro WebP نیز حفظ شوند.

---

## ۴. مثال عملی: افزودن گالری (`gallery`) بدون تغییر فایل‌های هسته

در `client/config.json` مجموعهٔ `gallery` را تعریف کنید:

```json
{
  "content": {
    "types": {
      "gallery": {
        "enabled": true,
        "base": "gallery",
        "index": true,
        "paginated": true,
        "perPage": 9,
        "nav": true,
        "icon": "photo",
        "labels": { "en": "Gallery", "fa": "گالری" },
        "descriptions": { "en": "Curated project visuals.", "fa": "مجموعه آثار تصویری" },
        "sortBy": "year",
        "sortOrder": "desc",
        "card": { "layout": "gallery", "aspectRatio": "square", "badgeLimit": 2 },
        "search": { "enabled": true, "placeholder": { "en": "Search works...", "fa": "جستجو در آثار..." } },
        "fields": [
          {
            "name": "medium",
            "type": "enum",
            "options": ["editorial", "branding", "3d"],
            "optionLabels": {
              "editorial": { "en": "Editorial", "fa": "سرمقاله و نشر" },
              "branding": { "en": "Branding", "fa": "هویت بصری" },
              "3d": { "en": "3D Art", "fa": "سه‌بعدی" }
            },
            "required": true,
            "default": "branding",
            "labels": { "en": "Medium", "fa": "سبک" },
            "showOnCard": "badge",
            "filter": { "enabled": true, "mode": "single", "param": "medium", "sort": "config" }
          },
          {
            "name": "year",
            "type": "number",
            "min": 2000,
            "max": 2035,
            "labels": { "en": "Year", "fa": "سال" },
            "showOnCard": "meta",
            "filter": { "enabled": true, "mode": "range", "param": "year" }
          },
          {
            "name": "featured",
            "type": "boolean",
            "default": false,
            "labels": { "en": "Featured only", "fa": "فقط آثار برگزیده" },
            "filter": { "enabled": true, "mode": "toggle", "param": "featured" }
          }
        ]
      }
    }
  }
}
```

سپس همگام‌سازی و ساخت نمونهٔ اول را اجرا کنید:

```bash
npm run content:sync
npm run content:new gallery brand-shot -- --title="Brand Shoot" --publish
npm run assets:generate
npm run upstream:check && npm run doctor && npm run lint && npm test && npm run audit:i18n && npm run build && npm run smoke && npm run link:check
```

- دستور `content:sync` به‌طور خودکار مجموعهٔ جدید و فیلدهایش را به `.pages.yml` اضافه می‌کند و پوشهٔ `src/content/gallery/` را آماده می‌سازد.
- دستور `content:new` مقادیر `default` و فیلدهای `required` تعریف‌شده در `fields[]` را در فرانت‌متر فایل‌های `.mdx` قرار می‌دهد.
- (تنها اگر نیاز به فیلدهای Zod بسیار خاص یا منطق محاسباتی سفارشی داشتید، می‌توانید همچنان از `client/content.ts` -> `clientCollections` استفاده کنید.)

---

## ۵. فعال/غیرفعال کردن، همگام‌سازی و دستورهای بررسی

```bash
npm run content:list                 # وضعیت، مسیر، و تعداد ورودی‌های هر مجموعه
npm run content:sync                 # همگام‌سازی .pages.yml و پوشه‌های محتوا با content.types
npm run content:sync -- --check      # بررسی عدم ناهماهنگی در CI و پیش از تحویل
npm run content:disable gallery      # غیرفعال‌سازی در client/config.json بدون حذف فایل‌ها
npm run content:enable gallery       # فعال‌سازی مجدد
npm run content:status               # ماتریس آمادگی هر گروه × هر زبان
npm run doctor                       # بررسی سلامت پیکربندی، کلیدها، تصاویر و مسیرها
npm run link:check                   # بررسی تمام لینک‌های داخلی و #لنگرها در dist/
npm run upstream:check               # بررسی رعایت مرزبندی لایهٔ هسته و client/
```

---

## ۶. محدودیت‌های آگاهانه و نکات مهم

- **وبلاگ نمای اختصاصی خود را حفظ می‌کند:** `BlogIndexView` و `BlogPostView` همچنان تاکسونومی، فهرست مطالب (TOC)، نوشته‌های مرتبط و فید Atom دارند؛ ضمن اینکه امکان افزودن فیلدهای تکمیلی روی `content.types.blog.fields` یا نمایش وبلاگ درون `<CollectionBrowser collection="blog" />` نیز فراهم است.
- **`pages` خاموش‌شدنی نیست** چون مالک صفحهٔ خانه و ریشهٔ سایت است.
- **ساخت کاور در وضعیت خاموش:** `content:new` و `assets:generate` کاور `./<group>.png` را حتی برای نوع‌های خاموش می‌سازند تا فعال‌کردن مجدد آن‌ها بیلد را نشکند.
- **تطابق دیکشنری در `audit:i18n`:** کلیدهای پویا مثل `nav_<type>`، `<type>_index_description`، `<type>_field_<field>`، `<type>_filter_<field>_all` و `<type>_option_<field>_<val>` اگر در `client/messages/<locale>.json` قرار بگیرند به‌طور خودکار توسط `npm run audit:i18n` به رسمیت شناخته می‌شوند (و برای دسترسی سریع می‌توان برچسب‌ها را مستقیم در `labels` / `optionLabels` داخل `client/config.json` نوشت).
- **تأیید خودکار (`verify:cli` و تست‌های واحد):** مجموعهٔ تست شامل `schema-config.test.ts`، `collection-filters.test.ts`، `content-types.test.ts` و `app.test.ts` است و اعتبار پارامترهای فیلتر یکتا، فیلدهای `enum`، رندر `<CollectionBrowser />` و جریان‌های CLI را تضمین می‌کند.
