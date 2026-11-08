// Apex Job — برنامه اصلی (وب + اندروید)
import '@fontsource-variable/vazirmatn';
import './styles.css';
import DOMPurify from 'dompurify';
import { App } from '@capacitor/app';
import { CONFIG } from './config.js';
import { configured, fetchJobs, fetchJob, fetchAds, fetchLastUpdate, fetchSettings, cachedSettings, cachedJobs, logLead, store, todayISO } from './api.js';
import { LANGS, t, num, getLang, setLang, applyDocumentLang, trProvince, trCategory, trCategoryOne, splitCats, trType, trGender, trNationality, fmtDate, timeAgo } from './i18n.js';
import { icon, LOGO_MARK } from './icons.js';
import { setAds, heroSliderHtml, feedAdHtml, detailAdHtml, renderSticker, mountAds } from './ads.js';
import { isNative, applyNotificationSetting } from './notify.js';
import { buildFaq, waMessage, mergeSettings } from './faq.js';
import { PROVINCES, CATEGORIES } from './data/taxonomy.js';
import { initPwa, installBannerHtml, installPwa, dismissPwa } from './pwa.js';

// ---------------------------------------------------------------- state
const DEFAULT_FILTERS = { q: '', province: '', category: '', type: '', gender: '', posted: '', quick: '', sort: 'new' };
const state = {
  jobs: [],
  loaded: false,
  error: null,
  offline: false,
  lastUpdate: null,
  filters: { ...DEFAULT_FILTERS },
  limit: 30,
  prefs: { name: '', provinces: [], categories: [], notify: true, theme: 'system', ...store.get('aj.prefs', {}) },
  saved: store.get('aj.saved', {}),
  seenAt: store.get('aj.seenAt', null),
  settings: mergeSettings(cachedSettings()),
  homeScroll: 0,
  detail: null,
  showOriginal: false,
};
if (!state.seenAt) { state.seenAt = Date.now(); store.set('aj.seenAt', state.seenAt); }

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const savePrefs = () => store.set('aj.prefs', state.prefs);
const saveSaved = () => store.set('aj.saved', state.saved);
const sx = (obj) => (obj && (obj[getLang()] || obj.fa)) || '';

// ---------------------------------------------------------------- helpers
const DAY = 864e5;
const today0 = () => new Date(todayISO() + 'T00:00:00').getTime();

function daysLeft(job) {
  if (!job.closing_date) return null;
  return Math.round((new Date(job.closing_date + 'T00:00:00').getTime() - today0()) / DAY);
}
/** تاریخ نشر معتبر (تاریخ‌های غیرعادی منبع نادیده گرفته می‌شوند) */
function pubTime(job) {
  if (!job.published) return null;
  const p = new Date(job.published + 'T00:00:00').getTime();
  const seen = new Date(job.first_seen_at).getTime();
  if (isNaN(p) || p > Date.now() + DAY || (!isNaN(seen) && p < seen - 60 * DAY)) return null;
  return p;
}
function ageDays(job) {
  const p = pubTime(job);
  if (p !== null) return Math.max(0, Math.round((today0() - p) / DAY));
  return Math.floor((Date.now() - new Date(job.first_seen_at).getTime()) / DAY);
}
const isNew = (job) => pubTime(job) !== null && ageDays(job) <= 1 && (Date.now() - new Date(job.first_seen_at).getTime()) < 2 * DAY;

function agoText(job) {
  if (pubTime(job) === null) return '';
  const d = ageDays(job);
  return d === 0 ? t('today') : d === 1 ? t('yesterday') : t('dayAgo', { n: d });
}

function deadlinePill(job) {
  const d = daysLeft(job);
  if (d === null) return '';
  let cls = '', txt;
  if (d < 0) { cls = 'closed'; txt = t('closed'); }
  else if (d === 0) { cls = 'hot'; txt = t('lastDay'); }
  else { cls = d <= 2 ? 'hot' : d <= 5 ? 'warm' : ''; txt = t('daysLeft', { n: d }); }
  return `<span class="dl-pill ${cls}">${icon('clock', 14)}${esc(txt)}</span>`;
}

function hueOf(s) {
  let h = 0;
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
function initials(org) {
  const words = String(org || '?').replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
    .filter((w) => w && !/^(the|of|and|for|in)$/i.test(w));
  if (!words.length) return '?';
  const isLatin = /[a-z]/i.test(words[0][0]);
  return isLatin ? (words[0][0] + (words[1]?.[0] || '')).toUpperCase() : words[0][0];
}
const avatar = (org, cls = '') => `<div class="avatar ${cls}" style="--h:${hueOf(org)}">${esc(initials(org))}</div>`;

const provincesText = (job) => (job.locations?.length
  ? job.locations.slice(0, 2).map((p) => trProvince(p)).join('، ') + (job.locations.length > 2 ? ` +${num(job.locations.length - 2)}` : '')
  : esc(job.location_raw || ''));

const norm = (s) => String(s || '').toLowerCase()
  .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀة]/g, 'ه').replace(/[ً-ٰٟ]/g, '')
  .replace(/[‌‏]/g, ' ');

/** عنوان وظیفه به زبان اپ (اگر ترجمه موجود باشد) */
const jt = (j) => (getLang() !== 'en' && j?.title_tr?.[getLang()]) || j?.title || '';
/** نسخه ترجمه‌شده جزئیات وظیفه به زبان اپ */
function localized(job) {
  const lang = getLang();
  const tr = job?.tr?.[lang];
  if (lang === 'en' || state.showOriginal || !tr) return job;
  const out = { ...job, title: jt(job) };
  for (const k of ['about_html', 'summary_html', 'requirements_html', 'submission_html', 'education', 'experience', 'salary', 'contract_duration']) {
    if (tr[k] && String(tr[k]).trim()) out[k] = tr[k];
  }
  return out;
}

function jobUrl(id) {
  const base = CONFIG.siteUrl || (location.protocol.startsWith('http') && !isNative() ? location.href.split('#')[0] : '');
  return base ? `${base.replace(/#.*$/, '')}#/job/${id}` : '';
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('on'), 2200);
}

const isTextInput = (el) => !!el && (el.tagName === 'TEXTAREA' ||
  (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'color', 'file', 'range'].includes(el.type)));

// ---------------------------------------------------------------- theme
function resolvedTheme() {
  if (state.prefs.theme === 'system') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return state.prefs.theme;
}
function applyTheme() {
  const th = resolvedTheme();
  document.documentElement.dataset.theme = th;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = th === 'dark' ? '#0E1420' : '#FBF6EC';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (state.prefs.theme === 'system') { applyTheme(); renderShell(); } });

