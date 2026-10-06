-- Two new columns on complaints:
--   user_message : what the citizen typed + what they said in the voice note
--   ai_decision  : the AI's short explanation of what it decided and why

alter table complaints
  add column if not exists user_message text,
  add column if not exists ai_decision  text;
