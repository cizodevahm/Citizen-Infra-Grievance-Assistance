-- Original WhatsApp schema for fresh databases. Already present in the existing database:
-- do not rerun it there. Automatic submission does not require any schema change.
begin;

create table if not exists whatsapp_conversations (
  phone_number_id text not null,
  sender_id text not null,
  step text not null default 'idle'
    check (step in ('idle', 'photo', 'location', 'description', 'confirm', 'track')),
  draft jsonb not null default '{}',
  expires_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (phone_number_id, sender_id)
);

create table if not exists whatsapp_events (
  id bigint generated always as identity primary key,
  phone_number_id text not null,
  sender_id text not null,
  message_id text not null,
  message jsonb not null,
  message_at timestamptz not null,
  received_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'done', 'failed', 'expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  unique (phone_number_id, message_id)
);
create index if not exists whatsapp_events_pending_idx
  on whatsapp_events(next_attempt_at, id) where status = 'pending';
create index if not exists whatsapp_events_sender_idx
  on whatsapp_events(phone_number_id, sender_id, id) where status = 'pending';

create table if not exists whatsapp_complaints (
  submission_id uuid primary key,
  phone_number_id text not null,
  sender_id text not null,
  complaint_id bigint not null unique references complaints(id),
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_complaints_sender_idx
  on whatsapp_complaints(phone_number_id, sender_id);

create table if not exists whatsapp_outbox (
  id bigint generated always as identity primary key,
  event_id bigint not null unique references whatsapp_events(id),
  phone_number_id text not null,
  sender_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'expired')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  expires_at timestamptz not null,
  meta_message_id text,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_outbox_pending_idx
  on whatsapp_outbox(next_attempt_at, id) where status = 'pending';
create index if not exists whatsapp_outbox_sender_idx
  on whatsapp_outbox(phone_number_id, sender_id, id) where status = 'pending';

alter table whatsapp_conversations enable row level security;
alter table whatsapp_events enable row level security;
alter table whatsapp_complaints enable row level security;
alter table whatsapp_outbox enable row level security;

commit;