// ---------------------------------------------------------------- filtering
function matches(j, f, skipQ = false) {
  if (f.province && !(j.locations || []).includes(f.province)) return false;
  if (f.category && !splitCats(j.category).includes(f.category)) return false;
  if (f.type && j.job_type !== f.type) return false;
  if (f.gender === 'Female' && j.gender === 'Male') return false;
  if (f.gender === 'Male' && j.gender === 'Female') return false;
  if (f.posted && ageDays(j) >= Number(f.posted)) return false;
  if (f.quick === 'new' && !isNew(j)) return false;
  if (f.quick === 'soon') { const d = daysLeft(j); if (d === null || d < 0 || d > 3) return false; }
  if (!skipQ && f.q.trim()) {
    const hay = norm([j.title, j.title_tr?.fa, j.title_tr?.ps, j.organization, j.category, trCategory(j.category), j.job_type, trType(j.job_type),
      j.location_raw, ...(j.locations || []), ...(j.locations || []).map((p) => trProvince(p))].join(' '));
    for (const tok of norm(f.q).split(/\s+/).filter(Boolean)) if (!hay.includes(tok)) return false;
  }
  return true;
}

function filtered() {
  const f = state.filters;
  const list = state.jobs.filter((j) => matches(j, f));
  if (f.sort === 'deadline') {
    list.sort((a, b) => (a.closing_date || '9999').localeCompare(b.closing_date || '9999'));
  }
  return list;
}

const activeFilterCount = () => ['province', 'category', 'type', 'gender', 'posted'].filter((k) => state.filters[k]).length;

function counts(field) {
  const m = new Map();
  for (const j of state.jobs) {
    const vals = field === 'locations' ? (j.locations || []) : field === 'category' ? splitCats(j.category) : [j[field]];
    for (const v of vals) if (v) m.set(v, (m.get(v) || 0) + 1);
  }
  return m;
}

const unseenCount = () => state.jobs.filter((j) => new Date(j.first_seen_at).getTime() > state.seenAt && ageDays(j) <= 3).length;

// ---------------------------------------------------------------- shell
function renderShell() {
  const unseen = unseenCount();
  const route = currentRoute().name;
  const badge = unseen ? `<span class="nbadge">${num(unseen > 99 ? '99+' : unseen)}</span>` : '';
  const initial = state.prefs.name ? esc(state.prefs.name.trim()[0]) : icon('user', 19);
  const langCode = getLang();
  $('#topbar').innerHTML = `
    <div class="tb-inner">
      <a class="brand" href="#/" aria-label="Apex Job">${LOGO_MARK}<span class="brand-name" dir="ltr">Apex<b>Job</b></span></a>
      <nav class="tb-links">
        <a href="#/" class="${route === 'home' ? 'on' : ''}">${icon('home', 18)}${t('home')}</a>
        <a href="#/new" class="${route === 'new' ? 'on' : ''}">${icon('bell', 18)}${t('updates')}${badge}</a>
        <a href="#/saved" class="${route === 'saved' ? 'on' : ''}">${icon('bookmark', 18)}${t('savedJobs')}</a>
      </nav>
      <div class="tb-actions">
        <div class="lang-wrap">
          <button class="icon-btn lang-btn" id="lang-btn" aria-haspopup="true" aria-label="${t('language')}">${icon('globe', 19)}<span>${langCode === 'en' ? 'EN' : langCode === 'ps' ? 'پښ' : 'دری'}</span></button>
          <div class="lang-menu" id="lang-menu" role="menu">
            ${LANGS.map((l) => `<button role="menuitem" data-lang="${l.code}" class="${l.code === langCode ? 'on' : ''}">${l.label}${l.code === langCode ? icon('check', 16) : ''}</button>`).join('')}
          </div>
        </div>
        <button class="icon-btn" id="theme-btn" aria-label="${t('theme')}">${icon(resolvedTheme() === 'dark' ? 'sun' : 'moon', 19)}</button>
        <a class="avatar-btn ${route === 'profile' ? 'on' : ''}" href="#/profile" aria-label="${t('profile')}">${initial}</a>
      </div>
    </div>`;
  $('#bottomnav').innerHTML = `
    <a href="#/" class="${route === 'home' ? 'on' : ''}">${icon('home', 22)}<span>${t('home')}</span></a>
    <a href="#/new" class="${route === 'new' ? 'on' : ''}">${icon('bell', 22)}<span>${t('updates')}</span>${badge}</a>
    <a href="#/saved" class="${route === 'saved' ? 'on' : ''}">${icon('bookmark', 22)}<span>${t('savedJobs')}</span></a>
    <a href="#/profile" class="${route === 'profile' ? 'on' : ''}">${icon('user', 22)}<span>${t('profile')}</span></a>`;
}

// ---------------------------------------------------------------- cards
function jobCard(j, compact = false) {
  const saved = !!state.saved[j.id];
  const fresh = isNew(j);
  const ago = agoText(j);
  return `<article class="job-card${fresh ? ' is-new' : ''}${compact ? ' compact' : ''}">
    ${avatar(j.organization)}
    <div class="jc-main">
      <h3 class="jc-title" dir="auto"><a class="stretched" href="#/job/${j.id}">${esc(jt(j))}</a></h3>
      <div class="jc-org" dir="auto">${esc(j.organization)}</div>
      <div class="jc-meta">
        ${j.locations?.length || j.location_raw ? `<span>${icon('pin', 15)}${provincesText(j)}</span>` : ''}
        ${j.job_type ? `<span>${icon('briefcase', 15)}${esc(trType(j.job_type))}</span>` : ''}
        ${!compact && j.category ? `<span class="m-cat">${icon('tag', 15)}${esc(trCategory(j.category))}</span>` : ''}
      </div>
    </div>
    <div class="jc-side">
      <div class="jc-top">
        ${fresh ? `<span class="star-badge">${icon('star', 13)}${t('new')}</span>` : ''}
        <button class="save-btn${saved ? ' on' : ''}" data-save="${j.id}" aria-label="${t('save')}">${icon('bookmark', 19)}</button>
      </div>
      <div class="jc-bottom">${deadlinePill(j)}${ago ? `<span class="jc-ago">${esc(ago)}</span>` : ''}</div>
    </div>
  </article>`;
}

function emptyState(ic, title, hint, extra = '') {
  return `<div class="empty">${icon(ic, 40)}<h3>${esc(title)}</h3>${hint ? `<p>${esc(hint)}</p>` : ''}${extra}</div>`;
}

function skeletons(n = 6) {
  return Array.from({ length: n }, () => '<div class="job-card skel"><div class="avatar"></div><div class="jc-main"><i></i><i></i><i></i></div></div>').join('');
}

// ---------------------------------------------------------------- filter panel
function chipGroup(key, options) {
  return `<div class="chip-group">${options.map(([v, label]) =>
    `<button class="fchip${state.filters[key] === v ? ' on' : ''}" data-fchip="${key}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
}

