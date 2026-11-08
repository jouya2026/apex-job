// پنل مدیریت Apex Job — آگهی‌ها، درخواست‌های واتساپ، پاسخ‌های آماده و تنظیمات
import '@fontsource-variable/vazirmatn';
import '../styles.css';
import './admin.css';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { icon, LOGO_MARK } from '../icons.js';
import { adInner } from '../ads.js';
import { fmtDate, faDigits } from '../i18n.js';
import { buildFaq, jobIntro, jobCode, mergeSettings, DEFAULT_SETTINGS } from '../faq.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa = (n) => faDigits(n);
const app = $('#admin');
const MAX_FILE_MB = 8;

const theme = localStorage.getItem('aj.admin.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;

if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
  app.innerHTML = `<div class="adm-center"><div class="card adm-login"><div class="adm-logo">${LOGO_MARK}<b dir="ltr">Apex<span>Job</span></b></div>
    <p>اتصال Supabase تنظیم نشده است. مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_KEY را طبق README تنظیم کنید.</p></div></div>`;
  throw new Error('not configured');
}

const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, storageKey: 'aj-admin-auth' } });

const PLACEMENTS = {
  hero: { label: 'اسلایدر بالای صفحه', hint: 'بالای صفحه اصلی، هر ۵ ثانیه چرخش — اندازه پیشنهادی ۱۶۰۰×۵۲۰' },
  feed: { label: 'بنر میان وظایف', hint: 'پس از هر ۶ وظیفه در فهرست — اندازه پیشنهادی ۱۶۰۰×۴۴۰' },
  detail: { label: 'بنر صفحه مشخصات', hint: 'داخل صفحه مشخصات هر وظیفه — اندازه پیشنهادی ۱۶۰۰×۴۴۰' },
  sticker: { label: 'استیکر شناور', hint: 'گوشه پایین صفحه، متحرک و قابل بستن — اندازه پیشنهادی ۴۰۰×۴۰۰ (GIF متحرک هم پذیرفته می‌شود)' },
};
const LANG_LABEL = { fa: 'دری', ps: 'پښتو', en: 'English' };
const DETAIL_COLS = 'id,title,organization,job_type,locations,location_raw,category,published,closing_date,gender,nationality,salary,contract_duration,vacancy_number,positions,education,experience,submission_html,apply_url,apply_email';

function toast(msg, bad = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.style.background = bad ? 'var(--hot)' : '';
  el.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('on'), 2600);
}

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fmtDate(iso, 'fa')}، ساعت ${fa(`${hh}:${mm}`)}`;
}
function ago(iso) {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'همین اکنون';
  if (m < 60) return `${fa(m)} دقیقه پیش`;
  if (m < 1440) return `${fa(Math.round(m / 60))} ساعت پیش`;
  return `${fa(Math.round(m / 1440))} روز پیش`;
}
function status(ad) {
  const now = Date.now();
  if (!ad.active) return ['off', 'غیرفعال'];
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return ['wait', 'زمان‌بندی‌شده'];
  if (ad.ends_at && new Date(ad.ends_at).getTime() <= now) return ['end', 'پایان‌یافته'];
  return ['on', 'در حال نشر'];
}
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  toast('کاپی شد ✓ — در واتساپ بچسبانید');
}

// ------------------------------------------------------------ login
function renderLogin(msg = '') {
  app.innerHTML = `<div class="adm-center">
    <form class="card adm-login" id="login">
      <div class="adm-logo">${LOGO_MARK}<b dir="ltr">Apex<span>Job</span></b></div>
      <h1>ورود به پنل مدیریت</h1>
      ${msg ? `<p class="adm-err">${esc(msg)}</p>` : ''}
      <label class="field"><span>ایمیل</span><input type="email" name="email" required autocomplete="username" dir="ltr"></label>
      <label class="field"><span>رمز عبور</span><input type="password" name="password" required autocomplete="current-password" dir="ltr"></label>
      <button class="btn primary full" type="submit">${icon('user', 18)}ورود</button>
    </form>
  </div>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
    btn.disabled = false;
    if (error) renderLogin('ایمیل یا رمز عبور درست نیست.');
    else boot();
  });
}

// ------------------------------------------------------------ dashboard shell
let ADS = [];
let SETTINGS = mergeSettings(null);
let section = localStorage.getItem('aj.admin.section') || 'ads';

