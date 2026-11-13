// بخش بورسیه‌ها، پروفایل ارگان‌ها/کشورها و دنبال کردن — طراحی یکپارچه خانواده APEX
import DOMPurify from 'dompurify';
import { fetchScholarship, store } from './api.js';
import { t, num, getLang, fmtDate } from './i18n.js';
import { icon } from './icons.js';
import { countryName, flagUrl, COUNTRIES } from './data/countries.js';
import { orgKey } from './data/orgs.js';
import { pushFollowsSync } from './notify.js';

let ctx = null; // { state, toast, avatar, emptyState, skeletons, jobCard, jt, waNumber, settingsText, isNative }
export function initScholarships(c) { ctx = c; }

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DAY = 864e5;
const LEVELS = ['bachelor', 'master', 'phd', 'postdoc'];
const DEFAULT_SF = { q: '', level: '', country: '', funding: '', sort: 'new' };
export const schFilters = { ...DEFAULT_SF };
let schLimit = 24;
let showOriginal = false;
const profileTab = { value: 'jobs' };

// ---------------------------------------------------------------- دنبال کردن
export function getFollows() { return store.get('aj.follows', []); }
function saveFollows(list) { store.set('aj.follows', list); pushFollowsSync(); }
export const isFollowing = (kind, key) => getFollows().some((f) => f.kind === kind && f.key === key);
export function toggleFollow(kind, key, name) {
  const list = getFollows();
  const i = list.findIndex((f) => f.kind === kind && f.key === key);
  if (i >= 0) { list.splice(i, 1); ctx.toast(t('unfollowToast', { name })); }
  else { list.push({ kind, key, name, at: Date.now() }); ctx.toast(t('followToast', { name })); }
  saveFollows(list);
  document.querySelectorAll(`[data-follow="${kind}"][data-key="${CSS.escape(key)}"]`).forEach((b) => {
    if (b.dataset.remove) return;
    const on = i < 0;
    b.classList.toggle('on', on);
    b.innerHTML = followInner(on, b.dataset.label);
  });
}
const followInner = (on, label) => `${icon(on ? 'check' : 'plus', 16)}<span>${on ? t('following') : t('follow')}</span>${label ? `<b class="ax-follow-name" dir="auto">${esc(label)}</b>` : ''}`;
/** دکمه دنبال کردن؛ اگر label داده شود نام ارگان/کشور هم در دکمه دیده می‌شود */
export const followBtn = (kind, key, name, cls = '', label = '') =>
  `<button class="ax-follow ${cls}${isFollowing(kind, key) ? ' on' : ''}" data-follow="${kind}" data-key="${esc(key)}" data-name="${esc(name)}"${label ? ` data-label="${esc(label)}"` : ''}>${followInner(isFollowing(kind, key), label)}</button>`;

// ---------------------------------------------------------------- کمکی‌ها
export const schTitle = (s) => (getLang() !== 'en' && s?.title_tr?.[getLang()]) || s?.title || '';
function localizedSch(s) {
  const lang = getLang();
  const tr = s?.tr?.[lang];
  if (lang === 'en' || showOriginal || !tr) return s;
  const out = { ...s, title: schTitle(s) };
  for (const k of ['summary_html', 'deadline_text', 'open_to', 'language_req', 'funding_text', 'country_raw']) if (tr[k] && String(tr[k]).trim()) out[k] = tr[k];
  return out;
}
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
function daysLeft(s) {
  if (!s.deadline) return null;
  return Math.round((new Date(s.deadline + 'T00:00:00').getTime() - today0()) / DAY);
}
const isNewSch = (s) => Date.now() - new Date(s.first_seen_at).getTime() < 2 * DAY;
const levelText = (s) => (s.levels || []).filter((l) => l !== 'other').map((l) => t(`lvl_${l}`)).join(getLang() === 'en' ? ', ' : '، ') || t('lvl_other');
const countriesText = (s) => (s.countries || []).map((c) => countryName(c, getLang())).join(getLang() === 'en' ? ', ' : '، ');
const flagImg = (code, cls = 'ax-flag', w = 80) => (code ? `<img class="${cls}" src="${flagUrl(code, w)}" alt="${esc(countryName(code, getLang()))}" loading="lazy" decoding="async">` : '');