function filterPanelHtml() {
  const f = state.filters;
  const pc = counts('locations');
  const cc = counts('category');
  const tc = counts('job_type');
  const provs = [...new Set([...pc.keys(), ...Object.keys(PROVINCES)])]
    .sort((a, b) => (pc.get(b) || 0) - (pc.get(a) || 0) || trProvince(a).localeCompare(trProvince(b)));
  const cats = [...cc.keys()].sort((a, b) => cc.get(b) - cc.get(a));
  const types = [...tc.keys()].sort((a, b) => tc.get(b) - tc.get(a)).slice(0, 6);
  return `<div class="fp">
    <label class="fp-field"><span>${icon('pin', 16)}${t('province')}</span>
      <select data-f="province"><option value="">${t('allProvinces')}</option>
        ${provs.map((p) => `<option value="${esc(p)}"${f.province === p ? ' selected' : ''}>${esc(trProvince(p))}${pc.get(p) ? ` (${num(pc.get(p))})` : ''}</option>`).join('')}
      </select></label>
    <label class="fp-field"><span>${icon('grid', 16)}${t('category')}</span>
      <select data-f="category"><option value="">${t('allCategories')}</option>
        ${cats.map((c) => `<option value="${esc(c)}"${f.category === c ? ' selected' : ''}>${esc(trCategoryOne(c))} (${num(cc.get(c))})</option>`).join('')}
      </select></label>
    <div class="fp-field"><span>${icon('briefcase', 16)}${t('jobType')}</span>
      ${chipGroup('type', [['', t('all')], ...types.map((x) => [x, trType(x)])])}</div>
    <div class="fp-field"><span>${icon('gender', 16)}${t('gender')}</span>
      ${chipGroup('gender', [['', t('all')], ['Female', t('forWomen')], ['Male', t('forMen')]])}</div>
    <div class="fp-field"><span>${icon('calendar', 16)}${t('posted')}</span>
      ${chipGroup('posted', [['', t('all')], ['1', t('today')], ['3', t('last3')], ['7', t('lastWeek')]])}</div>
    ${activeFilterCount() ? `<button class="btn ghost full" data-clear>${icon('x', 16)}${t('clearFilters')}</button>` : ''}
  </div>`;
}

function activeChipsHtml() {
  const f = state.filters;
  const chips = [];
  if (f.province) chips.push(['province', trProvince(f.province)]);
  if (f.category) chips.push(['category', trCategoryOne(f.category)]);
  if (f.type) chips.push(['type', trType(f.type)]);
  if (f.gender) chips.push(['gender', f.gender === 'Female' ? t('forWomen') : t('forMen')]);
  if (f.posted) chips.push(['posted', f.posted === '1' ? t('today') : f.posted === '3' ? t('last3') : t('lastWeek')]);
  if (f.quick) chips.push(['quick', f.quick === 'new' ? t('newToday') : t('closingSoon')]);
  if (!chips.length) return '';
  return chips.map(([k, l]) => `<button class="achip" data-chip-remove="${k}">${esc(l)}${icon('x', 14)}</button>`).join('');
}

// ---------------------------------------------------------------- home
function quickRowHtml() {
  const cc = counts('category');
  const top = [...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const f = state.filters;
  return `<div class="quick-row" role="toolbar">
    <button class="qchip star${f.quick === 'new' ? ' on' : ''}" data-quick="new">${icon('star', 15)}${t('newToday')}</button>
    <button class="qchip fire${f.quick === 'soon' ? ' on' : ''}" data-quick="soon">${icon('fire', 15)}${t('closingSoon')}</button>
    ${top.map(([c, n]) => `<button class="qchip${f.category === c ? ' on' : ''}" data-cat="${esc(c)}">${esc(trCategoryOne(c))}<small>${num(n)}</small></button>`).join('')}
  </div>`;
}

function forYouHtml() {
  const { provinces, categories } = state.prefs;
  if (!provinces.length && !categories.length) return '';
  const list = state.jobs.filter((j) =>
    (!provinces.length || (j.locations || []).some((p) => provinces.includes(p))) &&
    (!categories.length || splitCats(j.category).some((c) => categories.includes(c)))).slice(0, 12);
  if (!list.length) return '';
  return `<section class="foryou">
    <div class="sec-head"><h2>${icon('sparkle', 20)}${t('forYou')}</h2><small>${t('forYouHint')}</small></div>
    <div class="hscroll">${list.map((j) => jobCard(j, true)).join('')}</div>
  </section>`;
}

function statsNumbers() {
  const jobs = state.jobs;
  return {
    total: state.loaded ? num(jobs.length) : '—',
    fresh: state.loaded ? num(jobs.filter(isNew).length) : '—',
    orgs: state.loaded ? num(new Set(jobs.map((j) => j.organization)).size) : '—',
  };
}

function heroLatestHtml() {
  if (!state.loaded || !state.jobs.length) return '';
  const latest = [...state.jobs].sort((a, b) => ageDays(a) - ageDays(b) || b.id - a.id).slice(0, 4);
  return `<div class="hero-latest" aria-label="${t('latest')}">
    <div class="hl-head">${icon('star', 15)}${t('latest')}</div>
    ${latest.map((j) => `<a class="hl-item" href="#/job/${j.id}">
      ${avatar(j.organization)}
      <span class="hl-text"><b dir="auto">${esc(jt(j))}</b><small dir="auto">${esc(j.organization)}</small></span>
      ${deadlinePill(j)}
    </a>`).join('')}
  </div>`;
}

function renderHome() {
  const s = statsNumbers();
  const unseen = unseenCount();
  const hello = state.prefs.name ? t('heroHello', { name: esc(state.prefs.name) }) : t('heroTitle');
  const fc = activeFilterCount();
  $('#view').innerHTML = `
    <section class="hero">
      <div class="hero-bg" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="hero-inner">
        <div class="hero-main">
          <p class="kicker">${icon('sparkle', 16)}${t('tagline')}</p>
          <h1>${hello}</h1>
          <form class="searchbar" id="hero-search" role="search" onsubmit="return false">
            ${icon('search', 20)}
            <input id="q" data-q type="search" enterkeyhint="search" autocomplete="off" placeholder="${t('searchPh')}" value="${esc(state.filters.q)}">
            <button type="button" class="filter-btn" data-open-filters aria-label="${t('filters')}">${icon('sliders', 20)}${fc ? `<span class="fbadge">${num(fc)}</span>` : ''}</button>
          </form>
          <div class="stats">
            <div><b>${s.total}</b><span>${t('activeJobs')}</span></div>
            <div class="st-new"><b>${icon('star', 15)}${s.fresh}</b><span>${t('newToday')}</span></div>
            <div><b>${s.orgs}</b><span>${t('orgs')}</span></div>
          </div>
        </div>
        ${heroLatestHtml()}
      </div>
    </section>
    ${unseen ? `<a class="notice-new" href="#/new">${icon('bell', 18)}<span>${t('newSince', { n: unseen })}</span><b>${t('viewNew')}${icon('next', 16, 'flip')}</b></a>` : ''}
    ${installBannerHtml()}
    ${state.offline ? `<div class="notice-off">${icon('refresh', 16)}${t('offline')}</div>` : ''}
    ${heroSliderHtml()}
    ${state.loaded ? quickRowHtml() : ''}
    ${state.loaded ? forYouHtml() : ''}
    <div class="layout">
      <aside class="side-filters" id="side-filters">
        <div class="side-head">${icon('sliders', 18)}<h2>${t('filters')}</h2></div>
        ${filterPanelHtml()}
      </aside>
      <section class="results" id="results">
        <div class="results-head">
          <h2 id="results-count"></h2>
          <label class="sort">${icon('sliders', 16)}
            <select data-f="sort">
              <option value="new"${state.filters.sort === 'new' ? ' selected' : ''}>${t('sortNew')}</option>
              <option value="deadline"${state.filters.sort === 'deadline' ? ' selected' : ''}>${t('sortDeadline')}</option>
            </select></label>
        </div>
        <div class="active-chips" id="active-chips"></div>
        <div class="job-list" id="job-list"></div>
        <div id="load-more"></div>
        ${state.lastUpdate ? `<p class="updated">${icon('refresh', 14)}${t('updatedAgo', { t: timeAgo(state.lastUpdate) })}</p>` : ''}
      </section>
    </div>
    ${!isNative() && CONFIG.apkUrl ? `<a class="get-app" href="${esc(CONFIG.apkUrl)}" target="_blank" rel="noopener">${LOGO_MARK}<span>${t('getApp')}</span><b>${icon('download', 18)}${t('getAppBtn')}</b></a>` : ''}
  `;
  renderMiniBar();
  refreshResults();
  mountAds($('#view'));
}

// ---------------------------------------------------------------- نوار جستجوی کوچک هنگام اسکرول
function miniBarEl() {
  let el = $('#mini-bar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mini-bar';
    el.className = 'mini-bar';
    document.body.appendChild(el);
  }
  return el;
}

function renderMiniBar() {
  const el = miniBarEl();
  if (currentRoute().name !== 'home') { el.innerHTML = ''; el.classList.remove('show'); return; }
  const s = statsNumbers();
  const fc = activeFilterCount();
  el.innerHTML = `<div class="mini-inner">
    <form class="searchbar mini" role="search" onsubmit="return false">
      ${icon('search', 18)}
      <input id="q2" data-q type="search" enterkeyhint="search" autocomplete="off" placeholder="${t('searchPh')}" value="${esc(state.filters.q)}">
      <button type="button" class="filter-btn" data-open-filters aria-label="${t('filters')}">${icon('sliders', 18)}${fc ? `<span class="fbadge">${num(fc)}</span>` : ''}</button>
    </form>
    <div class="mini-stats">
      <span><b>${s.total}</b> ${t('activeJobs')}</span>
      <span class="st-new">${icon('star', 13)}<b>${s.fresh}</b> ${t('newToday')}</span>
    </div>
  </div>`;
  updateMiniBar();
}

function updateMiniBar() {
  const el = $('#mini-bar');
  if (!el || !el.innerHTML) return;
  const hero = $('#hero-search');
  if (!hero) { el.classList.remove('show'); return; }
  const topH = $('#topbar').getBoundingClientRect().bottom;
  const focused = document.activeElement?.id === 'q2';
  const show = focused || hero.getBoundingClientRect().bottom < topH;
  el.classList.toggle('show', show);
  document.body.classList.toggle('mini-on', show);
}
let scrollRaf = 0;
window.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; updateMiniBar(); });
}, { passive: true });

