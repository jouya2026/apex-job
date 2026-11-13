// نوتیفیکیشن برای دنبال‌کنندگان: وقتی ارگان یا کشوری که کاربر دنبال می‌کند وظیفه یا بورسیه تازه نشر کند
// متغیرهای محیطی: SUPABASE_URL, SUPABASE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT (متن JSON)
// بدون FIREBASE_SERVICE_ACCOUNT بی‌خطا خارج می‌شود (اپ در آن حالت تازه‌های دنبال‌شده را در خود اپ نشان می‌دهد).
import { createClient } from '@supabase/supabase-js';
import { orgKey } from '../src/data/orgs.js';
import { countryName } from '../src/data/countries.js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT } = process.env;
if (!FIREBASE_SERVICE_ACCOUNT) {
  console.log('FIREBASE_SERVICE_ACCOUNT تنظیم نشده — نوتیفیکیشن دنبال‌کنندگان رد شد.');
  process.exit(0);
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_URL و SUPABASE_SECRET_KEY تنظیم نشده‌اند.');
  process.exit(1);
}

const { initializeApp, cert } = await import('firebase-admin/app');
const { getMessaging } = await import('firebase-admin/messaging');
initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) });
const messaging = getMessaging();
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const faNum = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const titleOf = (row, lang) => (lang !== 'en' && row.title_tr?.[lang]) || row.title;

const { data: metaRow } = await db.from('meta').select('value').eq('key', 'follow_notify_at').maybeSingle();
const since = metaRow?.value?.at || new Date(Date.now() - 3 * 3600e3).toISOString();
const runAt = new Date().toISOString();

const [jobsRes, schRes] = await Promise.all([
  db.from('jobs').select('id,title,title_tr,organization').gt('first_seen_at', since).limit(500),
  db.from('scholarships').select('id,title,title_tr,organization,org_key,countries').gt('first_seen_at', since).limit(500),
]);
if (jobsRes.error) throw jobsRes.error;
const items = [
  ...(jobsRes.data || []).map((j) => ({ kind: 'job', id: j.id, org: j.organization, orgKey: orgKey(j.organization), countries: [], row: j })),
  ...(schRes.error ? [] : schRes.data || []).map((s) => ({ kind: 'sch', id: s.id, org: s.organization, orgKey: s.org_key || orgKey(s.organization), countries: s.countries || [], row: s })),
];
console.log(`تازه‌ها از ${since}: ${items.length}`);
if (!items.length) {
  await db.from('meta').upsert({ key: 'follow_notify_at', value: { at: runAt }, updated_at: runAt });
  process.exit(0);
}

const orgKeys = [...new Set(items.map((i) => i.orgKey).filter(Boolean))];
const countryKeys = [...new Set(items.flatMap((i) => i.countries))];
const follows = [];
for (const [kind, keys] of [['org', orgKeys], ['country', countryKeys]]) {
  for (let i = 0; i < keys.length; i += 100) {
    const { data, error } = await db.from('push_follows').select('token,kind,key,lang').eq('kind', kind).in('key', keys.slice(i, i + 100));
    if (error) throw error;
    follows.push(...data);
  }
}

// هر دستگاه: فهرست مواردی که به دنبال‌شده‌هایش ربط دارد
const perToken = new Map();
for (const f of follows) {
  const matched = items.filter((it) => (f.kind === 'org' ? it.orgKey === f.key : it.countries.includes(f.key)));
  if (!matched.length) continue;
  const entry = perToken.get(f.token) || { lang: f.lang || 'fa', items: new Map(), label: '' };
  matched.forEach((m) => entry.items.set(`${m.kind}:${m.id}`, m));
  if (!entry.label) entry.label = f.kind === 'org' ? matched[0].org : countryName(f.key, f.lang || 'fa');
  perToken.set(f.token, entry);
}
console.log(`دستگاه‌های دنبال‌کننده با تازه: ${perToken.size}`);

function message(token, entry) {
  const list = [...entry.items.values()];
  const first = list[0];
  const n = list.length;
  const lang = entry.lang;
  const route = n === 1 ? (first.kind === 'job' ? `#/job/${first.id}` : `#/sch/${first.id}`) : '#/new';
  const t = {
    fa: { title: `⭐ ${entry.label}`, body: n === 1 ? `فرصت تازه: ${titleOf(first.row, 'fa')}` : `${faNum(n)} فرصت تازه از دنبال‌شده‌های شما نشر شد` },
    ps: { title: `⭐ ${entry.label}`, body: n === 1 ? `نوی فرصت: ${titleOf(first.row, 'ps')}` : `ستاسو له تعقیب شویو ${faNum(n)} نوي فرصتونه خپاره شول` },
    en: { title: `⭐ ${entry.label}`, body: n === 1 ? `New opportunity: ${first.row.title}` : `${n} new opportunities from what you follow` },
  }[lang] || null;
  return {
    token,
    notification: t,
    data: { route },
    android: { priority: 'high', notification: { channelId: 'jobs', color: '#1B2A4A' } },
  };
}

const dead = [];
const messages = [...perToken.entries()].map(([token, entry]) => message(token, entry)).filter((m) => m.notification);
for (let i = 0; i < messages.length; i += 500) {
  const batch = messages.slice(i, i + 500);
  const res = await messaging.sendEach(batch);
  res.responses.forEach((r, idx) => {
    const code = r.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument')) dead.push(batch[idx].token);
  });
  console.log(`ارسال: ${res.successCount} موفق، ${res.failureCount} ناموفق`);
}
if (dead.length) {
  for (let i = 0; i < dead.length; i += 200) {
    const part = dead.slice(i, i + 200);
    await db.from('push_follows').delete().in('token', part);
    await db.from('push_tokens').delete().in('token', part);
  }
  console.log(`${dead.length} توکن نامعتبر حذف شد.`);
}
await db.from('meta').upsert({ key: 'follow_notify_at', value: { at: runAt }, updated_at: runAt });
