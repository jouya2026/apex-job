// تجزیه صفحات منبع بورسیه‌ها (فهرست و جزئیات)
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import { detectCountries } from '../src/data/countries.js';
import { orgKey } from '../src/data/orgs.js';

export const SOURCE_HOST_RE = /scholarships\.af/i;
const DETAIL_RE = /\/opportunity\/([^/?#]+)\/?/i;
const BRAND_RE = /scholarships\s*\.?\s*af|scholarshipsaf|telegram|join (our|us)|follow us|subscribe|sponsored|advertis|whatsapp (group|channel)|our (website|channel|page)/i;

const clean = (s) => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const low = (s) => clean(s).toLowerCase();

/** لینک‌های بورسیه در یک صفحه فهرست */
export function parseScholarshipList(html, baseUrl) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const items = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const m = href.match(DETAIL_RE);
    if (!m) return;
    let url;
    try { url = new URL(href, baseUrl); } catch { return; }
    if (!SOURCE_HOST_RE.test(url.hostname)) return;
    url.hash = ''; url.search = '';
    const key = url.toString().replace(/\/?$/, '/');
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ slug: m[1], url: key });
  });
  return items;
}

function textLines(root) {
  const lines = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === 'text') { const t = clean(node.data); if (t) lines.push(t); return; }
    if (node.type === 'tag' || node.type === 'root') {
      if (['script', 'style', 'noscript', 'svg', 'iframe'].includes(node.tagName)) return;
      (node.children || []).forEach(walk);
    }
  };
  root.toArray().forEach(walk);
  return lines;
}

const LABELS = {
  provider: ['provider', 'host', 'host institution', 'university', 'organization', 'offered by'],
  country: ['country / location', 'country/location', 'country', 'location', 'study in', 'host country'],
  program_type: ['program type', 'type', 'scholarship type'],
  level: ['study level', 'level', 'degree level', 'degree', 'program level', 'course level'],
  funding: ['funding', 'funding type', 'coverage', 'financial coverage'],
  open_to: ['open to', 'eligible nationalities', 'eligible countries', 'nationality', 'who can apply'],
  deadline: ['deadline', 'application deadline', 'last date', 'closing date'],
  language_req: ['language requirement', 'language requirements', 'english requirement'],
  gender: ['gender'],
  instruction: ['medium of instruction', 'language of instruction', 'instruction language'],
  opp_id: ['opportunity id', 'job id'],
  post_date: ['post date', 'posted on', 'published'],
};
function labelKey(line) {
  const l = low(line).replace(/\s*[:：]\s*$/, '');
  for (const [k, arr] of Object.entries(LABELS)) if (arr.includes(l)) return k;
  return null;
}
function inlineLabel(line) {
  const m = clean(line).match(/^([A-Za-z /]{3,40})\s*[:：]\s*(.+)$/);
  if (!m) return null;
  const k = labelKey(m[1]);
  return k ? [k, m[2]] : null;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
export function parseDate(s) {
  const t = String(s || '');
  let m = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const mon = (w) => MONTHS[w.slice(0, 4).toLowerCase()] || MONTHS[w.slice(0, 3).toLowerCase()];
  const fmt = (y, mo, d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/);
  if (m && mon(m[2])) return fmt(m[3], mon(m[2]), m[1]);
  m = t.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m && mon(m[1])) return fmt(m[3], mon(m[1]), m[2]);
  return null;
}

export function normalizeLevels(...texts) {
  const s = texts.map((x) => String(x || '').toLowerCase()).join(' | ');
  const out = [];
  if (/bachelor|undergrad|\bbsc\b|\bba\b|\bbs\b/.test(s)) out.push('bachelor');
  if (/master|\bmsc\b|\bma\b|\bmba\b|\bmphil\b|postgraduate|graduate (?:degree|program|study|studies)/.test(s)) out.push('master');
  if (/\bph\.?d\b|doctoral|doctorate/.test(s)) out.push('phd');
  if (/post-?doc/.test(s)) out.push('postdoc');
  if (!out.length && /diploma|short course|certificate|exchange|summer|non-degree/.test(s)) out.push('other');
  return out;
}