let qTimer;
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.matches?.('[data-q]')) return;
  document.querySelectorAll('[data-q]').forEach((x) => { if (x !== el) x.value = el.value; });
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    state.filters.q = el.value;
    state.limit = 30;
    refreshResults();
    // وقتی از نوار کوچک جستجو می‌شود، نتایج زیر همان نوار دیده شوند
    if (el.id === 'q2') {
      const res = $('#results');
      const bar = $('#mini-bar .mini-inner');
      if (res && bar) {
        const target = res.getBoundingClientRect().top + window.scrollY - bar.getBoundingClientRect().bottom - 8;
        if (window.scrollY > target) window.scrollTo({ top: target });
      }
    }
  }, 160);
});

function refreshResults() {
  const list = $('#job-list');
  if (!list) return;
  const countEl = $('#results-count');
  if (!state.loaded) {
    if (state.error) {
      list.innerHTML = emptyState('refresh', state.error === 'not-configured' ? t('notConfigured') : t('error'), '',
        `<button class="btn primary" data-retry>${icon('refresh', 18)}${t('retry')}</button>`);
      countEl.textContent = '';
    } else {
      list.innerHTML = skeletons();
      countEl.textContent = t('loading');
    }
    return;
  }
  const items = filtered();
  countEl.textContent = t('foundN', { n: items.length });
  $('#active-chips').innerHTML = activeChipsHtml();
  if (!items.length) {
    list.innerHTML = emptyState('search', t('noResults'), t('noResultsHint'),
      `<button class="btn ghost" data-clear>${icon('x', 16)}${t('clearFilters')}</button>`);
    $('#load-more').innerHTML = '';
  } else {
    const shown = items.slice(0, state.limit);
    let html = '';
    shown.forEach((j, i) => {
      html += jobCard(j);
      if ((i + 1) % 6 === 0) html += feedAdHtml(Math.floor(i / 6));
    });
    list.innerHTML = html;
    $('#load-more').innerHTML = items.length > state.limit
      ? `<button class="btn ghost full" data-more>${t('loadMore')} (${num(items.length - state.limit)})</button>` : '';
    mountAds(list);
  }
  const sheetBtn = $('#sheet-apply');
  if (sheetBtn) sheetBtn.textContent = t('showN', { n: items.length });
  const fc = activeFilterCount();
  document.querySelectorAll('.filter-btn').forEach((fb) => {
    fb.innerHTML = icon('sliders', fb.closest('.mini') ? 18 : 20) + (fc ? `<span class="fbadge">${num(fc)}</span>` : '');
  });
}

function refreshFilters() {
  const side = $('#side-filters');
  if (side) side.innerHTML = `<div class="side-head">${icon('sliders', 18)}<h2>${t('filters')}</h2></div>` + filterPanelHtml();
  const sheet = $('#sheet-body');
  if (sheet) sheet.innerHTML = filterPanelHtml();
  const qr = $('.quick-row');
  if (qr) qr.outerHTML = quickRowHtml();
  refreshResults();
}

