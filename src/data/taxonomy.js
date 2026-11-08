// فهرست ولایت‌ها، بخش‌ها و انواع قرارداد با ترجمه سه‌زبانه.
// این فایل هم در اپ و هم در اسکریپر استفاده می‌شود.

export const PROVINCES = {
  'Badakhshan':    { fa: 'بدخشان',     ps: 'بدخشان' },
  'Badghis':       { fa: 'بادغیس',     ps: 'بادغیس' },
  'Baghlan':       { fa: 'بغلان',      ps: 'بغلان' },
  'Balkh':         { fa: 'بلخ',        ps: 'بلخ' },
  'Bamian':        { fa: 'بامیان',     ps: 'بامیان' },
  'Daikondi':      { fa: 'دایکندی',    ps: 'دایکنډي' },
  'Farah':         { fa: 'فراه',       ps: 'فراه' },
  'Faryab':        { fa: 'فاریاب',     ps: 'فاریاب' },
  'Ghazni':        { fa: 'غزنی',       ps: 'غزني' },
  'Ghowr':         { fa: 'غور',        ps: 'غور' },
  'Helmand':       { fa: 'هلمند',      ps: 'هلمند' },
  'Herat':         { fa: 'هرات',       ps: 'هرات' },
  'Jawzjan':       { fa: 'جوزجان',     ps: 'جوزجان' },
  'Kabul':         { fa: 'کابل',       ps: 'کابل' },
  'Kandahar':      { fa: 'کندهار',     ps: 'کندهار' },
  'Kapisa':        { fa: 'کاپیسا',     ps: 'کاپیسا' },
  'Khost':         { fa: 'خوست',       ps: 'خوست' },
  'Kunar':         { fa: 'کنر',        ps: 'کونړ' },
  'Kunduz':        { fa: 'کندز',       ps: 'کندز' },
  'Laghman':       { fa: 'لغمان',      ps: 'لغمان' },
  'Logar':         { fa: 'لوگر',       ps: 'لوګر' },
  'Maidan Wardak': { fa: 'میدان وردک', ps: 'میدان وردګ' },
  'Nangarhar':     { fa: 'ننگرهار',    ps: 'ننګرهار' },
  'Nimruz':        { fa: 'نیمروز',     ps: 'نیمروز' },
  'Nuristan':      { fa: 'نورستان',    ps: 'نورستان' },
  'Oruzgan':       { fa: 'ارزگان',     ps: 'اروزګان' },
  'Paktia':        { fa: 'پکتیا',      ps: 'پکتیا' },
  'Paktika':       { fa: 'پکتیکا',     ps: 'پکتیکا' },
  'Panjshir':      { fa: 'پنجشیر',     ps: 'پنجشیر' },
  'Parwan':        { fa: 'پروان',      ps: 'پروان' },
  'Samangan':      { fa: 'سمنگان',     ps: 'سمنګان' },
  'Sar-e Pol':     { fa: 'سرپل',       ps: 'سرپل' },
  'Takhar':        { fa: 'تخار',       ps: 'تخار' },
  'Zabul':         { fa: 'زابل',       ps: 'زابل' },
};

// املاهای مختلف نام ولایت‌ها → نام استاندارد
export const PROVINCE_ALIASES = {
  'bamyan': 'Bamian', 'bamiyan': 'Bamian', 'daykundi': 'Daikondi', 'daikundi': 'Daikondi',
  'ghor': 'Ghowr', 'ghowr': 'Ghowr', 'uruzgan': 'Oruzgan', 'urozgan': 'Oruzgan', 'oruzgan': 'Oruzgan',
  'wardak': 'Maidan Wardak', 'maidan wardak': 'Maidan Wardak', 'maydan wardak': 'Maidan Wardak',
  'nimroz': 'Nimruz', 'nimruz': 'Nimruz', 'sar-e-pul': 'Sar-e Pol', 'sar-e pul': 'Sar-e Pol',
  'sar-e pol': 'Sar-e Pol', 'sari pul': 'Sar-e Pol', 'sar-i-pul': 'Sar-e Pol', 'sarepul': 'Sar-e Pol',
  'jowzjan': 'Jawzjan', 'jawzjan': 'Jawzjan', 'paktya': 'Paktia', 'panjsher': 'Panjshir',
  'mazar': 'Balkh', 'mazar-e-sharif': 'Balkh', 'mazar-i-sharif': 'Balkh', 'jalalabad': 'Nangarhar',
  'kundoz': 'Kunduz', 'konar': 'Kunar', 'helmend': 'Helmand', 'kandhar': 'Kandahar',
  'lashkargah': 'Helmand', 'pul-e-khumri': 'Baghlan', 'faizabad': 'Badakhshan', 'sheberghan': 'Jawzjan',
  'taloqan': 'Takhar', 'gardez': 'Paktia', 'charikar': 'Parwan', 'mehtarlam': 'Laghman',
};

