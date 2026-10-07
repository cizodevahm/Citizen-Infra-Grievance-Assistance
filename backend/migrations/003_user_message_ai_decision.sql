-- Two new columns on complaints:
--   user_message : what the citizen typed + what they said in the voice note
--   ai_decision  : the AI's short explanation of what it decided and why

alter table complaints
  add column if not exists user_message text,
  add column if not exists ai_decision  text;

-- Reserve the deleted status for soft-deleted complaints only.
begin;

alter table complaints drop constraint if exists complaints_status_check;

update complaints
set status = 'deleted'
where deleted_at is not null and status <> 'deleted';

alter table complaints add constraint complaints_status_check check (
  (deleted_at is null and status in ('pending', 'processing', 'completed'))
  or (deleted_at is not null and status = 'deleted')
);

commit;