function logoBox(s, cls = '') {
  if (s.org_logo) return `<div class="ax-logo ${cls}"><img src="${esc(s.org_logo)}" alt="${esc(s.organization)}" loading="lazy" decoding="async"></div>`;
  return ctx.avatar(s.organization || '?', `ax-logo-av ${cls}`);
}

function deadlinePill(s) {
  const d = daysLeft(s);
  if (d === null) return '';
  let cls = '', txt;
  if (d < 0) { cls = 'closed'; txt = t('closed'); }
  else if (d === 0) { cls = 'hot'; txt = t('lastDay'); }
  else { cls = d <= 5 ? 'hot' : d <= 14 ? 'warm' : ''; txt = t('daysLeft', { n: d }); }
  return `<span class="dl-pill ${cls}">${icon('clock', 14)}${esc(txt)}</span>`;
}
const fundBadge = (s) => (s.funding ? `<span class="ax-fund ${s.funding}">${icon(s.funding === 'full' ? 'money' : 'tag', 14)}${t(`fund_${s.funding}`)}</span>` : '');

const norm = (x) => String(x || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏]/g, ' ');

// ---------------------------------------------------------------- کارت
export function schCard(s, compact = false) {
  const c0 = (s.countries || [])[0];
  return `<article class="ax-sch${isNewSch(s) ? ' is-new' : ''}${compact ? ' compact' : ''}">
    <div class="ax-sch-media">${logoBox(s)}${c0 ? flagImg(c0, 'ax-flag-dot', 40) : ''}</div>
    <div class="ax-sch-main">
      <h3 dir="auto"><a class="stretched" href="#/sch/${s.id}">${esc(schTitle(s))}</a></h3>
      <div class="ax-sch-org" dir="auto">${esc(s.organization || '')}</div>
      <div class="ax-sch-meta">
        ${c0 ? `<span class="ax-country">${icon('pin', 14)}${esc(countriesText(s))}</span>` : ''}
        ${(s.levels || []).filter((l) => l !== 'other').slice(0, 3).map((l) => `<span class="ax-lvl">${icon('cap', 13)}${t(`lvl_${l}`)}</span>`).join('')}
      </div>
    </div>
    <div class="ax-sch-side">
      ${isNewSch(s) ? `<span class="star-badge">${icon('star', 13)}${t('new')}</span>` : ''}
      ${fundBadge(s)}
      ${deadlinePill(s)}
    </div>
  </article>`;
}

// ---------------------------------------------------------------- صفحه بورسیه‌ها
function schFiltered() {
  const f = schFilters;
  const list = ctx.state.sch.filter((s) => {
    if (f.level && !(s.levels || []).includes(f.level)) return false;
    if (f.country && !(s.countries || []).includes(f.country)) return false;
    if (f.funding && s.funding !== f.funding) return false;
    if (f.q.trim()) {
      const hay = norm([s.title, s.title_tr?.fa, s.title_tr?.ps, s.organization, ...(s.countries || []).flatMap((c) => COUNTRIES[c] || [])].join(' '));
      for (const tok of norm(f.q).split(/\s+/).filter(Boolean)) if (!hay.includes(tok)) return false;
    }
    return true;
  });
  if (f.sort === 'deadline') list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  return list;
}

function countryCounts() {
  const m = new Map();
  for (const s of ctx.state.sch) for (const c of s.countries || []) m.set(c, (m.get(c) || 0) + 1);
  return m;
}

