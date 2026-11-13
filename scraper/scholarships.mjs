// جمع‌آوری خودکار بورسیه‌های تحصیلی — توسط GitHub Actions اجرا می‌شود.
// متغیرهای محیطی: SUPABASE_URL, SUPABASE_SECRET_KEY
// اختیاری: SCH_MAX_PAGES (پیش‌فرض 8), SCH_MAX_DETAILS (پیش‌فرض 120), DELAY_MS (پیش‌فرض 1200)
import { createClient } from '@supabase/supabase-js';
import { appendFileSync } from 'node:fs';
import { parseScholarshipList, parseScholarshipDetail } from './sch-parse.mjs';

const BASE = process.env.SCH_SOURCE_BASE || 'https://scholarships.af';
const MAX_PAGES = Number(process.env.SCH_MAX_PAGES || 8);
const MAX_DETAILS = Number(process.env.SCH_MAX_DETAILS || 120);
const DELAY_MS = Number(process.env.DELAY_MS || 1200);
const LEVELS = [['bachelor', 'Bachelor'], ['master', 'master'], ['phd', 'phd'], ['postdoc', 'postdoc']];

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_URL و SUPABASE_SECRET_KEY تنظیم نشده‌اند.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; ApexJobBot/1.0)', 'Accept-Language': 'en' };

async function fetchRes(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) { lastErr = e; await sleep(2000 * (i + 1)); }
  }
  throw new Error(`${url} → ${lastErr?.message}`);
}
const fetchHtml = async (url) => { const r = await fetchRes(url); return r ? r.text() : ''; };

// ---------------------------------------------------------------- پیدا کردن لینک‌ها
/** لینک‌ها با نشانه مقطع تحصیلی: url → Set(levels) */
async function discover(known) {
  const found = new Map();
  const add = (url, level) => {
    if (!found.has(url)) found.set(url, new Set());
    if (level) found.get(url).add(level);
  };

  // ۱) WordPress REST API (اگر باز باشد)
  for (const base of ['job', 'jobs', 'job_listing', 'job-listings']) {
    try {
      const res = await fetchRes(`${BASE}/wp-json/wp/v2/${base}?per_page=100&page=1&_fields=link`, 1);
      if (!res || !(res.headers.get('content-type') || '').includes('json')) continue;
      const first = await res.json();
      if (!Array.isArray(first)) continue;
      const pages = Number(res.headers.get('x-wp-totalpages') || 1);
      first.forEach((p) => p.link && add(p.link.replace(/\/?$/, '/')));
      for (let pg = 2; pg <= Math.min(pages, MAX_PAGES); pg++) {
        const r = await fetchRes(`${BASE}/wp-json/wp/v2/${base}?per_page=100&page=${pg}&_fields=link`, 2);
        if (!r) break;
        (await r.json()).forEach((p) => p.link && add(p.link.replace(/\/?$/, '/')));
        await sleep(DELAY_MS);
      }
      console.log(`REST API (${base}): ${found.size} لینک`);
      break;
    } catch { /* REST بسته است */ }
  }

  // ۲) صفحات فهرست هر مقطع تحصیلی
  const listPage = async (query, level) => {
    let emptyStreak = 0;
    for (let p = 1; p <= MAX_PAGES; p++) {
      const urls = p === 1
        ? [`${BASE}/opportunities/?${query}`]
        : [`${BASE}/opportunities/page/${p}/?${query}`, `${BASE}/opportunities/?${query}&paged=${p}`];
      let items = [];
      for (const u of urls) {
        try { items = parseScholarshipList(await fetchHtml(u), BASE); } catch (e) { console.warn(`× ${u}: ${e.message}`); }
        if (items.length) break;
      }
      if (!items.length) break;
      const before = found.size;
      items.forEach((it) => add(it.url, level));
      const fresh = items.filter((it) => !known.has(it.url)).length;
      emptyStreak = fresh ? 0 : emptyStreak + 1;
      if (found.size === before && p > 1) break; // صفحه تکراری
      if (emptyStreak >= 2) break;
      await sleep(DELAY_MS);
    }
  };
  for (const [level, q] of LEVELS) await listPage(`level=${encodeURIComponent(q)}&job_type=scholarship`, level);
  await listPage('job_type=scholarship', '');
  return found;
}

