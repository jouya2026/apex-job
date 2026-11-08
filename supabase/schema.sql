-- =====================================================================
--  Apex Job — Supabase schema
--  این فایل را یک‌بار در Supabase → SQL Editor اجرا کنید.
--  قبل از اجرا، ایمیل مدیر را در پایین‌ترین بخش فایل عوض کنید.
-- =====================================================================

-- ---------- وظایف ----------
create table if not exists public.jobs (
  id                bigint primary key,
  slug              text,
  title             text not null,
  organization      text,
  job_type          text,
  locations         text[] not null default '{}',
  location_raw      text,
  category          text,
  published         date,
  closing_date      date,
  nationality       text,
  gender            text,
  salary            text,
  contract_duration text,
  vacancy_number    text,
  positions         text,
  education         text,
  experience        text,
  about_html        text,
  summary_html      text,
  requirements_html text,
  submission_html   text,
  apply_url         text,
  apply_email       text,
  source_url        text,              -- فقط برای اسکریپر؛ به کاربران داده نمی‌شود
  title_tr          jsonb,             -- عنوان ترجمه‌شده {fa, ps}
  tr                jsonb,             -- جزئیات ترجمه‌شده {fa: {...}, ps: {...}}
  translated_at     timestamptz,
  first_seen_at     timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists jobs_closing_idx    on public.jobs (closing_date);
create index if not exists jobs_first_seen_idx on public.jobs (first_seen_at desc);

alter table public.jobs enable row level security;

drop policy if exists "jobs public read" on public.jobs;
create policy "jobs public read" on public.jobs for select using (true);

-- ستون source_url برای عموم قابل خواندن نیست
revoke select on public.jobs from anon, authenticated;
grant select (
  id, slug, title, organization, job_type, locations, location_raw, category,
  published, closing_date, nationality, gender, salary, contract_duration,
  vacancy_number, positions, education, experience, about_html, summary_html,
  requirements_html, submission_html, apply_url, apply_email,
  first_seen_at, updated_at, title_tr, tr, translated_at
) on public.jobs to anon, authenticated;

-- ---------- مدیران ----------
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- هیچ policy برای admins تعریف نمی‌شود؛ فقط از طریق تابع is_admin خوانده می‌شود.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- تبلیغات ----------
create table if not exists public.ads (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text,
  cta         text,
  placement   text not null default 'hero'
              check (placement in ('hero', 'feed', 'detail', 'sticker')),
  kind        text not null default 'image'
              check (kind in ('image', 'text')),
  image_url   text,
  link_url    text,
  bg_from     text default '#1877F2',
  bg_to       text default '#7AB3FF',
  priority    int  not null default 0,
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  clicks      int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ads enable row level security;

drop policy if exists "ads public read active" on public.ads;
create policy "ads public read active" on public.ads for select using (
  (active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now()))
  or public.is_admin()
);

drop policy if exists "ads admin insert" on public.ads;
create policy "ads admin insert" on public.ads for insert with check (public.is_admin());

drop policy if exists "ads admin update" on public.ads;
create policy "ads admin update" on public.ads for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ads admin delete" on public.ads;
create policy "ads admin delete" on public.ads for delete using (public.is_admin());

create or replace function public.ad_click(ad_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ads set clicks = clicks + 1 where id = ad_id and active;
$$;
grant execute on function public.ad_click(uuid) to anon, authenticated;

-- ---------- توکن‌های نوتیفیکیشن (اپ اندروید) ----------
create table if not exists public.push_tokens (
  token      text primary key,
  platform   text,
  lang       text default 'fa',
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;

drop policy if exists "push tokens insert" on public.push_tokens;
create policy "push tokens insert" on public.push_tokens for insert with check (true);

drop policy if exists "push tokens admin read" on public.push_tokens;
create policy "push tokens admin read" on public.push_tokens for select using (public.is_admin());

-- ---------- وضعیت سیستم ----------
create table if not exists public.meta (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.meta enable row level security;

drop policy if exists "meta public read" on public.meta;
create policy "meta public read" on public.meta for select using (true);

-- ---------- محل ذخیره تصاویر تبلیغات ----------
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

drop policy if exists "ads images admin insert" on storage.objects;
create policy "ads images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ads' and public.is_admin());

drop policy if exists "ads images admin update" on storage.objects;
create policy "ads images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'ads' and public.is_admin());

drop policy if exists "ads images admin delete" on storage.objects;
create policy "ads images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'ads' and public.is_admin());

-- ---------- نسخه ۲ ----------

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

-- =====================================================================
--  ایمیل مدیر: ایمیل خود را جایگزین کنید (همان ایمیلی که در
--  Authentication → Users برای خود کاربر می‌سازید)
-- =====================================================================
insert into public.admins (email) values ('YOUR-EMAIL@example.com')
on conflict (email) do nothing;
