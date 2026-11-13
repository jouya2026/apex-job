// کشورها (برای بورسیه‌ها): کد ISO، نام انگلیسی، دری و پښتو
// هم در اپ و هم در اسکریپر استفاده می‌شود.

export const COUNTRIES = {
  af: ['Afghanistan', 'افغانستان', 'افغانستان'],
  au: ['Australia', 'آسترالیا', 'آسټرالیا'],
  at: ['Austria', 'اتریش', 'اتریش'],
  az: ['Azerbaijan', 'آذربایجان', 'آذربایجان'],
  bd: ['Bangladesh', 'بنگله‌دیش', 'بنګله دیش'],
  be: ['Belgium', 'بلجیم', 'بلجیم'],
  br: ['Brazil', 'برازیل', 'برازیل'],
  bn: ['Brunei', 'برونئی', 'برونئی'],
  bg: ['Bulgaria', 'بلغاریا', 'بلغاریا'],
  ca: ['Canada', 'کانادا', 'کاناډا'],
  cl: ['Chile', 'چلی', 'چلي'],
  cn: ['China', 'چین', 'چین'],
  hr: ['Croatia', 'کرواسیا', 'کروشیا'],
  cy: ['Cyprus', 'قبرس', 'قبرس'],
  cz: ['Czech Republic', 'چک', 'چک'],
  dk: ['Denmark', 'دنمارک', 'ډنمارک'],
  eg: ['Egypt', 'مصر', 'مصر'],
  ee: ['Estonia', 'استونیا', 'اسټونیا'],
  fi: ['Finland', 'فنلند', 'فنلنډ'],
  fr: ['France', 'فرانسه', 'فرانسه'],
  de: ['Germany', 'آلمان', 'جرمني'],
  gr: ['Greece', 'یونان', 'یونان'],
  hk: ['Hong Kong', 'هانگ‌کانگ', 'هانګ کانګ'],
  hu: ['Hungary', 'هنگری', 'هنګري'],
  is: ['Iceland', 'آیسلند', 'آیسلنډ'],
  in: ['India', 'هند', 'هند'],
  id: ['Indonesia', 'اندونیزیا', 'اندونیزیا'],
  ie: ['Ireland', 'آیرلند', 'آیرلنډ'],
  il: ['Israel', 'اسرائیل', 'اسرائیل'],
  it: ['Italy', 'ایتالیا', 'ایټالیا'],
  jp: ['Japan', 'جاپان', 'جاپان'],
  jo: ['Jordan', 'اردن', 'اردن'],
  kz: ['Kazakhstan', 'قزاقستان', 'قزاقستان'],
  kr: ['South Korea', 'کوریای جنوبی', 'سویلي کوریا'],
  kw: ['Kuwait', 'کویت', 'کویت'],
  kg: ['Kyrgyzstan', 'قرغزستان', 'قرغزستان'],
  lv: ['Latvia', 'لاتویا', 'لاتویا'],
  lt: ['Lithuania', 'لیتوانیا', 'لیتوانیا'],
  lu: ['Luxembourg', 'لوکزامبورگ', 'لوګزامبورګ'],
  my: ['Malaysia', 'مالیزیا', 'مالیزیا'],
  mt: ['Malta', 'مالتا', 'مالټا'],
  mx: ['Mexico', 'مکسیکو', 'مکسیکو'],
  ma: ['Morocco', 'مراکش', 'مراکش'],
  nl: ['Netherlands', 'هالند', 'هالنډ'],
  nz: ['New Zealand', 'زیلاند جدید', 'نوی زیلانډ'],
  no: ['Norway', 'ناروی', 'ناروې'],
  om: ['Oman', 'عمان', 'عمان'],
  pk: ['Pakistan', 'پاکستان', 'پاکستان'],
  ph: ['Philippines', 'فلیپین', 'فلیپین'],
  pl: ['Poland', 'پولند', 'پولنډ'],
  pt: ['Portugal', 'پرتگال', 'پرتګال'],
  qa: ['Qatar', 'قطر', 'قطر'],
  ro: ['Romania', 'رومانیا', 'رومانیا'],
  ru: ['Russia', 'روسیه', 'روسیه'],
  sa: ['Saudi Arabia', 'عربستان سعودی', 'سعودي عربستان'],
  rs: ['Serbia', 'صربستان', 'سربیا'],
  sg: ['Singapore', 'سنگاپور', 'سنګاپور'],
  sk: ['Slovakia', 'سلواکیا', 'سلواکیا'],
  si: ['Slovenia', 'سلوانیا', 'سلووینیا'],
  za: ['South Africa', 'افریقای جنوبی', 'سویلي افریقا'],
  es: ['Spain', 'هسپانیه', 'هسپانیه'],
  se: ['Sweden', 'سویدن', 'سویډن'],
  ch: ['Switzerland', 'سویس', 'سویس'],
  tw: ['Taiwan', 'تایوان', 'تایوان'],
  tj: ['Tajikistan', 'تاجکستان', 'تاجکستان'],
  th: ['Thailand', 'تایلند', 'تایلنډ'],
  tr: ['Turkey', 'ترکیه', 'ترکیه'],
  tm: ['Turkmenistan', 'ترکمنستان', 'ترکمنستان'],
  ae: ['United Arab Emirates', 'امارات متحده عربی', 'متحده عربي امارات'],
  gb: ['United Kingdom', 'بریتانیا', 'بریتانیا'],
  us: ['United States', 'ایالات متحده امریکا', 'متحده ایالات امریکا'],
  uz: ['Uzbekistan', 'ازبکستان', 'ازبکستان'],
  vn: ['Vietnam', 'ویتنام', 'ویتنام'],
  ir: ['Iran', 'ایران', 'ایران'],
  eu: ['Europe', 'اروپا', 'اروپا'],
};