async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  const { data: isAdmin } = await sb.rpc('is_admin');
  if (!isAdmin) {
    app.innerHTML = `<div class="adm-center"><div class="card adm-login"><div class="adm-logo">${LOGO_MARK}</div>
      <h1>دسترسی مدیر ندارید</h1><p>ایمیل <b dir="ltr">${esc(session.user.email)}</b> در جدول admins ثبت نشده است.</p>
      <button class="btn ghost full" id="out">${icon('logout', 18)}خروج</button></div></div>`;
    $('#out').onclick = async () => { await sb.auth.signOut(); renderLogin(); };
    return;
  }
  app.innerHTML = `
    <header class="adm-top">
      <div class="adm-logo">${LOGO_MARK}<b dir="ltr">Apex<span>Job</span></b><em>مدیریت</em></div>
      <div class="adm-actions">
        <a class="icon-btn" href="./" target="_blank" title="دیدن سایت">${icon('eye', 20)}</a>
        <button class="icon-btn" id="theme" title="تغییر نما">${icon(theme === 'dark' ? 'sun' : 'moon', 20)}</button>
        <button class="icon-btn" id="logout" title="خروج">${icon('logout', 20)}</button>
      </div>
    </header>
    <main class="adm-main">
      <section class="adm-stats" id="stats"></section>
      <nav class="adm-nav" id="adm-nav">
        <button data-sec="ads">${icon('image', 18)}آگهی‌ها</button>
        <button data-sec="leads">${icon('whatsapp', 18)}درخواست‌های واتساپ<span class="nbadge" id="lead-badge" hidden></span></button>
        <button data-sec="replies">${icon('sparkle', 18)}پاسخ‌های آماده</button>
        <button data-sec="settings">${icon('edit', 18)}تنظیمات تماس</button>
      </nav>
      <section class="card" id="sec-body"></section>
    </main>
    <div id="modal"></div>`;
  $('#logout').onclick = async () => { await sb.auth.signOut(); renderLogin(); };
  $('#theme').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('aj.admin.theme', next);
    $('#theme').innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 20);
  };
  $('#adm-nav').querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => showSection(b.dataset.sec)));
  const { data: st } = await sb.from('settings').select('key,value');
  SETTINGS = mergeSettings(Object.fromEntries((st || []).map((r) => [r.key, r.value])));
  loadStats();
  showSection(section);
}

function showSection(name) {
  section = name;
  localStorage.setItem('aj.admin.section', name);
  $('#adm-nav').querySelectorAll('[data-sec]').forEach((b) => b.classList.toggle('on', b.dataset.sec === name));
  if (name === 'leads') renderLeads();
  else if (name === 'replies') renderReplies();
  else if (name === 'settings') renderSettings();
  else renderAdsSection();
}

async function loadStats() {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 864e5).toISOString();
  const [active, fresh, leads, meta] = await Promise.all([
    sb.from('jobs').select('id', { count: 'exact', head: true }).or(`closing_date.gte.${today},closing_date.is.null`),
    sb.from('jobs').select('id', { count: 'exact', head: true }).gte('first_seen_at', since),
    sb.from('wa_leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    sb.from('meta').select('value,updated_at').eq('key', 'last_scrape').maybeSingle(),
  ]);
  const last = meta.data?.value || {};
  const ok = last.ok !== false;
  const newLeads = leads.count ?? 0;
  const badge = $('#lead-badge');
  if (badge) { badge.hidden = !newLeads; badge.textContent = fa(newLeads); }
  $('#stats').innerHTML = [
    ['briefcase', 'وظایف فعال', fa(active.count ?? 0)],
    ['star', 'تازه (۲۴ ساعت)', fa(fresh.count ?? 0)],
    ['whatsapp', 'درخواست‌های تازه واتساپ', fa(newLeads)],
    ['refresh', 'آخرین تازه‌سازی وظایف', last.at ? ago(last.at) : '—', ok ? '' : 'bad',
      ok ? (last.at ? `+${fa(last.added || 0)} وظیفه تازه` : 'هنوز اجرا نشده') : `خطا: ${esc(last.error || '')}`],
  ].map(([ic, label, value, cls = '', sub = '']) => `<div class="card stat ${cls}"><span class="stat-ic">${icon(ic, 20)}</span><div><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`).join('');
}

