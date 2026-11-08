// تجزیه صفحات منبع وظایف (لیست و جزئیات)
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { normalizeProvinces, normalizeGender, normalizeJobType } from '../src/data/taxonomy.js';

const SOURCE_HOST_RE = /acbar\.(org|support\.af)/i;
const DETAIL_RE = /\/jobs\/details\/(\d+)(?:\/([^/?#]*))?/i;

const clean = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const low = (s) => clean(s).toLowerCase();

/** لینک‌های وظایف در یک صفحه لیست */
export function parseListPage(html, baseUrl) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const items = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const m = href.match(DETAIL_RE);
    if (!m) return;
    const id = Number(m[1]);
    if (!id || seen.has(id)) return;
    seen.add(id);
    let url;
    try { url = new URL(href, baseUrl).toString(); } catch { return; }
    items.push({ id, slug: m[2] || '', url });
  });
  return items;
}

/** همه گره‌های متنی DOM به ترتیب (برای پیدا کردن جفت‌های برچسب/مقدار) */
function textLines(root) {
  const lines = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'text') {
      const t = clean(node.data);
      if (t) lines.push(t);
      return;
    }
    if (node.type === 'tag' || node.type === 'root') {
      if (['script', 'style', 'noscript', 'svg'].includes(node.tagName)) return;
      (node.children || []).forEach(walk);
    }
  };
  root.toArray().forEach(walk);
  return lines;
}

const LABELS = {
  type: ['type', 'job type'],
  location: ['location', 'locations', 'job location'],
  category: ['category'],
  published: ['published', 'publish date', 'posted'],
  nationality: ['nationality'],
  gender: ['gender'],
  salary: ['salary', 'salary range'],
  contract_duration: ['contract duration', 'duration'],
  vacancy_number: ['vacancy number', 'vacancy no', 'vacancy #'],
  positions: ['no of job', 'no. of jobs', 'number of jobs', 'no of jobs'],
  education: ['education'],
  experience: ['experience', 'years of experience'],
  deadline: ['deadline', 'closing date', 'close date'],
};
const ALL_LABELS = new Set(Object.values(LABELS).flat());
const STOP_WORDS = new Set(['print share', 'print', 'share', 'about the company', 'job summary', 'job requirements', 'submission guideline']);

function labelKey(line) {
  const l = low(line).replace(/[:：]\s*$/, '');
  for (const [k, arr] of Object.entries(LABELS)) if (arr.includes(l)) return k;
  return null;
}

function pickDate(s) {
  const m = String(s || '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function sanitize(html) {
  const out = sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h3', 'h4', 'h5',
      'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'div', 'span'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href || '';
        if (!href || SOURCE_HOST_RE.test(href)) return { tagName: 'span', attribs: {} };
        return { tagName: 'a', attribs: { href, target: '_blank', rel: 'noopener noreferrer' } };
      },
      h1: 'h3', h2: 'h3',
    },
    exclusiveFilter: (frame) => ['p', 'div', 'span', 'li'].includes(frame.tag) && !frame.text.replace(/ /g, '').trim() && !frame.mediaChildren?.length,
  });
  return out.replace(/(&nbsp;| )+/g, ' ').replace(/(<br\s*\/?>\s*){3,}/g, '<br><br>').trim();
}

