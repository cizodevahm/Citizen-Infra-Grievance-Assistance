begin;

alter table whatsapp_conversations drop constraint if exists whatsapp_conversations_step_check;
alter table whatsapp_conversations add constraint whatsapp_conversations_step_check
  check (step in ('idle', 'photo', 'location', 'description', 'confirm', 'track', 'processing'));

create table if not exists whatsapp_processing_jobs (
  submission_id uuid primary key,
  phone_number_id text not null,
  sender_id text not null,
  image_id text not null,
  message_at timestamptz not null,
  stage text not null default 'download'
    check (stage in ('download', 'photo', 'ready', 'done', 'failed', 'cancelled')),
  image_bytes bytea,
  findings jsonb,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists whatsapp_processing_jobs_pending_idx
  on whatsapp_processing_jobs(next_attempt_at, created_at)
  where stage in ('download', 'photo', 'ready');
alter table whatsapp_processing_jobs enable row level security;

-- A chat event has one immediate reply; a background job has one final reply.
alter table whatsapp_outbox alter column event_id drop not null;
alter table whatsapp_outbox add column if not exists submission_id uuid
  references whatsapp_processing_jobs(submission_id);
create unique index if not exists whatsapp_outbox_submission_idx on whatsapp_outbox(submission_id);
alter table whatsapp_outbox drop constraint if exists whatsapp_outbox_reply_source_check;
-- Older deployments can contain replies without an originating inbox event.
-- Keep them sendable/updatable without allowing new unlinked replies by default.
alter table whatsapp_outbox add column if not exists legacy_reply_source boolean not null default false;
update whatsapp_outbox set legacy_reply_source=true
  where event_id is null and submission_id is null and not legacy_reply_source;
alter table whatsapp_outbox add constraint whatsapp_outbox_reply_source_check
  check (
    ((event_id is not null) <> (submission_id is not null))
    or (legacy_reply_source and event_id is null and submission_id is null)
  );

commit;
