// ترجمه خودکار عنوان و جزئیات وظایف به دری (اصطلاحات افغانستان) و پښتو
// - اگر GEMINI_API_KEY تنظیم شده باشد: ترجمه با مدل هوش مصنوعی Gemini (کیفیت بهتر و ادبی)
// - در غیر آن: Google Translate رایگان (دری افغانستان fa-AF و پښتو)
// متغیرهای محیطی: SUPABASE_URL, SUPABASE_SECRET_KEY
// اختیاری: GEMINI_API_KEY, GEMINI_MODEL, MAX_TRANSLATE (پیش‌فرض 25)
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { fileURLToPath } from 'node:url';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, GEMINI_API_KEY } = process.env;
const MAX = Number(process.env.MAX_TRANSLATE || 25);
const MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-2.5-flash'].filter(Boolean);

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && (!SUPABASE_URL || !SUPABASE_SECRET_KEY)) {
  console.error('SUPABASE_URL و SUPABASE_SECRET_KEY تنظیم نشده‌اند.');
  process.exit(1);
}
const db = isMain ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } }) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HTML_FIELDS = ['about_html', 'summary_html', 'requirements_html', 'submission_html'];
const TEXT_FIELDS = ['education', 'experience', 'salary', 'contract_duration'];

// واژه‌های ایرانی ← اصطلاحات ادبی دری افغانستان (برای اطمینان پس از ترجمه)
const AFGHAN_TERMS = [
  ['کارشناسی ارشد', 'ماستری'], ['کارشناسی', 'لیسانس'], ['دکترای', 'دوکتورای'], ['دکترا', 'دوکتورا'],
  ['دانشگاه‌ها', 'پوهنتون‌ها'], ['دانشگاه', 'پوهنتون'], ['دانشکده', 'پوهنځی'], ['دانشجویان', 'محصلان'], ['دانشجو', 'محصل'],
  ['دانش‌آموزان', 'شاگردان'], ['دانش‌آموز', 'شاگرد'], ['دبیرستان', 'لیسه'], ['آموزش و پرورش', 'معارف'],
  ['بیمارستان', 'شفاخانه'], ['درمانگاه', 'کلینیک'], ['پزشکان', 'داکتران'], ['پزشک', 'داکتر'], ['دکتر', 'داکتر'],
  ['پرستار', 'نرس'], ['بهداشت', 'صحت'], ['شهرستان', 'ولسوالی'], ['استان‌ها', 'ولایات'], ['استان', 'ولایت'],
  ['حقوق و مزایا', 'معاش و امتیازات'], ['حقوق ماهانه', 'معاش ماهوار'], ['ماهانه', 'ماهوار'], ['رزومه', 'خلص سوانح'],
  ['گواهینامه', 'تصدیق‌نامه'], ['مدارک', 'اسناد'], ['آگهی', 'اعلان'],
  ['مهندسی', 'انجنیری'], ['مهندسان', 'انجنیران'], ['مهندس', 'انجنیر'], ['تلفن', 'تیلیفون'], ['اینترنت', 'انترنت'],
  ['کامپیوتر', 'کمپیوتر'], ['رایانه', 'کمپیوتر'], ['خودرو', 'موتر'], ['رانندگی', 'دریوری'], ['راننده', 'دریور'],
  ['سازمان‌های غیردولتی', 'مؤسسات غیردولتی'], ['سازمان غیردولتی', 'مؤسسه غیردولتی'], ['شهرداری', 'شاروالی'],
  ['اردیبهشت', 'ثور'], ['فروردین', 'حمل'], ['خرداد', 'جوزا'], ['مرداد', 'اسد'], ['شهریور', 'سنبله'],
  ['آبان', 'عقرب'], ['آذر', 'قوس'], ['بهمن', 'دلو'], ['اسفند', 'حوت'],
];
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function afghanize(text) {
  if (!text) return text;
  let out = text;
  // فقط کلمه کامل (مثلاً «استان» در «استاندارد» تغییر نمی‌کند)
  for (const [ir, af] of AFGHAN_TERMS) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\u200c])${escRe(ir)}(?=$|[^\\p{L}]|\\u200c|ی(?:$|[^\\p{L}]))`, 'gu'), af);
  }
  return out;
}

function cleanHtml(html) {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h3', 'h4', 'h5', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'div', 'span'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
}

// ---------------------------------------------------------------- Gemini
const PROMPT = `You are a professional translator for an Afghan job portal.
Translate the JSON values below from English into:
1) "fa": Dari (Afghan Persian) — formal, literary Afghan Dari as used in official Afghan job announcements.
   Always use Afghan terms: پوهنتون (not دانشگاه), پوهنځی, لیسانس (not کارشناسی), ماستری (not کارشناسی ارشد), معاش (not حقوق), ماهوار,
   شفاخانه (not بیمارستان), داکتر (not پزشک), ولایت (not استان), ولسوالی (not شهرستان), خلص سوانح (not رزومه), وظیفه (not شغل),
   اعلان (not آگهی), تصدیق‌نامه (not گواهینامه), اسناد (not مدارک), مکتوب (not نامه), انجنیر/انجنیری (not مهندس), تیلیفون, انترنت, کمپیوتر, موتر, شاروالی, مؤسسه.