// ---------------------------------------------------------------- لوگو در حافظه خود ما
const logoCache = new Map();
async function rehostLogo(orgKeyValue, src) {
  if (!src || !orgKeyValue) return null;
  if (logoCache.has(orgKeyValue)) return logoCache.get(orgKeyValue);
  try {
    const res = await fetchRes(src, 2);
    const type = res?.headers.get('content-type') || '';
    if (!res || !/^image\//.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1024 * 1024) return null;
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('svg') ? 'svg' : type.includes('gif') ? 'gif' : 'jpg';
    const path = `orgs/${orgKeyValue}.${ext}`;
    const { error } = await db.storage.from('logos').upload(path, buf, { contentType: type, upsert: true, cacheControl: '2592000' });
    if (error) throw error;
    const urlOut = db.storage.from('logos').getPublicUrl(path).data.publicUrl;
    logoCache.set(orgKeyValue, urlOut);
    return urlOut;
  } catch (e) {
    console.warn(`  لوگو ذخیره نشد (${orgKeyValue}): ${e.message}`);
    return null;
  }
}

async function setMeta(value) {
  await db.from('meta').upsert({ key: 'last_scholarship_scrape', value, updated_at: new Date().toISOString() });
}

async function main() {
  const started = Date.now();
  // آدرس‌ها و لوگوهای موجود
  const known = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('scholarships').select('source_url,org_key,org_logo').range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => { known.add(r.source_url); if (r.org_logo && r.org_key) logoCache.set(r.org_key, r.org_logo); });
    if (data.length < 1000) break;
  }
  console.log(`بورسیه‌های موجود: ${known.size}`);

  const found = await discover(known);
  const queue = [...found.keys()].filter((u) => !known.has(u));
  console.log(`لینک‌های پیدا شده: ${found.size} — تازه: ${queue.length}`);

  let added = 0, skipped = 0, failed = 0;
  for (const url of queue.slice(0, MAX_DETAILS)) {
    try {
      const html = await fetchHtml(url);
      if (!html) { skipped++; continue; }
      const s = parseScholarshipDetail(html, url);
      if (!s.title) throw new Error('عنوان پیدا نشد');
      const hinted = [...(found.get(url) || [])];
      const levels = [...new Set([...s.levels.filter((l) => l !== 'other'), ...hinted])];
      if (!s.is_scholarship && !hinted.length) { skipped++; continue; }
      const logo = await rehostLogo(s.org_key, s.org_logo_src);
      const { is_scholarship, org_logo_src, ...row } = s;
      row.levels = levels.length ? levels : s.levels;
      row.org_logo = logo;
      row.updated_at = new Date().toISOString();
      const { error } = await db.from('scholarships').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      added++;
      console.log(`+ ${row.id} ${row.title} — ${row.organization} [${row.countries.join(',')}] ${row.levels.join('/')}`);
    } catch (e) {
      failed++;
      console.warn(`× ${url}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  // پاک‌سازی: ۳۰ روز پس از ختم مهلت، یا یک سال بدون مهلت مشخص
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString();
  const r1 = await db.from('scholarships').delete({ count: 'exact' }).lt('deadline', cutoff);
  const r2 = await db.from('scholarships').delete({ count: 'exact' }).is('deadline', null).lt('first_seen_at', yearAgo);
  const removed = (r1.count || 0) + (r2.count || 0);

  const summary = { at: new Date().toISOString(), ok: true, added, skipped, failed, removed, seconds: Math.round((Date.now() - started) / 1000) };
  await setMeta(summary);
  console.log('خلاصه:', summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Apex Job — بورسیه‌ها\n\n| تازه | ردشده | ناموفق | حذف‌شده | زمان |\n|---|---|---|---|---|\n| ${added} | ${skipped} | ${failed} | ${removed} | ${summary.seconds}s |\n`);
  }
  if (added === 0 && failed > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error('خطا:', e.message);
  try { await setMeta({ at: new Date().toISOString(), ok: false, error: String(e.message).slice(0, 300) }); } catch {}
  process.exit(1);
});
