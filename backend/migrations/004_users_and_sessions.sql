-- Every user is an administrator. Provision the first user on the trusted server.
begin;

create table users (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  email         text not null unique
                  check (char_length(email) between 3 and 254 and email = lower(btrim(email))),
  password_hash text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table user_sessions (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index user_sessions_user_id_idx on user_sessions (user_id);
create index user_sessions_expires_at_idx on user_sessions (expires_at);

-- Match 001_init.sql: no public RLS policies; the backend's postgres role bypasses RLS.
alter table users enable row level security;
alter table user_sessions enable row level security;
revoke all on users, user_sessions from public;
revoke all on sequence users_id_seq, user_sessions_id_seq from public;
grant select, insert, update, delete on users, user_sessions to postgres;
grant usage, select on sequence users_id_seq, user_sessions_id_seq to postgres;

commit;