2) "ps": Pashto — standard Afghan Pashto.
Rules: keep every HTML tag and attribute exactly; translate only visible text. Do NOT translate or change URLs, email addresses, phone numbers,
vacancy/reference numbers, organization names, acronyms (e.g. UNICEF, NGO, M&E, WASH), software names, or English job-specific proper nouns.
Return ONLY JSON of the form {"fa": {...same keys...}, "ps": {...same keys...}}. Empty values stay empty.`;

async function geminiTranslate(payload) {
  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nJSON:\n${JSON.stringify(payload)}` }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(120000),
        });
        if (res.status === 404) { lastErr = new Error(`model ${model} not found`); break; }
        if (res.status === 429 || res.status >= 500) { lastErr = new Error(`HTTP ${res.status}`); await sleep(15000 * (attempt + 1)); continue; }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
        const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
        if (!json.fa || !json.ps) throw new Error('پاسخ ناقص');
        return json;
      } catch (e) {
        lastErr = e;
        await sleep(3000);
      }
    }
  }
  throw lastErr || new Error('Gemini ناموفق');
}

// ---------------------------------------------------------------- Google Translate (رایگان، بدون کلید)
async function gtx(text, tl) {
  const body = new URLSearchParams({ q: text });
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}&dt=t`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (compatible; ApexJobBot/1.0)' },
      body,
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const data = await res.json();
      return (data?.[0] || []).map((seg) => seg?.[0] || '').join('');
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error('Google Translate ناموفق');
}

let gtxDari = 'fa-AF';
async function gtxLang(text, lang) {
  if (lang === 'ps') return gtx(text, 'ps');
  try { return await gtx(text, gtxDari); }
  catch (e) { if (gtxDari !== 'fa') { gtxDari = 'fa'; return gtx(text, 'fa'); } throw e; }
}

const SKIP_RE = /^(https?:\/\/\S+|[\w.+-]+@[\w.-]+\.\w+|[\d\s\-+()./:]+)$/;

/** ترجمه فهرستی از متن‌ها با حفظ ترتیب (هر خط یک بخش) */
async function gtxLines(lines, lang) {
  const out = new Array(lines.length);
  let batch = [];
  let size = 0;
  const flush = async () => {
    if (!batch.length) return;
    const joined = batch.map((b) => b.text.replace(/\n/g, ' ')).join('\n');
    const tr = (await gtxLang(joined, lang)).split('\n');
    if (tr.length === batch.length) batch.forEach((b, i) => { out[b.i] = tr[i]; });
    else for (const b of batch) out[b.i] = await gtxLang(b.text, lang);
    batch = []; size = 0;
    await sleep(400);
  };
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i];
    if (!s || !s.trim() || SKIP_RE.test(s.trim())) { out[i] = s; continue; }
    if (size + s.length > 3500) await flush();
    batch.push({ i, text: s }); size += s.length + 1;
  }
  await flush();
  return out;
}

async function gtxHtml(html, lang) {
  if (!html) return '';
  const $ = cheerio.load(html, null, false);
  const nodes = [];
  const walk = (n) => {
    if (n.type === 'text') { if (n.data.trim()) nodes.push(n); return; }
    if (n.type === 'tag' && n.tagName === 'a' && /^(https?:|mailto:)/.test(n.attribs?.href || '') && $(n).text().trim() === (n.attribs.href || '').replace(/^mailto:/, '')) return;
    (n.children || []).forEach(walk);
  };
  $.root().toArray().forEach(walk);
  const tr = await gtxLines(nodes.map((n) => n.data.trim()), lang);
  nodes.forEach((n, i) => { const lead = n.data.match(/^\s*/)[0]; const tail = n.data.match(/\s*$/)[0]; n.data = lead + (tr[i] ?? n.data.trim()) + tail; });
  return $.html();
}

async function googleTranslate(payload) {
  const result = { fa: {}, ps: {} };
  for (const lang of ['fa', 'ps']) {
    const textKeys = Object.keys(payload).filter((k) => !k.endsWith('_html'));
    const tr = await gtxLines(textKeys.map((k) => payload[k] || ''), lang);
    textKeys.forEach((k, i) => { result[lang][k] = tr[i] || ''; });
    for (const k of Object.keys(payload).filter((k) => k.endsWith('_html'))) result[lang][k] = await gtxHtml(payload[k], lang);
  }
  return result;
}

// ---------------------------------------------------------------- اجرا
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: jobs, error } = await db.from('jobs')
    .select(['id', 'title', ...HTML_FIELDS, ...TEXT_FIELDS].join(','))
    .is('translated_at', null)
    .or(`closing_date.gte.${today},closing_date.is.null`)
    .order('first_seen_at', { ascending: false })
    .limit(MAX);
  if (error) throw error;
  const provider = GEMINI_API_KEY ? 'Gemini' : 'Google Translate';
  console.log(`ترجمه با ${provider} — ${jobs.length} وظیفه در صف`);

  let ok = 0, failed = 0;
  for (const job of jobs) {
    const payload = { title: job.title };
    for (const k of [...TEXT_FIELDS, ...HTML_FIELDS]) payload[k] = job[k] || '';
    try {
      let tr;
      try { tr = GEMINI_API_KEY ? await geminiTranslate(payload) : await googleTranslate(payload); }
      catch (e) {
        if (!GEMINI_API_KEY) throw e;
        console.warn(`  Gemini ناموفق (${e.message}) — Google Translate`);
        tr = await googleTranslate(payload);
      }
      const out = {};
      const titles = {};
      for (const lang of ['fa', 'ps']) {
        const src = tr[lang] || {};
        const fix = lang === 'fa' ? afghanize : (x) => x;
        titles[lang] = fix(String(src.title || '').trim()) || job.title;
        out[lang] = {};
        for (const k of TEXT_FIELDS) out[lang][k] = job[k] ? fix(String(src[k] || '').trim()) : '';
        for (const k of HTML_FIELDS) out[lang][k] = job[k] ? cleanHtml(fix(String(src[k] || ''))) : '';
      }
      const { error: upErr } = await db.from('jobs').update({ title_tr: titles, tr: out, translated_at: new Date().toISOString() }).eq('id', job.id);
      if (upErr) throw upErr;
      ok++;
      console.log(`✓ ${job.id} ${job.title} → ${titles.fa}`);
    } catch (e) {
      failed++;
      console.warn(`× ${job.id}: ${e.message}`);
    }
    await sleep(GEMINI_API_KEY ? 6000 : 800);
  }
  console.log(`ترجمه شد: ${ok} — ناموفق: ${failed}`);
}

export { googleTranslate, afghanize, cleanHtml };

if (isMain) main().catch((e) => { console.error('خطا:', e.message); process.exit(1); });
