// ارتباط با دیتابیس Supabase + کش محلی برای باز شدن سریع و آفلاین
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

export const configured = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseKey);
export const supabase = configured
  ? createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: false } })
  : null;

const LIST_COLS = 'id,title,title_tr,organization,job_type,locations,location_raw,category,published,closing_date,gender,first_seen_at';
const DETAIL_COLS = LIST_COLS + ',nationality,salary,contract_duration,vacancy_number,positions,education,experience,about_html,summary_html,requirements_html,submission_html,apply_url,apply_email,tr';

const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
export { store };

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function cachedJobs() {
  return store.get('aj.jobs.cache', null);
}

export async function fetchJobs() {
  if (!supabase) throw new Error('not-configured');
  const all = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supabase
      .from('jobs')
      .select(LIST_COLS)
      .or(`closing_date.gte.${todayISO()},closing_date.is.null`)
      .order('first_seen_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) break;
  }
  store.set('aj.jobs.cache', { at: Date.now(), jobs: all });
  return all;
}

const detailCache = new Map();
export async function fetchJob(id) {
  if (detailCache.has(id)) return detailCache.get(id);
  if (!supabase) throw new Error('not-configured');
  const { data, error } = await supabase.from('jobs').select(DETAIL_COLS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (data) detailCache.set(id, data);
  return data;
}

export async function fetchAds() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ads')
    .select('id,title,subtitle,cta,placement,kind,image_url,link_url,bg_from,bg_to,priority')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export function adClick(id) {
  if (!supabase) return;
  supabase.rpc('ad_click', { ad_id: id }).then(() => {}, () => {});
}

export async function fetchLastUpdate() {
  if (!supabase) return null;
  const { data } = await supabase.from('meta').select('value,updated_at').eq('key', 'last_scrape').maybeSingle();
  return data?.value?.at || data?.updated_at || null;
}

export async function fetchSettings() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('settings').select('key,value');
  if (error || !data) return null;
  store.set('aj.settings', Object.fromEntries(data.map((r) => [r.key, r.value])));
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}
export const cachedSettings = () => store.get('aj.settings', null);

/** ثبت کلیک دکمه واتساپ (بدون هیچ معلومات شخصی) تا در پنل مدیریت دیده شود */
export function logLead(job, lang, platform) {
  if (!supabase || !job) return;
  supabase.from('wa_leads').insert({
    job_id: job.id, job_title: String(job.title || '').slice(0, 200), organization: String(job.organization || '').slice(0, 200),
    closing_date: job.closing_date || null, lang, platform,
  }).then(() => {}, () => {});
}

export async function savePushToken(token, platform, lang) {
  if (!supabase || !token) return;
  await supabase.from('push_tokens').upsert({ token, platform, lang }, { onConflict: 'token', ignoreDuplicates: true });
}
