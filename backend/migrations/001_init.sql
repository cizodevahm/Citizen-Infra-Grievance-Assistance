
-- ---------------------------------------------------------------
create extension if not exists postgis with schema extensions;

create table if not exists complaints (
  id                    bigint generated always as identity primary key,
  tracking_id           text        not null unique,
  parent_id             bigint      references complaints(id) on delete set null,  -- NULL = main ticket
  status                text        not null default 'pending'
                          check (status in ('pending','processing','completed')),
  category              text        not null
                          check (category in ('pothole','streetlight','water_leak','drain','other')),
  severity              text        not null check (severity in ('low','medium','high','urgent')),
  is_urgent             boolean     not null default false,
  department            text        not null,
  summary               text        not null,
  original_text_english text        not null default '',
  raw_text              text,
  transcript            text,
  image_url             text,
  audio_url             text,
  lat                   double precision not null check (lat between -90 and 90),
  lng                   double precision not null check (lng between -180 and 180),
  geom                  geography(Point, 4326) not null,
  report_count          integer     not null default 1,   -- meaningful on main tickets
  ai_raw                jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  acknowledged_at       timestamptz,
  resolved_at           timestamptz,
  deleted_at            timestamptz,
  deleted_by            text,
  delete_reason         text
);

create index if not exists complaints_geom_idx       on complaints using gist (geom);
create index if not exists complaints_parent_idx     on complaints (parent_id);
create index if not exists complaints_status_idx     on complaints (status);
create index if not exists complaints_category_idx   on complaints (category);
create index if not exists complaints_created_at_idx on complaints (created_at desc);
create index if not exists complaints_deleted_at_idx on complaints (deleted_at);

create table if not exists status_history (
  id           bigint generated always as identity primary key,
  complaint_id bigint not null references complaints(id) on delete cascade,
  old_status   text,
  new_status   text not null,
  changed_by   text,
  changed_at   timestamptz not null default now()
);
create index if not exists status_history_complaint_idx on status_history (complaint_id);

-- Selfies / blurry photos / non-issues: logged, no complaint created, no image stored
create table if not exists rejected_submissions (
  id          bigint generated always as identity primary key,
  reason      text,
  raw_text    text,
  lat         double precision,
  lng         double precision,
  ai_raw      jsonb,
  created_at  timestamptz not null default now()
);

-- SECURITY: Supabase exposes public tables through its REST API with the anon key.
-- Enabling RLS with no policies blocks that. Our Flask backend connects directly as the
-- postgres role, which bypasses RLS, so it keeps working.
alter table complaints           enable row level security;
alter table status_history       enable row level security;
alter table rejected_submissions enable row level security;