// ------------------------------------------------------------ آگهی‌ها
let tab = 'all';
function renderAdsSection() {
  $('#sec-body').innerHTML = `
    <div class="adm-head">
      <h2>${icon('image', 20)}آگهی‌ها</h2>
      <button class="btn primary" id="new-ad">${icon('plus', 18)}آگهی تازه</button>
    </div>
    <div class="adm-tabs" id="tabs"></div>
    <div id="ads-list" class="adm-ads"></div>`;
  $('#new-ad').onclick = () => openForm();
  loadAds();
}

async function loadAds() {
  const { data, error } = await sb.from('ads').select('*').order('placement').order('priority', { ascending: false }).order('created_at', { ascending: false });
  if (error) { toast('خطا در خواندن آگهی‌ها: ' + error.message, true); return; }
  ADS = data || [];
  renderAds();
}

function renderAds() {
  if (!$('#tabs')) return;
  const counts = Object.fromEntries(Object.keys(PLACEMENTS).map((k) => [k, ADS.filter((a) => a.placement === k).length]));
  $('#tabs').innerHTML = [['all', 'همه', ADS.length], ...Object.entries(PLACEMENTS).map(([k, v]) => [k, v.label, counts[k]])]
    .map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}<small>${fa(n)}</small></button>`).join('');
  $('#tabs').querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderAds(); }));
  const list = ADS.filter((a) => tab === 'all' || a.placement === tab);
  const el = $('#ads-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty">${icon('image', 40)}<h3>هنوز آگهی ثبت نشده است</h3><p>با دکمه «آگهی تازه» نخستین بنر یا استیکر را بسازید.</p></div>`;
    return;
  }
  el.innerHTML = list.map((ad) => {
    const [cls, label] = status(ad);
    return `<article class="adm-ad">
      <div class="adm-prev ${ad.placement === 'sticker' ? 'sq' : ''}">${adInner(ad)}</div>
      <div class="adm-info">
        <div class="adm-row1"><h3>${esc(ad.title)}</h3><span class="st ${cls}">${label}</span></div>
        <p>${PLACEMENTS[ad.placement]?.label || ad.placement} · اولویت ${fa(ad.priority)} · ${icon('eye', 14)} ${fa(ad.clicks)} کلیک</p>
        <p class="dates">${icon('calendar', 14)} ${ad.starts_at ? fmt(ad.starts_at) : 'از همین اکنون'} ← ${ad.ends_at ? fmt(ad.ends_at) : 'بدون پایان'}</p>
      </div>
      <div class="adm-btns">
        <label class="switch" title="فعال/غیرفعال"><input type="checkbox" data-toggle="${ad.id}" ${ad.active ? 'checked' : ''}><i></i></label>
        <button class="icon-btn" data-edit="${ad.id}" title="ویرایش">${icon('edit', 19)}</button>
        <button class="icon-btn danger" data-del="${ad.id}" title="حذف">${icon('trash', 19)}</button>
      </div>
    </article>`;
  }).join('');
  el.querySelectorAll('[data-toggle]').forEach((c) => (c.onchange = async () => {
    const { error } = await sb.from('ads').update({ active: c.checked, updated_at: new Date().toISOString() }).eq('id', c.dataset.toggle);
    if (error) { toast(error.message, true); c.checked = !c.checked; } else { toast(c.checked ? 'فعال شد' : 'غیرفعال شد'); loadAds(); }
  }));
  el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => openForm(ADS.find((a) => a.id === b.dataset.edit))));
  el.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
    const ad = ADS.find((a) => a.id === b.dataset.del);
    if (!confirm(`آگهی «${ad.title}» برای همیشه حذف شود؟`)) return;
    const { error } = await sb.from('ads').delete().eq('id', ad.id);
    if (error) toast(error.message, true); else { toast('حذف شد'); loadAds(); }
  }));
}

