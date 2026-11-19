-- 크리에이터 ↔ 담당자 대화를 허브 자료(hub_state 한 행)와 따로 저장하는 표. Supabase → SQL Editor 에 붙여 넣고 Run 을 한 번 누른다.
-- 메시지 하나를 보낼 때 한 줄만 추가하고, 대화방마다 그 방의 메시지만 읽는다 (lib/server/chat.ts).
-- schema.sql 을 이미 실행한 프로젝트에 추가로 실행한다. 여러 번 실행해도 괜찮다.

create table if not exists public.hub_messages (
  id         text        primary key,
  campaign_id text       not null,
  entry_id   text        not null,          -- 캠페인 안의 크리에이터 행. 대화방 하나 = 행 하나
  sender     text        not null check (sender in ('staff', 'creator')),
  user_id    text        not null,
  name       text        not null,
  body       text        not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists hub_messages_entry on public.hub_messages (entry_id, created_at);
create index if not exists hub_messages_campaign on public.hub_messages (campaign_id);

-- 사람마다 대화방을 어디까지 읽었는지. 안 읽은 메시지 수를 셀 때 쓴다.
create table if not exists public.hub_chat_reads (
  user_id  text        not null,
  entry_id text        not null,
  read_at  timestamptz not null,
  primary key (user_id, entry_id)
);

-- 안 읽은 메시지 수: 이 사람이 볼 수 있는 대화방들 중에서, 상대편이 마지막으로 읽은 뒤에 보낸 메시지.
create or replace function public.hub_unread(p_user text, p_entries text[], p_sender text)
returns table (entry_id text, n bigint)
language sql stable
set search_path = public
as $$
  select m.entry_id, count(*)
  from hub_messages m
  left join hub_chat_reads r on r.user_id = p_user and r.entry_id = m.entry_id
  where m.entry_id = any (p_entries)
    and m.sender = p_sender
    and (r.read_at is null or m.created_at > r.read_at)
  group by m.entry_id
$$;

-- hub_state 와 같은 규칙: 정책을 두지 않아 브라우저용 키(anon, publishable)로는 읽지도 쓰지도 못하고,
-- 허브 서버(secret 키 = service_role)만 드나든다. 브라우저는 실시간 "새 메시지 있음" 신호만 받고, 내용은 허브 서버에서 가져간다.
alter table public.hub_messages enable row level security;
alter table public.hub_chat_reads enable row level security;
grant select, insert, update, delete on public.hub_messages, public.hub_chat_reads to service_role;
revoke all on public.hub_messages, public.hub_chat_reads from anon, authenticated;
revoke execute on function public.hub_unread(text, text[], text) from public, anon, authenticated;
grant execute on function public.hub_unread(text, text[], text) to service_role;
