-- Soft delete support for dashboard/admin deletion.
-- Deleted complaints stay searchable by tracking ID, but list/map/dashboard queries hide them.

alter table complaints
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text,
  add column if not exists delete_reason text;

create index if not exists complaints_deleted_at_idx on complaints (deleted_at);