function openForm(ad = null) {
  const a = ad || { title: '', subtitle: '', cta: '', placement: 'hero', kind: 'image', image_url: '', link_url: '', bg_from: '#1877F2', bg_to: '#7AB3FF', priority: 0, active: true, starts_at: null, ends_at: null };
  $('#modal').innerHTML = `<div class="adm-modal-bg" data-close></div>
  <form class="adm-modal card" id="ad-form">
    <div class="adm-head"><h2>${icon(ad ? 'edit' : 'plus', 20)}${ad ? 'ویرایش آگهی' : 'آگهی تازه'}</h2><button type="button" class="icon-btn" data-close>${icon('x', 20)}</button></div>
    <div class="adm-form-grid">
      <div class="adm-fields">
        <label class="field"><span>محل نمایش</span>
          <select name="placement">${Object.entries(PLACEMENTS).map(([k, v]) => `<option value="${k}" ${a.placement === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
          <small class="hint" id="pl-hint"></small></label>
        <div class="field"><span>نوعیت آگهی</span>
          <div class="seg" id="kind">
            <button type="button" data-kind="image" class="${a.kind === 'image' ? 'on' : ''}">${icon('image', 16)} تصویر / GIF متحرک</button>
            <button type="button" data-kind="text" class="${a.kind === 'text' ? 'on' : ''}">${icon('sparkle', 16)} متنی متحرک</button>
          </div></div>
        <label class="field"><span>عنوان *</span><input name="title" required maxlength="80" value="${esc(a.title)}"></label>
        <div class="only-text">
          <label class="field"><span>متن دوم</span><input name="subtitle" maxlength="120" value="${esc(a.subtitle)}"></label>
          <label class="field"><span>متن دکمه</span><input name="cta" maxlength="24" value="${esc(a.cta)}" placeholder="مثلاً: همین اکنون ببینید"></label>
          <div class="field"><span>رنگ‌ها</span><div class="colors">
            <input type="color" name="bg_from" value="${esc(a.bg_from || '#1877F2')}"><input type="color" name="bg_to" value="${esc(a.bg_to || '#7AB3FF')}">
            <div class="presets">${[['#1877F2', '#7AB3FF'], ['#0F9D58', '#6DD5A0'], ['#F59E0B', '#FBBF24'], ['#E11D48', '#FB7185'], ['#7C3AED', '#C084FC'], ['#0F172A', '#334155']].map(([x, y]) => `<button type="button" data-preset="${x},${y}" style="background:linear-gradient(135deg,${x},${y})"></button>`).join('')}</div>
          </div></div>
        </div>
        <div class="only-image">
          <div class="field"><span>تصویر</span>
            <label class="upload">${icon('download', 18)}<span id="up-label">انتخاب فایل (GIF, JPG, PNG, WEBP — حداکثر ${fa(MAX_FILE_MB)} مگابایت)</span><input type="file" id="file" accept="image/gif,image/png,image/jpeg,image/webp"></label>
            <input name="image_url" dir="ltr" placeholder="یا آدرس تصویر: https://..." value="${esc(a.image_url)}"></div>
        </div>
        <label class="field"><span>لینک هنگام کلیک (اختیاری)</span><input name="link_url" dir="ltr" placeholder="https://wa.me/${esc(SETTINGS.whatsapp)}" value="${esc(a.link_url)}"></label>
        <div class="two">
          <label class="field"><span>آغاز نشر</span><input type="datetime-local" name="starts_at" value="${toLocalInput(a.starts_at)}"></label>
          <label class="field"><span>پایان نشر</span><input type="datetime-local" name="ends_at" value="${toLocalInput(a.ends_at)}"></label>
        </div>
        <div class="two">
          <label class="field"><span>اولویت (بزرگ‌تر = نخست)</span><input type="number" name="priority" value="${Number(a.priority) || 0}" min="0" max="100"></label>
          <div class="field"><span>وضعیت</span><label class="inline-switch"><span class="switch"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}><i></i></span>فعال</label></div>
        </div>
      </div>
      <div class="adm-preview-col">
        <span class="field-label">پیش‌نمایش زنده</span>
        <div id="preview"></div>
      </div>
    </div>
    <div class="adm-foot">
      <button type="button" class="btn ghost" data-close>لغو</button>
      <button type="submit" class="btn primary">${icon('check', 18)}ذخیره</button>
    </div>
  </form>`;
  document.body.classList.add('no-scroll');
  const form = $('#ad-form');
  let kind = a.kind;
  const read = () => {
    const f = new FormData(form);
    return { ...a, kind, title: f.get('title'), subtitle: f.get('subtitle'), cta: f.get('cta'), placement: f.get('placement'), image_url: f.get('image_url'), link_url: f.get('link_url'), bg_from: f.get('bg_from'), bg_to: f.get('bg_to') };
  };
  const preview = () => {
    const d = read();
    form.classList.toggle('k-image', kind === 'image');
    form.classList.toggle('k-text', kind === 'text');
    $('#pl-hint').textContent = PLACEMENTS[d.placement].hint;
    const cls = d.placement === 'hero' ? 'ad-feed hero-prev' : 'ad-feed';
    $('#preview').innerHTML = d.placement === 'sticker'
      ? `<div class="sticker-prev"><div class="sticker-link">${d.kind === 'image' && d.image_url ? `<img src="${esc(d.image_url)}">` : `<div class="sticker-text" style="--a1:${esc(d.bg_from)};--a2:${esc(d.bg_to)}"><strong>${esc(d.title || 'عنوان')}</strong>${d.subtitle ? `<span>${esc(d.subtitle)}</span>` : ''}</div>`}<span class="ad-label">آگهی</span></div></div>`
      : `<div class="${cls}">${adInner({ ...d, title: d.title || 'عنوان آگهی' })}<span class="ad-label">آگهی</span></div>`;
  };
  form.addEventListener('input', preview);
  form.addEventListener('change', preview);
  form.querySelectorAll('[data-kind]').forEach((b) => (b.onclick = () => {
    kind = b.dataset.kind;
    form.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('on', x === b));
    preview();
  }));
  form.querySelectorAll('[data-preset]').forEach((b) => (b.onclick = () => {
    const [x, y] = b.dataset.preset.split(',');
    form.bg_from.value = x; form.bg_to.value = y; preview();
  }));
  $('#file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!/^image\/(gif|png|jpeg|webp)$/.test(file.type)) { toast('فقط GIF, JPG, PNG یا WEBP پذیرفته می‌شود', true); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { toast(`حجم فایل بیشتر از ${fa(MAX_FILE_MB)} مگابایت است`, true); return; }
    $('#up-label').textContent = 'در حال آپلود…';
    const ext = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('ads').upload(path, file, { cacheControl: '31536000', contentType: file.type });
    if (error) { toast('آپلود ناموفق: ' + error.message, true); $('#up-label').textContent = 'انتخاب فایل'; return; }
    form.image_url.value = sb.storage.from('ads').getPublicUrl(path).data.publicUrl;
    $('#up-label').textContent = '✓ ' + file.name;
    preview();
  };
  $('#modal').querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = read();
    const f = new FormData(form);
    if (kind === 'image' && !d.image_url) { toast('تصویر را انتخاب کنید یا آدرس آن را بنویسید', true); return; }
    if (d.link_url && !/^(https?:|mailto:|tel:)/i.test(d.link_url)) { toast('لینک باید با https:// آغاز شود', true); return; }
    const row = {
      title: d.title.trim(), subtitle: d.subtitle?.trim() || null, cta: d.cta?.trim() || null, placement: d.placement, kind,
      image_url: d.image_url?.trim() || null, link_url: d.link_url?.trim() || null, bg_from: d.bg_from, bg_to: d.bg_to,
      priority: Number(f.get('priority')) || 0, active: !!f.get('active'),
      starts_at: f.get('starts_at') ? new Date(f.get('starts_at')).toISOString() : null,
      ends_at: f.get('ends_at') ? new Date(f.get('ends_at')).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    const { error } = ad ? await sb.from('ads').update(row).eq('id', ad.id) : await sb.from('ads').insert(row);
    btn.disabled = false;
    if (error) { toast('ذخیره ناموفق: ' + error.message, true); return; }
    toast('ذخیره شد ✓');
    closeModal();
    loadAds();
  };
  preview();
}

function closeModal() {
  $('#modal').innerHTML = '';
  document.body.classList.remove('no-scroll');
}

// ------------------------------------------------------------ درخواست‌های واتساپ
let leadFilter = 'new';
async function renderLeads() {
  $('#sec-body').innerHTML = `
    <div class="adm-head">
      <h2>${icon('whatsapp', 20)}درخواست‌های واتساپ</h2>
      <div class="seg" id="lead-filter">
        <button data-lf="new" class="${leadFilter === 'new' ? 'on' : ''}">تازه</button>
        <button data-lf="all" class="${leadFilter === 'all' ? 'on' : ''}">همه</button>
      </div>
    </div>
    <p class="adm-note">هر بار که کسی روی دکمه واتساپ یک وظیفه می‌زند، این‌جا ثبت می‌شود (بدون نام یا شماره). پیام او در واتساپ شما «کد وظیفه» را دارد؛ با دکمه «پاسخ‌های آماده» جواب‌های همان وظیفه را کاپی کنید.</p>
    <div id="leads" class="adm-leads"><div class="empty">${icon('refresh', 32)}<p>لطفاً صبر کنید…</p></div></div>`;
  $('#lead-filter').querySelectorAll('[data-lf]').forEach((b) => (b.onclick = () => { leadFilter = b.dataset.lf; renderLeads(); }));
  let q = sb.from('wa_leads').select('*').order('created_at', { ascending: false }).limit(200);
  if (leadFilter === 'new') q = q.eq('status', 'new');
  const { data, error } = await q;
  const el = $('#leads');
  if (!el) return;
  if (error) { el.innerHTML = `<div class="empty"><h3>خطا</h3><p>${esc(error.message)}</p><p>آیا فایل supabase/update-v2.sql را اجرا کرده‌اید؟</p></div>`; return; }
  if (!data.length) { el.innerHTML = `<div class="empty">${icon('whatsapp', 40)}<h3>درخواست تازه‌ای نیست</h3></div>`; return; }
  el.innerHTML = data.map((l) => `<article class="adm-lead ${l.status}">
      <div class="lead-main">
        <h3 dir="auto">${esc(l.job_title)}</h3>
        <p dir="auto">${esc(l.organization || '')}</p>
        <p class="lead-meta">
          <span class="code" dir="ltr">${jobCode(l.job_id)}</span>
          <span>${icon('globe', 14)}${LANG_LABEL[l.lang] || l.lang || '—'}</span>
          <span>${icon('phone', 14)}${l.platform === 'android' ? 'اپ اندروید' : 'سایت'}</span>
          <span>${icon('clock', 14)}${ago(l.created_at)}</span>
          ${l.closing_date ? `<span>${icon('calendar', 14)}ختم مهلت: ${fmtDate(l.closing_date, 'fa')}</span>` : ''}
        </p>
      </div>
      <div class="lead-btns">
        <button class="btn primary sm" data-replies="${l.job_id}" data-lang="${esc(l.lang || 'fa')}">${icon('sparkle', 16)}پاسخ‌های آماده</button>
        <a class="btn ghost sm" href="./#/job/${l.job_id}" target="_blank">${icon('eye', 16)}وظیفه</a>
        <button class="btn ghost sm" data-done="${l.id}" data-st="${l.status}">${icon('check', 16)}${l.status === 'new' ? 'رسیدگی شد' : 'بازگشت به تازه'}</button>
      </div>
    </article>`).join('');
  el.querySelectorAll('[data-replies]').forEach((b) => (b.onclick = () => openReplies(Number(b.dataset.replies), b.dataset.lang)));
  el.querySelectorAll('[data-done]').forEach((b) => (b.onclick = async () => {
    const next = b.dataset.st === 'new' ? 'done' : 'new';
    const { error: e2 } = await sb.from('wa_leads').update({ status: next }).eq('id', b.dataset.done);
    if (e2) toast(e2.message, true); else { renderLeads(); loadStats(); }
  }));
}

// ------------------------------------------------------------ پاسخ‌های آماده
async function fetchJobByCode(input) {
  const m = String(input || '').match(/(\d{3,})/);
  if (!m) return null;
  const { data } = await sb.from('jobs').select(DETAIL_COLS).eq('id', Number(m[1])).maybeSingle();
  return data;
}

function repliesHtml(job, lang) {
  const items = [{ id: 'intro', q: 'معرفی وظیفه (پاسخ اول)', a: jobIntro(job, lang) }, ...buildFaq(job, SETTINGS, lang)];
  const all = items.map((it) => it.a).join('\n\n');
  return `<div class="rep-langs">${Object.entries(LANG_LABEL).map(([k, v]) => `<button class="${k === lang ? 'on' : ''}" data-rl="${k}">${v}</button>`).join('')}</div>
    <div class="rep-list">
      ${items.map((it, i) => `<div class="rep-item">
        <div class="rep-q">${esc(it.q)}</div>
        <pre class="rep-a" dir="auto">${esc(it.a)}</pre>
        <button class="btn ghost sm" data-copy="${i}">${icon('check', 15)}کاپی</button>
      </div>`).join('')}
    </div>
    <button class="btn wa full" data-copy-all>${icon('whatsapp', 18)}کاپی همه پاسخ‌ها در یک پیام</button>
    <textarea hidden id="rep-all">${esc(all)}</textarea>
    ${items.map((it, i) => `<textarea hidden id="rep-${i}">${esc(it.a)}</textarea>`).join('')}`;
}

function bindReplies(root, job, lang, rerender) {
  root.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => copyText($(`#rep-${b.dataset.copy}`, root).value)));
  root.querySelector('[data-copy-all]').onclick = () => copyText($('#rep-all', root).value);
  root.querySelectorAll('[data-rl]').forEach((b) => (b.onclick = () => rerender(b.dataset.rl)));
}

