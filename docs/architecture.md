# 구조

폴더 구성, 디자인 방향, 데이터 모델, 기술 선택을 적은 문서다.

## 폴더 구성

```
app/about/            소개 (첫 화면)
app/campaigns/        캠페인 목록·등록, [id]/ 캠페인 상세
app/today/            오늘 할 일
app/contracts/        계약서 앱 사용 순서와 링크
docs/contract-app/    계약서 앱에 넣을 미리 채우기 코드와 적용 방법
app/mypage/           마이페이지
app/login/, signup/   로그인, 담당자 가입
app/join/             크리에이터 초대 링크
app/creator/          크리에이터의 내 일정
app/api/              서버 API: auth(가입·로그인·로그아웃·비밀번호), me, campaigns, join, creator
proxy.ts              역할별 화면 이동(담당자 화면 / 내 일정 / 로그인, 개발자는 둘 다)
app/not-found.tsx     없는 화면 안내
components/           상단 메뉴(SiteHeader), 파란 띠(PageBand), 캠페인 목록·등록 폼, 크리에이터 진행 표, 대기 상태 표시
lib/campaigns.ts      데이터 모양과 규칙: 진행 단계, 대기 주체, 마감·진행률 계산
lib/store.ts          화면이 쓰는 서버 데이터 사본: 바로 반영하고 서버에 저장, 20초마다 새로 받음
lib/ops.ts            담당자가 할 수 있는 변경 목록과 입력 검사 (화면과 서버가 같이 쓴다)
lib/files.ts          올릴 수 있는 서류 종류와 파일 형식 확인. 자동 검사: node lib/files.check.ts
lib/me.ts             로그인한 계정
lib/server/           서버 전용: db(Supabase 또는 data/hub.json 읽기·쓰기), auth(비밀번호 해시·세션·권한), creator(크리에이터에게 보낼 범위), mail(메일 발송), files(서류 파일 보관: Supabase Storage 또는 data/files)
lib/contract.ts       계약서 앱 링크 만들기
lib/demo.ts           처음 켤 때 들어가는 예시 캠페인 3개 (담당자 홍가영·이세연)
lib/date.ts           D-day·대기 일수 계산 (한국 시간 기준). 자동 검사: node lib/date.check.ts
app/globals.css       색·폰트·애니메이션 (스텔라이즈 색 값)
docs/                 화면과 기능(guide), 설치와 운영(setup), 구조(architecture), 화면 캡처(screens)
PRODUCT.md            사용자, 목적, 브랜드 약속, 원칙
```

## 디자인 방향

- **인크로스 홈([incross.com/ko](https://incross.com/ko/))의 시각 언어**: 파란 띠 위 상단 메뉴와 촘촘한 큰 제목, 세로선으로 나눈 4칸 요약, 위 2px 진한 선과 1px 구분선으로 나눈 목록. 홈페이지처럼 큰 배너는 쓰지 않는다. 하루 종일 켜 두는 업무 화면이라 크리에이터 진행 표가 첫 화면에 보여야 한다.
- **배경과 색은 [스텔라이즈](https://www.stellaize.com/)**: 브랜드 파랑 그라데이션, 스텔라이즈 회색 글자(`#282A3A`, `#404252`, `#5B5D6B`)와 구분선(`#DDDFE2`). 폰트는 두 사이트 공통인 Pretendard.
- **AI 앱처럼 보이지 않게**: Tailwind 기본 색·둥근 모서리·그림자를 테마에서 지워서 쓸 수 없게 했다. 알약 배지와 그림자 카드 대신 작은 네모(■)와 글자로 상태를 표시한다.
- **빨강은 문제일 때만**: 마감이 지난 건(기획자 피드백 11/7). 일주일 안 마감은 진한 글자로만 표시한다.
- **휴대폰**: 메뉴는 옆으로 밀어 넘기고, 요약은 2칸, 크리에이터 진행 표는 이름 칸을 고정한 채 옆으로 민다.
- 사이트의 CSS·JS·이미지 파일은 복사하지 않고 값만 옮겼다. 로고는 공식 파일을 받기 전까지 글자 로고로 둔다.

---

## 데이터 모델

```
Campaign (캠페인)                     1 ─── N  Entry (캠페인별 크리에이터 진행 건)
  캠페인 이름 · 광고주 · 채널                     크리에이터 이름 · 채널
  업로드 날짜 · 담당자(여러 명) · 등록일            단계별 체크 날짜 11칸 (부킹 요청 … 업로드, 리포트 작성)
                                                단계별 마감 11칸 (업로드 칸 = 이 크리에이터의 업로드 날짜)
                                                드랍한 날 · 초대 코드 · 연결된 크리에이터 계정
                                                최종단가 · PA 광고 1개월 단가 · 운송장 번호

User (계정)          담당자 / 개발자 / 크리에이터 · 이름 · 이메일 · 비밀번호 해시
Submission (제출)    크리에이터가 낸 링크: 어느 진행 건의 어느 단계 · 링크 · 메모 · 낸 날
Notice (보낸 메일)   담당자가 보낸 마감 알림 메일: 어느 진행 건의 어느 단계 · 마감 · 보낸 날
Profile (개인정보)   크리에이터 계정마다 하나: 성함 · 전화번호 · 주소 · 동의한 시각 · 신분증/통장사본 파일 정보
```

`Entry` 가 이 앱의 중심이다. 캠페인이 아니라 **크리에이터 × 캠페인** 단위로 단계를 추적한다. 다음 단계, 대기 주체, 대기 일수, 지금 걸린 마감은 저장하지 않고 체크 날짜와 마감 날짜에서 계산한다(`lib/campaigns.ts`). 크리에이터 DB를 빼면서 크리에이터는 캠페인 안에 이름과 채널만 둔다.

---

## 기술 스택

- 웹앱 (.exe 아님: 여러 명이 같은 데이터를 동시에 본다)
- Next.js 16 (App Router) + TypeScript + Tailwind v4 — 적용됨
- 저장: Supabase(Postgres)의 표 하나에 자료 전체를 jsonb 한 행으로 넣는다(`supabase/schema.sql`). `SUPABASE_URL`, `SUPABASE_SECRET_KEY`가 없으면 서버의 JSON 파일 하나(`data/hub.json`)를 쓴다. 로그인은 직접 만든 것(scrypt 해시, HttpOnly 쿠키 세션)이고 Supabase Auth는 쓰지 않는다. 읽기·쓰기는 `lib/server/db.ts`만 거친다. 표를 종류별로 나누는 것과 RLS는 아직 하지 않았다. 계약서 서류 파일은 계약서 앱이 각자 PC에서 처리하므로 허브에 저장하지 않는다
- 배포: Vercel(서울). Vercel은 파일을 보관하지 않으므로 Supabase 연결이 꼭 있어야 한다. 방법은 [setup.md](setup.md)
