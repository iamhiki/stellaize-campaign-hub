# 설치와 운영

허브를 내 컴퓨터에서 켜는 법, Supabase 연결, Vercel 배포, 테스트 계정, 계약서 앱 연결을 적은 문서다. 화면 설명은 [guide.md](guide.md).

## 내 컴퓨터에서 실행하기

**준비물:** [Node.js](https://nodejs.org) 20.9 이상(LTS 버전 설치 권장), Git. 터미널에서 `node -v`로 버전을 확인한다.

```bash
git clone https://github.com/iamhiki/stellaize-campaign-hub.git
cd stellaize-campaign-hub
npm install      # 처음 한 번만
npm run dev
```

브라우저에서 **http://localhost:3000** 을 열면 소개 화면이 먼저 뜬다. "시작하기"를 누르거나 상단 메뉴로 이동한다. 끄려면 터미널에서 `Ctrl+C`.

- 최신 내용 받기: `git pull` → `npm install` → `npm run dev`
- `Port 3000 is in use`가 나오면 이미 켜져 있는 것이다. 그대로 http://localhost:3000 을 열거나 `npm run dev -- -p 3001`로 다른 포트를 쓴다.
- **처음 한 번:** `.env.example`을 `.env.local`로 복사하고 `STAFF_JOIN_CODE=`(팀 가입 코드)와 `DEV_JOIN_CODE=`(개발자 코드) 뒤에 코드를 정해 넣는다. 그다음 http://localhost:3000/signup 에서 그 코드로 계정을 만든다. 자세한 내용은 [guide.md](guide.md)의 "계정과 크리에이터 화면".
- Supabase를 연결하지 않으면 등록하고 체크한 내용, 계정, 제출 링크는 `data/hub.json`에 저장된다(git에 올라가지 않는다). 비밀번호는 원문이 아니라 해시로 저장한다. 이 파일을 지우고 다시 켜면 계정이 모두 사라지고 예시 캠페인 3개로 돌아간다.
- 파일에 저장할 때는 같은 서버에 접속한 사람끼리만 데이터를 같이 본다. 각자 자기 PC에서 켜면 데이터도 각자다. Supabase를 연결하면 같은 Supabase 프로젝트를 쓰는 허브끼리 같은 데이터를 본다.

### 휴대폰에서 열기

허브는 설치하는 앱이 아니라 웹사이트다. 휴대폰 브라우저로 주소를 열면 되고, 크리에이터의 내 일정 화면은 휴대폰 폭에 맞춰 나온다. 담당자 화면의 표는 휴대폰에서 옆으로 밀어서 본다.

**배포된 주소(https://stellaize-campaign-hub.vercel.app)는 어디서든 열린다.** 와이파이가 달라도, LTE여도 된다. 아래는 배포본이 아니라 내 PC에서 켠 허브를 휴대폰으로 볼 때의 방법이다.

**지금(허브를 내 PC에서 켠 상태):** 휴대폰이 PC와 **같은 와이파이**에 있어야 한다. 밖에서나 다른 와이파이, LTE에서는 열리지 않는다.

1. PC에서 켜 둔 `npm run dev`를 끄고(`Ctrl+C`) `npm run build` → `npm start`로 다시 켠다. 개발 모드(`npm run dev`)는 다른 기기에서 열면 화면이 제대로 동작하지 않을 수 있다.
2. 윈도우가 방화벽 허용을 물으면 **허용**을 누른다.
3. PC의 주소를 확인한다: 터미널에서 `ipconfig` → **IPv4 주소** (예: `192.168.0.45`).
4. 휴대폰 브라우저에서 `http://그주소:3000`을 연다 (예: `http://192.168.0.45:3000`).

**앱처럼 쓰기(홈 화면에 추가):** 주소를 연 상태에서
- 아이폰(사파리): 아래 **공유** 버튼 → **홈 화면에 추가**
- 안드로이드(크롬): 오른쪽 위 **⋮** → **홈 화면에 추가**

홈 화면에 스텔라이즈 아이콘이 생기고, 누르면 허브가 열린다. 앱스토어·플레이스토어에 올리는 앱은 아니다.

알아둘 점
- PC의 주소는 와이파이를 다시 잡으면 바뀔 수 있다. 안 열리면 3번부터 다시 한다.
- 크리에이터가 자기 휴대폰으로 어디서나 열려면 배포된 주소를 쓴다(아래 "Vercel에 올리기"). 올린 뒤에는 그 주소를 같은 방법으로 홈 화면에 추가한다.
- **계약서 작성** 링크는 휴대폰에서 열리지 않는다. 계약서 앱이 PC 안에서만 돌기 때문이다.
- 실제 휴대폰에서는 아직 열어 보지 않았다. 휴대폰 폭으로 줄인 PC 브라우저에서만 확인했다.

### Vercel에 올리기

크리에이터가 인터넷에서 열 수 있게 하는 설정이다. Supabase 연결이 먼저 돼 있어야 한다(Vercel은 파일을 보관하지 않는다).

1. [vercel.com/new](https://vercel.com/new)에서 GitHub 계정으로 로그인하고 이 저장소(`stellaize-campaign-hub`)를 **Import** 한다.
2. **Environment Variables**에 `.env.local`과 같은 값을 넣는다: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `STAFF_JOIN_CODE`, `DEV_JOIN_CODE`. 메일을 보낼 때는 `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_CC`도. 앱 알림에는 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`(`.env.local`에 들어 있는 값 그대로. 바꾸면 이미 알림을 켠 기기는 다시 켜야 한다). 메일이 설정되면 로그인 화면의 "비밀번호 찾기"가 재설정 링크를 메일로 보낸다. 설정 전에는 개발자가 마이페이지 팀원 계정에서 링크를 만들어 준다.
3. **Deploy**를 누른다. 끝나면 `https://….vercel.app` 주소가 나온다. 그 뒤로는 `main`에 푸시할 때마다 자동으로 다시 올라간다.

- 서버 위치는 `vercel.json`에서 서울(`icn1`)로 정해 두었다. Supabase가 서울에 있어서다.
- 내 컴퓨터의 허브와 Vercel의 허브가 같은 Supabase를 쓰면 **같은 자료**를 본다.
- 주소를 아는 사람은 누구나 로그인 화면까지는 온다. 가입은 가입 코드나 초대 링크가 있어야 한다.

### 앱 알림 (홈 화면 앱, 웹 푸시)

새 메시지가 오면 사이트를 닫아 두어도 휴대폰·PC에 알림이 뜬다. 앱 스토어 앱이 아니라 사이트를 **홈 화면에 추가**하는 웹앱이고, 비용은 없다(푸시 서비스는 구글·애플·모질라가 무료로 운영).

- 켜는 곳: 담당자·개발자는 **마이페이지 → 앱 알림**, 크리에이터는 **내 일정** 맨 아래. 기기마다 따로 켠다.
- 안드로이드·PC(크롬, 엣지): 바로 켜진다.
- 아이폰: iOS 16.4 이상, 사파리 **공유 → 홈 화면에 추가** 한 뒤 홈 화면의 "캠페인 허브"에서 켠다. 사파리 탭에서는 켤 수 없다.
- 크롬 시크릿 창에서는 켜지지 않는다(크롬이 막아 둠).
- 누구에게 가나: 크리에이터 방은 크리에이터와 그 캠페인 담당자들, 팀방은 그 캠페인 담당자들, 1:1은 상대. 보낸 사람에게는 가지 않는다.
- 로그아웃하면 그 기기의 알림이 꺼진다. 계정을 지우면 그 사람 기기도 모두 빠진다.
- 키: `.env.local`과 Vercel에 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. 없으면 앱 알림에 "알림 설정이 아직 서버에 들어가지 않았습니다"가 뜨고 아무것도 보내지 않는다. 새로 만들려면 `npx web-push generate-vapid-keys`.
- 알림 받을 기기 목록은 허브 자료(`hub_state`) 안에 들어 있어서 Supabase에 따로 SQL을 실행할 필요가 없다.

### 임시 테스트 계정

화면을 시험해 볼 계정을 한 번에 만들고, 끝나면 한 번에 지운다. 프로젝트 폴더의 터미널에서 실행한다.

| 명령 | 하는 일 |
|---|---|
| `node scripts/test-accounts.mjs create` | 담당자 1명(`staff@test.local`), 개발자 1명(`dev@test.local`), 크리에이터 2명(`creator1@test.local`, `creator2@test.local`)을 만들고 비밀번호를 보여 준다 |
| `node scripts/test-accounts.mjs list` | 지금 있는 테스트 계정을 보여 준다 |
| `node scripts/test-accounts.mjs delete` | 테스트 계정, 그 로그인, 크리에이터 연결을 지운다 |

- 비밀번호는 만들 때마다 새로 정해지고 그때 한 번만 보인다. 잊었으면 `delete` 후 다시 `create` 한다.
- 크리에이터 계정은 아직 아무도 가입하지 않은 크리에이터 행에 연결된다(캠페인마다 첫 행, 최대 2개).
- 이메일이 `@test.local`로 끝나는 계정만 지운다. 실제 계정은 그대로다. 테스트하면서 체크한 단계와 제출한 링크는 캠페인에 남는다.
- 허브가 쓰는 저장소를 따라간다. Supabase를 연결했으면 Supabase에, 아니면 `data/hub.json`에 만든다.
- 여러 사람이 접속하는 서버에 올린 뒤에는 시험이 끝나면 꼭 `delete` 한다.

### Supabase 연결

자료를 PC의 파일이 아니라 Supabase(인터넷의 DB)에 저장하는 설정이다. 베타 동안은 Supabase 무료 요금제로 충분하다.

1. [supabase.com](https://supabase.com)에서 계정을 만들고 **New project**로 프로젝트를 만든다. 지역은 **Northeast Asia (Seoul)** 을 고른다.
2. 왼쪽 메뉴 **SQL Editor**에 이 저장소의 `supabase/schema.sql` 내용을 붙여 넣고 **Run**을 누른다. 표 하나(`hub_state`)가 생긴다.
3. **Project Settings → API Keys**에서 **Project URL**과 **secret 키**(`sb_secret_…`, 예전 화면이면 `service_role`)를 복사한다.
4. `.env.local`에 두 줄을 넣고 저장한 뒤 허브를 껐다 켠다.

   ```
   SUPABASE_URL=https://프로젝트주소.supabase.co
   SUPABASE_SECRET_KEY=복사한_secret_키
   ```

5. 지금 `data/hub.json`의 자료를 그대로 쓰려면 허브를 켜기 전에 `node scripts/push-to-supabase.mjs`를 한 번 실행한다. 계정, 캠페인, 체크, 제출 링크가 Supabase로 옮겨진다. Supabase에 이미 자료가 있으면 덮어쓰지 않고 멈춘다.
   옮기지 않고 허브를 열면 Supabase는 예시 캠페인 3개가 들어간 새 저장소로 시작하고, `/signup`에서 계정을 다시 만들어야 한다.

알아둘 점
- secret 키는 자료 전체를 읽고 쓸 수 있는 키다. `.env.local`에만 두고 git, 이슈, 카톡에 적지 않는다. 새어 나갔으면 Supabase에서 키를 새로 만든다.
- `data/hub.json`은 옮긴 뒤에도 그대로 남지만 더는 바뀌지 않는다. `.env.local`의 두 줄을 지우면 허브가 다시 이 파일을 쓴다.
- `SUPABASE_URL`은 `https://프로젝트주소.supabase.co`까지만 넣는다. 끝에 `/rest/v1/`를 붙여 넣어도 허브가 알아서 뗀다.
- 프로젝트를 만들 때 **Enable Data API**는 켜 둔다. 허브가 이 API로 저장한다. `schema.sql`이 허브 서버(secret 키)에만 표 권한을 주므로 "Grant API access to new tables automatically"는 꺼도 된다.
- 무료 요금제는 자동 백업이 없고, 1주일 동안 접속이 없으면 프로젝트가 일시정지된다. 정지되면 Supabase 대시보드에서 다시 켠다.
- **할 일 (대회 종료 후 실제 배포 때):** 지금 운영 Supabase는 시드니(Oceania) 지역이다. Supabase는 지역을 바꿀 수 없어서, 서울(Northeast Asia) 지역에 새 프로젝트를 만들고 `schema.sql`, `chat.sql`을 실행한 다음 자료를 옮긴다. 옮길 자료는 hub_state, 서류 파일, 대화 표다. 그다음 Vercel과 `.env.local`의 키 세 개를 바꾼다. 허브 서버(서울)와 가까워 빨라지고, 크리에이터 개인정보도 국내에 보관된다. 대회 기간에는 옮기지 않기로 했다(2026-11-19).
- 지금은 허브 자료 전체를 표의 한 행에 통째로 넣는다(베타용). 캠페인이 수백 개로 늘기 전에 표를 나누는 작업이 필요하다.

### 대화(채팅) 표와 실시간 신호

크리에이터 ↔ 담당자 대화는 허브 자료와 따로 Supabase 표에 저장하고, 새 메시지가 오면 열린 화면에 바로 알린다.

1. Supabase **SQL Editor**에 `supabase/chat.sql` 내용을 붙여 넣고 **Run**을 누른다. 표 두 개(`hub_messages`, `hub_chat_reads`)와 안 읽은 수를 세는 함수가 생긴다.
2. 전에 허브 자료 안에 쌓인 대화가 있으면 `node scripts/move-chat-to-table.mjs`로 한 번 옮긴다.
3. 실시간 신호: **Project Settings → API Keys**의 **publishable 키**(`sb_publishable_…`)를 `.env.local`과 Vercel에 `SUPABASE_PUBLISHABLE_KEY`로 넣는다. 브라우저에 공개되는 키라 괜찮다. 표에는 정책이 없어 이 키로는 아무것도 읽을 수 없고, 신호에는 메시지 내용이 없다.
4. **Realtime → Settings**에서 공개 채널(public channels)이 막혀 있지 않은지 확인한다. 막혀 있으면 신호만 안 갈 뿐 대화는 30초마다 확인해서 계속 된다.

- 1번을 하지 않고 Supabase를 쓰면 대화가 열리지 않는다(표가 없음). Supabase 없이 PC 파일로 쓸 때는 1~4번 모두 필요 없다.
- publishable 키가 없으면 실시간 신호 없이 대화창은 5초, 알림 숫자는 20초마다 확인한다.

### 계약서 앱 연결

**데모 앱 (2026-11-18):** https://stellaize-campaign-app-h4v9is7wrhrcvzbw5q52y3.streamlit.app
- 계약서 앱 v3.1을 Streamlit Community Cloud에 올린 데모판. 저장소: `iamhiki/stellaize-contract-demo` (비공개)
- 배포된 허브는 Vercel의 `NEXT_PUBLIC_CONTRACT_APP_URL`로 이 주소를 연다. 바꾸면 Redeploy 해야 반영된다.
- **견본 서류만 쓴다.** 앱 왼쪽 "견본 서류 (가짜)"에서 사업자등록증·주민등록증·통장사본을 내려받아 올린다. 실제 서류는 올리지 않는다.
- 서버에는 MS Word가 없어 계약서 미리보기는 안 나온다. `.docx` 내려받기는 된다.
- 아래는 원본(각자 PC) 기준 설명이다.

계약서 자동작성 앱(기획자 제작, 공유 드라이브 `계약서 작성 자동화` 폴더)은 정산서류 개인정보를 다뤄서 **각자 PC에서 `실행.bat`으로 켜고 `http://localhost:8501`에서만** 열린다. 캠페인 허브는 앱을 품지 않고 링크로 연다.

- 허브의 **계약서 작성** 링크 = `http://localhost:8501/?from=campaign-hub&campaign=…&advertiser=…&upload=…&creator=…`
- 넘기는 값은 캠페인명·광고주·업로드 날짜·크리에이터명뿐이다. 서류와 개인정보는 허브로 오지 않는다.
- 계약서 앱이 이 값을 칸에 채우려면 `app.py`에 함수 하나를 넣어야 한다: [docs/contract-app/](contract-app/README.md). 넣기 전에도 링크는 빈 앱을 연다.
- 실제 계약서 앱 v3.1에 넣어 허브 링크 → 미리 채우기까지 확인했다(2026-11-09). 팀원 PC에서도 채워지게 하려면 배포본(드라이브 zip)의 `app.py`에 같은 수정이 들어가야 한다.
- 허브 화면 안에 넣지 않고 **새 탭으로 연다.** 서류를 서버로 올리지 않기 위해 계약서 앱을 허브 서버에 합치지도 않는다.
- **연동이 여기까지인 이유:** 계약서 앱은 신분증·통장 사본 같은 서류를 다뤄서 각자 PC 안에서만 돈다. 그래서 허브가 할 수 있는 일은 "값을 들고 그 PC의 앱을 여는 것"까지다. 계약서 앱이 꺼져 있으면 링크가 열리지 않고(이슈 #1), 계약서를 만들었는지는 허브로 돌아오지 않아 담당자가 정산 서류 단계를 직접 체크한다. 금액과 PPL 유형은 허브에 넣는 칸이 없어 넘기지 않는다.
- 앱을 다른 주소로 띄운다면 `.env.local`에 `NEXT_PUBLIC_CONTRACT_APP_URL=http://…`를 넣고 다시 빌드한다.
- 왼쪽 아래 검은 동그라미 "N"은 개발 모드에서만 보이는 Next.js 도구 버튼이다. 실제 배포 화면에는 나오지 않는다.

## 주의 사항

- 대외비 캠페인은 담당자 외 비노출. 화면에서 가리는 게 아니라 허브 서버가 담당자가 아닌 계정에는 그 캠페인과 딸린 자료를 보내지 않는다([guide.md](guide.md)의 "대외비 캠페인").
- 크리에이터 개인정보(신분증, 통장 사본, 주소)는 Storage 접근 제어 필수, 정산 완료 후 보관 기한 정책 필요
- 주민등록번호 등 고유식별정보는 암호화해서 저장하고 화면에는 가려서 표시 (개인정보보호법)