// نام‌های دیگر کشورها و شهرهای مشهور ← کد کشور
const ALIASES = {
  'usa': 'us', 'u.s.': 'us', 'u.s.a': 'us', 'america': 'us', 'united states of america': 'us',
  'uk': 'gb', 'u.k.': 'gb', 'england': 'gb', 'scotland': 'gb', 'wales': 'gb', 'britain': 'gb', 'great britain': 'gb',
  'oxford': 'gb', 'cambridge': 'gb', 'london': 'gb', 'edinburgh': 'gb', 'manchester': 'gb',
  'korea': 'kr', 'republic of korea': 'kr', 'seoul': 'kr',
  'uae': 'ae', 'dubai': 'ae', 'abu dhabi': 'ae', 'emirates': 'ae',
  'turkiye': 'tr', 'türkiye': 'tr', 'istanbul': 'tr', 'ankara': 'tr',
  'czechia': 'cz', 'holland': 'nl', 'the netherlands': 'nl', 'amsterdam': 'nl',
  'beijing': 'cn', 'shanghai': 'cn', 'wuhan': 'cn', 'nanjing': 'cn', 'hangzhou': 'cn',
  'tokyo': 'jp', 'osaka': 'jp', 'kyoto': 'jp',
  'berlin': 'de', 'munich': 'de', 'paris': 'fr', 'rome': 'it', 'milan': 'it', 'madrid': 'es', 'barcelona': 'es',
  'sydney': 'au', 'melbourne': 'au', 'brisbane': 'au', 'canberra': 'au', 'perth': 'au',
  'toronto': 'ca', 'montreal': 'ca', 'vancouver': 'ca', 'ottawa': 'ca',
  'new york': 'us', 'california': 'us', 'boston': 'us', 'harvard': 'us',
  'kuala lumpur': 'my', 'jakarta': 'id', 'riyadh': 'sa', 'jeddah': 'sa', 'doha': 'qa', 'almaty': 'kz', 'astana': 'kz',
  'bishkek': 'kg', 'dushanbe': 'tj', 'tashkent': 'uz', 'islamabad': 'pk', 'lahore': 'pk', 'delhi': 'in', 'new delhi': 'in',
  'european union': 'eu', 'erasmus': 'eu',
};

const LANG_IDX = { en: 0, fa: 1, ps: 2 };

export function countryName(code, lang = 'fa') {
  const c = COUNTRIES[code];
  if (!c) return code ? code.toUpperCase() : '';
  return c[LANG_IDX[lang] ?? 1];
}

/** فهرست کدهای کشور از متن آزاد («Shanghai, China» ← ['cn']) */
export function detectCountries(raw) {
  if (!raw) return [];
  const text = ' ' + String(raw).toLowerCase().replace(/[()،,;/|•\n–-]+/g, ' , ') + ' ';
  const found = [];
  const add = (c) => { if (c && !found.includes(c)) found.push(c); };
  const test = (name) => new RegExp(`(^|[\\s,])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,]|$)`).test(text);
  for (const [code, names] of Object.entries(COUNTRIES)) if (test(names[0].toLowerCase())) add(code);
  for (const [alias, code] of Object.entries(ALIASES)) if (test(alias)) add(code);
  return found;
}

/** آدرس تصویر بیرق کشور (فایل‌های داخل خود اپ: public/flags — بدون نیاز به سرویس بیرونی) */
export const flagUrl = (code) => (code && COUNTRIES[code] ? `flags/${code}.png` : '');
