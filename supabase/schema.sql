-- 캠페인 허브가 쓰는 테이블. Supabase 대시보드 → SQL Editor 에 붙여 넣고 Run 을 한 번 누른다.
-- 허브의 자료 전체(계정, 세션, 캠페인, 제출 링크, 마감 알림)가 이 표의 한 행에 jsonb 로 들어간다 (lib/server/db.ts).
create table if not exists public.hub_state (
  id      int    primary key check (id = 1),
  data    jsonb  not null,
  -- 저장할 때마다 1씩 오른다. 읽은 뒤 다른 저장이 끼어들었으면 그 저장은 버리고 다시 한다.
  version bigint not null default 0
);

-- 정책을 하나도 두지 않는다: 브라우저에 공개되는 키(anon, publishable)로는 읽지도 쓰지도 못하고,
-- 허브 서버만 secret 키로 드나든다.
alter table public.hub_state enable row level security;
