// نوتیفیکیشن روزانه «وظایف جدید» به گوشی کاربران (Firebase Cloud Messaging)
// متغیرهای محیطی: SUPABASE_URL, SUPABASE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT (متن JSON)
// اگر FIREBASE_SERVICE_ACCOUNT تنظیم نشده باشد، این اسکریپت بدون خطا خارج می‌شود.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT } = process.env;

if (!FIREBASE_SERVICE_ACCOUNT) {
  console.log('FIREBASE_SERVICE_ACCOUNT تنظیم نشده — ارسال نوتیفیکیشن رد شد.');
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

const toFaDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const TEXT = {
  fa: (n) => ({ title: `⭐ ${toFaDigits(n)} وظیفه جدید امروز`, body: 'فرصت‌های شغلی تازه منتشر شد. همین حالا ببینید.' }),
  ps: (n) => ({ title: `⭐ نن ${toFaDigits(n)} نوې دندې`, body: 'نوې کاري فرصتونه خپاره شول. همدا اوس یې وګورئ.' }),
  en: (n) => ({ title: `⭐ ${n} new jobs today`, body: 'Fresh job opportunities were just posted. Take a look now.' }),
};

const since = new Date(Date.now() - 24 * 3600e3).toISOString();
const yesterday = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
// فقط وظایفی که واقعاً تازه نشر شده‌اند (نه وظایف قدیمی که در اولین اجرا جمع‌آوری شدند)
const { count, error } = await db.from('jobs').select('id', { count: 'exact', head: true })
  .gte('first_seen_at', since)
  .or(`published.gte.${yesterday},published.is.null`);
if (error) throw error;
if (!count) {
  console.log('در ۲۴ ساعت گذشته وظیفه جدیدی نبود.');
  process.exit(0);
}

const tokens = [];
for (let from = 0; ; from += 1000) {
  const { data, error: e } = await db.from('push_tokens').select('token, lang').range(from, from + 999);
  if (e) throw e;
  tokens.push(...data);
  if (data.length < 1000) break;
}
console.log(`وظایف جدید: ${count} — دستگاه‌ها: ${tokens.length}`);

const dead = [];
for (const lang of ['fa', 'ps', 'en']) {
  const group = tokens.filter((t) => (t.lang || 'fa') === lang).map((t) => t.token);
  const text = TEXT[lang](count);
  for (let i = 0; i < group.length; i += 500) {
    const batch = group.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: text,
      data: { route: '#/new' },
      android: { priority: 'high', notification: { channelId: 'jobs', color: '#1877F2' } },
    });
    res.responses.forEach((r, idx) => {
      const code = r.error?.code || '';
      if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument')) {
        dead.push(batch[idx]);
      }
    });
    console.log(`${lang}: ارسال ${res.successCount} موفق، ${res.failureCount} ناموفق`);
  }
}

if (dead.length) {
  for (let i = 0; i < dead.length; i += 200) {
    await db.from('push_tokens').delete().in('token', dead.slice(i, i + 200));
  }
  console.log(`${dead.length} توکن نامعتبر حذف شد.`);
}
