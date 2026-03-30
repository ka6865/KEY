# THE KEY (더 키) 🗝️
### 내 손안의 프리미엄 방탈출 아카이브 시스템

**THE KEY**는 단순한 기록을 넘어, 당신의 방탈출 경험을 프리미엄하게 관리하고 친구들과 함께 추억을 쌓을 수 있는 전문 로그 플랫폼입니다.

---

## ✨ 주요 기능

### 1. 지능형 테마 기록 (Easy Log)
- 전국의 수많은 방탈출 테마를 직접 입력하여 제한 없이 기록할 수 있습니다.
- 성공 여부, 사용 힌트 수, 평점, 탈출 날짜 등을 상세하게 관리하세요.

### 2. 소셜 공동 편집 (Social Join)
- **에어비앤비 스타일 초대**: 기록마다 고유한 초대 링크를 생성하여 친구에게 공유하세요.
- **실시간 합류**: 친구가 링크를 클릭하기만 하면 해당 기록에 공동 멤버로 추가됩니다.
- **함께 쓰는 일기**: 합류한 친구들도 함께 기록을 보고 수정할 수 있습니다.

### 3. 직관적인 통계 대시보드
- 나의 전체 탈출 횟수와 평균 성공률을 실시간으로 확인하세요.
- 함께한 친구들의 프로필(Facepile UI)을 통해 누가 이 테마에 함께했는지 한눈에 알 수 있습니다.

### 4. PWA (Progressive Web App) 지원
- 별도의 앱스토어 설치 없이, 브라우저에서 **'홈 화면에 추가'**를 누르면 실제 어플리케이션처럼 사용할 수 있습니다.
- 나만의 방탈출 전용 앱 아이콘과 전체 화면 경험을 즐기세요.

---

## 🛠 기술 스택
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database / Auth**: Supabase (PostgreSQL)
- **Styling**: Vanilla CSS (Premium Glassmorphism Design)
- **Deployment**: Vercel

---

## 🚀 시작하기

### 환경 변수 설정
`.env.local` 파일에 다음과 같은 Supabase 정보를 추가해야 합니다.
```env
NEXT_PUBLIC_SUPABASE_URL=당신의_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=당신의_SUPABASE_ANON_KEY
```

### 실행 방법
```bash
npm install
npm run dev
```

---

## 📱 어플로 사용하기 (추천)
모바일 기기에서 이 서비스 주소로 접속한 뒤, 브라우저의 공유 기능을 눌러 **'홈 화면에 추가'**를 선택하세요. 바탕화면에 생선된 전용 아이콘을 통해 앱처럼 사용이 가능합니다.

---

© 2026 THE KEY. ALL RIGHTS RESERVED.
