# Stellaize Campaign Hub

인플루언서 광고 캠페인에서 **"누가, 지금 어느 단계에서, 누구를 기다리는지"** 를 한 화면에 보여 주는 운영 도구.

**🔗 https://stellaize-campaign-hub.vercel.app** (로그인 필요)

![캠페인 상세 화면](docs/screens/board.png)

## 왜 만들었나

캠페인 하나에 크리에이터가 여러 명이고, 그런 캠페인이 동시에 여러 개 돈다.
진행 상황은 구글시트와 메일에 흩어져 있어서, 어디까지 됐는지 매번 물어봐야 했다.

## 무엇을 하나

| 기능 | 내용 |
|---|---|
| **진행 표** | 크리에이터마다 11단계 체크, 단계별 마감, 지금 누구 차례인지. 마감 지나면 빨간 경고, 업로드 끝나면 완료 탭 |
| **오늘 할 일** | 여러 캠페인에서 마감 임박 · 마감 지남 · 컨펌 대기만 모아 보기 |
| **크리에이터 화면** | 초대받은 크리에이터가 자기 일정과 단가를 보고, 링크와 서류를 직접 제출 |
| **마감 알림 메일** | 담당자가 양식을 확인하고 고쳐서 보내기 |
| **대외비 캠페인** | 담당자에게만 보임 |
| **계약서 앱 연동** | 캠페인 정보를 미리 채워서 계약서 앱 열기. [데모 앱](https://stellaize-campaign-app-h4v9is7wrhrcvzbw5q52y3.streamlit.app)은 견본(가짜) 서류로 체험 |

## 어떻게 만들었나

- **Next.js 16 · TypeScript · Tailwind v4 · Supabase · Vercel**
- **권한은 서버에서**: 화면에서 가리지 않고, 서버가 역할에 맞는 자료만 보낸다 (담당자 / 크리에이터 / 개발자)
- **동시에 저장해도 안 덮어쓰기**: 버전 번호를 확인하고 저장한다
- **개인정보**: 서류는 비공개 보관함에 두고 본인과 담당자만 받는다. 파일 형식은 내용으로 확인한다
- **실무자 피드백으로 만들기**: 기획자에게 다섯 번 답을 받아 고쳤다 → [기록](https://github.com/iamhiki/stellaize-campaign-hub/issues/6)

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

처음 한 번 `.env.example`을 `.env.local`로 복사하고 가입 코드를 정한다. → [설치와 운영](docs/setup.md)

## 더 보기

| 문서 | 내용 |
|---|---|
| [화면과 기능](docs/guide.md) | 화면마다 무엇을 하는지 |
| [설치와 운영](docs/setup.md) | Supabase 연결, Vercel 배포, 테스트 계정 |
| [구조](docs/architecture.md) | 폴더 구성, 데이터 모델, 디자인 방향 |
| [로드맵](https://github.com/iamhiki/stellaize-campaign-hub/issues/7) | 다음에 만들 것 |
| [정해야 할 것](https://github.com/iamhiki/stellaize-campaign-hub/issues/8) | 회사 · 기획자 확인이 필요한 것 |

만든 사람: 홍가영, 이세연