/** محتوای بین یک عنوان h2 و عنوان h2 بعدی */
function sectionHtml($, names) {
  const wanted = names.map((n) => n.toLowerCase());
  const h = $('h2, h3').filter((_, e) => wanted.includes(low($(e).text()).replace(/[:：]$/, ''))).first();
  if (!h.length) return '';
  const tag = h[0].tagName;
  const stopSel = `${tag}, :has(> ${tag}), :has(${tag})`;
  let el = h;
  for (let depth = 0; depth < 4 && el.length; depth++) {
    const sibs = el.nextUntil(stopSel);
    const html = sibs.toArray().map((n) => $.html(n)).join('');
    if (clean(cheerio.load(html).text()).length > 15) return html;
    el = el.parent();
  }
  return '';
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /https?:\/\/[^\s"'<>)]+/gi;

function firstGood(list) {
  return (list || []).map((s) => s.replace(/[.,;]+$/, '')).find((s) => !SOURCE_HOST_RE.test(s) && !/ethicspoint/i.test(s)) || '';
}

/** تجزیه صفحه جزئیات وظیفه */
export function parseDetailPage(html, url) {
  const $ = cheerio.load(html);
  $('script, style, noscript, footer, nav, form, iframe').remove();

  const title = clean($('h1').first().text());
  const root = $('body');
  const lines = textLines(root);

  // شروع از عنوان وظیفه
  let start = lines.findIndex((l) => l === title);
  if (start < 0) start = lines.findIndex((l) => l.length > 2 && title.startsWith(l));
  if (start < 0) start = 0;
  const qsIdx = lines.findIndex((l, i) => i > start && low(l) === 'quick summary');

  // نام ارگان = آخرین خط قبل از Quick Summary (به جز وضعیت Open/Closed)
  let organization = '';
  if (qsIdx > start) {
    const between = lines.slice(start + 1, qsIdx).filter((l) => !['open', 'closed', 'expired', 'new'].includes(low(l)));
    organization = between[between.length - 1] || '';
  }

  const end = (() => {
    const i = lines.findIndex((l, j) => j > start && ['about the company', 'job summary', 'similar jobs'].includes(low(l)));
    return i > 0 ? i : lines.length;
  })();

  const fields = {};
  for (let i = Math.max(start, qsIdx); i < end; i++) {
    const key = labelKey(lines[i]);
    if (!key || fields[key] !== undefined) continue;
    const vals = [];
    const max = ['education', 'experience'].includes(key) ? 60 : key === 'location' ? 20 : 6;
    for (let j = i + 1; j < end && vals.length < max; j++) {
      const l = lines[j];
      if (labelKey(l) || ALL_LABELS.has(low(l)) || STOP_WORDS.has(low(l))) break;
      vals.push(l);
    }
    fields[key] = clean(vals.join(' ')).replace(/\s+([,.;:])/g, '$1');
  }

  const about = sanitize(sectionHtml($, ['About the Company', 'About the Organization', 'About Company']));
  const summary = sanitize(sectionHtml($, ['Job Summary', 'Job Description']));
  const requirements = sanitize(sectionHtml($, ['Job Requirements', 'Requirements']));
  const submission = sanitize(sectionHtml($, ['Submission Guideline', 'Submission Guidelines', 'How to Apply']));

  // راه درخواست
  const subText = cheerio.load(submission || '').text();
  let applyValue = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/^(?:email\s*\/\s*application form|submission email|application form)\s*:?\s*(.*)$/i);
    if (m) {
      applyValue = m[1] && m[1].length > 4 ? m[1] : (lines[i + 1] || '');
      if (applyValue) break;
    }
  }
  const apply_url = firstGood(applyValue.match(URL_RE)) || firstGood(subText.match(URL_RE));
  let apply_email = firstGood(applyValue.match(EMAIL_RE));
  if (!apply_email && !apply_url) apply_email = firstGood(subText.match(EMAIL_RE));

  const location_raw = fields.location || '';
  const m = (url || '').match(DETAIL_RE);

  return {
    id: m ? Number(m[1]) : null,
    slug: m ? (m[2] || '') : '',
    title,
    organization,
    job_type: normalizeJobType(fields.type),
    locations: normalizeProvinces(location_raw),
    location_raw,
    category: fields.category || '',
    published: pickDate(fields.published),
    closing_date: pickDate(fields.deadline),
    nationality: fields.nationality || '',
    gender: normalizeGender(fields.gender),
    salary: fields.salary || '',
    contract_duration: fields.contract_duration || '',
    vacancy_number: fields.vacancy_number || '',
    positions: fields.positions || '',
    education: fields.education || '',
    experience: fields.experience || '',
    about_html: about,
    summary_html: summary,
    requirements_html: requirements,
    submission_html: submission,
    apply_url,
    apply_email,
    source_url: url,
  };
}
