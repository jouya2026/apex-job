// نوتیفیکیشن‌ها در اپ اندروید
//  - اگر Firebase تنظیم شده باشد: پوش واقعی «وظایف جدید امروز» از سرور
//  - در غیر آن: یادآوری روزانه محلی در ساعت تعیین‌شده
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { CONFIG } from './config.js';
import { savePushToken, syncFollows } from './api.js';
import { t, getLang } from './i18n.js';

export const isNative = () => Capacitor.isNativePlatform();
const REMINDER_ID = 7001;
let listenersReady = false;

function openUpdates() {
  location.hash = '#/new';
}

async function setupListeners() {
  if (listenersReady) return;
  listenersReady = true;
  LocalNotifications.addListener('localNotificationActionPerformed', openUpdates);
  if (CONFIG.pushEnabled) {
    PushNotifications.addListener('registration', (tok) => {
      savePushToken(tok.value, Capacitor.getPlatform(), getLang()).catch(() => {});
      try { localStorage.setItem('aj.pushToken', tok.value); } catch {}
      pushFollowsSync();
    });
    PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
      location.hash = a?.notification?.data?.route || '#/new';
    });
  }
}

async function ensurePermission(plugin) {
  let p = await plugin.checkPermissions();
  const state = p.display ?? p.receive;
  if (state === 'prompt' || state === 'prompt-with-rationale') p = await plugin.requestPermissions();
  return (p.display ?? p.receive) === 'granted';
}

/** فعال/غیرفعال کردن نوتیفیکیشن روزانه */
export async function applyNotificationSetting(enabled) {
  if (!isNative()) return false;
  try {
    await setupListeners();
    if (CONFIG.pushEnabled) {
      if (!enabled) { await PushNotifications.unregister().catch(() => {}); return false; }
      const ok = await ensurePermission(PushNotifications);
      if (!ok) return false;
      await PushNotifications.createChannel({ id: 'jobs', name: 'Apex Job', importance: 4, vibration: true }).catch(() => {});
      await PushNotifications.register();
      return true;
    }
    // یادآوری محلی
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
    if (!enabled) return false;
    const ok = await ensurePermission(LocalNotifications);
    if (!ok) return false;
    await LocalNotifications.createChannel({ id: 'jobs', name: 'Apex Job', importance: 4, vibration: true }).catch(() => {});
    await LocalNotifications.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: t('reminderTitle'),
        body: t('reminderBody'),
        channelId: 'jobs',
        schedule: { on: { hour: CONFIG.dailyReminderHour, minute: 0 }, allowWhileIdle: true },
        extra: { route: '#/new' },
      }],
    });
    return true;
  } catch (e) {
    console.warn('notifications:', e);
    return false;
  }
}

/** دنبال‌شده‌ها را برای نوتیفیکیشن سرور ثبت می‌کند (فقط اپ اندروید با Firebase) */
export function pushFollowsSync() {
  if (!isNative() || !CONFIG.pushEnabled) return;
  let token = null;
  let follows = [];
  try {
    token = localStorage.getItem('aj.pushToken');
    follows = JSON.parse(localStorage.getItem('aj.follows') || '[]');
  } catch {}
  if (token) syncFollows(token, getLang(), follows).catch(() => {});
}
