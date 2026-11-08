// =====================================================================
//  تنظیمات Apex Job
//  فقط بخش «اطلاعات تماس شما» را تغییر دهید. کلیدهای Supabase از
//  GitHub Secrets خوانده می‌شوند (راهنما در README.md).
// =====================================================================

export const CONFIG = {
  appName: 'Apex Job',
  version: '1.0.0',

  // ---------- اطلاعات تماس شما ----------
  whatsapp: '93790499585',          // شماره واتساپ با کد کشور، بدون + و صفر
  phone: '0790499585',              // برای دکمه تماس
  officeAddress: {
officeAddress: {
  fa: '📍 افغانستان، ولایت تخار، شهر تالقان، چوک مرکزی، جوار مارکیت موبایل سنتر، مارکیت مولانا، منزل اول، دکان شماره ۱۲',
  ps: '📍 افغانستان، تخار ولایت، تالقان ښار، مرکزي چوک، د موبایل سنټر مارکېټ ترڅنګ، مولانا مارکېټ، لومړی منزل، ۱۲ نمبر دوکان',
  en: '📍 Afghanistan, Takhar Province, Taloqan City, Central Square, Next to Mobile Center Market, Maulana Market, First Floor, Shop No. 12'
  },
  // ساعت یادآوری روزانه در اپ (وقتی Firebase فعال نیست)
  dailyReminderHour: 9,

  // ---------- از GitHub Secrets / فایل .env خوانده می‌شود ----------
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseKey: import.meta.env.VITE_SUPABASE_KEY || '',
  pushEnabled: import.meta.env.VITE_PUSH_ENABLED === 'true',
  siteUrl: import.meta.env.VITE_SITE_URL || '',
  apkUrl: import.meta.env.VITE_APK_URL || '',
};
