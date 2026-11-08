// پرسش‌های متداول هر وظیفه — پاسخ‌ها خودکار از روی مشخصات همان وظیفه ساخته می‌شوند.
// هم در صفحه وظیفه (اپ و سایت) و هم در پنل مدیریت (پاسخ‌های آماده واتساپ) استفاده می‌شود.
import { CONFIG } from './config.js';
import { fmtDate, num, trProvince, trType, trGender, trNationality, t } from './i18n.js';

export const jobCode = (id) => `AJ-${id}`;

export const DEFAULT_SETTINGS = {
  address: CONFIG.officeAddress,
  hours: {
    fa: 'شنبه تا پنجشنبه، ساعت ۸ صبح تا ۵ عصر',
    ps: 'له شنبې تر پنجشنبې، د سهار له ۸ بجو د ماښام تر ۵ بجو',
    en: 'Saturday to Thursday, 8:00 AM – 5:00 PM',
  },
  fee: {
    fa: 'برای معلومات درباره هزینه خدمات ثبت‌نام، لطفاً در واتساپ با ما در تماس شوید.',
    ps: 'د نوم لیکنې د خدماتو د لګښت په اړه د معلوماتو لپاره، مهرباني وکړئ په واټساپ کې له موږ سره اړیکه ونیسئ.',
    en: 'For information about our application service fee, please contact us on WhatsApp.',
  },
  docs_extra: { fa: '', ps: '', en: '' },
  whatsapp: CONFIG.whatsapp,
  phone: CONFIG.phone,
};

export function mergeSettings(remote) {
  const out = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const [k, v] of Object.entries(remote || {})) {
    if (v && typeof v === 'object' && out[k] && typeof out[k] === 'object') {
      for (const [l, txt] of Object.entries(v)) if (String(txt || '').trim()) out[k][l] = txt;
    } else if (v !== null && v !== undefined && String(v).trim()) out[k] = v;
  }
  return out;
}

const pick = (obj, lang) => (obj && (obj[lang] || obj.fa)) || '';

function daysLeftOf(job) {
  if (!job.closing_date) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = job.closing_date.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - today) / 864e5);
}