async function openReplies(jobId, lang = 'fa') {
  $('#modal').innerHTML = `<div class="adm-modal-bg" data-close></div>
    <div class="adm-modal card narrow"><div class="adm-head"><h2>${icon('sparkle', 20)}پاسخ‌های آماده</h2><button type="button" class="icon-btn" data-close>${icon('x', 20)}</button></div>
    <div id="rep-body"><div class="empty"><p>لطفاً صبر کنید…</p></div></div></div>`;
  document.body.classList.add('no-scroll');
  $('#modal').querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeModal));
  const job = await fetchJobByCode(String(jobId));
  const body = $('#rep-body');
  if (!body) return;
  if (!job) { body.innerHTML = '<div class="empty"><h3>این وظیفه در دیتابیس یافت نشد (ممکن است حذف شده باشد).</h3></div>'; return; }
  const draw = (l) => {
    body.innerHTML = `<p class="rep-title" dir="auto"><b>${esc(job.title)}</b> — ${esc(job.organization || '')} <span class="code" dir="ltr">${jobCode(job.id)}</span></p>` + repliesHtml(job, l);
    bindReplies(body, job, l, draw);
  };
  draw(LANG_LABEL[lang] ? lang : 'fa');
}

function generalReplies() {
  const s = SETTINGS;
  return [
    ['پیام خوش‌آمد (Greeting message)', `سلام و احترام 🌟\nبه Apex Job خوش آمدید! برای این‌که سریع‌تر رهنمایی‌تان کنیم، لطفاً «کد وظیفه» (مثلاً AJ-146752) یا نام وظیفه‌ای را که می‌خواهید برایش ثبت‌نام کنید، بفرستید.\n\n📍 ${s.address.fa}\n🕘 ${s.hours.fa}`],
    ['پیام بیرون از وقت کاری (Away message)', `سلام! از پیام شما سپاس 🙏\nهمکاران ما در اوقات کاری (${s.hours.fa}) به‌زودی پاسخ می‌دهند. لطفاً کد وظیفه و نام خود را بفرستید تا کار شما در اولویت قرار گیرد.`],
    ['/اسناد — فهرست عمومی اسناد', 'برای ثبت‌نام این اسناد را آماده کنید:\n• خلص سوانح (CV) تازه به زبان انگلیسی\n• کاپی تذکره\n• کاپی سند تحصیلی\n• تصدیق‌نامه‌های تجربه کاری\n• یک قطعه عکس\n• ایمیل فعال و شماره تماس'],
    ['/هزینه — هزینه خدمات', s.fee.fa],
    ['/آدرس — آدرس و اوقات کاری', `📍 ${s.address.fa}\n🕘 ${s.hours.fa}\n📞 ${s.phone}`],
    ['/انگیزه — تشویق برای اقدام', 'هر فرصت تنها یک‌بار در خانه شما را می‌زند! 💪 اسناد خود را همین امروز بفرستید تا پیش از ختم مهلت درخواست شما با دقت کامل آماده و ارسال شود. ما در هر قدم کنار شما هستیم.'],
  ];
}