// ---------------------------------------------------------------- filter sheet (mobile)
let sheetHistory = false;
function openSheet() {
  if (document.activeElement && isTextInput(document.activeElement)) document.activeElement.blur();
  $('#sheet-root').innerHTML = `
    <div class="sheet-overlay" data-close-sheet></div>
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      <div class="sheet-head"><h2>${icon('sliders', 20)}${t('filters')}</h2><button class="icon-btn" data-close-sheet aria-label="${t('close')}">${icon('x', 20)}</button></div>
      <div class="sheet-body" id="sheet-body">${filterPanelHtml()}</div>
      <div class="sheet-foot"><button class="btn primary full" id="sheet-apply" data-close-sheet>${t('showN', { n: filtered().length })}</button></div>
    </div>`;
  requestAnimationFrame(() => $('#sheet-root').classList.add('open'));
  document.body.classList.add('no-scroll');
  // در نسخه وب، دکمه برگشت مرورگر اول همین پنجره را می‌بندد
  if (!isNative()) { history.pushState({ ajSheet: 1 }, ''); sheetHistory = true; }
}
const sheetOpen = () => $('#sheet-root').classList.contains('open');
function closeSheet(fromHistory = false) {
  const root = $('#sheet-root');
  const wasOpen = root.classList.contains('open');
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 260);
  if (sheetHistory && !fromHistory && wasOpen) { sheetHistory = false; history.back(); }
  else if (fromHistory) sheetHistory = false;
}
window.addEventListener('popstate', () => { if (sheetOpen()) closeSheet(true); });

