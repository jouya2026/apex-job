-- =====================================================================
--  Apex Job — به‌روزرسانی نسخه ۳: ترجمه خودکار وظایف
--  یک‌بار در Supabase → SQL Editor اجرا کنید (اجرای دوباره ضرری ندارد).
-- =====================================================================
alter table public.jobs add column if not exists title_tr      jsonb;
alter table public.jobs add column if not exists tr            jsonb;
alter table public.jobs add column if not exists translated_at timestamptz;

create index if not exists jobs_untranslated_idx on public.jobs (first_seen_at desc) where translated_at is null;

grant select (title_tr, tr, translated_at) on public.jobs to anon, authenticated;
