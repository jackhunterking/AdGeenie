-- Feature: Clean malformed tool parts in messages.parts
-- Purpose: One-time, reversible cleanup to remove invalid AI SDK v5 tool parts
-- References:
--  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
--  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

begin;

-- Backup affected rows
create table if not exists messages_backup_invalid_parts as
select id, conversation_id, parts, created_at
from messages
where false;

insert into messages_backup_invalid_parts (id, conversation_id, parts, created_at)
select id, conversation_id, parts, created_at
from messages m
where exists (
  select 1
  from jsonb_array_elements(m.parts) p
  where
    jsonb_typeof(p->'type') is distinct from 'string' -- non-string type
    or ((p->>'type') like 'tool-%' and coalesce(p->>'toolCallId','') = '') -- tool-* w/o toolCallId
    or ((p->>'type') = 'tool-result' and coalesce(p->>'toolCallId','') = '') -- tool-result w/o toolCallId
    or ((p->>'type') like 'tool-%' and (p ? 'output') = false and (p ? 'result') = false) -- tool-* w/o output/result
);

-- Clean invalid parts by filtering array elements
update messages m
set parts = (
  select coalesce(jsonb_agg(p2), '[]'::jsonb)
  from (
    select p as p2
    from jsonb_array_elements(m.parts) p
    where
      jsonb_typeof(p->'type') = 'string'
      and (
        -- non-tool parts
        (p->>'type') not like 'tool-%'
        or (
          -- tool-result must have toolCallId
          (p->>'type') = 'tool-result' and coalesce(p->>'toolCallId','') <> ''
        )
        or (
          -- other tool-* must have toolCallId and either output or result
          (p->>'type') like 'tool-%'
          and (p->>'type') <> 'tool-result'
          and coalesce(p->>'toolCallId','') <> ''
          and ((p ? 'output') or (p ? 'result'))
        )
      )
  ) s
)
where exists (
  select 1
  from jsonb_array_elements(m.parts) p
  where
    jsonb_typeof(p->'type') is distinct from 'string'
    or ((p->>'type') like 'tool-%' and coalesce(p->>'toolCallId','') = '')
    or ((p->>'type') = 'tool-result' and coalesce(p->>'toolCallId','') = '')
    or ((p->>'type') like 'tool-%' and (p ? 'output') = false and (p ? 'result') = false)
);

commit;