export function normalizeFunding(...texts) {
  const s = texts.map((x) => String(x || '').toLowerCase()).join(' | ');
  if (/fully[\s-]*funded|full scholarship|full funding|full tuition|100%/.test(s)) return 'full';
  if (/partial|partially/.test(s)) return 'partial';
  return '';
}

export function idFromSlug(slug) {
  let h = 2166136261;
  for (const c of String(slug)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return 900000000 + (Math.abs(h) % 99999999);
}

function sanitize(html) {
  const out = sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'h3', 'h4', 'h5', 'a', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote'],
    allowedAttributes: { a: ['href'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href || '';
        if (!href || SOURCE_HOST_RE.test(href) || /^(#|javascript:)/i.test(href)) return { tagName: 'span', attribs: {} };
        return { tagName: 'a', attribs: { href, target: '_blank', rel: 'noopener noreferrer' } };
      },
      h1: 'h3', h2: 'h3', div: 'p',
    },
    exclusiveFilter: (frame) => ['p', 'span', 'li', 'h3', 'h4', 'td'].includes(frame.tag) && !frame.text.replace(/ /g, '').trim(),
  });
  return out.replace(/(&nbsp;|\u00a0)+/g, ' ').replace(/<span>\s*<\/span>/g, '').replace(/\s+\./g, '.').replace(/<p>\s*\.?\s*<\/p>/g, '').trim();
}

const START_RE = /^(opportunity description|introduction|about the (scholarship|program|opportunity)|overview|description)$/i;
const STOP_RE = /^(other opportunities you may like|related (opportunities|posts|scholarships)|you may also like|share (this|on)|leave a (reply|comment)|comments?|frequently asked questions|faqs?)\b/i;
const APPLY_RE = /apply\s*(now|here|online|today)|application (portal|form|link|page)|official (website|link|page|site)|visit (the )?(official )?(website|site)|apply/i;

/** تجزیه صفحه جزئیات بورسیه */
export function parseScholarshipDetail(html, url) {
  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, form, ins, .adsbygoogle').remove();

  let title = clean($('h1').first().text());
  if (!title || SOURCE_HOST_RE.test(title)) {
    const og = clean($('meta[property="og:title"]').attr('content'));
    title = og.replace(/\s*[-|–]\s*scholarships\.?af.*$/i, '').trim();
  }
  if (!title) title = clean($('h2').first().text());

  const lines = textLines($('body'));
  const fields = {};
  for (let i = 0; i < lines.length; i++) {
    const inl = inlineLabel(lines[i]);
    if (inl) { if (fields[inl[0]] === undefined) fields[inl[0]] = clean(inl[1]); continue; }
    const key = labelKey(lines[i]);
    if (!key || fields[key] !== undefined) continue;
    const next = lines[i + 1];
    if (next && !labelKey(next) && next.length < 300) fields[key] = clean(next);
  }

  // ارگان: خطی که با @ آغاز می‌شود
  let organization = fields.provider || '';
  const atLine = lines.find((l) => /^@\s*\S/.test(l));
  if (atLine) organization = clean(atLine.replace(/^@\s*/, '')) || organization;
  if (!organization) {
    const orgA = $('a[href*="/organizations/"]').filter((_, a) => clean($(a).text())).first();
    organization = clean(orgA.text()).replace(/^@\s*/, '');
  }

  // نوع فرصت
  const typeLine = lines.find((l) => /^(scholarships?|fellowships?|competitions?|short programs?|courses?|internships?|jobs?|research|awards?|conferences?)$/i.test(l));
  const type = typeLine ? typeLine.toLowerCase().replace(/s$/, '') : '';
  const isScholarship = type ? type === 'scholarship' : /scholarship/i.test(`${fields.program_type || ''} ${title}`);

  // لوگوی ارگان
  let logo = '';
  $('a[href*="/organizations/"] img, img[class*="logo" i]').each((_, img) => {
    if (logo) return;
    const src = $(img).attr('data-src') || $(img).attr('src') || '';
    if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(src) && !/scholarships\.af-(logo|home)/i.test(src)) logo = src;
  });
  if (logo) { try { logo = new URL(logo, url).toString(); } catch { logo = ''; } }

  // متن اصلی
  const blocks = $('h1,h2,h3,h4,h5,p,ul,ol,table,blockquote').toArray().filter((el) => {
    let p = el.parent;
    while (p) { if (['ul', 'ol', 'table', 'blockquote', 'p'].includes(p.tagName)) return false; p = p.parent; }
    return true;
  });
  let start = blocks.findIndex((el) => /^h[1-5]$/.test(el.tagName) && START_RE.test(clean($(el).text())));
  if (start < 0) start = blocks.findIndex((el) => /^h[1-5]$/.test(el.tagName) && clean($(el).text()) === title) + 1;
  if (start < 0) start = 0;
  let end = blocks.findIndex((el, i) => i > start && /^h[1-5]$/.test(el.tagName) && STOP_RE.test(clean($(el).text())));
  if (end < 0) end = blocks.length;
  // نام منبع: لینک‌هایش حذف و جمله‌هایی که نام آن را دارند پاک می‌شوند
  const scrub = (el) => {
    $(el).find('a[href]').each((_, a) => { if (SOURCE_HOST_RE.test($(a).attr('href') || '') && BRAND_RE.test($(a).text())) $(a).remove(); });
    const walk = (n) => {
      if (n.type === 'text') {
        if (BRAND_RE.test(n.data)) n.data = n.data.split(/(?<=[.!?؟])\s+/).filter((x) => !BRAND_RE.test(x)).join(' ');
        return;
      }
      (n.children || []).forEach(walk);
    };
    walk(el);
    // جمله‌ای که نام منبع را در لینک داشت و حالا ناقص مانده («Read more on .»)
    const walk2 = (n) => {
      if (n.type === 'text') {
        n.data = n.data.replace(/(^|[.!?]\s+)[^.!?]*\b(read more|learn more|visit|more details|for more (information|details)|check|available)\b[^.!?]*\b(on|at|from|via)\s*$/i, '$1');
        if (/^\s*\.\s*$/.test(n.data) && n.prev && n.prev.type === 'text') n.data = '';
        return;
      }
      (n.children || []).forEach(walk2);
    };
    walk2(el);
    return true;
  };
  const body = blocks.slice(start, end)
    .filter((el) => {
      if (!scrub(el)) return false;
      const txt = clean($(el).text());
      if (!txt && el.tagName !== 'table') return false;
      if (BRAND_RE.test(txt)) return false;
      if (/^h[1-5]$/.test(el.tagName) && START_RE.test(txt) && /opportunity description/i.test(txt)) return false;
      return true;
    })
    .map((el) => $.html(el)).join('\n');

  // لینک رسمی درخواست
  let apply_url = '';
  let website_url = '';
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (!/^https?:/i.test(href) || SOURCE_HOST_RE.test(href)) return;
    if (/facebook|twitter|x\.com|linkedin|instagram|t\.me|telegram|whatsapp|youtube|pinterest|addtoany|sharethis/i.test(href)) return;
    const txt = clean($(a).text());
    if (href === apply_url || href === website_url) return;
    if (!apply_url && /apply/i.test(txt)) apply_url = href;
    else if (!website_url && APPLY_RE.test(txt)) website_url = href;
  });
  if (!apply_url) apply_url = website_url;

  const deadline_text = fields.deadline || '';
  const levels = normalizeLevels(fields.level, fields.program_type, title);
  const funding = normalizeFunding(fields.funding, fields.program_type, title);
  const countryRaw = fields.country || '';
  const countries = detectCountries(`${countryRaw}`).length ? detectCountries(countryRaw) : detectCountries(`${title} ${organization}`);
  const m = String(url || '').match(DETAIL_RE);
  const slug = m ? m[1] : '';
  const idNum = Number(String(fields.opp_id || '').replace(/\D/g, ''));

  return {
    id: idNum > 0 ? idNum : idFromSlug(slug),
    slug,
    is_scholarship: isScholarship,
    title,
    organization,
    org_key: orgKey(organization),
    org_logo_src: logo,
    country_raw: countryRaw,
    countries,
    levels,
    funding,
    funding_text: fields.funding || '',
    deadline: parseDate(deadline_text),
    deadline_text,
    open_to: fields.open_to || '',
    language_req: fields.language_req || '',
    instruction_lang: fields.instruction || '',
    gender_text: fields.gender || '',
    published: parseDate(fields.post_date),
    summary_html: sanitize(body),
    apply_url,
    website_url: website_url && website_url !== apply_url ? website_url : '',
    source_url: url,
  };
}
