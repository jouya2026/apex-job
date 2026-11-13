// کلید یکتای هر ارگان (برای پروفایل و دنبال کردن) — در اپ و اسکریپر مشترک است
export function orgKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
