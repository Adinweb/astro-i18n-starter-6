# ساخت صفحهٔ اصلی سفارشی برای مشتری — راهنمای گام‌به‌گام

> سناریو: این تمپلیت را کلون کرده‌اید و می‌خواهید سایت یک مشتری را روی آن بسازید.
> صفحهٔ اصلی (`/`) تقریباً همیشه تنها صفحه‌ای است که طراحی اختصاصی می‌خواهد؛ این راهنما
> فقط همان را پوشش می‌دهد: از صفر تا صفحه‌ای که در دو زبان، RTL و LTR، درست رندر شود و
> تست‌های پروژه را پاس کند.
>
> مرجع کامل سایر بخش‌ها: [GUIDE-FA.md](GUIDE-FA.md) — قواعد عامل‌های هوش مصنوعی: [AGENTS.md](../AGENTS.md)

---

## فهرست

1. [انتخاب مسیر: سه راه برای ساخت خانه](#۱-انتخاب-مسیر-سه-راه-برای-ساخت-خانه)
2. [آماده‌سازی پروژه](#۲-آمادهسازی-پروژه)
3. [صفحهٔ اصلی کجاست و فرانت‌متر آن چه معنایی دارد](#۳-صفحهٔ-اصلی-کجاست-و-فرانتمتر-آن-چه-معنایی-دارد)
4. [مسیر A — متن و عکس را عوض کنید، هیرو بماند](#۴-مسیر-a--متن-و-عکس-را-عوض-کنید-هیرو-بماند)
5. [مسیر B — کل صفحه در MDX، بدون کد Astro جدید](#۵-مسیر-b--کل-صفحه-در-mdx-بدون-کد-astro-جدید)
6. [مسیر C — قالب اختصاصی Astro (پیشنهادی برای مشتری)](#۶-مسیر-c--قالب-اختصاصی-astro-پیشنهادی-برای-مشتری)
7. [بلوک‌های آماده برای کپی](#۷-بلوکهای-آماده-برای-کپی)
8. [تصاویر](#۸-تصاویر)
9. [لینک‌ها و ناوبری](#۹-لینکها-و-ناوبری)
10. [دو زبانه کردن صفحه](#۱۰-دو-زبانه-کردن-صفحه)
11. [SEO و دسترس‌پذیری](#۱۱-seo-و-دسترسپذیری)
12. [چک‌لیست تأیید قبل از تحویل](#۱۲-چکلیست-تأیید-قبل-از-تحویل)
13. [تحویل به مشتری](#۱۳-تحویل-به-مشتری)
14. [خطاهای رایج](#۱۴-خطاهای-رایج)

---

## ۱. انتخاب مسیر: سه راه برای ساخت خانه

صفحهٔ اصلی از سه راه ساخته می‌شود و هر سه با یک URL (`/` و `/fa/`) تمام می‌شوند.
اول مسیر را انتخاب کنید؛ بقیهٔ گام‌ها مشترک است.

| مسیر | چه زمانی | چه چیزی را ویرایش می‌کنید | سختی |
| --- | --- | --- | --- |
| **A — هیرو آماده** | مشتری طراحی اختصاصی نمی‌خواهد؛ فقط متن، عکس و بخش‌ها عوض می‌شوند | `src/content/pages/home/<locale>.mdx` | ★ |
| **B — خانهٔ تمام‌MDX** | طراحی متفاوت است ولی نمی‌خواهید کامپوننت Astro بنویسید | همان فایل MDX + چند کلاس Tailwind | ★★ |
| **C — قالب اختصاصی Astro** | طراحی کاملاً سفارشی، چند بخش تکرارشونده، کد قابل نگهداری برای تیم | `src/views/pages/…astro` + MDX فقط برای متن | ★★★ |

> برای یک پروژهٔ واقعی مشتری **C** را انتخاب کنید: طراحی در یک فایل `.astro` می‌ماند،
> متن هر زبان در MDX خودش، و بازبینی/تغییر بعدی ساده است. اگر فقط یک لندینگ ساده
> می‌خواهید، **B** سریع‌ترین گزینه است.

---

## ۲. آماده‌سازی پروژه

### ۲.۱ نصب و اجرا

```bash
pnpm install                      # lockfile موجود است؛ از --frozen-lockfile هم می‌توانید استفاده کنید
cp .env.example .env              # سپس SITE_URL را با دامنهٔ نهایی پر کنید
pnpm dev                          # http://localhost:3000  (نه ۴۳۲۱)
```

`SITE_URL` تعیین‌کنندهٔ canonical، `hreflang`، OG، sitemap و RSS است. اگر خالی بماند
بیلد روی `http://localhost:3000` ساخته می‌شود و در محیط انتشار با گارد
`ASTRO_REQUIRE_SITE_URL` جلوی انتشار آدرس اشتباه گرفته می‌شود.

### ۲.۲ هویت برند (قبل از طراحی صفحه)

| چه چیزی | کجا |
| --- | --- |
| نام، توضیح، author، تصویر اجتماعی | [app.config.json](../app.config.json) → `site` |
| لوگو/فاوآیکون/PWA | `public/` + `brand` در همان فایل، سپس `pnpm run assets:generate` |
| رنگ اصلی و نقش‌های معنایی | [src/styles/global.css](../src/styles/global.css) → توکن‌های OKLCH |
| فونت هر زبان | [src/i18n/locales.ts](../src/i18n/locales.ts) → `font` در `LOCALE_METADATA` |
| متن دکمه‌ها و ناوبری | `messages/en.json` و `messages/fa.json` (هرگز در قالب هاردکد نشود) |

هیچ رنگ hex داخل کامپوننت ننویسید؛ از `primary`، `accent`، `surface`، `muted`، `border`
و معادل‌های `-fg` استفاده کنید تا دارک‌مود و RTL هم درست بمانند.

### ۲.۳ پاک‌سازی محتوای دمو

سایت مشتری نباید مقاله‌ها و صفحات نمونه را داشته باشد:

```bash
ls src/content/blog                    # گروه‌های مقالهٔ نمونه
pnpm run remove:post <group-slug> --force
pnpm run remove:page pricing --force   # اگر صفحهٔ قیمت‌گذاری لازم نیست
```

این اسکریپت‌ها پوشهٔ محتوا و کلید ناوبری `nav_<key>` را پاک می‌کنند و Paraglide را
دوباره کامپایل می‌کنند. بعد از حذف، آیتم‌های مربوطه را از
[src/libs/config/navigation.ts](../src/libs/config/navigation.ts) (`PAGE_ITEMS` و اسلات‌های
هدر/فوتر) هم بردارید.

به‌روزرسانی عنوان و توضیح صفحهٔ خانه در همهٔ زبان‌ها، بدون دست‌زدن به بدنهٔ متن:

```bash
pnpm run new:page home --update \
  --title:en="Acme Studio" --desc:en="Brand, web and product design for growing teams." \
  --title:fa="استودیو آکمی" --desc:fa="طراحی برند، وب و محصول برای تیم‌های در حال رشد."
```

---

## ۳. صفحهٔ اصلی کجاست و فرانت‌متر آن چه معنایی دارد

صفحهٔ اصلی یک ورودی معمولی از مجموعهٔ `pages` است:

```text
src/content/pages/home/
├── en.mdx     →  /
├── fa.mdx     →  /fa/
└── home.png   →  تصویر هیرو/OG (همان‌جا کنار محتوا)
```

مسیر `/` از `slug: ""` می‌آید و **فقط برای صفحهٔ خانه مجاز است**. آن را عوض نکنید، وگرنه
خانه جابه‌جا می‌شود و `/` به ۴۰۴ می‌خورد.

فرانت‌متر و معنای هر کلید:

| کلید | مقدارهای مجاز | پیش‌فرض | اثر |
| --- | --- | --- | --- |
| `title` | متن | — | `<h1>` (در حالت‌های آماده)، `<title>`، OG |
| `slug` | رشته (برای خانه: خالی) | `""` در خانه | مسیر نهایی |
| `description` | متن | — | توضیح متا و زیرعنوان هیرو |
| `image` | `./home.png` | — | پس‌زمینهٔ هیرو آمتوسفریک + تصویر OG |
| `hero` | `none` \| `minimal` \| `default` | `none` | نوع هدر صفحه |
| `container` | `canvas` \| `contained` \| `prose` | `canvas` | عرض بدنه |
| `flushTop` | `true` \| `false` | `false` | حذف فاصلهٔ بالای `<main>` برای هیروی full-bleed |
| `template` | `home` \| … | — | واگذاری کل صفحه به یک قالب `.astro` |
| `draft` | `true` \| `false` | `false` | حذف از بیلد و مسیرها |

سه ترکیب پرکاربرد:

```yaml
# ۱) هیروی آماده با عکس، بدنهٔ عریض
hero: "default"
container: "contained"

# ۲) هدر تایپوگرافیک ساده، بدنهٔ مقاله‌ای
hero: "minimal"
container: "prose"

# ۳) کنترل کامل: خودتان هیرو و بخش‌ها را می‌سازید (مسیر B)
hero: "none"
container: "canvas"
flushTop: true
```

> ⚠️ هرگز `layout` را در فرانت‌متر MDX ننویسید؛ این کلید رزرو `@astrojs/mdx` است و
> بیلد را می‌شکند. معادل آن `container` است.

---

## ۴. مسیر A — متن و عکس را عوض کنید، هیرو بماند

۱. در `src/content/pages/home/en.mdx` خط `template: "home"` را نگه دارید.
۲. هیروی دمو (اسپلیت ۱۲ ستونی در
   [HomePageTemplate.astro](../src/views/pages/HomePageTemplate.astro)) با `title` و
   `description` فرانت‌متر و سه آیتم داخل فایل پر می‌شود. برای مشتری، سه آیتم را در
   همان فایل `.astro` با محتوای واقعی جایگزین کنید (یا مسیر C را ببینید).
۳. بدنهٔ MDX بعد از هیرو رندر می‌شود؛ آن را با بخش‌های زیر جایگزین کنید.
۴. `image: "./home.png"` را با عکس واقعی مشتری عوض کنید (بخش ۸).

این مسیر کمترین کار را دارد، ولی طراحی هیرو ثابت است.

---

## ۵. مسیر B — کل صفحه در MDX، بدون کد Astro جدید

از این مسیر وقتی استفاده کنید که طراحی با `<section>`های ساده قابل ساخت است.

### ۵.۱ فرانت‌متر

```yaml
---
title: "استودیو آکمی"
slug: ""
description: "طراحی برند، وب و محصول برای تیم‌های در حال رشد."
image: "./home.png"
hero: "none"
container: "canvas"
flushTop: true
draft: false
---
```

خط `template` را بردارید تا MDX خام رندر شود (بدون هیروی دمو).

### ۵.۲ ساختار فایل

بعد از `---` یک خط خالی، بعد importها، بعد بدنه:

```mdx
import PageSection from '@/components/PageSection.astro';
import Icon from '@/components/Icon.astro';
```

### ۵.۳ هیروی اختصاصی (اولین بخش، زیر هدر شناور)

چون `flushTop: true` است، اولین بخش باید خودش فاصلهٔ بالایی برای هدر ثابت بدهد:

```html
<section
  aria-labelledby="page-hero-title"
  class="relative isolate overflow-hidden border-b border-border bg-linear-to-b from-surface via-bg to-bg pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24"
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 -top-24 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-primary/10 blur-3xl"
  ></div>

  <div class="layout-container">
    <div class="grid gap-10 lg:grid-cols-12 lg:items-center">
      <div class="lg:col-span-7" data-trig>
        <p class="section-kicker">طراحی و توسعه</p>
        <h1 id="page-hero-title" class="mt-3 text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
          برند شما، سایت شما
        </h1>
        <p class="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          توضیح یک‌خطی ارزش پیشنهادی؛ همان چیزی که مشتری در سه ثانیه باید بفهمد.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a href="#contact" class="cta h-11 px-6 text-sm">
            <span>شروع گفت‌وگو</span>
            <Icon name="arrow-right" size={16} class="shrink-0 rtl:rotate-180" />
          </a>
          <a href="#services" class="btn-secondary h-11">خدمات</a>
        </div>
      </div>
      <div class="lg:col-span-5" data-trig data-trig-direction="end">
        <!-- تصویر/کارت سمت مقابل هیرو -->
      </div>
    </div>
  </div>
</section>
```

`id="page-hero-title"` همان `HERO_TITLE_ID` پروژه است؛ برای سازگاری با بقیهٔ صفحات از
همین استفاده کنید (`aria-labelledby` هم به آن اشاره می‌کند).

### ۵.۴ بخش‌های بعدی با `PageSection`

`PageSection` پس‌زمینه و ریتم عمودی full-bleed را می‌دهد و محتوا را در
`.layout-container` (۱۲۸۰px) می‌نشاند:

```html
<PageSection spacing="lg">
  <p class="section-kicker">خدمات</p>
  <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">چه کاری انجام می‌دهیم</h2>

  <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-trig-stagger data-trig-stagger-delay="0.08">
    <article data-trig class="rounded-2xl border border-border bg-surface p-6 transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
      <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
        <Icon name="globe" size={20} />
      </span>
      <h3 class="mt-4 text-lg font-bold text-fg">عنوان خدمت</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted">دو خط توضیح، بدون واژه‌های تبلیغاتی توخالی.</p>
    </article>
    <!-- کارت‌های بعدی -->
  </div>
</PageSection>

<PageSection id="contact" surface="surface" spacing="lg" borderTop>
  <div class="max-w-2xl">
    <p class="section-kicker">تماس</p>
    <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">بریم سراغ پروژه؟</h2>
    <p class="mt-4 text-base leading-relaxed text-muted">ایمیل یا فرم؛ هرکدام که برای مشتری طبیعی‌تر است.</p>
    <a href="mailto:hello@example.com" class="cta mt-8 h-11 px-6 text-sm">ارسال ایمیل</a>
  </div>
</PageSection>
```

نکته‌ها:

- `PageSection` با `id` خودش `scroll-mt-28` می‌گیرد، پس لینک‌های `#services` زیر هدر
  ثابت گم نمی‌شوند.
- `surface`: `default` | `surface` | `subtle` — برای تفکیک بصری بخش‌ها، نه رنگ دلخواه.
- `spacing`: `none` | `sm` | `md` | `lg`.
- انیمیشن ظاهر شدن: `data-trig` روی هر آیتم و `data-trig-stagger` روی والد؛ هرگز
  `opacity-0` یا `display:none` دستی ننویسید.

---

## ۶. مسیر C — قالب اختصاصی Astro (پیشنهادی برای مشتری)

اینجا کل صفحه یک کامپوننت است؛ MDX فقط متن می‌دهد. چهار ویرایش کوچک لازم است.

### ۶.۱ ساخت قالب

فایل `src/views/pages/StudioHome.astro`:

```astro
---
import { render, type CollectionEntry } from 'astro:content';
import BaseLayout from '@/layouts/BaseLayout.astro';
import PageSection from '@/components/PageSection.astro';
import Icon from '@/components/Icon.astro';
import { HERO_TITLE_ID } from '@/libs/config/app';
import type { Locale } from '@/i18n/locales';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';

interface Props {
  entry: CollectionEntry<'pages'>;
  locale: Locale;
  alternates: Partial<Record<Locale, string>>;
  url: string;
  schema?: Record<string, unknown> | Record<string, unknown>[];
}

const { entry, locale, alternates, url, schema } = Astro.props;
const { Content } = await render(entry);

const workHref = (await getPageUrl('features', locale)) ?? getBlogIndexHref(locale);
const services = [
  { icon: 'layers', title: 'استراتژی برند', body: '…' },
  { icon: 'globe', title: 'وب‌سایت', body: '…' },
  { icon: 'shield', title: 'پشتیبانی', body: '…' },
] as const;
---

<BaseLayout
  title={entry.data.title}
  description={entry.data.description}
  image={entry.data.image}
  schema={schema}
  locale={locale}
  url={url}
  alternates={alternates}
  flushTop
  canvas
>
  <section aria-labelledby={HERO_TITLE_ID} class="relative isolate border-b border-border pt-28 pb-16 sm:pt-36 sm:pb-20">
    <div class="layout-container">
      <p class="section-kicker">استودیو</p>
      <h1 id={HERO_TITLE_ID} class="mt-3 max-w-3xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
        {entry.data.title}
      </h1>
      {entry.data.description && (
        <p class="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg">
          {entry.data.description}
        </p>
      )}
      <a href="#contact" class="cta mt-8 h-11 px-6 text-sm">
        <span>شروع گفت‌وگو</span>
        <Icon name="arrow-right" size={16} class="shrink-0 rtl:rotate-180" />
      </a>
    </div>
  </section>

  <PageSection spacing="lg">
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-trig-stagger>
      {services.map((s) => (
        <article data-trig class="rounded-2xl border border-border bg-surface p-6">
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
            <Icon name={s.icon} size={20} />
          </span>
          <h2 class="mt-4 text-lg font-bold text-fg">{s.title}</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
        </article>
      ))}
    </div>
  </PageSection>

  <PageSection id="contact" surface="surface" spacing="lg" borderTop>
    <div class="prose prose-wide">
      <Content />
    </div>
    <a href={workHref} class="btn-secondary mt-6">نمونه‌کارها</a>
  </PageSection>
</BaseLayout>
```

### ۶.۲ ثبت قالب

در [src/views/PageView.astro](../src/views/PageView.astro) هم import و هم نقشه را
به‌روز کنید:

```astro
import StudioHome from '@/views/pages/StudioHome.astro';

const PAGE_TEMPLATES = {
  home: HomePageTemplate,
  'studio-home': StudioHome,
} as const;
```

### ۶.۳ باز کردن کلید در شمای محتوا

در [src/content.config.ts](../src/content.config.ts) مقدار `template` یک enum بسته است؛
بدون این تغییر، بیلد با خطای اعتبارسنجی می‌شکند:

```ts
template: z.enum(['home', 'studio-home']).optional(),
```

### ۶.۴ فعال‌کردن روی صفحه

در `src/content/pages/home/en.mdx` و `fa.mdx`:

```yaml
template: "studio-home"
hero: "none"
container: "canvas"
flushTop: true
```

وقتی `template` ست شود، `hero`/`container`/`flushTop` نقشی ندارند، چون قالب خودش
`BaseLayout` را صدا می‌زند. آن‌ها را فقط برای خوانایی نگه دارید یا بردارید.

### ۶.۵ چرا این مسیر برای مشتری بهتر است

- یک `<h1>` و یک تعریف از هیرو، نه تکرار آن در چند فایل.
- متن هر زبان در MDX خودش؛ کد در `.astro` مشترک.
- `astro check` تایپ پراپ‌ها را بررسی می‌کند.
- تغییر طراحی بعدی، بدون دست‌زدن به محتوا انجام می‌شود.

---

## ۷. بلوک‌های آماده برای کپی

همهٔ نمونه‌ها با توکن‌های موجود پروژه ساخته شده‌اند و در RTL خودکار آینه می‌شوند.

### ۷.۱ نوار لوگوی مشتریان

```html
<PageSection spacing="sm" borderTop borderBottom>
  <p class="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted rtl:tracking-normal">
    مورد اعتماد تیم‌ها
  </p>
  <ul class="mt-8 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-5">
    <li class="flex items-center justify-center opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
      <Image src={logo1} alt="نام مشتری" class="h-8 w-auto" />
    </li>
  </ul>
</PageSection>
```

لوگوها را با `import` از `src/assets/` بیاورید تا Astro نسخهٔ بهینه بسازد (بخش ۸).

### ۷.۲ بخش «چطور کار می‌کنیم» (سه مرحله)

```html
<PageSection spacing="lg" surface="subtle">
  <h2 class="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">سه قدم تا نتیجه</h2>
  <ol class="mt-10 grid gap-8 sm:grid-cols-3" data-trig-stagger>
    <li data-trig class="relative ps-12">
      <span class="absolute start-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg" aria-hidden="true">۱</span>
      <h3 class="text-lg font-bold text-fg">کشف</h3>
      <p class="mt-2 text-sm leading-relaxed text-muted">…</p>
    </li>
    <!--۲ و ۳-->
  </ol>
</PageSection>
```

### ۷.۳ نقل‌قول مشتری

```html
<PageSection spacing="lg">
  <figure class="mx-auto max-w-3xl text-center" data-trig>
    <blockquote class="text-balance text-2xl font-semibold leading-relaxed text-fg sm:text-3xl">
      «نتیجه دقیقاً همان چیزی بود که در اولین جلسه توصیفش کردیم.»
    </blockquote>
    <figcaption class="mt-6 text-sm text-muted">نام، سمت، شرکت</figcaption>
  </figure>
</PageSection>
```

### ۷.۴ نوار CTA پایانی

```html
<PageSection spacing="lg" surface="surface" borderTop>
  <div class="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
    <div>
      <h2 class="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">آمادهٔ شروع هستید؟</h2>
      <p class="mt-2 text-sm text-muted">پاسخ در کمتر از یک روز کاری.</p>
    </div>
    <a href="mailto:hello@example.com" class="cta h-11 px-6 text-sm">تماس با ما</a>
  </div>
</PageSection>
```

### ۷.۵ قواعد ثابت

- دکمهٔ اصلی: `.cta` — دکمهٔ ثانویه: `.btn-secondary` — چیپ: `.chip` — سطح شیشه‌ای: `.glass-surface`.
  این کلاس‌ها یک‌جا در `global.css` تعریف شده‌اند؛ دوباره نسازید.
- فقط یک `<h1>` در کل صفحه (تست smoke تعدادش را چک می‌کند).
- هیچ کلاس فیزیکی (`ml-`، `pr-`، `text-left`، `left-`) ننویسید؛ همیشه `ms-`، `pe-`، `text-start`، `start-*`.
- آیکون فقط با `<Icon name="…" />`. نام‌های موجود: `search`، `globe`، `close`، `check`،
  `menu`، `chevron-left/right/down`، `sun`، `moon`، `copy`، `external-link`، `arrow-right`،
  `shield`، `mail`، `layers`، `headers`. آیکون جدید: [icons.svg.ts](../src/pages/icons.svg.ts).
- متن دکمه‌های مشترک را با `m.common_…` از Paraglide بگیرید، نه رشتهٔ ثابت.

---

## ۸. تصاویر

- تصویر هر ورودی **کنار خودش** می‌ماند: `src/content/pages/home/home.png` و در فرانت‌متر `image: "./home.png"`.
  محتوای `image()` توسط Astro حل، بهینه و در صورت نبود فایل، بیلد شکسته می‌شود.
- تصویر هیرو حداقل ۱۹۲۰px عرض داشته باشد (نسبت پیشنهادی ۱۶:۹ برای OG).
- عکس داخل بدنه را با `<Image>` رندر کنید، نه `<img>` خام:

```mdx
import { Image } from 'astro:assets';
import heroShot from '@/assets/studio/shot.jpg';
```

```html
<Image src={heroShot} alt="توضیح دقیق تصویر" widths={[480, 768, 1280]} sizes="(min-width: 1024px) 50vw, 100vw" class="rounded-2xl border border-border" />
```

- `alt` توصیفی بنویسید؛ برای تصویر تزئینی `alt=""` (نه حذف ویژگی).
- `pnpm run assets:generate` فقط فایل‌های **موجود را نگه می‌دارد** و می‌توانید
  بدون نگرانی آن را اجرا کنید؛ برای بازتولید تصویرهای جایگزین (`home.png`، آیکون‌ها، OG)
  از `pnpm run assets:generate -- --force` استفاده کنید.

---

## ۹. لینک‌ها و ناوبری

هرگز مسیر را دستی نسازید:

```astro
import { localizeHref } from '@/i18n/paths';
import { getBlogIndexHref, getPageUrl } from '@/libs/content/service';

const aboutHref = await getPageUrl('about', locale);      // '/' یا '/fa/درباره-ما/'
const blogHref = getBlogIndexHref(locale);
```

- `localizeHref('/contact', locale)` برای مسیرهای ثابت.
- `getPageUrl('<group>', locale)` برای صفحات محتوایی؛ اگر صفحه در آن زبان draft باشد
  `null` برمی‌گرداند، پس همیشه fallback بدهید.
- بخش‌های داخلی خانه: `href="#services"` (همان صفحه).
- برای اضافه‌کردن آیتم به هدر/دراور/فوتر: [navigation.ts](../src/libs/config/navigation.ts)
  — هر سه از `getNavigationSlots()` می‌خوانند.
- زبان هرگز با `navigate()` عوض نمی‌شود؛ `LanguageSwitcher` خودش `window.location.assign` را انجام می‌دهد.

---

## ۱۰. دو زبانه کردن صفحه

۱. متن هر زبان را در فایل خودش بنویسید: `en.mdx`، `fa.mdx`. متن‌ها ترجمهٔ یکدیگرند، نه کپی.
۲. عنوان/توضیح هر زبان:

```bash
pnpm run new:page home --update --title:fa="استودیو آکمی" --desc:fa="…" --sync-frontmatter
```

`--sync-frontmatter` کلیدهای ساختاری (`image`، `hero`، `container`، `flushTop`، `template`)
را بین زبان‌ها هم‌تراز می‌کند؛ متن را دست نمی‌زند.

۳. عبارت‌های تکراری رابط (CTA، برچسب فرم، پیام خطا) را به `messages/*.json` ببرید:

```bash
pnpm run i18n:add -- --category=home --key=cta_primary --en="Start a project" --fa="شروع پروژه"
pnpm run messages:compile
```

در قالب `.astro`:

```astro
import * as m from '@/paraglide/messages';
<a href="#contact" class="cta h-11 px-6 text-sm">{m.home_cta_primary({}, { locale })}</a>
```

۴. زبان جدید؟ `pnpm run i18n:add-lang -- de --name="Deutsch" --dir=ltr --with-content`.
۵. در پایان: `pnpm run audit:i18n` باید بدون اختلاف کلید/محتوا پاس شود.

> در MDX به `locale` دسترسی ندارید؛ به همین دلیل **متن محتوایی** در فایل هر زبان
> می‌نشیند و **متن رابط** در پیام‌های Paraglide. این دو را قاطی نکنید.

---

## ۱۱. SEO و دسترس‌پذیری

- `title` و `description` فرانت‌متر → `<title>`، توضیح متا، OG و Twitter.
- canonical و `hreflang` (شامل `x-default`) خودکار از `alternates` ساخته می‌شوند؛ دست نزنید.
- تصویر OG: همان `image` ورودی، با کارت بهینه‌شده‌ای که `src/libs/content/social.ts` می‌سازد.
- در صفحهٔ خانه، `WebSite`/`WebPage` از `PageView` می‌آید؛ اگر قالب اختصاصی ساختید،
  `schema` را به `BaseLayout` پاس بدهید (در نمونهٔ بخش ۶ انجام شده).
- **یک `<h1>`**، سلسلهٔ درست `h2`/`h3`، و هر `section` با `aria-labelledby` یا عنوان.
- لینک‌ها متن توصیفی داشته باشند؛ «بیشتر» تنها کافی نیست.
- دکمهٔ آیکونی: `<IconButton icon="…" label="…" />` — نه `<button>` دست‌ساز.
- کنتراست: روی `bg-surface` از `text-muted` برای متن فرعی و `text-fg` برای متن اصلی استفاده کنید.

---

## ۱۲. چک‌لیست تأیید قبل از تحویل

```bash
pnpm run lint          # messages + astro check + tsc (خطای تایپ/شمای محتوا اینجا گیر می‌افتد)
pnpm test              # ۱۹۳ تست واحد
pnpm run audit:i18n    # هم‌ترازی زبان‌ها، کلیدها، مسیرها، RTL
pnpm run build         # Astro + Pagefind
pnpm run smoke         # HTML/SEO/feed/H1 روی خروجی واقعی
pnpm run knip          # کد و وابستگی مرده
```

سپس دستی در مرورگر:

- [ ] `/` و `/fa/` هر دو باز می‌شوند و متن‌ها ترجمه شده‌اند.
- [ ] در فارسی، جهت، فونت، فاصله‌ها و آینه‌شدن آیکون‌ها درست است.
- [ ] تم روشن/تاریک/سیستم هر سه خوانا هستند.
- [ ] فقط یک `<h1>` (خروجی `grep -o '<h1' dist/index.html | wc -l` باید ۱ باشد).
- [ ] لینک‌های `#anchor` زیر هدر ثابت نمی‌پَرند.
- [ ] انیمیشن ظاهر شدن با اسکرول اجرا می‌شود و با JS خاموش همه‌چیز دیده می‌شود (`print` هم).
- [ ] ناوبری موبایل، زبان و جستجو کار می‌کنند.
- [ ] هیچ کلمهٔ دمو/استارتر («Astro i18n Starter»، «لوکس»...) باقی نمانده است.
- [ ] `pnpm run build` بدون هشدار محتوای گمشده (تصویر/ترجمه) تمام شد.

---

## ۱۳. تحویل به مشتری

| مورد | کجا | چرا |
| --- | --- | --- |
| `SITE_URL` روی دامنهٔ نهایی | محیط بیلد | canonical/sitemap/RSS |
| نام، توضیح، author، شبکه‌های اجتماعی | `app.config.json` | متادیتا و فوتر |
| تصویر OG و فاوآیکون | `public/` + `site.socialImage` | اشتراک‌گذاری و PWA |
| تنظیم کوکی و رضایت | `cookies` در `app.config.json` | انطباق GDPR/TDDDG |
| فرم تماس | `api.baseUrl` یا `PUBLIC_API_BASE_URL` / `PUBLIC_CONTACT_API_URL` | اتصال به سرویس ایمیل/CRM |
| صفحات حقوقی | `privacy`، `terms` در ناوبری فوتر | الزام قانونی |
| حذف محتوای دمو | `remove:page`/`remove:post` | جلوگیری از محتوای گمراه‌کننده |
| بازبینی لایسنس | `LICENSE` | حقوق استفاده برای مشتری |

اگر فرم تماس لازم است و هنوز سرویس انتخاب نشده، پیش از نوشتن هر کد یک سرویس
تراکنشی ایمیل انتخاب کنید؛ فرم فعلی فقط یک آداپتور سمت کلاینت برای endpoint خارجی است
و هیچ بک‌اندی در این پروژه وجود ندارد (Pure SSG).

---

## ۱۴. خطاهای رایج

| نشانه | علت | راه‌حل |
| --- | --- | --- |
| بیلد: `Invalid enum value` روی `template` | قالب جدید در `content.config.ts` ثبت نشده | مقدار را به enum اضافه کنید |
| بیلد: `layout` شناخته نشد / خطای MDX | `layout:` در فرانت‌متر | با `container:` عوض کنید |
| صفحه دو `<h1>` دارد | هیروی آماده + `<h1>` دستی | هیرو را `none` کنید یا `h1` خودتان را بردارید |
| متن‌ها بعد از تغییر MDX عوض نشدند | `template` فعال است و متن از قالب می‌آید | بخش مربوطه در `.astro` را ویرایش کنید |
| بخش اول زیر هدر گم می‌شود | `flushTop: true` بدون `pt-28` | فاصلهٔ بالای بخش اول را بدهید |
| در فارسی چیدمان آینه نمی‌شود | کلاس فیزیکی (`ml`، `text-left`) | به `ms`، `text-start` تغییر دهید |
| تصویر در بیلد پیدا نمی‌شود | مسیر `public/` یا مسیر مطلق | فایل را کنار MDX بگذارید و `./file.png` بنویسید |
| `m.some_key is not a function` | پیام کامپایل نشده یا کلید غلط | `pnpm run messages:compile` و `audit:i18n` |
| انیمیشن کارت‌های جدید اجرا نمی‌شود | عناصر پویا مشاهده نشده‌اند | `refreshChronoTrig()` را صدا بزنید |
| `astro check` روی Props قالب خطا می‌دهد | امضای Props با `PageView` فرق دارد | `entry, locale, alternates, url, schema?` را دقیقاً بگیرید |

---

### ضمیمه — نقشهٔ فایل‌های صفحهٔ اصلی

```text
src/content/pages/home/en.mdx         متن + فرانت‌متر (en)
src/content/pages/home/fa.mdx         متن + فرانت‌متر (fa)
src/content/pages/home/home.png       تصویر هیرو/OG
src/views/PageView.astro              انتخاب قالب بر اساس frontmatter.template
src/views/pages/HomePageTemplate.astro  قالب دمو (مسیر A)
src/views/pages/StudioHome.astro      قالب اختصاصی شما (مسیر C)
src/content.config.ts                 شمای صفحه + مقدارهای مجاز template
src/components/PageSection.astro      بخش full-bleed با ریتم و سطح
src/components/PageHero.astro         هیروی آماده با عکس (hero: default)
src/components/PageHeader.astro       هدر تایپوگرافیک (hero: minimal)
src/styles/global.css                 توکن رنگ، .layout-container، .cta، .btn-secondary، .chip
src/libs/config/navigation.ts         هدر/دراور/فوتر
```
