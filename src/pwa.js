// PWA: نصب سایت مانند اپلیکیشن روی آیفون و اندروید (Add to Home Screen)
import { Capacitor } from '@capacitor/core';
import { icon, LOGO_MARK } from './icons.js';
import { t } from './i18n.js';

let deferredPrompt = null;
let onChange = () => {};

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const dismissedRecently = () => {
  try { return Date.now() - Number(localStorage.getItem('aj.pwa.dismissed') || 0) < 14 * 864e5; } catch { return false; }
};

export function initPwa(changed) {
  onChange = changed || onChange;
  if (Capacitor.isNativePlatform()) return;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    onChange();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; onChange(); });
}

export function installBannerHtml() {
  if (Capacitor.isNativePlatform() || isStandalone() || dismissedRecently()) return '';
  const ios = isIos();
  if (!ios && !deferredPrompt) return '';
  return `<div class="pwa-banner" id="pwa-banner">
    ${LOGO_MARK}
    <div class="pwa-text"><b>${t('pwaTitle')}</b>${ios ? `<small>${t('pwaIos')}</small>` : ''}</div>
    ${ios ? '' : `<button class="btn primary sm" data-pwa-install>${icon('download', 16)}${t('pwaBtn')}</button>`}
    <button class="icon-btn" data-pwa-dismiss aria-label="${t('close')}">${icon('x', 18)}</button>
  </div>`;
}

export async function installPwa() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  try { await deferredPrompt.userChoice; } catch {}
  deferredPrompt = null;
  onChange();
}

export function dismissPwa() {
  try { localStorage.setItem('aj.pwa.dismissed', String(Date.now())); } catch {}
  document.getElementById('pwa-banner')?.remove();
}