export function normalizeProvinces(raw) {
  if (!raw) return [];
  const text = ' ' + String(raw).toLowerCase().replace(/[(),;/|•\n]+/g, ' , ') + ' ';
  const found = [];
  const add = (p) => { if (p && !found.includes(p)) found.push(p); };
  for (const name of Object.keys(PROVINCES)) {
    if (text.includes(' ' + name.toLowerCase() + ' ') || text.includes(' ' + name.toLowerCase() + ',') ||
        text.includes(' ' + name.toLowerCase() + '-')) add(name);
  }
  for (const [alias, name] of Object.entries(PROVINCE_ALIASES)) {
    const re = new RegExp('(^|[\\s,\\-])' + alias.replace(/[-]/g, '\\-') + '([\\s,\\-]|$)');
    if (re.test(text)) add(name);
  }
  return found;
}

export const CATEGORIES = {
  'Accounting':                   { fa: 'محاسبه و حسابداری',    ps: 'محاسبه' },
  'Admin-Clerical':               { fa: 'اداری و دفتری',        ps: 'اداري او دفتري' },
  'Agriculture':                  { fa: 'زراعت',                ps: 'کرنه' },
  'Automotive':                   { fa: 'موتر و وسایط',         ps: 'موټر او وسایط' },
  'Banking':                      { fa: 'بانکداری',             ps: 'بانکداري' },
  'Biotech':                      { fa: 'بیوتکنالوژی',          ps: 'بیوټکنالوژي' },
  'Business Development':         { fa: 'انکشاف تجارت',         ps: 'د سوداګرۍ پراختیا' },
  'Capacity Building':            { fa: 'ارتقای ظرفیت',         ps: 'ظرفیت لوړونه' },
  'Communication':                { fa: 'ارتباطات',             ps: 'اړیکې' },
  'Construction':                 { fa: 'ساختمان',              ps: 'ودانۍ' },
  'Consultant':                   { fa: 'مشاوریت',              ps: 'سلاکاري' },
  'Coordination':                 { fa: 'هماهنگی',              ps: 'همغږي' },
  'Customer Service':             { fa: 'خدمات مشتریان',        ps: 'د پیرودونکو خدمات' },
  'Design':                       { fa: 'دیزاین',               ps: 'ډیزاین' },
  'Distribution-Shipping':        { fa: 'توزیع و حمل',          ps: 'وېش او لېږد' },
  'Education':                    { fa: 'تعلیم و تربیه',        ps: 'ښوونه او روزنه' },
  'Engineering':                  { fa: 'انجنیری',              ps: 'انجنیري' },
  'Entry Level':                  { fa: 'سطح ابتدایی',          ps: 'لومړنۍ کچه' },
  'Executive':                    { fa: 'اجرائیوی',             ps: 'اجرائیوي' },
  'Facilities':                   { fa: 'تسهیلات',              ps: 'اسانتیاوې' },
  'Finance':                      { fa: 'امور مالی',            ps: 'مالي چارې' },
  'Franchise':                    { fa: 'نمایندگی',             ps: 'استازولي' },
  'General':                      { fa: 'عمومی',                ps: 'عمومي' },
  'General Business':             { fa: 'تجارت عمومی',          ps: 'عمومي سوداګري' },
  'General Labor':                { fa: 'کارگری عمومی',         ps: 'عمومي کارګري' },
  'Government':                   { fa: 'دولتی',                ps: 'دولتي' },
  'Grocery':                      { fa: 'مواد غذایی',           ps: 'خوراکي توکي' },
  'Health Care':                  { fa: 'صحت',                  ps: 'روغتیا' },
  'Hospitality-Hotel':            { fa: 'هوتلداری',             ps: 'هوټلداري' },
  'Human Resources':              { fa: 'منابع بشری',           ps: 'بشري سرچینې' },
  'Information Technology':       { fa: 'تکنالوژی معلوماتی',    ps: 'معلوماتي ټکنالوژي' },
  'Installation-Maint-Repair':    { fa: 'نصب و ترمیم',          ps: 'نصب او ترمیم' },
  'Insurance':                    { fa: 'بیمه',                 ps: 'بیمه' },
  'Inventory':                    { fa: 'گدام و موجودی',        ps: 'ګودام او زېرمه' },
  'IT':                           { fa: 'آی‌تی',                ps: 'آی ټي' },
  'Legal':                        { fa: 'حقوقی',                ps: 'حقوقي' },
  'Management':                   { fa: 'مدیریت',               ps: 'مدیریت' },
  'Marketing':                    { fa: 'بازاریابی',            ps: 'بازارموندنه' },
  'Media-Journalism':             { fa: 'رسانه و ژورنالیزم',    ps: 'رسنۍ او ژورنالیزم' },
  'Monitoring and Evaluation':    { fa: 'نظارت و ارزیابی',      ps: 'څارنه او ارزونه' },
  'Natural Resources Management': { fa: 'مدیریت منابع طبیعی',   ps: 'د طبیعي سرچینو مدیریت' },
  'Nonprofit-Social Services':    { fa: 'خدمات اجتماعی',        ps: 'ټولنیز خدمات' },
  'Nurse':                        { fa: 'نرسنگ',                ps: 'نرسنګ' },
  'Other':                        { fa: 'متفرقه',               ps: 'نور' },
  'Pharmaceutical':               { fa: 'دواسازی',              ps: 'درمل جوړونه' },
  'Professional Services':        { fa: 'خدمات مسلکی',          ps: 'مسلکي خدمات' },
  'Program':                      { fa: 'پروگرام',              ps: 'پروګرام' },
  'Purchasing-Procurement':       { fa: 'تدارکات',              ps: 'تدارکات' },
  'QA-Quality Control':           { fa: 'کنترول کیفیت',         ps: 'د کیفیت کنټرول' },
  'Real Estate':                  { fa: 'املاک',                ps: 'املاک' },
  'Research':                     { fa: 'تحقیق',                ps: 'څېړنه' },
  'Restaurant-Food Service':      { fa: 'رستورانت',             ps: 'رستورانت' },
  'Retail':                       { fa: 'پرچون‌فروشی',          ps: 'پرچون پلور' },
  'Sales':                        { fa: 'فروش',                 ps: 'پلور' },
  'Science':                      { fa: 'علوم',                 ps: 'ساینس' },
  'Security':                     { fa: 'امنیت',                ps: 'امنیت' },
  'Skilled Labor':                { fa: 'کارگر ماهر',           ps: 'مسلکي کارګر' },
  'Strategy-Planning':            { fa: 'ستراتیژی و پلان‌گذاری', ps: 'ستراتیژي او پلان جوړونه' },
  'Supply Chain':                 { fa: 'زنجیره اکمالات',       ps: 'د اکمالاتو لړۍ' },
  'Support':                      { fa: 'خدمات حمایوی',         ps: 'ملاتړ' },
  'Telecom':                      { fa: 'مخابرات',              ps: 'مخابرات' },
  'Telecommunications':           { fa: 'مخابرات',              ps: 'مخابرات' },
  'Training':                     { fa: 'آموزش و تربیه',        ps: 'روزنه' },
  'Translator':                   { fa: 'ترجمانی',              ps: 'ژباړه' },
  'Transportation':               { fa: 'ترانسپورت',            ps: 'ترانسپورت' },
  'Veterinary Services':          { fa: 'خدمات وترنری',         ps: 'وترنري خدمات' },
  'Warehouse':                    { fa: 'گدام',                 ps: 'ګودام' },
};

