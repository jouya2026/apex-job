# Apex Job — راهنمای راه‌اندازی

سایت + اپلیکیشن اندروید + داشبورد تبلیغات. وظایف هر ۲ ساعت به‌صورت خودکار جمع‌آوری می‌شوند و شما هیچ کاری برای نشر آن‌ها انجام نمی‌دهید.

```
GitHub Actions (هر ۲ ساعت) ──► Supabase (دیتابیس) ◄── سایت (GitHub Pages)
        │                              ▲                └── اپ اندروید (APK)
        └─ ساخت APK و سایت             └── داشبورد مدیریت: admin.html
```

---

## مرحله ۱ — Supabase (دیتابیس رایگان) — حدود ۵ دقیقه

1. در [supabase.com](https://supabase.com) ثبت‌نام کنید و **New project** بسازید (Region: Frankfurt).
2. فایل `supabase/schema.sql` را باز کنید، در **آخرین خط** ایمیل خود را به جای `YOUR-EMAIL@example.com` بنویسید.
3. در Supabase بروید به **SQL Editor** ← محتوای کامل فایل را بچسبانید ← **Run**.
4. بروید به **Authentication ← Users ← Add user ← Create new user**؛ همان ایمیل و یک رمز بنویسید و تیک **Auto Confirm User** را بزنید. (این حساب ورود شما به داشبورد تبلیغات است.)
5. بروید به **Project Settings ← API Keys** و این سه مقدار را کاپی کنید:
   - **Project URL**
   - **Publishable key** (یا در پروژه‌های قدیمی‌تر: `anon public`)
   - **Secret key** (یا: `service_role`) — این کلید محرمانه است.

## مرحله ۲ — GitHub — حدود ۱۰ دقیقه

1. یک ریپازیتوری **Public** به نام `apex-job` بسازید.
2. همه فایل‌های این پوشه را آپلود کنید (پوشه `.github` حتماً باید آپلود شود). ساده‌ترین راه با Git:
   ```bash
   cd apex-job
   git init && git add . && git commit -m "Apex Job"
   git branch -M main
   git remote add origin https://github.com/USERNAME/apex-job.git
   git push -u origin main
   ```
3. **Settings ← Secrets and variables ← Actions ← New repository secret** و این‌ها را اضافه کنید:

   | نام Secret | مقدار |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key |
   | `ANDROID_KEYSTORE_PASSWORD` | از فایل `android-signing-SECRET.txt` |
   | `ANDROID_KEYSTORE_BASE64` | از فایل `android-signing-SECRET.txt` |

4. **Settings ← Pages ← Source** را روی **GitHub Actions** بگذارید.

## مرحله ۳ — روشن کردن

در زبانه **Actions**:
1. ورک‌فلو **«جمع‌آوری خودکار وظایف»** ← **Run workflow** (اولین اجرا چند دقیقه طول می‌کشد).
2. ورک‌فلو **«انتشار سایت»** و **«ساخت اپلیکیشن اندروید»** ← **Run workflow**.

نتیجه:
- سایت: `https://USERNAME.github.io/apex-job/`
- داشبورد تبلیغات: `https://USERNAME.github.io/apex-job/admin.html`
- فایل APK: صفحه **Releases** ریپازیتوری (لینک دانلود در خود سایت هم نمایش داده می‌شود)

از این به بعد همه‌چیز خودکار است: هر ۲ ساعت وظایف تازه، هر بار که فایلی را تغییر دهید سایت و APK دوباره ساخته می‌شوند.

## مرحله ۴ — آدرس دفتر

فایل `src/config.js` را باز کنید و `officeAddress` را به سه زبان بنویسید. شماره واتساپ (`0790499585`) از قبل تنظیم شده است.

---

## اختیاری: نوتیفیکیشن واقعی روزانه (Firebase)

بدون Firebase، اپ هر روز ساعت ۹ صبح یک یادآوری «وظایف جدید امروز» نشان می‌دهد. برای نوتیفیکیشن واقعی با تعداد وظایف جدید:
1. در [console.firebase.google.com](https://console.firebase.google.com) پروژه بسازید ← **Add app ← Android** ← Package name: `com.apexjob.app` ← فایل `google-services.json` را دانلود کنید.
2. محتوای این فایل را در Secret به نام `GOOGLE_SERVICES_JSON` بگذارید.
3. **Project settings ← Service accounts ← Generate new private key** ← محتوای فایل JSON را در Secret به نام `FIREBASE_SERVICE_ACCOUNT` بگذارید.
4. ورک‌فلو اندروید را دوباره اجرا کنید و APK جدید را نصب کنید.

## انتقال به سرور یا دامنه واقعی

- **دامنه شخصی روی همین GitHub Pages:** Settings ← Pages ← Custom domain. سپس در **Settings ← Secrets and variables ← Actions ← Variables** متغیری به نام `SITE_URL` با آدرس کامل (مثلاً `https://apexjob.af/`) بسازید.
- **هاست دیگر:** دستور `npm run build` را اجرا کنید و محتوای پوشه `dist` را روی هر هاست (cPanel, Netlify, Cloudflare Pages) آپلود کنید. Supabase و جمع‌آوری خودکار مثل قبل کار می‌کنند.

## ساختار فایل‌ها

| مسیر | کار |
|---|---|
| `src/main.js` | برنامه اصلی (صفحه‌ها، فلترها، پروفایل) |
| `src/i18n.js` | ترجمه دری / پښتو / English |
| `src/styles.css` | طراحی و رنگ‌ها |
| `src/config.js` | واتساپ، تلفن، آدرس دفتر |
| `src/admin/` | داشبورد مدیریت تبلیغات |
| `scraper/` | جمع‌آوری خودکار وظایف و نوتیفیکیشن |
| `supabase/schema.sql` | ساختار دیتابیس |
| `.github/workflows/` | خودکارسازی (جمع‌آوری، سایت، APK، نوتیفیکیشن) |

## نکات مهم

- اگر ریپازیتوری ۶۰ روز هیچ تغییری نداشته باشد، GitHub اجرای زمان‌بندی‌شده را متوقف می‌کند. با یک تغییر کوچک یا فعال کردن دوباره ورک‌فلو در Actions دوباره روشن می‌شود.
- متن خود وظایف (شرح وظایف، شرایط) به همان زبانی نمایش داده می‌شود که ارگان نوشته است؛ تمام رابط کاربری، ولایت‌ها، بخش‌ها و نوع قرارداد به سه زبان ترجمه می‌شوند.
- اگر سایت منبع ساختار صفحات خود را تغییر دهد، فایل `scraper/parse.mjs` نیاز به اصلاح دارد. نتیجه هر اجرا در Actions و در داشبورد مدیریت (کارت «آخرین به‌روزرسانی») دیده می‌شود.
- فایل `android-signing-SECRET.txt` را هرگز در GitHub آپلود نکنید و آن را نگه دارید؛ بدون آن نسخه‌های بعدی اپ روی نسخه نصب‌شده به‌روز نمی‌شوند.