export function renderScholarships(view) {
  const st = ctx.state;
  const total = st.schLoaded ? num(st.sch.length) : '—';
  const full = st.schLoaded ? num(st.sch.filter((s) => s.funding === 'full').length) : '—';
  const cc = countryCounts();
  const f = schFilters;
  const top = [...cc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  view.innerHTML = `<div class="ax-page">
    <section class="ax-bar">
      <div class="ax-bar-head">
        <span class="ax-bar-ico">${icon('cap', 24)}</span>
        <div><h1>${t('schTitle')}</h1><p>${t('schTagline')}</p></div>
      </div>
      <form class="ax-search" role="search" onsubmit="return false">
        ${icon('search', 19)}
        <input data-sq type="search" enterkeyhint="search" autocomplete="off" placeholder="${t('schSearchPh')}" value="${esc(f.q)}">
      </form>
      <div class="ax-stats">
        <div><b>${total}</b><span>${t('activeSch')}</span></div>
        <div><b>${full}</b><span>${t('fullyFundedN')}</span></div>
        <div><b>${st.schLoaded ? num(cc.size) : '—'}</b><span>${t('countriesN')}</span></div>
      </div>
    </section>
    <div class="ax-tabs" role="tablist">
      ${[['', t('allLevels')], ...LEVELS.map((l) => [l, t(`lvl_${l}`)])].map(([v, l]) => `<button role="tab" class="${f.level === v ? 'on' : ''}" data-sch-level="${v}">${l}</button>`).join('')}
    </div>
    ${top.length ? `<section class="ax-countries">
      <div class="ax-sec-h"><span class="ax-ico">${icon('globe', 18)}</span><h2>${t('popularCountries')}</h2></div>
      <div class="ax-country-row">${top.map(([c, n]) => `<a class="ax-country-chip" href="#/country/${c}">${flagImg(c, 'ax-flag-round', 80)}<span>${esc(countryName(c, getLang()))}</span><small>${num(n)}</small></a>`).join('')}</div>
    </section>` : ''}
    <div class="ax-filters">
      <label class="ax-select">${icon('globe', 16)}<select data-sf="country"><option value="">${t('allCountries')}</option>
        ${[...cc.keys()].sort((a, b) => countryName(a, getLang()).localeCompare(countryName(b, getLang()))).map((c) => `<option value="${c}"${f.country === c ? ' selected' : ''}>${esc(countryName(c, getLang()))} (${num(cc.get(c))})</option>`).join('')}
      </select></label>
      <div class="ax-chips">
        ${[['', t('all')], ['full', t('fund_full')], ['partial', t('fund_partial')]].map(([v, l]) => `<button class="fchip${f.funding === v ? ' on' : ''}" data-sch-fund="${v}">${l}</button>`).join('')}
      </div>
      <label class="ax-select">${icon('sliders', 16)}<select data-sf="sort">
        <option value="new"${f.sort === 'new' ? ' selected' : ''}>${t('sortNew')}</option>
        <option value="deadline"${f.sort === 'deadline' ? ' selected' : ''}>${t('sortDeadline')}</option>
      </select></label>
    </div>
    <div class="ax-results-h"><h2 id="sch-count"></h2></div>
    <div class="ax-list" id="sch-list"></div>
    <div id="sch-more"></div>
  </div>`;
  refreshSchResults();
}

export function refreshSchResults() {
  const list = $('#sch-list');
  if (!list) return;
  const st = ctx.state;
  if (!st.schLoaded) {
    if (st.schError) {
      list.innerHTML = ctx.emptyState('refresh', st.schError === 'not-configured' ? t('notConfigured') : t('error'), '', `<button class="btn primary" data-retry>${icon('refresh', 18)}${t('retry')}</button>`);
      $('#sch-count').textContent = '';
    } else {
      list.innerHTML = ctx.skeletons(5);
      $('#sch-count').textContent = t('loading');
    }
    return;
  }
  const items = schFiltered();
  $('#sch-count').textContent = t('schFoundN', { n: items.length });
  if (!items.length) {
    list.innerHTML = ctx.emptyState('cap', t('noSch'), t('noResultsHint'), `<button class="btn ghost" data-sch-clear>${icon('x', 16)}${t('clearFilters')}</button>`);
    $('#sch-more').innerHTML = '';
    return;
  }
  list.innerHTML = items.slice(0, schLimit).map((s) => schCard(s)).join('');
  $('#sch-more').innerHTML = items.length > schLimit ? `<button class="btn ghost full" data-sch-more>${t('loadMore')} (${num(items.length - schLimit)})</button>` : '';
}

// ---------------------------------------------------------------- جزئیات بورسیه
const clean = (html) => DOMPurify.sanitize(html || '', {
  ALLOWED_TAGS: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h3', 'h4', 'h5', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
function fact(ic, label, value) {
  if (!value) return '';
  return `<div class="ax-fact"><span class="ax-ico">${icon(ic, 18)}</span><div><small>${esc(label)}</small><b dir="auto">${value}</b></div></div>`;
}

function waSch(s) {
  const L = getLang();
  const msg = t('waMsgSch', {
    title: s.title, org: s.organization || '—', country: countriesText(s) || '—', levels: levelText(s),
    deadline: s.deadline ? fmtDate(s.deadline, L) : (s.deadline_text || '—'), code: `AS-${s.id}`,
  });
  return `https://wa.me/${ctx.waNumber()}?text=${encodeURIComponent(msg)}`;
}

function helpBlock(s) {
  const st = ctx.settingsText();
  return `<div class="help-card ax-help">
    <div class="help-head"><span class="help-ic">${icon('sparkle', 22)}</span><div><h3>${t('schHelpTitle')}</h3><p>${t('schHelpText')}</p></div></div>
    <div class="help-actions">
      <a class="btn wa" href="${waSch(s)}" target="_blank" rel="noopener">${icon('whatsapp', 20)}${t('whatsapp')}</a>
      <a class="btn ghost" href="tel:${esc(st.phone)}">${icon('phone', 18)}<span dir="ltr">${esc(st.phone)}</span></a>
    </div>
    <div class="help-addr">${icon('pin', 18)}<div><small>${t('office')}</small><span>${esc(st.address)}</span></div></div>
    <div class="help-addr">${icon('clock', 18)}<div><small>${t('hours')}</small><span>${esc(st.hours)}</span></div></div>
  </div>`;
}

export async function renderSchDetail(view, id, isCurrent) {
  const listItem = ctx.state.sch.find((s) => s.id === id);
  view.innerHTML = `<div class="ax-page ax-detail">${topBar()}<section class="ax-hero">${listItem ? heroInner(listItem) : '<div class="skel-block"></div>'}</section><div class="ax-card skel-block tall"></div></div>`;
  let s;
  try { s = await fetchScholarship(id); }
  catch (e) {
    if (!isCurrent()) return;
    view.innerHTML = `<div class="ax-page ax-detail">${topBar()}${ctx.emptyState('refresh', e.message === 'not-configured' ? t('notConfigured') : t('error'), '', `<button class="btn primary" data-retry>${icon('refresh', 18)}${t('retry')}</button>`)}</div>`;
    return;
  }
  if (!isCurrent()) return;
  if (!s) { view.innerHTML = `<div class="ax-page ax-detail">${topBar()}${ctx.emptyState('search', t('notFound'), '')}</div>`; return; }
  ctx.state.schDetail = s;
  document.title = `${schTitle(s)} — Apex Job`;
  const L = localizedSch(s);
  const hasTr = getLang() !== 'en' && !!s.tr?.[getLang()];
  const dl = daysLeft(s);
  const deadlineVal = s.deadline
    ? `${esc(fmtDate(s.deadline))}${dl !== null && dl >= 0 ? `<em class="${dl <= 5 ? 'hot' : ''}">${esc(dl === 0 ? t('lastDay') : t('daysLeft', { n: dl }))}</em>` : ''}`
    : esc(L.deadline_text && !/check|official|varies/i.test(s.deadline_text) ? L.deadline_text : t('deadlineSeeSite'));
  const similar = ctx.state.sch.filter((x) => x.id !== s.id && ((x.countries || []).some((c) => (s.countries || []).includes(c)) || x.org_key === s.org_key)).slice(0, 4);
  view.innerHTML = `<div class="ax-page ax-detail">
    ${topBar()}
    <section class="ax-hero">${heroInner(s)}</section>
    <div class="ax-detail-grid">
      <div class="ax-d-main">
        <section class="ax-card">
          <div class="ax-sec-h"><span class="ax-ico">${icon('grid', 18)}</span><h2>${t('schDetails')}</h2></div>
          <div class="ax-facts">
            ${fact('building', t('provider'), s.organization ? `<a href="#/org/${esc(s.org_key || orgKey(s.organization))}">${esc(s.organization)}</a>` : '')}
            ${fact('globe', t('country'), (s.countries || []).map((c) => `<a href="#/country/${c}">${esc(countryName(c, getLang()))}</a>`).join('، ') || esc(L.country_raw))}
            ${fact('cap', t('studyLevel'), esc(levelText(s)))}
            ${fact('money', t('funding'), esc(s.funding ? t(`fund_${s.funding}`) : L.funding_text))}
            ${fact('clock', t('deadline'), deadlineVal)}
            ${fact('users', t('openTo'), esc(L.open_to))}
            ${fact('flag', t('languageReq'), esc(L.language_req))}
            ${fact('globe', t('instructionLang'), esc(s.instruction_lang))}
          </div>
        </section>
        ${hasTr ? `<div class="tr-note">${icon('globe', 16)}<span>${showOriginal ? t('showOriginal') : t('autoTr')}</span><button data-sch-tr>${showOriginal ? t('showTranslation') : t('showOriginal')}</button></div>` : ''}
        ${L.summary_html && L.summary_html.replace(/<[^>]+>/g, '').trim() ? `<section class="ax-card prose">
          <div class="ax-sec-h"><span class="ax-ico">${icon('sparkle', 18)}</span><h2>${t('schDescription')}</h2></div>
          <div class="prose-body" dir="auto">${clean(L.summary_html)}</div>
        </section>` : ''}
      </div>
      <aside class="ax-d-aside">
        <section class="ax-card apply-card" id="sch-apply">
          <div class="ax-sec-h"><span class="ax-ico">${icon('check', 18)}</span><h2>${t('schApplyBox')}</h2></div>
          <div class="apply-direct">
            ${s.apply_url ? `<a class="btn ax-go" href="${esc(s.apply_url)}" target="_blank" rel="noopener">${icon('external', 18)}${t('officialApply')}</a>` : ''}
            ${s.website_url ? `<a class="btn ghost" href="${esc(s.website_url)}" target="_blank" rel="noopener">${icon('globe', 18)}${t('officialSite')}</a>` : ''}
          </div>
          ${helpBlock(s)}
        </section>
      </aside>
    </div>
    ${similar.length ? `<section class="similar"><div class="ax-sec-h"><span class="ax-ico">${icon('cap', 18)}</span><h2>${t('similar')}</h2></div><div class="ax-list">${similar.map((x) => schCard(x)).join('')}</div></section>` : ''}
  </div>
  <div class="apply-bar ax-apply-bar">
    ${s.apply_url ? `<a class="btn ax-go" href="${esc(s.apply_url)}" target="_blank" rel="noopener">${icon('external', 18)}${t('officialApply')}</a>`
      : `<a class="btn primary" href="#sch-apply" data-scroll-to="sch-apply">${icon('check', 18)}${t('schApplyBox')}</a>`}
    <a class="btn wa" href="${waSch(s)}" target="_blank" rel="noopener">${icon('whatsapp', 20)}<span class="hide-xs">${t('whatsapp')}</span></a>
  </div>`;
}

const topBar = () => `<div class="detail-top"><button class="icon-btn" data-back aria-label="${t('back')}">${icon('back', 22, 'flip')}</button></div>`;

function heroInner(s) {
  const c0 = (s.countries || [])[0];
  const key = s.org_key || orgKey(s.organization);
  return `${c0 ? `<img class="ax-hero-flag" src="${flagUrl(c0, 320)}" alt="" aria-hidden="true">` : ''}
    <div class="ax-hero-row">
      <div class="ax-hero-media">${logoBox(s, 'lg')}${c0 ? flagImg(c0, 'ax-flag-dot lg', 80) : ''}</div>
      <div class="ax-hero-text">
        <h1 dir="auto">${esc(schTitle(s))}</h1>
        <a class="ax-hero-org" href="#/org/${esc(key)}" dir="auto">${icon('building', 16)}${esc(s.organization || '')}</a>
        <div class="ax-hero-chips">
          ${isNewSch(s) ? `<span class="star-badge">${icon('star', 13)}${t('new')}</span>` : ''}
          ${fundBadge(s)}
          ${deadlinePill(s)}
          ${(s.levels || []).filter((l) => l !== 'other').map((l) => `<span class="ax-lvl light">${icon('cap', 13)}${t(`lvl_${l}`)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="ax-hero-actions">
      ${s.organization ? followBtn('org', key, s.organization, 'light', s.organization) : ''}
      ${c0 ? followBtn('country', c0, countryName(c0, getLang()), 'light', countryName(c0, getLang())) : ''}
    </div>`;
}

// ---------------------------------------------------------------- پروفایل ارگان و کشور
function profilePage({ head, jobs, sch }) {
  const tab = profileTab.value === 'sch' || !jobs.length ? (sch.length ? 'sch' : 'jobs') : 'jobs';
  return `<div class="ax-page ax-profile">
    ${topBar()}
    <section class="ax-hero ax-pro-hero">${head}</section>
    <div class="ax-tabs">
      <button class="${tab === 'jobs' ? 'on' : ''}" data-ptab="jobs">${icon('briefcase', 16)}${t('jobsTab')} <small>${num(jobs.length)}</small></button>
      <button class="${tab === 'sch' ? 'on' : ''}" data-ptab="sch">${icon('cap', 16)}${t('schTab')} <small>${num(sch.length)}</small></button>
    </div>
    <div class="ax-list" id="ptab-body">${tabBody(tab, jobs, sch)}</div>
  </div>`;
}
function tabBody(tab, jobs, sch) {
  const list = tab === 'sch' ? sch.map((s) => schCard(s)) : jobs.map((j) => ctx.jobCard(j));
  return list.length ? list.join('') : ctx.emptyState(tab === 'sch' ? 'cap' : 'briefcase', t('profileEmpty'), '');
}

let lastProfile = null;
export function renderOrgProfile(view, key) {
  const jobs = ctx.state.jobs.filter((j) => orgKey(j.organization) === key);
  const sch = ctx.state.sch.filter((s) => (s.org_key || orgKey(s.organization)) === key);
  const name = jobs[0]?.organization || sch[0]?.organization || getFollows().find((f) => f.key === key)?.name || key;
  const logoSrc = sch.find((s) => s.org_logo);
  const countries = [...new Set(sch.flatMap((s) => s.countries || []))];
  lastProfile = { jobs, sch };
  document.title = `${name} — Apex Job`;
  view.innerHTML = profilePage({
    jobs, sch,
    head: `<div class="ax-hero-row">
        <div class="ax-hero-media">${logoSrc ? logoBox(logoSrc, 'lg') : ctx.avatar(name, 'ax-logo-av lg')}</div>
        <div class="ax-hero-text">
          <small class="ax-kicker">${t('orgProfile')}</small>
          <h1 dir="auto">${esc(name)}</h1>
          <div class="ax-hero-chips">
            <span class="ax-count">${icon('briefcase', 14)}${num(jobs.length)} ${t('jobsTab')}</span>
            <span class="ax-count">${icon('cap', 14)}${num(sch.length)} ${t('schTab')}</span>
            ${countries.slice(0, 3).map((c) => `<a class="ax-count" href="#/country/${c}">${flagImg(c, 'ax-flag-mini', 40)}${esc(countryName(c, getLang()))}</a>`).join('')}
          </div>
        </div>
      </div>
      <div class="ax-hero-actions">${followBtn('org', key, name, 'light')}</div>`,
  });
}

export function renderCountryProfile(view, code) {
  const sch = ctx.state.sch.filter((s) => (s.countries || []).includes(code));
  const name = countryName(code, getLang());
  lastProfile = { jobs: [], sch };
  document.title = `${name} — Apex Job`;
  view.innerHTML = `<div class="ax-page ax-profile">
    ${topBar()}
    <section class="ax-hero ax-pro-hero">
      <img class="ax-hero-flag" src="${flagUrl(code, 320)}" alt="" aria-hidden="true">
      <div class="ax-hero-row">
        <div class="ax-hero-media">${flagImg(code, 'ax-flag-big', 160)}</div>
        <div class="ax-hero-text">
          <small class="ax-kicker">${t('country')}</small>
          <h1>${esc(name)}</h1>
          <div class="ax-hero-chips"><span class="ax-count">${icon('cap', 14)}${num(sch.length)} ${t('schTab')}</span></div>
        </div>
      </div>
      <div class="ax-hero-actions">${followBtn('country', code, name, 'light')}</div>
    </section>
    <div class="ax-list">${sch.length ? sch.map((s) => schCard(s)).join('') : ctx.emptyState('cap', t('profileEmpty'), '')}</div>
  </div>`;
}

// ---------------------------------------------------------------- دنبال‌شده‌ها (تازه‌ها و پروفایل)
function followedItems(days = 7) {
  const follows = getFollows();
  if (!follows.length) return [];
  const orgs = new Set(follows.filter((f) => f.kind === 'org').map((f) => f.key));
  const ctrs = new Set(follows.filter((f) => f.kind === 'country').map((f) => f.key));
  const since = Date.now() - days * DAY;
  const jobs = ctx.state.jobs.filter((j) => orgs.has(orgKey(j.organization)) && new Date(j.first_seen_at).getTime() > since)
    .map((j) => ({ kind: 'job', at: new Date(j.first_seen_at).getTime(), item: j }));
  const sch = ctx.state.sch.filter((s) => (orgs.has(s.org_key || orgKey(s.organization)) || (s.countries || []).some((c) => ctrs.has(c))) && new Date(s.first_seen_at).getTime() > since)
    .map((s) => ({ kind: 'sch', at: new Date(s.first_seen_at).getTime(), item: s }));
  return [...jobs, ...sch].sort((a, b) => b.at - a.at);
}
export function followedNewCount() {
  const seen = store.get('aj.followSeenAt', 0);
  return followedItems(3).filter((x) => x.at > seen).length;
}
export function followedFeedHtml() {
  const list = followedItems(7).slice(0, 20);
  store.set('aj.followSeenAt', Date.now());
  if (!list.length) return '';
  return `<section class="ax-feed">
    <div class="group-label"><span>${icon('star', 15)} ${t('fromFollowed')}</span><small>${num(list.length)}</small></div>
    <div class="job-list">${list.map((x) => (x.kind === 'job' ? ctx.jobCard(x.item) : schCard(x.item))).join('')}</div>
  </section>`;
}
export function followedListHtml() {
  const follows = getFollows();
  return `<section class="card">
    <h2>${icon('star', 18)}${t('followedTitle')}</h2>
    ${follows.length ? `<div class="ax-follow-list">${follows.map((f) => `<div class="ax-follow-item">
        <a href="#/${f.kind === 'org' ? 'org' : 'country'}/${esc(f.key)}">${f.kind === 'country' ? flagImg(f.key, 'ax-flag-mini', 40) : icon('building', 16)}<span dir="auto">${esc(f.kind === 'country' ? countryName(f.key, getLang()) : f.name)}</span></a>
        <button class="icon-btn" data-follow="${f.kind}" data-key="${esc(f.key)}" data-name="${esc(f.name)}" data-remove="1" aria-label="${t('close')}">${icon('x', 16)}</button>
      </div>`).join('')}</div>` : `<p class="ax-muted">${t('followedEmpty')}</p>`}
  </section>`;
}

// ---------------------------------------------------------------- رویدادها
/** کلیک‌های این بخش؛ اگر رسیدگی شد true برمی‌گرداند */
export function handleSchClick(el, e, rerender) {
  const d = el.dataset;
  if (d.follow) {
    e.preventDefault(); e.stopPropagation();
    toggleFollow(d.follow, d.key, d.name);
    if (d.remove) rerender();
    return true;
  }
  if (d.schLevel !== undefined) { schFilters.level = d.schLevel; schLimit = 24; rerender(); return true; }
  if (d.schFund !== undefined) { schFilters.funding = d.schFund; schLimit = 24; rerender(); return true; }
  if (d.schMore !== undefined) { schLimit += 24; refreshSchResults(); return true; }
  if (d.schClear !== undefined) { Object.assign(schFilters, { ...DEFAULT_SF, q: schFilters.q }); schLimit = 24; rerender(); return true; }
  if (d.schTr !== undefined) { const y = window.scrollY; showOriginal = !showOriginal; rerender().then?.(() => window.scrollTo(0, y)); return true; }
  if (d.ptab) {
    profileTab.value = d.ptab;
    document.querySelectorAll('[data-ptab]').forEach((b) => b.classList.toggle('on', b === el));
    const body = $('#ptab-body');
    if (body && lastProfile) body.innerHTML = tabBody(d.ptab, lastProfile.jobs, lastProfile.sch);
    return true;
  }
  if (d.scrollTo) { e.preventDefault(); document.getElementById(d.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return true; }
  return false;
}
export const SCH_CLICK_SELECTOR = '[data-follow],[data-sch-level],[data-sch-fund],[data-sch-more],[data-sch-clear],[data-sch-tr],[data-ptab],[data-scroll-to]';

export function handleSchChange(el, rerender) {
  if (!el.matches('[data-sf]')) return false;
  schFilters[el.dataset.sf] = el.value;
  schLimit = 24;
  if (el.dataset.sf === 'sort') refreshSchResults(); else rerender();
  return true;
}

let sqTimer;
export function handleSchInput(el) {
  if (!el.matches('[data-sq]')) return false;
  clearTimeout(sqTimer);
  sqTimer = setTimeout(() => { schFilters.q = el.value; schLimit = 24; refreshSchResults(); }, 160);
  return true;
}

