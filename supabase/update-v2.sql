-- =====================================================================
--  Apex Job — به‌روزرسانی نسخه ۲
--  اگر schema.sql را قبلاً اجرا کرده‌اید، فقط همین فایل را یک‌بار در
--  Supabase → SQL Editor اجرا کنید. (اجرای دوباره آن ضرری ندارد.)
-- =====================================================================

-- ---------- تنظیمات عمومی (آدرس، اوقات کاری، هزینه، شماره‌ها) ----------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;

drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select using (true);

drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- درخواست‌های واتساپ (کلیک روی دکمه واتساپ، بدون معلومات شخصی) ----------
create table if not exists public.wa_leads (
  id           bigint generated always as identity primary key,
  job_id       bigint,
  job_title    text,
  organization text,
  closing_date date,
  lang         text,
  platform     text,
  status       text not null default 'new' check (status in ('new', 'done')),
  created_at   timestamptz not null default now()
);
create index if not exists wa_leads_created_idx on public.wa_leads (created_at desc);
alter table public.wa_leads enable row level security;

drop policy if exists "wa leads insert" on public.wa_leads;
create policy "wa leads insert" on public.wa_leads for insert
  with check (status = 'new' and char_length(coalesce(job_title, '')) <= 200);

drop policy if exists "wa leads admin read" on public.wa_leads;
create policy "wa leads admin read" on public.wa_leads for select using (public.is_admin());

drop policy if exists "wa leads admin update" on public.wa_leads;
create policy "wa leads admin update" on public.wa_leads for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wa leads admin delete" on public.wa_leads;
create policy "wa leads admin delete" on public.wa_leads for delete using (public.is_admin());

-- ---------- محل ذخیره تصاویر آگهی: پذیرش GIF و حداکثر ۸ مگابایت ----------
update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/gif', 'image/png', 'image/jpeg', 'image/webp']
where id = 'ads';
