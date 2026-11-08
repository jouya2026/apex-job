// ترجمه رابط کاربری به سه زبان: دری (اصطلاحات افغانستان)، پښتو، English
import { PROVINCES, CATEGORIES, JOB_TYPES, GENDERS, NATIONALITIES } from './data/taxonomy.js';

export const LANGS = [
  { code: 'fa', label: 'دری', dir: 'rtl' },
  { code: 'ps', label: 'پښتو', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

const S = {
  fa: {
    tagline: 'فرصت‌های کاری تازه، هر روز',
    heroTitle: 'وظیفه مناسب خود را بیابید',
    heroHello: 'سلام {name}، وظیفه مناسب خود را بیابید',
    searchPh: 'جستجوی عنوان وظیفه، ارگان یا مهارت…',
    search: 'جستجو',
    activeJobs: 'وظیفه فعال',
    newToday: 'تازه امروز',
    closingSoon: 'نزدیک به ختم مهلت',
    orgs: 'ارگان',
    latest: 'تازه‌ترین وظایف',
    filters: 'فلترها',
    province: 'ولایت',
    category: 'بخش کاری',
    jobType: 'نوعیت قرارداد',
    gender: 'جنسیت',
    posted: 'زمان نشر',
    all: 'همه',
    allProvinces: 'همه ولایات',
    allCategories: 'همه بخش‌ها',
    today: 'امروز',
    last3: 'سه روز اخیر',
    lastWeek: 'هفته اخیر',
    sort: 'ترتیب',
    sortNew: 'تازه‌ترین',
    sortDeadline: 'نزدیک‌ترین مهلت',
    clear: 'پاک کردن',
    clearFilters: 'پاک کردن فلترها',
    showN: 'نمایش {n} وظیفه',
    foundN: '{n} وظیفه',
    noResults: 'وظیفه‌ای با این مشخصات یافت نشد',
    noResultsHint: 'فلترها را کمتر بسازید یا کلمه دیگری را جستجو کنید.',
    new: 'تازه',
    daysLeft: '{n} روز باقی‌مانده',
    lastDay: 'روز آخر',
    closed: 'مهلت ختم شد',
    deadline: 'ختم مهلت',
    published: 'تاریخ نشر',
    location: 'موقعیت',
    nationality: 'تابعیت',
    salary: 'معاش',
    contractDuration: 'مدت قرارداد',
    vacancyNumber: 'شماره اعلان',
    positions: 'تعداد بست',
    education: 'تحصیلات',
    experience: 'تجربه کاری',
    aboutOrg: 'درباره ارگان',
    jobSummary: 'شرح وظایف',
    requirements: 'شرایط و نیازمندی‌ها',
    howToApply: 'رهنمود درخواست',
    applyNow: 'درخواست مستقیم',
    applyEmail: 'ارسال درخواست به ایمیل',
    applyBox: 'راه‌های درخواست برای این وظیفه',
    helpTitle: 'این فرصت را از دست ندهید!',
    helpText: 'هر موفقیت بزرگ با یک قدم آغاز می‌شود. برای تمام امور ثبت‌نام این وظیفه با ما در تماس شوید یا به دفتر ما تشریف بیاورید؛ ما در هر قدم در کنار شما هستیم.',
    whatsapp: 'گفتگو در واتساپ',
    call: 'تماس تلیفونی',
    office: 'آدرس دفتر',
    hours: 'اوقات کاری',
    waMsg: 'سلام Apex Job 👋\nمی‌خواهم برای این وظیفه ثبت‌نام کنم:\n«{title}»\nارگان: {org}\nموقعیت: {loc}\nختم مهلت: {deadline}\nکد وظیفه: {code}',
    faqTitle: 'پرسش‌های متداول درباره این وظیفه',
    faqMore: 'پرسش دیگری دارید؟ در واتساپ از ما بپرسید',
    save: 'ذخیره',
    saved: 'ذخیره شد',
    share: 'شریک‌سازی',
    copied: 'لینک کاپی شد',
    back: 'برگشت',
    home: 'خانه',
    savedJobs: 'ذخیره‌ها',
    updates: 'تازه‌ها',
    profile: 'پروفایل',
    savedEmpty: 'تا هنوز وظیفه‌ای را ذخیره نکرده‌اید',
    savedEmptyHint: 'روی نشانه ذخیره هر وظیفه بزنید تا در این‌جا نگهداری شود.',
    newSince: '{n} وظیفه تازه از آخرین بازدید شما',
    updatesTitle: 'وظایف تازه',
    updatesEmpty: 'در ۲۴ ساعت گذشته وظیفه تازه‌ای نشر نشده است',
    yesterday: 'دیروز',
    earlier: 'پیش‌تر',
    forYou: 'پیشنهاد برای شما',
    forYouHint: 'بر اساس ولایات و بخش‌هایی که در پروفایل انتخاب کرده‌اید',
    popularCats: 'بخش‌های پرطرفدار',
    yourName: 'نام شما',
    namePh: 'نام خود را بنویسید',
    favProvinces: 'ولایات مورد علاقه',
    favCategories: 'بخش‌های مورد علاقه',
    notifications: 'اطلاع‌رسانی روزانه وظایف تازه',
    notificationsHint: 'هر روز یک پیام کوتاه درباره وظایف تازه روی موبایل شما',
    notifWebHint: 'این گزینه در اپلیکیشن اندروید فعال است.',
    theme: 'نمای اپلیکیشن',
    light: 'روشن',
    dark: 'تاریک',
    system: 'خودکار',
    language: 'زبان',
    contactUs: 'تماس با ما',
    aboutApp: 'درباره Apex Job',
    aboutText: 'Apex Job هر روز تازه‌ترین فرصت‌های کاری افغانستان را برای شما نشر می‌کند و در کنار شما است تا با اطمینان برای وظیفه دلخواه خود درخواست بدهید.',
    version: 'نسخه',
    loading: 'لطفاً صبر کنید…',
    error: 'اتصال برقرار نشد. انترنت خود را بررسی کنید و دوباره کوشش کنید.',
    retry: 'کوشش دوباره',
    offline: 'نمایش آخرین معلومات ذخیره‌شده',
    notConfigured: 'اتصال دیتابیس هنوز تنظیم نشده است (رهنمای README).',
    ad: 'آگهی',
    close: 'بستن',
    updatedAgo: 'تازه‌شده: {t}',
    getApp: 'اپلیکیشن اندروید Apex Job را دریافت کنید',
    getAppBtn: 'دریافت',
    similar: 'وظایف مشابه',
    notFound: 'این وظیفه یافت نشد یا حذف شده است.',
    justNow: 'همین اکنون',
    minAgo: '{n} دقیقه پیش',
    hourAgo: '{n} ساعت پیش',
    dayAgo: '{n} روز پیش',
    reminderTitle: '⭐ وظایف تازه امروز',
    reminderBody: 'فرصت‌های کاری تازه نشر شده‌اند. همین اکنون ببینید.',
    moreFilters: 'فلترهای بیشتر',
    apply: 'تطبیق',
    menu: 'فهرست',
    seeAll: 'همه',
    forWomen: 'برای خانم‌ها',
    forMen: 'برای آقایان',
    viewNew: 'دیدن',
    loadMore: 'نمایش بیشتر',
    profileHint: 'تنظیمات شخصی شما تنها روی همین دستگاه ذخیره می‌شود.',
    guest: 'مهمان',
    detailsOf: 'مشخصات وظیفه',
    autoTr: 'ترجمه خودکار از متن اصلی اعلان',
    showOriginal: 'دیدن متن اصلی',
    showTranslation: 'دیدن ترجمه',
    pwaTitle: 'Apex Job را مانند اپلیکیشن روی موبایل خود نصب کنید',
    pwaIos: 'در Safari دکمه شریک‌سازی (مربع با تیر رو به بالا) را بزنید و «Add to Home Screen» را انتخاب کنید.',
    pwaBtn: 'نصب',
  },
  ps: {
    tagline: 'هره ورځ نوي کاري فرصتونه',
    heroTitle: 'خپله مناسبه دنده ومومئ',
    heroHello: 'سلام {name}، خپله مناسبه دنده ومومئ',
    searchPh: 'د دندې، ادارې یا مهارت لټون…',
    search: 'لټون',
    activeJobs: 'فعالې دندې',
    newToday: 'نن نوې',
    closingSoon: 'نېټه یې نږدې ده',
    orgs: 'ادارې',
    latest: 'تر ټولو نوې دندې',
    filters: 'فلټرونه',
    province: 'ولایت',
    category: 'کاري برخه',
    jobType: 'د قرارداد ډول',
    gender: 'جنسیت',
    posted: 'د خپرېدو وخت',
    all: 'ټول',
    allProvinces: 'ټول ولایتونه',
    allCategories: 'ټولې برخې',
    today: 'نن',
    last3: 'وروستۍ درې ورځې',
    lastWeek: 'وروستۍ اونۍ',
    sort: 'ترتیب',
    sortNew: 'تر ټولو نوې',
    sortDeadline: 'نږدې وروستۍ نېټه',
    clear: 'پاکول',
    clearFilters: 'فلټرونه پاک کړئ',
    showN: '{n} دندې وښایاست',
    foundN: '{n} دندې',
    noResults: 'په دې ځانګړتیاوو دنده ونه موندل شوه',
    noResultsHint: 'فلټرونه کم کړئ یا بل څه ولټوئ.',
    new: 'نوې',
    daysLeft: '{n} ورځې پاتې',
    lastDay: 'وروستۍ ورځ',
    closed: 'موده پای ته رسېدلې',
    deadline: 'وروستۍ نېټه',
    published: 'د خپرېدو نېټه',
    location: 'ځای',
    nationality: 'تابعیت',
    salary: 'معاش',
    contractDuration: 'د قرارداد موده',
    vacancyNumber: 'د اعلان شمېره',
    positions: 'د بستونو شمېر',
    education: 'زده کړې',
    experience: 'کاري تجربه',
    aboutOrg: 'د ادارې په اړه',
    jobSummary: 'د دندې شرحه',
    requirements: 'شرطونه او اړتیاوې',
    howToApply: 'د غوښتنې لارښود',
    applyNow: 'مستقیمه غوښتنه',
    applyEmail: 'برېښنالیک ته غوښتنه ولېږئ',
    applyBox: 'د دې دندې لپاره د غوښتنې لارې',
    helpTitle: 'دا فرصت له لاسه مه ورکوئ!',
    helpText: 'هره لویه بریا په یوه ګام پیلېږي. د دې دندې د نوم لیکنې د ټولو چارو لپاره له موږ سره اړیکه ونیسئ یا زموږ دفتر ته راشئ؛ موږ په هر ګام کې ستاسو تر څنګ یو.',
    whatsapp: 'په واټساپ خبرې',
    call: 'ټلیفوني اړیکه',
    office: 'د دفتر پته',
    hours: 'کاري وخت',
    waMsg: 'سلام Apex Job 👋\nغواړم د دې دندې لپاره نوم ولیکم:\n«{title}»\nاداره: {org}\nځای: {loc}\nوروستۍ نېټه: {deadline}\nد دندې کوډ: {code}',
    faqTitle: 'د دې دندې په اړه عامې پوښتنې',
    faqMore: 'بله پوښتنه لرئ؟ په واټساپ کې یې له موږ وپوښتئ',
    save: 'خوندي کول',
    saved: 'خوندي شوه',
    share: 'شریکول',
    copied: 'لینک کاپي شو',
    back: 'شاته',
    home: 'کور',
    savedJobs: 'خوندي شوې',
    updates: 'تازه',
    profile: 'پروفایل',
    savedEmpty: 'تر اوسه مو کومه دنده نه ده خوندي کړې',
    savedEmptyHint: 'د هرې دندې د خوندي کولو نښه کېکاږئ چې دلته پاتې شي.',
    newSince: 'ستاسو له وروستي لیدنې راهیسې {n} نوې دندې',
    updatesTitle: 'تازه دندې',
    updatesEmpty: 'په تېرو ۲۴ ساعتونو کې نوې دنده نه ده خپره شوې',
    yesterday: 'پرون',
    earlier: 'مخکې',
    forYou: 'ستاسو لپاره وړاندیز',
    forYouHint: 'هغو ولایتونو او برخو ته په پام چې په پروفایل کې مو ټاکلي',
    popularCats: 'مشهورې برخې',
    yourName: 'ستاسو نوم',
    namePh: 'خپل نوم ولیکئ',
    favProvinces: 'خوښ ولایتونه',
    favCategories: 'خوښې برخې',
    notifications: 'د نویو دندو ورځنی خبرتیا',
    notificationsHint: 'هره ورځ ستاسو په موبایل کې د نویو دندو یو لنډ پیغام',
    notifWebHint: 'دا اختیار د اندروید په اپلیکیشن کې فعال دی.',
    theme: 'د اپلیکیشن بڼه',
    light: 'روښانه',
    dark: 'تیاره',
    system: 'اتومات',
    language: 'ژبه',
    contactUs: 'موږ سره اړیکه',
    aboutApp: 'د Apex Job په اړه',
    aboutText: 'Apex Job هره ورځ د افغانستان تر ټولو نوي کاري فرصتونه تاسو ته خپروي او ستاسو تر څنګ دی چې په ډاډ سره د خپلې خوښې دندې لپاره غوښتنه وکړئ.',
    version: 'نسخه',
    loading: 'لطفاً صبر وکړئ…',
    error: 'اړیکه ونه شوه. انټرنیټ وګورئ او بیا هڅه وکړئ.',
    retry: 'بیا هڅه',
    offline: 'وروستي خوندي شوي معلومات ښودل کېږي',
    notConfigured: 'د ډیټابیس اړیکه لا نه ده تنظیم شوې (README وګورئ).',
    ad: 'اعلان',
    close: 'بندول',
    updatedAgo: 'تازه شوی: {t}',
    getApp: 'د Apex Job د اندروید اپلیکیشن ترلاسه کړئ',
    getAppBtn: 'ترلاسه کول',
    similar: 'ورته دندې',
    notFound: 'دا دنده ونه موندل شوه یا لرې شوې ده.',
    justNow: 'همدا اوس',
    minAgo: '{n} دقیقې مخکې',
    hourAgo: '{n} ساعته مخکې',
    dayAgo: '{n} ورځې مخکې',
    reminderTitle: '⭐ د نن نوې دندې',
    reminderBody: 'نوي کاري فرصتونه خپاره شوي. همدا اوس یې وګورئ.',
    moreFilters: 'نور فلټرونه',
    apply: 'پلي کول',
    menu: 'مینو',
    seeAll: 'ټول',
    forWomen: 'د مېرمنو لپاره',
    forMen: 'د نارینه وو لپاره',
    viewNew: 'کتل',
    loadMore: 'نور وښایاست',
    profileHint: 'ستاسو شخصي تنظیمات یوازې په همدې وسیله خوندي کېږي.',
    guest: 'مېلمه',
    detailsOf: 'د دندې ځانګړتیاوې',
    autoTr: 'د اعلان له اصلي متن څخه اتوماتیکه ژباړه',
    showOriginal: 'اصلي متن وګورئ',
    showTranslation: 'ژباړه وګورئ',
    pwaTitle: 'Apex Job د اپلیکیشن په څېر په خپل موبایل کې نصب کړئ',
    pwaIos: 'په Safari کې د شریکولو تڼۍ (هغه مربع چې پورته غشی لري) کېکاږئ او «Add to Home Screen» وټاکئ.',
    pwaBtn: 'نصب',
  },
  en: {
    tagline: 'Fresh job opportunities, every day',
    heroTitle: 'Find the job that fits you',
    heroHello: 'Hi {name}, find the job that fits you',
    searchPh: 'Search title, organization or skill…',
    search: 'Search',
    activeJobs: 'active jobs',
    newToday: 'new today',
    closingSoon: 'closing soon',
    orgs: 'organizations',
    latest: 'Latest jobs',
    filters: 'Filters',
    province: 'Province',
    category: 'Category',
    jobType: 'Job type',
    gender: 'Gender',
    posted: 'Posted',
    all: 'All',
    allProvinces: 'All provinces',
    allCategories: 'All categories',
    today: 'Today',
    last3: 'Last 3 days',
    lastWeek: 'Last week',
    sort: 'Sort',
    sortNew: 'Newest',
    sortDeadline: 'Deadline soonest',
    clear: 'Clear',
    clearFilters: 'Clear filters',
    showN: 'Show {n} jobs',
    foundN: '{n} jobs',
    noResults: 'No jobs match these filters',
    noResultsHint: 'Try fewer filters or a different search.',
    new: 'New',
    daysLeft: '{n} days left',
    lastDay: 'Last day',
    closed: 'Closed',
    deadline: 'Deadline',
    published: 'Published',
    location: 'Location',
    nationality: 'Nationality',
    salary: 'Salary',
    contractDuration: 'Contract duration',
    vacancyNumber: 'Vacancy number',
    positions: 'Positions',
    education: 'Education',
    experience: 'Experience',
    aboutOrg: 'About the organization',
    jobSummary: 'Job description',
    requirements: 'Requirements',
    howToApply: 'How to apply',
    applyNow: 'Apply directly',
    applyEmail: 'Apply by email',
    applyBox: 'Ways to apply for this job',
    helpTitle: 'Don’t let this opportunity slip away!',
    helpText: 'Every big success starts with one step. Contact us or visit our office for everything about applying to this job — we are with you at every step.',
    whatsapp: 'Chat on WhatsApp',
    call: 'Call us',
    office: 'Office address',
    hours: 'Working hours',
    waMsg: 'Hello Apex Job 👋\nI would like to apply for this job:\n“{title}”\nOrganization: {org}\nLocation: {loc}\nDeadline: {deadline}\nJob code: {code}',
    faqTitle: 'Common questions about this job',
    faqMore: 'Another question? Ask us on WhatsApp',
    save: 'Save',
    saved: 'Saved',
    share: 'Share',
    copied: 'Link copied',
    back: 'Back',
    home: 'Home',
    savedJobs: 'Saved',
    updates: 'Updates',
    profile: 'Profile',
    savedEmpty: 'No saved jobs yet',
    savedEmptyHint: 'Tap the bookmark on any job to keep it here.',
    newSince: '{n} new jobs since your last visit',
    updatesTitle: 'Fresh jobs',
    updatesEmpty: 'No new jobs in the last 24 hours',
    yesterday: 'Yesterday',
    earlier: 'Earlier',
    forYou: 'Picked for you',
    forYouHint: 'Based on the provinces and categories in your profile',
    popularCats: 'Popular categories',
    yourName: 'Your name',
    namePh: 'Type your name',
    favProvinces: 'Favorite provinces',
    favCategories: 'Favorite categories',
    notifications: 'Daily new-job notifications',
    notificationsHint: 'One short message a day about fresh jobs on your phone',
    notifWebHint: 'Available in the Android app.',
    theme: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    system: 'Auto',
    language: 'Language',
    contactUs: 'Contact us',
    aboutApp: 'About Apex Job',
    aboutText: 'Apex Job publishes the latest job opportunities in Afghanistan every day and stands with you so you can apply for the job you want with confidence.',
    version: 'Version',
    loading: 'Please wait…',
    error: 'Could not connect. Check your internet and try again.',
    retry: 'Try again',
    offline: 'Showing the last saved data',
    notConfigured: 'Database connection is not configured yet (see README).',
    ad: 'Ad',
    close: 'Close',
    updatedAgo: 'Updated {t}',
    getApp: 'Get the Apex Job Android app',
    getAppBtn: 'Get it',
    similar: 'Similar jobs',
    notFound: 'This job was not found or has been removed.',
    justNow: 'just now',
    minAgo: '{n} min ago',
    hourAgo: '{n} h ago',
    dayAgo: '{n} days ago',
    reminderTitle: '⭐ New jobs today',
    reminderBody: 'Fresh job opportunities were published. Take a look now.',
    moreFilters: 'More filters',
    apply: 'Apply',
    menu: 'Menu',
    seeAll: 'All',
    forWomen: 'Open to women',
    forMen: 'Open to men',
    viewNew: 'View',
    loadMore: 'Show more',
    profileHint: 'Your personal settings are stored on this device only.',
    guest: 'Guest',
    detailsOf: 'Job details',
    autoTr: 'Automatically translated from the original announcement',
    showOriginal: 'Show original',
    showTranslation: 'Show translation',
    pwaTitle: 'Install Apex Job on your phone like an app',
    pwaIos: 'In Safari, tap the Share button (square with an up arrow) and choose “Add to Home Screen”.',
    pwaBtn: 'Install',
  },
};

let current = 'fa';
try { current = localStorage.getItem('aj.lang') || 'fa'; } catch {}
if (!S[current]) current = 'fa';

export const getLang = () => current;
export const getDir = () => (LANGS.find((l) => l.code === current) || LANGS[0]).dir;

export function setLang(code) {
  if (!S[code]) return;
  current = code;
  try { localStorage.setItem('aj.lang', code); } catch {}
  applyDocumentLang();
}

export function applyDocumentLang() {
  document.documentElement.lang = current === 'fa' ? 'fa-AF' : current === 'ps' ? 'ps-AF' : 'en';
  document.documentElement.dir = getDir();
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faDigits = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[d]);
export function num(n, lang = current) {
  return lang === 'en' ? String(n) : faDigits(n);
}

export function t(key, vars = {}, lang = current) {
  let s = (S[lang] && S[lang][key]) ?? S.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(k === 'n' ? num(v, lang) : v);
  return s;
}

function fromMap(map, value, lang = current) {
  if (!value) return '';
  if (lang === 'en') return value;
  const hit = map[value];
  return hit ? hit[lang] : value;
}
export const trProvince = (v, lang) => fromMap(PROVINCES, v, lang);
export const trType = (v, lang) => fromMap(JOB_TYPES, v, lang);
export const trGender = (v, lang) => fromMap(GENDERS, v, lang);
export const trNationality = (v, lang) => fromMap(NATIONALITIES, v, lang);

/** بخش کاری ممکن است چند بخش جدا شده با کامه باشد */
export const splitCats = (v) => String(v || '').split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
export const trCategoryOne = (v, lang) => fromMap(CATEGORIES, v, lang);
export const trCategory = (v, lang = current) => splitCats(v).map((c) => trCategoryOne(c, lang)).join(lang === 'en' ? ', ' : '، ');

// ------------------------------------------------------------------ تاریخ
// تقویم هجری شمسی با نام ماه‌های افغانستان (بدون وابستگی به تنظیمات موبایل)
const MONTHS = {
  fa: ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'],
  ps: ['وری', 'غویی', 'غبرګولی', 'چنګاښ', 'زمری', 'وږی', 'تله', 'لړم', 'لیندۍ', 'مرغومی', 'سلواغه', 'کب'],
};
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toJalali(gy, gm, gd) {
  const g = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let d = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g[gm - 1];
  jy += 33 * Math.floor(d / 12053); d %= 12053;
  jy += 4 * Math.floor(d / 1461); d %= 1461;
  jy += Math.floor((d - 1) / 365);
  if (d > 365) d = (d - 1) % 365;
  const jm = d < 186 ? 1 + Math.floor(d / 31) : 7 + Math.floor((d - 186) / 30);
  const jd = 1 + (d < 186 ? d % 31 : (d - 186) % 30);
  return [jy, jm, jd];
}

export function fmtDate(iso, lang = current) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  let y, mo, d;
  if (m && String(iso).length === 10) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    const dt = new Date(iso);
    if (isNaN(dt)) return String(iso);
    y = dt.getFullYear(); mo = dt.getMonth() + 1; d = dt.getDate();
  }
  if (lang === 'en') return `${d} ${EN_MONTHS[mo - 1]} ${y}`;
  const [jy, jm, jd] = toJalali(y, mo, d);
  return `${faDigits(jd)} ${MONTHS[lang === 'ps' ? 'ps' : 'fa'][jm - 1]} ${faDigits(jy)}`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 90) return t('justNow');
  if (diff < 3600) return t('minAgo', { n: Math.round(diff / 60) });
  if (diff < 86400) return t('hourAgo', { n: Math.round(diff / 3600) });
  return t('dayAgo', { n: Math.round(diff / 86400) });
}