const L = {
  fa: {
    q: {
      docs: 'برای این وظیفه کدام اسناد لازم است؟',
      eligible: 'آیا من شرایط این وظیفه را دارم؟',
      deadline: 'آخرین مهلت درخواست چه وقت است؟',
      how: 'درخواست چگونه ارسال می‌شود؟',
      result: 'نتیجه را چه وقت و چگونه می‌دانم؟',
      fee: 'هزینه خدمات ثبت‌نام چقدر است؟',
      office: 'آدرس و اوقات کاری شما کجاست؟',
    },
    cv: 'خلص سوانح (CV) تازه به زبان انگلیسی',
    cover: 'مکتوب درخواست (Cover Letter) مخصوص همین وظیفه',
    tazkira: 'کاپی تذکره (کاغذی یا الکترونیکی)',
    degree: (e) => `کاپی سند تحصیلی${e ? ` (${e})` : ''}`,
    expDocs: 'تصدیق‌نامه‌ها یا مکتوب‌های تجربه کاری',
    photo: 'یک قطعه عکس تازه',
    email: 'یک آدرس ایمیل فعال و شماره تماس',
    docsEnd: 'اسناد خود را با ما شریک سازید تا همه چیز را به‌طور درست و به‌موقع آماده کنیم.',
    gender: 'جنسیت', nat: 'تابعیت', edu: 'تحصیلات', exp: 'تجربه', loc: 'موقعیت', pos: 'تعداد بست',
    eligibleEnd: 'اگر این شرایط را دارید، همین اکنون اقدام کنید؛ اگر مطمئن نیستید، در واتساپ از ما بپرسید تا رهنمایی‌تان کنیم.',
    noDeadline: 'تاریخ ختم مهلت در اعلان مشخص نشده است؛ هرچه زودتر اقدام کنید.',
    deadline: (date, left) => `آخرین مهلت درخواست ${date} است${left}. لطفاً حداقل دو روز پیش از ختم مهلت با ما در تماس شوید.`,
    leftDays: (n) => ` (${num(n, 'fa')} روز باقی‌مانده)`,
    leftLast: ' (امروز روز آخر است)',
    leftClosed: ' (مهلت ختم شده است)',
    howForm: 'درخواست این وظیفه از طریق فورم آنلاین ارگان ارسال می‌شود.',
    howEmail: (e) => `درخواست این وظیفه به ایمیل ${e} ارسال می‌شود.`,
    howOther: 'درخواست طبق رهنمود درخواست که در همین صفحه آمده است ارسال می‌شود.',
    howEnd: 'ما در تمام مراحل، از آماده‌سازی اسناد تا ارسال درخواست، در کنار شما هستیم.',
    result: 'معمولاً ارگان‌ها پس از ختم مهلت، اسناد را بررسی و نامزدان شارت‌لست‌شده را برای امتحان یا مصاحبه از طریق تماس تلیفونی یا ایمیل دعوت می‌کنند. موبایل و ایمیل خود را همیشه فعال نگه دارید.',
    hours: 'اوقات کاری',
  },
  ps: {
    q: {
      docs: 'د دې دندې لپاره کوم اسناد اړین دي؟',
      eligible: 'ایا زه د دې دندې شرطونه لرم؟',
      deadline: 'د غوښتنې وروستۍ نېټه کله ده؟',
      how: 'غوښتنه څنګه لېږل کېږي؟',
      result: 'پایله به کله او څنګه معلومه کړم؟',
      fee: 'د نوم لیکنې د خدماتو لګښت څومره دی؟',
      office: 'ستاسو پته او کاري وخت څه دی؟',
    },
    cv: 'په انګلیسي ژبه تازه سي وي (CV)',
    cover: 'د همدې دندې لپاره د غوښتنې لیک (Cover Letter)',
    tazkira: 'د تذکرې کاپي (کاغذي یا برېښنايي)',
    degree: (e) => `د زده کړو د سند کاپي${e ? ` (${e})` : ''}`,
    expDocs: 'د کاري تجربې تصدیق‌نامې یا لیکونه',
    photo: 'یو تازه عکس',
    email: 'یو فعال برېښنالیک پته او د اړیکې شمېره',
    docsEnd: 'خپل اسناد له موږ سره شریک کړئ چې هر څه په سمه او پر وخت چمتو کړو.',
    gender: 'جنسیت', nat: 'تابعیت', edu: 'زده کړې', exp: 'تجربه', loc: 'ځای', pos: 'د بستونو شمېر',
    eligibleEnd: 'که دا شرطونه لرئ، همدا اوس اقدام وکړئ؛ که ډاډه نه یاست، په واټساپ کې موږ وپوښتئ چې لارښوونه مو وکړو.',
    noDeadline: 'په اعلان کې وروستۍ نېټه نه ده ټاکل شوې؛ هر څومره ژر چې کېږي اقدام وکړئ.',
    deadline: (date, left) => `د غوښتنې وروستۍ نېټه ${date} ده${left}. مهرباني وکړئ لږ تر لږه دوه ورځې مخکې له موږ سره اړیکه ونیسئ.`,
    leftDays: (n) => ` (${num(n, 'ps')} ورځې پاتې)`,
    leftLast: ' (نن وروستۍ ورځ ده)',
    leftClosed: ' (موده پای ته رسېدلې)',
    howForm: 'د دې دندې غوښتنه د ادارې د آنلاین فورمې له لارې لېږل کېږي.',
    howEmail: (e) => `د دې دندې غوښتنه ${e} برېښنالیک ته لېږل کېږي.`,
    howOther: 'غوښتنه د هغه لارښود سره سم لېږل کېږي چې په همدې پاڼه کې راغلی.',
    howEnd: 'موږ په ټولو پړاوونو کې، د اسنادو له چمتو کولو تر غوښتنې لېږلو پورې، ستاسو تر څنګ یو.',
    result: 'معمولاً ادارې د وروستۍ نېټې وروسته اسناد ګوري او لنډ لېست شوي کسان د ازموینې یا مرکې لپاره د ټلیفون یا برېښنالیک له لارې رابولي. خپل موبایل او برېښنالیک تل فعال وساتئ.',
    hours: 'کاري وخت',
  },
  en: {
    q: {
      docs: 'Which documents do I need for this job?',
      eligible: 'Am I eligible for this job?',
      deadline: 'When is the application deadline?',
      how: 'How is the application submitted?',
      result: 'When and how will I hear back?',
      fee: 'How much is the application service fee?',
      office: 'Where is your office and what are your hours?',
    },
    cv: 'An up-to-date CV in English',
    cover: 'A cover letter written for this job',
    tazkira: 'A copy of your Tazkira (paper or electronic)',
    degree: (e) => `A copy of your education certificate${e ? ` (${e})` : ''}`,
    expDocs: 'Work experience certificates or letters',
    photo: 'One recent photo',
    email: 'An active email address and phone number',
    docsEnd: 'Share your documents with us so we can prepare everything correctly and on time.',
    gender: 'Gender', nat: 'Nationality', edu: 'Education', exp: 'Experience', loc: 'Location', pos: 'Positions',
    eligibleEnd: 'If you meet these requirements, act now; if you are not sure, ask us on WhatsApp and we will guide you.',
    noDeadline: 'The announcement does not state a deadline; apply as soon as possible.',
    deadline: (date, left) => `The application deadline is ${date}${left}. Please contact us at least two days before it closes.`,
    leftDays: (n) => ` (${n} days left)`,
    leftLast: ' (today is the last day)',
    leftClosed: ' (the deadline has passed)',
    howForm: 'Applications for this job are submitted through the organization’s online form.',
    howEmail: (e) => `Applications for this job are sent by email to ${e}.`,
    howOther: 'Applications are submitted according to the instructions on this page.',
    howEnd: 'We are with you at every step, from preparing your documents to submitting the application.',
    result: 'Organizations usually review applications after the deadline and invite shortlisted candidates to a test or interview by phone or email. Keep your phone and email active.',
    hours: 'Hours',
  },
};