export const JOB_TYPES = {
  'Full Time':   { fa: 'تمام وقت',   ps: 'بشپړ وخت' },
  'Part Time':   { fa: 'نیمه وقت',   ps: 'نیم وخت' },
  'Contract':    { fa: 'قراردادی',   ps: 'قراردادي' },
  'Consultancy': { fa: 'مشاوریت',    ps: 'مشورتي' },
  'Internship':  { fa: 'کارآموزی',   ps: 'کارزده کړه' },
  'Volunteer':   { fa: 'رضاکارانه',  ps: 'رضاکارانه' },
  'Temporary':   { fa: 'موقت',       ps: 'لنډمهاله' },
};

export const GENDERS = {
  'Male':        { fa: 'مرد',       ps: 'نارینه' },
  'Female':      { fa: 'زن',        ps: 'ښځینه' },
  'Male/Female': { fa: 'مرد / زن',  ps: 'نارینه / ښځینه' },
  'Any':         { fa: 'تفاوت ندارد', ps: 'توپیر نه لري' },
};

export const NATIONALITIES = {
  'Afghan':        { fa: 'افغان',       ps: 'افغان' },
  'National':      { fa: 'افغان (ملی)', ps: 'افغان (ملي)' },
  'International': { fa: 'بین‌المللی',  ps: 'نړیوال' },
  'Any':           { fa: 'تفاوت ندارد', ps: 'توپیر نه لري' },
};

export function normalizeGender(v) {
  const s = String(v || '').toLowerCase().replace(/\s+/g, '');
  if (!s) return '';
  const f = s.includes('female');
  const m = s.replace(/female/g, '').includes('male');
  if ((m && f) || s.includes('both') || s.includes('m/f')) return 'Male/Female';
  if (f) return 'Female';
  if (m) return 'Male';
  if (s.includes('any')) return 'Any';
  return String(v).trim();
}

export function normalizeJobType(v) {
  const s = String(v || '').toLowerCase();
  if (!s) return '';
  for (const k of Object.keys(JOB_TYPES)) if (s.includes(k.toLowerCase())) return k;
  if (s.includes('consult')) return 'Consultancy';
  if (s.includes('intern')) return 'Internship';
  if (s.includes('volunt')) return 'Volunteer';
  return String(v).trim();
}