function renderReplies() {
  $('#sec-body').innerHTML = `
    <div class="adm-head"><h2>${icon('sparkle', 20)}پاسخ‌های آماده واتساپ</h2></div>
    <p class="adm-note">کد وظیفه را از پیام مراجعه‌کننده کاپی کنید (مثلاً <b dir="ltr">AJ-146752</b>) و پاسخ‌های همان وظیفه را با یک کلیک کاپی و در واتساپ بفرستید.</p>
    <form class="rep-search" id="rep-search">
      <input name="code" dir="ltr" placeholder="AJ-146752" required>
      <button class="btn primary" type="submit">${icon('search', 18)}دریافت پاسخ‌ها</button>
    </form>
    <div id="rep-result"></div>
    <h3 class="adm-sub">${icon('whatsapp', 18)}پیام‌های عمومی برای WhatsApp Business</h3>
    <p class="adm-note">این متن‌ها را یک‌بار در اپ WhatsApp Business بگذارید (رهنمای README). نام‌هایی که با «/» آغاز می‌شوند همان «Quick replies» هستند.</p>
    <div class="rep-list" id="gen-replies">
      ${generalReplies().map(([q, a], i) => `<div class="rep-item"><div class="rep-q">${esc(q)}</div><pre class="rep-a">${esc(a)}</pre><button class="btn ghost sm" data-gcopy="${i}">${icon('check', 15)}کاپی</button></div>`).join('')}
    </div>`;
  const gen = generalReplies();
  $('#gen-replies').querySelectorAll('[data-gcopy]').forEach((b) => (b.onclick = () => copyText(gen[Number(b.dataset.gcopy)][1])));
  $('#rep-search').onsubmit = async (e) => {
    e.preventDefault();
    const out = $('#rep-result');
    out.innerHTML = '<div class="empty"><p>لطفاً صبر کنید…</p></div>';
    const job = await fetchJobByCode(new FormData(e.target).get('code'));
    if (!job) { out.innerHTML = '<div class="empty"><h3>وظیفه‌ای با این کد یافت نشد.</h3></div>'; return; }
    const draw = (l) => {
      out.innerHTML = `<div class="card rep-card"><p class="rep-title" dir="auto"><b>${esc(job.title)}</b> — ${esc(job.organization || '')}</p>${repliesHtml(job, l)}</div>`;
      bindReplies(out, job, l, draw);
    };
    draw('fa');
  };
}

