// نمایش تبلیغات: اسلایدر بالا، بنر بین کارت‌ها، بنر صفحه جزئیات، استیکر شناور
import { adClick } from './api.js';
import { t } from './i18n.js';
import { icon } from './icons.js';

let ADS = [];
export const setAds = (list) => { ADS = Array.isArray(list) ? list : []; };
export const adsFor = (placement) => ADS.filter((a) => a.placement === placement);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeColor = (c, d) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : d);
const safeUrl = (u) => (/^(https?:|mailto:|tel:)/i.test(u || '') ? u : '');

export function adInner(ad) {
  if (ad.kind === 'image' && ad.image_url) {
    return `<img src="${esc(ad.image_url)}" alt="${esc(ad.title)}" loading="lazy" decoding="async">`;
  }
  const from = safeColor(ad.bg_from, '#1877F2');
  const to = safeColor(ad.bg_to, '#7AB3FF');
  return `<div class="ad-text" style="--a1:${from};--a2:${to}">
      <div class="ad-text-body">
        <strong>${esc(ad.title)}</strong>
        ${ad.subtitle ? `<span>${esc(ad.subtitle)}</span>` : ''}
      </div>
      ${ad.cta ? `<span class="ad-cta">${esc(ad.cta)}</span>` : ''}
      <i class="ad-shine"></i>
    </div>`;
}

function adLink(ad, cls, inner) {
  const href = safeUrl(ad.link_url);
  const tag = href ? 'a' : 'div';
  const attrs = href ? ` href="${esc(href)}" target="_blank" rel="noopener sponsored"` : '';
  return `<${tag} class="${cls}" data-ad="${esc(ad.id)}"${attrs}>${inner}<span class="ad-label">${t('ad')}</span></${tag}>`;
}

export function heroSliderHtml() {
  const list = adsFor('hero');
  if (!list.length) return '';
  return `<section class="ad-slider" data-count="${list.length}">
    <div class="ad-track">${list.map((a, i) => adLink(a, `ad-slide${i === 0 ? ' is-on' : ''}`, adInner(a))).join('')}</div>
    ${list.length > 1 ? `<div class="ad-dots">${list.map((_, i) => `<button class="${i === 0 ? 'on' : ''}" data-dot="${i}" aria-label="${i + 1}"></button>`).join('')}</div>` : ''}
  </section>`;
}

export function feedAdHtml(index) {
  const list = adsFor('feed');
  if (!list.length) return '';
  const ad = list[index % list.length];
  return adLink(ad, 'ad-feed', adInner(ad));
}

export function detailAdHtml() {
  const list = adsFor('detail');
  if (!list.length) return '';
  const ad = list[Math.floor(Date.now() / 60000) % list.length];
  return adLink(ad, 'ad-feed ad-detail', adInner(ad));
}

let stickerClosed = false;
export function renderSticker(host) {
  const list = adsFor('sticker');
  if (!list.length || stickerClosed) { host.innerHTML = ''; return; }
  const ad = list[Math.floor(Date.now() / 60000) % list.length];
  const inner = ad.kind === 'image' && ad.image_url
    ? `<img src="${esc(ad.image_url)}" alt="${esc(ad.title)}">`
    : `<div class="sticker-text" style="--a1:${safeColor(ad.bg_from, '#1877F2')};--a2:${safeColor(ad.bg_to, '#7AB3FF')}"><strong>${esc(ad.title)}</strong>${ad.subtitle ? `<span>${esc(ad.subtitle)}</span>` : ''}</div>`;
  host.innerHTML = `<div class="sticker">${adLink(ad, 'sticker-link', inner)}<button class="sticker-x" aria-label="${t('close')}">${icon('x', 14)}</button></div>`;
  host.querySelector('.sticker-x').onclick = () => { stickerClosed = true; host.innerHTML = ''; };
}

/** فعال‌سازی اسلایدر و ثبت کلیک‌ها در محدوده داده‌شده */
let sliderTimer = null;
export function mountAds(root) {
  root.querySelectorAll('[data-ad]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', () => adClick(el.dataset.ad));
  });
  clearInterval(sliderTimer);
  const slider = root.querySelector('.ad-slider');
  if (!slider) return;
  const slides = [...slider.querySelectorAll('.ad-slide')];
  const dots = [...slider.querySelectorAll('[data-dot]')];
  if (slides.length < 2) return;
  let i = 0;
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  };
  dots.forEach((d) => d.addEventListener('click', (e) => { e.preventDefault(); go(Number(d.dataset.dot)); restart(); }));
  let x0 = null;
  slider.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) { go(i + (dx < 0 ? 1 : -1) * (document.dir === 'rtl' ? -1 : 1)); restart(); }
  });
  const restart = () => { clearInterval(sliderTimer); sliderTimer = setInterval(() => { if (!document.hidden && slider.isConnected) go(i + 1); }, 5000); };
  restart();
}