/** فهرست پرسش و پاسخ برای یک وظیفه */
export function buildFaq(job, settings, lang = 'fa') {
  const s = mergeSettings(settings);
  const T = L[lang] || L.fa;
  const sub = String(job.submission_html || '').toLowerCase();
  const items = [];

  // ۱) اسناد
  const docs = [T.cv];
  if (/cover\s*letter|motivation letter/.test(sub)) docs.push(T.cover);
  docs.push(T.tazkira, T.degree(job.education ? String(job.education).slice(0, 90) : ''));
  if (job.experience) docs.push(T.expDocs);
  docs.push(T.photo, T.email);
  const extra = pick(s.docs_extra, lang).trim();
  if (extra) docs.push(extra);
  items.push({ id: 'docs', q: T.q.docs, a: docs.map((d) => `• ${d}`).join('\n') + '\n\n' + T.docsEnd });

  // ۲) شرایط
  const rows = [];
  if (job.gender) rows.push(`${T.gender}: ${trGender(job.gender, lang)}`);
  if (job.nationality) rows.push(`${T.nat}: ${trNationality(job.nationality, lang)}`);
  if (job.education) rows.push(`${T.edu}: ${job.education}`);
  if (job.experience) rows.push(`${T.exp}: ${job.experience}`);
  const loc = (job.locations || []).map((p) => trProvince(p, lang)).join(lang === 'en' ? ', ' : '، ') || job.location_raw;
  if (loc) rows.push(`${T.loc}: ${loc}`);
  if (job.positions) rows.push(`${T.pos}: ${num(job.positions, lang)}`);
  if (rows.length) items.push({ id: 'eligible', q: T.q.eligible, a: rows.map((r) => `• ${r}`).join('\n') + '\n\n' + T.eligibleEnd });

  // ۳) مهلت
  const dl = daysLeftOf(job);
  const left = dl === null ? '' : dl < 0 ? T.leftClosed : dl === 0 ? T.leftLast : T.leftDays(dl);
  items.push({ id: 'deadline', q: T.q.deadline, a: job.closing_date ? T.deadline(fmtDate(job.closing_date, lang), left) : T.noDeadline });

  // ۴) روش درخواست
  const how = job.apply_url ? T.howForm : job.apply_email ? T.howEmail(job.apply_email) : T.howOther;
  items.push({ id: 'how', q: T.q.how, a: `${how} ${T.howEnd}` });

  // ۵) نتیجه
  items.push({ id: 'result', q: T.q.result, a: T.result });

  // ۶) هزینه
  items.push({ id: 'fee', q: T.q.fee, a: pick(s.fee, lang) });

  // ۷) آدرس و اوقات کاری
  items.push({ id: 'office', q: T.q.office, a: `📍 ${pick(s.address, lang)}\n🕘 ${T.hours}: ${pick(s.hours, lang)}\n📞 ${s.phone}` });

  return items;
}

/** متن کامل پیام واتساپ کاربر (بدون لینک) */
export function waMessage(job, lang) {
  const loc = (job.locations || []).map((p) => trProvince(p, lang)).join(lang === 'en' ? ', ' : '، ') || job.location_raw || '—';
  return t('waMsg', {
    title: job.title,
    org: job.organization || '—',
    loc,
    deadline: job.closing_date ? fmtDate(job.closing_date, lang) : '—',
    code: jobCode(job.id),
  }, lang);
}

/** متن معرفی کوتاه وظیفه برای پاسخ اول در واتساپ (پنل مدیریت) */
export function jobIntro(job, lang = 'fa') {
  const T = { fa: ['وظیفه', 'ارگان', 'نوعیت', 'ختم مهلت'], ps: ['دنده', 'اداره', 'ډول', 'وروستۍ نېټه'], en: ['Job', 'Organization', 'Type', 'Deadline'] }[lang] || [];
  return [
    `📌 ${T[0]}: ${job.title}`,
    `🏢 ${T[1]}: ${job.organization || '—'}`,
    job.job_type ? `💼 ${T[2]}: ${trType(job.job_type, lang)}` : '',
    job.closing_date ? `⏳ ${T[3]}: ${fmtDate(job.closing_date, lang)}` : '',
    `🔖 ${jobCode(job.id)}`,
  ].filter(Boolean).join('\n');
}