// ---------------------------------------------------------------- detail
const LIST_KEYS = ['id', 'title', 'title_tr', 'organization', 'job_type', 'locations', 'location_raw', 'category', 'published', 'closing_date', 'gender', 'first_seen_at'];
const pickList = (j) => Object.fromEntries(LIST_KEYS.map((k) => [k, j[k]]));

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') { node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener noreferrer'); }
});
const clean = (html) => DOMPurify.sanitize(html || '', {
  ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h3', 'h4', 'h5', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});

function fact(ic, label, value, wide = false) {
  if (!value) return '';
  return `<div class="fact${wide ? ' wide' : ''}"><span class="fact-ic">${icon(ic, 18)}</span><div><small>${esc(label)}</small><b dir="auto">${value}</b></div></div>`;
}

/** لینک واتساپ با پیام آماده (بدون هیچ لینکی) */
function waLink(job) {
  const number = state.settings.whatsapp || CONFIG.whatsapp;
  if (!job) return `https://wa.me/${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(waMessage(job, getLang()))}`;
}

function contactBlock(job) {
  const s = state.settings;
  return `<div class="help-card">
    <div class="help-head"><span class="help-ic">${icon('sparkle', 22)}</span><div><h3>${t('helpTitle')}</h3><p>${t('helpText')}</p></div></div>
    <div class="help-actions">
      <a class="btn wa" href="${waLink(job)}" ${job ? `data-wa="${job.id}"` : ''} target="_blank" rel="noopener">${icon('whatsapp', 20)}${t('whatsapp')}</a>
      <a class="btn ghost" href="tel:${esc(s.phone)}">${icon('phone', 18)}<span dir="ltr">${esc(s.phone)}</span></a>
    </div>
    <div class="help-addr">${icon('pin', 18)}<div><small>${t('office')}</small><span>${esc(sx(s.address))}</span></div></div>
    <div class="help-addr">${icon('clock', 18)}<div><small>${t('hours')}</small><span>${esc(sx(s.hours))}</span></div></div>
  </div>`;
}

function faqHtml(job) {
  const items = buildFaq(job, state.settings, getLang());
  return `<section class="card faq">
    <h2>${icon('sparkle', 20)}${t('faqTitle')}</h2>
    <div class="faq-list">
      ${items.map((it, i) => `<details class="faq-item"${i === 0 ? ' open' : ''}>
        <summary><span>${esc(it.q)}</span>${icon('next', 18, 'faq-chev')}</summary>
        <div class="faq-a">${esc(it.a).replace(/\n/g, '<br>')}</div>
      </details>`).join('')}
    </div>
    <a class="faq-more" href="${waLink(job)}" data-wa="${job.id}" target="_blank" rel="noopener">${icon('whatsapp', 18)}${t('faqMore')}</a>
  </section>`;
}

async function renderDetail(id) {
  const view = $('#view');
  const listJob = state.jobs.find((j) => j.id === id);
  view.innerHTML = `<div class="detail">${detailTop()}<div class="card d-head">${listJob ? headInner(listJob) : '<div class="skel-block"></div>'}</div><div class="card skel-block tall"></div></div>`;
  let job;
  try {
    job = await fetchJob(id);
  } catch (e) {
    if (currentRoute().id !== id) return;
    view.innerHTML = `<div class="detail">${detailTop()}${emptyState('refresh', e.message === 'not-configured' ? t('notConfigured') : t('error'), '', `<button class="btn primary" data-retry>${icon('refresh', 18)}${t('retry')}</button>`)}</div>`;
    return;
  }
  if (currentRoute().id !== id) return;
  state.detail = job;
  if (!job) {
    view.innerHTML = `<div class="detail">${detailTop()}${emptyState('search', t('notFound'), '')}</div>`;
    return;
  }
  document.title = `${jt(job)} — Apex Job`;
  const L = localized(job);
  const hasTr = getLang() !== 'en' && !!job.tr?.[getLang()];
  const sec = (key, html) => (html && html.replace(/<[^>]+>/g, '').trim()
    ? `<section class="card prose"><h2>${t(key)}</h2><div class="prose-body" dir="auto">${clean(html)}</div></section>` : '');
  const dl = daysLeft(job);
  view.innerHTML = `<div class="detail">
    ${detailTop(job)}
    <div class="detail-grid">
      <div class="d-main">
        <div class="card d-head">${headInner(job)}</div>
        <section class="card facts">
          <h2 class="sr">${t('detailsOf')}</h2>
          <div class="facts-grid">
            ${fact('pin', t('location'), job.locations?.length ? esc(job.locations.map((p) => trProvince(p)).join('، ')) : esc(job.location_raw))}
            ${fact('briefcase', t('jobType'), esc(trType(job.job_type)))}
            ${fact('tag', t('category'), esc(trCategory(job.category)))}
            ${pubTime(job) !== null ? fact('calendar', t('published'), esc(fmtDate(job.published))) : ''}
            ${fact('clock', t('deadline'), job.closing_date ? `${esc(fmtDate(job.closing_date))}${dl !== null && dl >= 0 ? `<em class="${dl <= 2 ? 'hot' : ''}">${esc(dl === 0 ? t('lastDay') : t('daysLeft', { n: dl }))}</em>` : ''}` : '')}
            ${fact('gender', t('gender'), esc(trGender(job.gender)))}
            ${fact('flag', t('nationality'), esc(trNationality(job.nationality)))}
            ${fact('money', t('salary'), esc(L.salary))}
            ${fact('calendar', t('contractDuration'), esc(L.contract_duration))}
            ${fact('hash', t('vacancyNumber'), esc(job.vacancy_number))}
            ${fact('users', t('positions'), esc(job.positions ? num(job.positions) : ''))}
          </div>
          ${L.education || L.experience ? `<div class="facts-long">
            ${fact('cap', t('education'), esc(L.education), true)}
            ${fact('star', t('experience'), esc(L.experience), true)}
          </div>` : ''}
        </section>
        <div id="ad-slot">${detailAdHtml()}</div>
        ${hasTr ? `<div class="tr-note">${icon('globe', 16)}<span>${state.showOriginal ? t('showOriginal') : t('autoTr')}</span><button data-tr-toggle>${state.showOriginal ? t('showTranslation') : t('showOriginal')}</button></div>` : ''}
        ${sec('aboutOrg', L.about_html)}
        ${sec('jobSummary', L.summary_html)}
        ${sec('requirements', L.requirements_html)}
        ${sec('howToApply', L.submission_html)}
        ${faqHtml(L)}
      </div>
      <aside class="d-aside">
        <section class="card apply-card" id="apply">
          <h2>${icon('check', 20)}${t('applyBox')}</h2>
          ${job.apply_url || job.apply_email ? `<div class="apply-direct">
            ${job.apply_url ? `<a class="btn primary" href="${esc(job.apply_url)}" target="_blank" rel="noopener">${icon('external', 18)}${t('applyNow')}</a>` : ''}
            ${job.apply_email ? `<a class="btn ghost" href="mailto:${esc(job.apply_email)}?subject=${encodeURIComponent(job.title + (job.vacancy_number ? ' - ' + job.vacancy_number : ''))}">${icon('mail', 18)}<span dir="ltr">${esc(job.apply_email)}</span></a>` : ''}
          </div>` : ''}
          ${contactBlock(job)}
        </section>
      </aside>
    </div>
    <div id="similar-slot">${similarHtml(job)}</div>
  </div>
  <div class="apply-bar">
    ${job.apply_url ? `<a class="btn primary" href="${esc(job.apply_url)}" target="_blank" rel="noopener">${icon('external', 18)}${t('applyNow')}</a>`
      : job.apply_email ? `<a class="btn primary" href="mailto:${esc(job.apply_email)}">${icon('mail', 18)}${t('applyEmail')}</a>`
      : `<a class="btn primary" href="#apply" data-scroll-apply>${icon('check', 18)}${t('howToApply')}</a>`}
    <a class="btn wa" href="${waLink(job)}" data-wa="${job.id}" target="_blank" rel="noopener">${icon('whatsapp', 20)}<span class="hide-xs">${t('whatsapp')}</span></a>
  </div>`;
  mountAds(view);
}

function similarHtml(job) {
  const cats = splitCats(job.category);
  const similar = state.jobs.filter((j) => j.id !== job.id && (splitCats(j.category).some((c) => cats.includes(c)) || j.organization === job.organization)).slice(0, 4);
  return similar.length ? `<section class="similar"><div class="sec-head"><h2>${t('similar')}</h2></div><div class="job-list">${similar.map((j) => jobCard(j)).join('')}</div></section>` : '';
}

/** وقتی داده‌ها بعد از باز شدن صفحه جزئیات رسیدند، جاهای خالی پر شوند */
function fillDetailSlots() {
  const ad = $('#ad-slot');
  if (ad && !ad.innerHTML.trim()) { ad.innerHTML = detailAdHtml(); mountAds(ad); }
  const sim = $('#similar-slot');
  if (sim && !sim.innerHTML.trim() && state.detail) sim.innerHTML = similarHtml(state.detail);
}

function detailTop(job) {
  return `<div class="detail-top">
    <button class="icon-btn" data-back aria-label="${t('back')}">${icon('back', 22, 'flip')}</button>
    ${job ? `<div class="dt-actions">
      <button class="icon-btn${state.saved[job.id] ? ' on' : ''}" data-save="${job.id}" aria-label="${t('save')}">${icon('bookmark', 20)}</button>
      <button class="icon-btn" data-share="${job.id}" aria-label="${t('share')}">${icon('share', 20)}</button>
    </div>` : ''}
  </div>`;
}

function headInner(job) {
  return `${avatar(job.organization, 'lg')}
    <div class="dh-text">
      <h1 dir="auto">${esc(jt(job))}</h1>
      <p class="dh-org" dir="auto">${icon('building', 16)}${esc(job.organization)}</p>
      <div class="dh-chips">
        ${isNew(job) ? `<span class="star-badge">${icon('star', 13)}${t('new')}</span>` : ''}
        ${deadlinePill(job)}
        ${job.locations?.length || job.location_raw ? `<span class="soft-pill">${icon('pin', 14)}${provincesText(job)}</span>` : ''}
        ${job.job_type ? `<span class="soft-pill">${icon('briefcase', 14)}${esc(trType(job.job_type))}</span>` : ''}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- updates / saved / profile
function renderUpdates() {
  const recent = state.jobs.filter((j) => ageDays(j) <= 3 && pubTime(j) !== null).sort((a, b) => ageDays(a) - ageDays(b) || b.id - a.id);
  const groups = [[t('today'), recent.filter((j) => ageDays(j) === 0)], [t('yesterday'), recent.filter((j) => ageDays(j) === 1)], [t('earlier'), recent.filter((j) => ageDays(j) > 1)]];
  $('#view').innerHTML = `<div class="page">
    <div class="page-head"><h1>${icon('bell', 24)}${t('updatesTitle')}</h1></div>
    ${!state.loaded ? `<div class="job-list">${skeletons(4)}</div>`
      : recent.length ? groups.filter(([, l]) => l.length).map(([label, l]) => `
        <div class="group-label"><span>${esc(label)}</span><small>${num(l.length)}</small></div>
        <div class="job-list">${l.map((j) => jobCard(j)).join('')}</div>`).join('')
      : emptyState('bell', t('updatesEmpty'), '')}
  </div>`;
  if (state.loaded) {
    state.seenAt = Date.now();
    store.set('aj.seenAt', state.seenAt);
  }
}

function renderSaved() {
  const list = Object.values(state.saved).sort((a, b) => (b._savedAt || 0) - (a._savedAt || 0));
  $('#view').innerHTML = `<div class="page">
    <div class="page-head"><h1>${icon('bookmark', 24)}${t('savedJobs')}</h1></div>
    ${list.length ? `<div class="job-list">${list.map((j) => jobCard(state.jobs.find((x) => x.id === j.id) || j)).join('')}</div>`
      : emptyState('bookmark', t('savedEmpty'), t('savedEmptyHint'))}
  </div>`;
}

function seg(name, options, current) {
  return `<div class="seg">${options.map(([v, l]) => `<button class="${current === v ? 'on' : ''}" data-${name}="${v}">${l}</button>`).join('')}</div>`;
}

function prefChips(kind, keys, tr) {
  const sel = state.prefs[kind];
  return `<div class="chip-cloud">${keys.map((k) => `<button class="fchip${sel.includes(k) ? ' on' : ''}" data-pref="${kind}" data-v="${esc(k)}">${sel.includes(k) ? icon('check', 14) : ''}${esc(tr(k))}</button>`).join('')}</div>`;
}

function renderProfile() {
  const p = state.prefs;
  const s = state.settings;
  const cc = counts('category');
  const cats = [...new Set([...[...cc.keys()].sort((a, b) => cc.get(b) - cc.get(a)), ...Object.keys(CATEGORIES)])];
  $('#view').innerHTML = `<div class="page profile">
    <section class="card profile-head">
      <div class="p-avatar">${p.name ? esc(p.name.trim()[0]) : icon('user', 34)}</div>
      <div><h1>${esc(p.name || t('guest'))}</h1><p>${t('profileHint')}</p></div>
    </section>
    <section class="card">
      <label class="field"><span>${t('yourName')}</span><input id="pf-name" value="${esc(p.name)}" placeholder="${t('namePh')}" maxlength="40"></label>
    </section>
    <section class="card settings">
      <div class="set-row"><span>${icon('globe', 18)}${t('language')}</span>${seg('lang', LANGS.map((l) => [l.code, l.label]), getLang())}</div>
      <div class="set-row"><span>${icon(resolvedTheme() === 'dark' ? 'moon' : 'sun', 18)}${t('theme')}</span>${seg('theme-set', [['light', t('light')], ['dark', t('dark')], ['system', t('system')]], p.theme)}</div>
      <div class="set-row">
        <span>${icon('bell', 18)}<span><b>${t('notifications')}</b><small>${isNative() ? t('notificationsHint') : t('notifWebHint')}</small></span></span>
        <label class="switch"><input type="checkbox" id="pf-notify" ${p.notify ? 'checked' : ''} ${isNative() ? '' : 'disabled'}><i></i></label>
      </div>
    </section>
    <section class="card">
      <h2>${icon('pin', 18)}${t('favProvinces')}</h2>
      ${prefChips('provinces', Object.keys(PROVINCES).sort((a, b) => trProvince(a).localeCompare(trProvince(b))), (k) => trProvince(k))}
    </section>
    <section class="card">
      <h2>${icon('grid', 18)}${t('favCategories')}</h2>
      ${prefChips('categories', cats, (k) => trCategoryOne(k))}
    </section>
    <section class="card contact">
      <h2>${icon('phone', 18)}${t('contactUs')}</h2>
      <div class="help-actions">
        <a class="btn wa" href="${waLink(null)}" target="_blank" rel="noopener">${icon('whatsapp', 20)}${t('whatsapp')}</a>
        <a class="btn ghost" href="tel:${esc(s.phone)}">${icon('phone', 18)}<span dir="ltr">${esc(s.phone)}</span></a>
      </div>
      <div class="help-addr">${icon('pin', 18)}<div><small>${t('office')}</small><span>${esc(sx(s.address))}</span></div></div>
      <div class="help-addr">${icon('clock', 18)}<div><small>${t('hours')}</small><span>${esc(sx(s.hours))}</span></div></div>
    </section>
    <section class="card about">
      <div class="about-brand">${LOGO_MARK}<span dir="ltr">Apex<b>Job</b></span></div>
      <p>${t('aboutText')}</p>
      <small>${t('version')} ${num(CONFIG.version)}${state.lastUpdate ? ` · ${t('updatedAgo', { t: timeAgo(state.lastUpdate) })}` : ''}</small>
    </section>
  </div>`;
  $('#pf-name').addEventListener('input', (e) => { state.prefs.name = e.target.value.slice(0, 40); savePrefs(); renderShell(); const h = $('.profile-head h1'); if (h) h.textContent = state.prefs.name || t('guest'); });
  const nt = $('#pf-notify');
  nt?.addEventListener('change', async () => {
    state.prefs.notify = nt.checked;
    savePrefs();
    const ok = await applyNotificationSetting(nt.checked);
    if (nt.checked && !ok) { nt.checked = false; state.prefs.notify = false; savePrefs(); }
  });
}

// ---------------------------------------------------------------- router
function currentRoute() {
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  if ((m = h.match(/^\/job\/(\d+)/))) return { name: 'job', id: Number(m[1]) };
  if (h.startsWith('/new')) return { name: 'new' };
  if (h.startsWith('/saved')) return { name: 'saved' };
  if (h.startsWith('/profile')) return { name: 'profile' };
  return { name: 'home' };
}

let lastRoute = null;
let navCount = 0;
function render() {
  const r = currentRoute();
  if (lastRoute === 'home' && r.name !== 'home') state.homeScroll = window.scrollY;
  if (sheetOpen()) closeSheet(true);
  document.body.dataset.route = r.name;
  if (r.name !== 'job') document.title = 'Apex Job';
  renderShell();
  if (r.name === 'home') renderHome();
  else if (r.name === 'job') renderDetail(r.id);
  else if (r.name === 'new') renderUpdates();
  else if (r.name === 'saved') renderSaved();
  else renderProfile();
  if (r.name !== 'home') renderMiniBar();
  renderSticker($('#sticker-root'));
  window.scrollTo(0, r.name === 'home' && lastRoute && lastRoute !== 'home' ? state.homeScroll : 0);
  updateMiniBar();
  lastRoute = r.name;
}
window.addEventListener('hashchange', () => { navCount++; render(); });

function goBack() {
  if (navCount > 0) history.back();
  else location.hash = '#/';
}

// ---------------------------------------------------------------- دکمه برگشت موبایل (اندروید)
if (isNative()) {
  App.addListener('backButton', () => {
    const ae = document.activeElement;
    if (isTextInput(ae)) { ae.blur(); return; }
    if (sheetOpen()) { closeSheet(); return; }
    const menu = $('#lang-menu');
    if (menu?.classList.contains('open')) { menu.classList.remove('open'); return; }
    const r = currentRoute().name;
    if (r !== 'home') { goBack(); return; }
    if (window.scrollY > 300) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    App.exitApp();
  });
}

// ---------------------------------------------------------------- کیبورد: دکمه‌های پایین با کیبورد بالا نیایند
const touchDevice = matchMedia('(pointer: coarse)').matches;
let fullHeight = window.innerHeight;
if (touchDevice) {
  document.addEventListener('focusin', (e) => {
    if (isTextInput(e.target)) document.body.classList.add('kb-open');
  });
  document.addEventListener('focusout', (e) => {
    if (!isTextInput(e.target)) return;
    setTimeout(() => { if (!isTextInput(document.activeElement)) { document.body.classList.remove('kb-open'); updateMiniBar(); } }, 80);
  });
  window.addEventListener('resize', () => {
    const h = window.innerHeight;
    if (h > fullHeight) fullHeight = h;
    // کیبورد با دکمه برگشت بسته شد ولی فیلد هنوز فعال است
    if (document.body.classList.contains('kb-open') && h > fullHeight * 0.9) {
      document.body.classList.remove('kb-open');
      if (isTextInput(document.activeElement)) document.activeElement.blur();
    }
  });
  window.addEventListener('orientationchange', () => setTimeout(() => { fullHeight = window.innerHeight; }, 400));
}

// ---------------------------------------------------------------- events
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-tr-toggle],[data-pwa-install],[data-pwa-dismiss],[data-wa],[data-save],[data-share],[data-back],[data-quick],[data-cat],[data-fchip],[data-chip-remove],[data-clear],[data-more],[data-open-filters],[data-close-sheet],[data-lang],[data-theme-set],[data-pref],[data-retry],#lang-btn,#theme-btn,[data-scroll-apply]');
  const menu = $('#lang-menu');
  if (menu && !e.target.closest('.lang-wrap')) menu.classList.remove('open');
  if (!el) return;
  const d = el.dataset;
  const f = state.filters;

  if (d.trToggle !== undefined) {
    const y = window.scrollY;
    state.showOriginal = !state.showOriginal;
    const r = currentRoute();
    if (r.name === 'job') renderDetail(r.id).then(() => window.scrollTo(0, y));
    return;
  }
  if (d.pwaInstall !== undefined) { installPwa(); return; }
  if (d.pwaDismiss !== undefined) { dismissPwa(); return; }
  if (d.wa) {
    // پیام واتساپ باز می‌شود؛ فقط یک سطر بی‌نام برای پنل مدیریت ثبت می‌شود
    const id = Number(d.wa);
    const j = state.detail?.id === id ? state.detail : state.jobs.find((x) => x.id === id);
    logLead(j, getLang(), isNative() ? 'android' : 'web');
    return;
  }
  if (el.id === 'lang-btn') { menu.classList.toggle('open'); return; }
  if (el.id === 'theme-btn') {
    state.prefs.theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
    savePrefs(); applyTheme(); renderShell();
    if (currentRoute().name === 'profile') renderProfile();
    return;
  }
  if (d.save) {
    e.preventDefault(); e.stopPropagation();
    const id = Number(d.save);
    if (state.saved[id]) { delete state.saved[id]; }
    else {
      const j = state.jobs.find((x) => x.id === id) || (state.detail?.id === id ? state.detail : null);
      if (j) state.saved[id] = { ...pickList(j), _savedAt: Date.now() };
      toast(t('saved'));
    }
    saveSaved();
    document.querySelectorAll(`[data-save="${id}"]`).forEach((b) => b.classList.toggle('on', !!state.saved[id]));
    if (currentRoute().name === 'saved') renderSaved();
    return;
  }
  if (d.share) {
    const id = Number(d.share);
    const j = state.jobs.find((x) => x.id === id) || (state.detail?.id === id ? state.detail : null);
    const url = jobUrl(id);
    const title = j ? `${j.title} — ${j.organization}` : 'Apex Job';
    try {
      if (navigator.share) await navigator.share({ title, text: title, url: url || undefined });
      else { await navigator.clipboard.writeText(url ? `${title}\n${url}` : title); toast(t('copied')); }
    } catch {}
    return;
  }
  if (d.back !== undefined) { goBack(); return; }
  if (d.scrollApply !== undefined) { e.preventDefault(); $('#apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (d.quick) { f.quick = f.quick === d.quick ? '' : d.quick; state.limit = 30; refreshFilters(); return; }
  if (d.cat !== undefined) { f.category = f.category === d.cat ? '' : d.cat; state.limit = 30; refreshFilters(); return; }
  if (d.fchip) { f[d.fchip] = d.v; state.limit = 30; refreshFilters(); return; }
  if (d.chipRemove) { f[d.chipRemove] = ''; state.limit = 30; refreshFilters(); return; }
  if (d.clear !== undefined) { state.filters = { ...DEFAULT_FILTERS, q: f.q, sort: f.sort }; state.limit = 30; refreshFilters(); return; }
  if (d.more !== undefined) { state.limit += 30; refreshResults(); return; }
  if (d.openFilters !== undefined) { openSheet(); return; }
  if (d.closeSheet !== undefined) { closeSheet(); return; }
  if (d.lang) {
    setLang(d.lang);
    menu?.classList.remove('open');
    render();
    if (isNative() && state.prefs.notify) applyNotificationSetting(true);
    return;
  }
  if (d.themeSet) { state.prefs.theme = d.themeSet; savePrefs(); applyTheme(); renderShell(); renderProfile(); return; }
  if (d.pref) {
    const arr = state.prefs[d.pref];
    const i = arr.indexOf(d.v);
    if (i >= 0) arr.splice(i, 1); else arr.push(d.v);
    savePrefs();
    el.classList.toggle('on', i < 0);
    el.innerHTML = (i < 0 ? icon('check', 14) : '') + esc(d.pref === 'provinces' ? trProvince(d.v) : trCategoryOne(d.v));
    return;
  }
  if (d.retry !== undefined) { load(); return; }
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-f]');
  if (!el) return;
  state.filters[el.dataset.f] = el.value;
  state.limit = 30;
  if (el.dataset.f === 'sort') refreshResults(); else refreshFilters();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSheet(); $('#lang-menu')?.classList.remove('open'); }
});

// ---------------------------------------------------------------- data loading
async function load() {
  state.error = null;
  const cache = cachedJobs();
  if (cache?.jobs?.length && !state.loaded) {
    state.jobs = cache.jobs;
    state.loaded = true;
    render();
  } else if (!state.loaded) {
    render();
  }
  try {
    const [jobs, ads, last, settings] = await Promise.all([
      fetchJobs(), fetchAds(), fetchLastUpdate().catch(() => null), fetchSettings().catch(() => null),
    ]);
    state.jobs = jobs;
    state.loaded = true;
    state.offline = false;
    state.lastUpdate = last;
    if (settings) state.settings = mergeSettings(settings);
    setAds(ads);
  } catch (err) {
    console.warn(err);
    if (state.loaded) state.offline = true;
    else state.error = err?.message === 'not-configured' ? 'not-configured' : 'network';
  }
  const r = currentRoute().name;
  const typing = isTextInput(document.activeElement);
  if (r === 'home') {
    if (typing) { refreshResults(); renderShell(); }
    else { const y = window.scrollY; renderShell(); renderHome(); window.scrollTo(0, y); updateMiniBar(); }
  } else if (r === 'job') { renderShell(); fillDetailSlots(); }
  else if (!typing) render();
  renderSticker($('#sticker-root'));
}

// ---------------------------------------------------------------- start
applyDocumentLang();
applyTheme();
initPwa(() => {
  // وقتی امکان نصب آماده شد، بنر نصب در صفحه خانه نمایش داده شود
  const banner = $('#pwa-banner');
  const html = installBannerHtml();
  if (banner && !html) banner.remove();
  else if (!banner && html && currentRoute().name === 'home') $('.hero')?.insertAdjacentHTML('afterend', html);
});
if (!configured) state.error = 'not-configured';
load();
if (isNative() && state.prefs.notify) setTimeout(() => applyNotificationSetting(true), 1500);
document.addEventListener('visibilitychange', () => {
  // هر وقت کاربر بعد از مدتی به برنامه برگردد، معلومات تازه می‌شود
  if (!document.hidden && state.loaded && Date.now() - (cachedJobs()?.at || 0) > 30 * 60e3) load();
});
