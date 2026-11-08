// داشبورد مدیریت Apex Job — مدیریت تبلیغات و مشاهده وضعیت سیستم
import '@fontsource-variable/vazirmatn';
import '../styles.css';
import './admin.css';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { icon, LOGO_MARK } from '../icons.js';
import { adInner } from '../ads.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const app = $('#admin');

const theme = localStorage.getItem('aj.admin.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;

if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
  app.innerHTML = `<div class="adm-center"><div class="card adm-login"><div class="adm-logo">${LOGO_MARK}<b dir="ltr">Apex<span>Job</span></b></div>
    <p>اتصال Supabase تنظیم نشده است. مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_KEY را طبق README تنظیم کنید.</p></div></div>`;
  throw new Error('not configured');
}

const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: true, storageKey: 'aj-admin-auth' } });

const PLACEMENTS = {
  hero: { label: 'اسلایدر بالای صفحه', hint: 'بالای صفحه اصلی، چرخشی هر ۵ ثانیه — اندازه پیشنهادی ۱۶۰۰×۵۲۰' },
  feed: { label: 'بنر بین وظایف', hint: 'بعد از هر ۶ وظیفه در لیست — اندازه پیشنهادی ۱۶۰۰×۴۴۰' },
  detail: { label: 'بنر صفحه مشخصات', hint: 'داخل صفحه جزئیات هر وظیفه — اندازه پیشنهادی ۱۶۰۰×۴۴۰' },
  sticker: { label: 'استیکر شناور', hint: 'گوشه پایین صفحه، متحرک و قابل بستن — اندازه پیشنهادی ۴۰۰×۴۰۰ (GIF هم قبول است)' },
};

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
  try {
    return new Intl.DateTimeFormat('fa-AF-u-ca-persian-nu-arabext', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso.slice(0, 16).replace('T', ' '); }
}
function ago(iso) {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${fa(Math.max(m, 0))} دقیقه پیش`;
  if (m < 1440) return `${fa(Math.round(m / 60))} ساعت پیش`;
  return `${fa(Math.round(m / 1440))} روز پیش`;
}
function status(ad) {
  const now = Date.now();
  if (!ad.active) return ['off', 'غیرفعال'];
  if (ad.starts_at && new Date(ad.starts_at).getTime() > now) return ['wait', 'زمان‌بندی‌شده'];
  if (ad.ends_at && new Date(ad.ends_at).getTime() <= now) return ['end', 'منقضی'];
  return ['on', 'در حال نشر'];
}
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// ------------------------------------------------------------ login
function renderLogin(msg = '') {
  app.innerHTML = `<div class="adm-center">
    <form class="card adm-login" id="login">
      <div class="adm-logo">${LOGO_MARK}<b dir="ltr">Apex<span>Job</span></b></div>
      <h1>ورود به داشبورد مدیریت</h1>
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

// ------------------------------------------------------------ dashboard
let ADS = [];

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
        <a class="icon-btn" href="./" target="_blank" title="مشاهده سایت">${icon('eye', 20)}</a>
        <button class="icon-btn" id="theme" title="تغییر نما">${icon(theme === 'dark' ? 'sun' : 'moon', 20)}</button>
        <button class="icon-btn" id="logout" title="خروج">${icon('logout', 20)}</button>
      </div>
    </header>
    <main class="adm-main">
      <section class="adm-stats" id="stats"></section>
      <section class="card">
        <div class="adm-head">
          <h2>${icon('image', 20)}تبلیغات</h2>
          <button class="btn primary" id="new-ad">${icon('plus', 18)}تبلیغ جدید</button>
        </div>
        <div class="adm-tabs" id="tabs"></div>
        <div id="ads-list" class="adm-ads"></div>
      </section>
    </main>
    <div id="modal"></div>`;
  $('#logout').onclick = async () => { await sb.auth.signOut(); renderLogin(); };
  $('#theme').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('aj.admin.theme', next);
    $('#theme').innerHTML = icon(next === 'dark' ? 'sun' : 'moon', 20);
  };
  $('#new-ad').onclick = () => openForm();
  loadStats();
  loadAds();
}

async function loadStats() {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 864e5).toISOString();
  const [active, fresh, tokens, meta] = await Promise.all([
    sb.from('jobs').select('id', { count: 'exact', head: true }).or(`closing_date.gte.${today},closing_date.is.null`),
    sb.from('jobs').select('id', { count: 'exact', head: true }).gte('first_seen_at', since),
    sb.from('push_tokens').select('token', { count: 'exact', head: true }),
    sb.from('meta').select('value,updated_at').eq('key', 'last_scrape').maybeSingle(),
  ]);
  const last = meta.data?.value || {};
  const ok = last.ok !== false;
  $('#stats').innerHTML = [
    ['briefcase', 'وظایف فعال', fa(active.count ?? 0)],
    ['star', 'جدید (۲۴ ساعت)', fa(fresh.count ?? 0)],
    ['bell', 'دستگاه‌های نوتیفیکیشن', fa(tokens.count ?? 0)],
    ['refresh', 'آخرین به‌روزرسانی', last.at ? ago(last.at) : '—', ok ? '' : 'bad',
      ok ? (last.at ? `+${fa(last.added || 0)} وظیفه جدید` : 'هنوز اجرا نشده') : `خطا: ${esc(last.error || '')}`],
  ].map(([ic, label, value, cls = '', sub = '']) => `<div class="card stat ${cls}"><span class="stat-ic">${icon(ic, 20)}</span><div><small>${label}</small><b>${value}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`).join('');
}

let tab = 'all';
async function loadAds() {
  const { data, error } = await sb.from('ads').select('*').order('placement').order('priority', { ascending: false }).order('created_at', { ascending: false });
  if (error) { toast('خطا در خواندن تبلیغات: ' + error.message, true); return; }
  ADS = data || [];
  renderAds();
}

function renderAds() {
  const counts = Object.fromEntries(Object.keys(PLACEMENTS).map((k) => [k, ADS.filter((a) => a.placement === k).length]));
  $('#tabs').innerHTML = [['all', 'همه', ADS.length], ...Object.entries(PLACEMENTS).map(([k, v]) => [k, v.label, counts[k]])]
    .map(([k, l, n]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}<small>${fa(n)}</small></button>`).join('');
  $('#tabs').querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; renderAds(); }));
  const list = ADS.filter((a) => tab === 'all' || a.placement === tab);
  const el = $('#ads-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty">${icon('image', 40)}<h3>هنوز تبلیغی ثبت نشده</h3><p>با دکمه «تبلیغ جدید» اولین بنر یا استیکر را بسازید.</p></div>`;
    return;
  }
  el.innerHTML = list.map((ad) => {
    const [cls, label] = status(ad);
    return `<article class="adm-ad">
      <div class="adm-prev ${ad.placement === 'sticker' ? 'sq' : ''}">${adInner(ad)}</div>
      <div class="adm-info">
        <div class="adm-row1"><h3>${esc(ad.title)}</h3><span class="st ${cls}">${label}</span></div>
        <p>${PLACEMENTS[ad.placement]?.label || ad.placement} · اولویت ${fa(ad.priority)} · ${icon('eye', 14)} ${fa(ad.clicks)} کلیک</p>
        <p class="dates">${icon('calendar', 14)} ${ad.starts_at ? fmt(ad.starts_at) : 'از همین حالا'} ← ${ad.ends_at ? fmt(ad.ends_at) : 'بدون پایان'}</p>
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
    if (!confirm(`تبلیغ «${ad.title}» برای همیشه حذف شود؟`)) return;
    const { error } = await sb.from('ads').delete().eq('id', ad.id);
    if (error) toast(error.message, true); else { toast('حذف شد'); loadAds(); }
  }));
}

// ------------------------------------------------------------ form
function openForm(ad = null) {
  const a = ad || { title: '', subtitle: '', cta: '', placement: 'hero', kind: 'text', image_url: '', link_url: '', bg_from: '#1877F2', bg_to: '#7AB3FF', priority: 0, active: true, starts_at: null, ends_at: null };
  $('#modal').innerHTML = `<div class="adm-modal-bg" data-close></div>
  <form class="adm-modal card" id="ad-form">
    <div class="adm-head"><h2>${icon(ad ? 'edit' : 'plus', 20)}${ad ? 'ویرایش تبلیغ' : 'تبلیغ جدید'}</h2><button type="button" class="icon-btn" data-close>${icon('x', 20)}</button></div>
    <div class="adm-form-grid">
      <div class="adm-fields">
        <label class="field"><span>محل نمایش</span>
          <select name="placement">${Object.entries(PLACEMENTS).map(([k, v]) => `<option value="${k}" ${a.placement === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
          <small class="hint" id="pl-hint"></small></label>
        <div class="field"><span>نوع تبلیغ</span>
          <div class="seg" id="kind">
            <button type="button" data-kind="image" class="${a.kind === 'image' ? 'on' : ''}">${icon('image', 16)} تصویر / GIF</button>
            <button type="button" data-kind="text" class="${a.kind === 'text' ? 'on' : ''}">${icon('sparkle', 16)} متنی متحرک</button>
          </div></div>
        <label class="field"><span>عنوان *</span><input name="title" required maxlength="80" value="${esc(a.title)}"></label>
        <div class="only-text">
          <label class="field"><span>متن دوم</span><input name="subtitle" maxlength="120" value="${esc(a.subtitle)}"></label>
          <label class="field"><span>متن دکمه</span><input name="cta" maxlength="24" value="${esc(a.cta)}" placeholder="مثلاً: همین حالا ببینید"></label>
          <div class="field"><span>رنگ‌ها</span><div class="colors">
            <input type="color" name="bg_from" value="${esc(a.bg_from || '#1877F2')}"><input type="color" name="bg_to" value="${esc(a.bg_to || '#7AB3FF')}">
            <div class="presets">${[['#1877F2', '#7AB3FF'], ['#0F9D58', '#6DD5A0'], ['#F59E0B', '#FBBF24'], ['#E11D48', '#FB7185'], ['#7C3AED', '#C084FC'], ['#0F172A', '#334155']].map(([x, y]) => `<button type="button" data-preset="${x},${y}" style="background:linear-gradient(135deg,${x},${y})"></button>`).join('')}</div>
          </div></div>
        </div>
        <div class="only-image">
          <div class="field"><span>تصویر</span>
            <label class="upload">${icon('download', 18)}<span id="up-label">انتخاب فایل (JPG, PNG, WEBP, GIF)</span><input type="file" id="file" accept="image/*"></label>
            <input name="image_url" dir="ltr" placeholder="یا آدرس تصویر: https://..." value="${esc(a.image_url)}"></div>
        </div>
        <label class="field"><span>لینک هنگام کلیک</span><input name="link_url" dir="ltr" placeholder="https://wa.me/93790499585" value="${esc(a.link_url)}"></label>
        <div class="two">
          <label class="field"><span>شروع نشر</span><input type="datetime-local" name="starts_at" value="${toLocalInput(a.starts_at)}"></label>
          <label class="field"><span>پایان نشر</span><input type="datetime-local" name="ends_at" value="${toLocalInput(a.ends_at)}"></label>
        </div>
        <div class="two">
          <label class="field"><span>اولویت (بزرگ‌تر = اول)</span><input type="number" name="priority" value="${Number(a.priority) || 0}" min="0" max="100"></label>
          <div class="field"><span>وضعیت</span><label class="inline-switch"><span class="switch"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}><i></i></span>فعال</label></div>
        </div>
      </div>
      <div class="adm-preview-col">
        <span class="field-label">پیش‌نمایش زنده</span>
        <div id="preview"></div>
      </div>
    </div>
    <div class="adm-foot">
      <button type="button" class="btn ghost" data-close>انصراف</button>
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
      ? `<div class="sticker-prev"><div class="sticker-link">${d.kind === 'image' && d.image_url ? `<img src="${esc(d.image_url)}">` : `<div class="sticker-text" style="--a1:${esc(d.bg_from)};--a2:${esc(d.bg_to)}"><strong>${esc(d.title || 'عنوان')}</strong>${d.subtitle ? `<span>${esc(d.subtitle)}</span>` : ''}</div>`}<span class="ad-label">تبلیغ</span></div></div>`
      : `<div class="${cls}">${adInner({ ...d, title: d.title || 'عنوان تبلیغ' })}<span class="ad-label">تبلیغ</span></div>`;
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
    if (file.size > 5 * 1024 * 1024) { toast('حجم فایل بیشتر از ۵ مگابایت است', true); return; }
    $('#up-label').textContent = 'در حال آپلود…';
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from('ads').upload(path, file, { cacheControl: '31536000', contentType: file.type });
    if (error) { toast('آپلود ناموفق: ' + error.message, true); $('#up-label').textContent = 'انتخاب فایل'; return; }
    form.image_url.value = sb.storage.from('ads').getPublicUrl(path).data.publicUrl;
    $('#up-label').textContent = '✓ ' + file.name;
    preview();
  };
  $('#modal').querySelectorAll('[data-close]').forEach((b) => (b.onclick = closeForm));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = read();
    const f = new FormData(form);
    if (kind === 'image' && !d.image_url) { toast('تصویر را انتخاب یا آدرس آن را وارد کنید', true); return; }
    if (d.link_url && !/^(https?:|mailto:|tel:)/i.test(d.link_url)) { toast('لینک باید با https:// شروع شود', true); return; }
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
    closeForm();
    loadAds();
  };
  preview();
}

function closeForm() {
  $('#modal').innerHTML = '';
  document.body.classList.remove('no-scroll');
}

boot();
