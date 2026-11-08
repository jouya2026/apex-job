// اسکریپر خودکار وظایف — توسط GitHub Actions هر چند ساعت اجرا می‌شود.
// متغیرهای محیطی: SUPABASE_URL, SUPABASE_SECRET_KEY
// اختیاری: MAX_PAGES (پیش‌فرض 15), MAX_DETAILS (پیش‌فرض 300), DELAY_MS (پیش‌فرض 900)
import { createClient } from '@supabase/supabase-js';
import { appendFileSync } from 'node:fs';
import { parseListPage, parseDetailPage } from './parse.mjs';

const SOURCE_BASE = process.env.SOURCE_BASE || 'https://www.acbar.org';
const LIST_URL = (p) => `${SOURCE_BASE}/en/jobs${p > 1 ? `?page=${p}` : ''}`;
const MAX_PAGES = Number(process.env.MAX_PAGES || 15);
const MAX_DETAILS = Number(process.env.MAX_DETAILS || 300);
const DELAY_MS = Number(process.env.DELAY_MS || 900);
const KEEP_DAYS_AFTER_CLOSE = 45;

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_URL و SUPABASE_SECRET_KEY تنظیم نشده‌اند.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchHtml(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ApexJobBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(2000 * (i + 1));
    }
  }
  throw new Error(`${url} → ${lastErr?.message}`);
}

async function existingIds() {
  const ids = new Set();
  let from = 0;
  for (;;) {
    const { data, error } = await db.from('jobs').select('id').range(from, from + 999);
    if (error) throw error;
    data.forEach((r) => ids.add(Number(r.id)));
    if (data.length < 1000) break;
    from += 1000;
  }
  return ids;
}

async function setMeta(value) {
  await db.from('meta').upsert({ key: 'last_scrape', value, updated_at: new Date().toISOString() });
}

async function main() {
  const started = Date.now();
  const known = await existingIds();
  console.log(`وظایف موجود در دیتابیس: ${known.size}`);

  // ۱) جمع‌آوری لینک‌های جدید از صفحات لیست
  const queue = [];
  let emptyStreak = 0;
  for (let p = 1; p <= MAX_PAGES; p++) {
    let items;
    try {
      items = parseListPage(await fetchHtml(LIST_URL(p)), SOURCE_BASE);
    } catch (e) {
      console.warn(`صفحه ${p} خوانده نشد: ${e.message}`);
      if (p === 1) throw e;
      break;
    }
    if (!items.length) break;
    const fresh = items.filter((it) => !known.has(it.id) && !queue.some((q) => q.id === it.id));
    queue.push(...fresh);
    console.log(`صفحه ${p}: ${items.length} وظیفه، ${fresh.length} جدید`);
    emptyStreak = fresh.length ? 0 : emptyStreak + 1;
    if (emptyStreak >= 2) break;
    await sleep(DELAY_MS);
  }

  // ۲) خواندن جزئیات وظایف جدید
  let added = 0, failed = 0;
  for (const item of queue.slice(0, MAX_DETAILS)) {
    try {
      const job = parseDetailPage(await fetchHtml(item.url), item.url);
      if (!job.id || !job.title) throw new Error('عنوان پیدا نشد');
      job.updated_at = new Date().toISOString();
      const { error } = await db.from('jobs').upsert(job, { onConflict: 'id' });
      if (error) throw error;
      added++;
      console.log(`+ ${job.id} ${job.title} — ${job.organization}`);
    } catch (e) {
      failed++;
      console.warn(`× ${item.id}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  // ۳) پاک‌سازی وظایف خیلی قدیمی
  const cutoff = new Date(Date.now() - KEEP_DAYS_AFTER_CLOSE * 864e5).toISOString().slice(0, 10);
  const { error: delErr, count: removed } = await db.from('jobs').delete({ count: 'exact' }).lt('closing_date', cutoff);
  if (delErr) console.warn('پاک‌سازی ناموفق:', delErr.message);

  const summary = {
    at: new Date().toISOString(), ok: true, added, failed, removed: removed || 0,
    queued: queue.length, seconds: Math.round((Date.now() - started) / 1000),
  };
  await setMeta(summary);
  console.log('خلاصه:', summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Apex Job — جمع‌آوری وظایف\n\n| جدید | ناموفق | حذف‌شده | زمان |\n|---|---|---|---|\n| ${added} | ${failed} | ${summary.removed} | ${summary.seconds}s |\n`);
  }
  if (added === 0 && failed > 0) process.exitCode = 1;
}

main().catch(async (e) => {
  console.error('خطا:', e.message);
  try { await setMeta({ at: new Date().toISOString(), ok: false, error: String(e.message).slice(0, 300) }); } catch {}
  process.exit(1);
});