// ------------------------------------------------------------ تنظیمات تماس
function renderSettings() {
  const s = SETTINGS;
  const tri = (key, label, rows = 2) => `<fieldset class="tri"><legend>${label}</legend>
    ${['fa', 'ps', 'en'].map((l) => `<label class="field"><span>${LANG_LABEL[l]}</span><textarea name="${key}.${l}" rows="${rows}" dir="${l === 'en' ? 'ltr' : 'rtl'}">${esc(s[key]?.[l] || '')}</textarea></label>`).join('')}
  </fieldset>`;
  $('#sec-body').innerHTML = `
    <div class="adm-head"><h2>${icon('edit', 20)}تنظیمات تماس و پاسخ‌ها</h2></div>
    <p class="adm-note">این معلومات بدون ساختن دوباره اپ، فوراً در سایت، اپلیکیشن، پرسش‌های متداول هر وظیفه و پاسخ‌های آماده نمایش داده می‌شود.</p>
    <form id="settings-form" class="settings-form">
      <div class="two">
        <label class="field"><span>شماره واتساپ (با کد کشور، بدون + و صفر)</span><input name="whatsapp" dir="ltr" value="${esc(s.whatsapp)}" placeholder="93790499585"></label>
        <label class="field"><span>شماره تماس</span><input name="phone" dir="ltr" value="${esc(s.phone)}" placeholder="0790499585"></label>
      </div>
      ${tri('address', 'آدرس دفتر')}
      ${tri('hours', 'اوقات کاری')}
      ${tri('fee', 'پاسخ «هزینه خدمات»', 3)}
      ${tri('docs_extra', 'اسناد اضافی که همیشه لازم است (اختیاری)')}
      <div class="adm-foot"><button class="btn primary" type="submit">${icon('check', 18)}ذخیره تنظیمات</button></div>
    </form>`;
  $('#settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const wa = String(f.get('whatsapp') || '').replace(/\D/g, '');
    const rows = [
      { key: 'whatsapp', value: wa || DEFAULT_SETTINGS.whatsapp },
      { key: 'phone', value: String(f.get('phone') || '').trim() || DEFAULT_SETTINGS.phone },
      ...['address', 'hours', 'fee', 'docs_extra'].map((k) => ({
        key: k, value: Object.fromEntries(['fa', 'ps', 'en'].map((l) => [l, String(f.get(`${k}.${l}`) || '').trim()])),
      })),
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true;
    const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
    btn.disabled = false;
    if (error) { toast('ذخیره ناموفق: ' + error.message, true); return; }
    SETTINGS = mergeSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    toast('تنظیمات ذخیره شد ✓');
  };
}

boot();
