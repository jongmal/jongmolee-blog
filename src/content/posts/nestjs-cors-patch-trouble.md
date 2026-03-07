---
title: "NestJS CORS 삽질 총정리 — PATCH만 안 되는 이유"
description: "PATCH 요청만 CORS에 막힌다면 allowedHeaders와 Vite 프록시를 의심하세요. 프리플라이트부터 해결까지 실전 트러블슈팅 기록. 지금 바로 확인해 보세요."
date: 2026-03-08
tags: ["NestJS", "CORS", "Vite", "트러블슈팅"]
slug: "nestjs-cors-patch-trouble"
category: "개인 칼럼"
series: "NestJS 실전 트러블슈팅"
seriesOrder: 2
status: publish
---

# NestJS CORS 삽질 총정리 — PATCH만 안 되는 이유

GET, POST는 잘 된다. PUT도 된다. 근데 PATCH만 안 된다.

NestJS CORS 설정을 분명히 했는데, 콘솔에는 빨간 글씨가 쏟아진다.

```
Access to fetch at 'http://localhost:3000/api/v1/admin/...'
Method patch is not allowed by Access-Control-Allow-Methods in preflight response.
```

curl로 테스트하면 200 OK. 브라우저에서만 터진다. CORS 지옥에 온 걸 환영한다 🔥

---

## 🔍 증상: PATCH만 CORS 에러

![프로덕션 버그 리포트에 굳어버린 표정](/images/memes/tagged/facepalm9.webp)

관리자 페이지에서 수정 기능을 구현했다. React Admin의 `useUpdate` 훅을 호출하면 PATCH 요청이 나가는 구조였다.

### 재현 패턴

엔드포인트별로 하나씩 확인해봤다.

- `GET /api/v1/admin/items` → ✅ 정상
- `POST /api/v1/admin/items` → ✅ 정상
- `PUT /api/v1/admin/items/1` → ✅ 정상
- `PATCH /api/v1/admin/items/1` → ❌ CORS 에러

세 개는 되는데 PATCH만 막힌다. 뭔가 패턴이 있을 것 같았다.

curl로 직접 쏴봤다.

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/levels/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Level 2"}' -v
```

응답은 `200 OK`. 서버 로직에는 문제가 없다는 뜻이다.

> **핵심:** CORS는 브라우저가 검사하는 메커니즘이다. curl은 CORS를 무시하기 때문에 curl에서 되고 브라우저에서 안 되는 건 CORS 문제의 전형적인 패턴이다.

### 프리플라이트(Preflight)를 먼저 이해해야 한다

CORS에서 핵심은 **OPTIONS 메서드로 날아가는 프리플라이트 요청**이다. 브라우저는 실제 요청을 보내기 전에 "이 메서드랑 헤더 써도 돼요?" 하고
서버에 먼저 물어본다.

서버가 "PATCH 허용"이라고 응답해야 실제 PATCH 요청이 나간다. 이 과정에서 하나라도 어긋나면 브라우저가 요청 자체를 차단한다.

단순 요청(Simple Request)과 프리플라이트가 필요한 요청을 구분하는 기준은 아래와 같다.

- `Content-Type`이 `application/json`이면 → 프리플라이트 필요
- `PATCH`, `PUT`, `DELETE` 메서드 → 프리플라이트 필요
- 커스텀 헤더 포함 → 프리플라이트 필요

PATCH 요청에 `Content-Type: application/json`을 쓰면 두 조건을 동시에 만족하기 때문에
반드시 프리플라이트가 먼저 날아간다.

> **주의:** GET/POST만 테스트해서 "CORS 설정 완료"라고 생각했다면 PATCH에서 터질 가능성이 높다. 메서드마다 동작 방식이 다르다.

---

## 🧠 원인 1: allowedHeaders 누락

![의심의 눈초리로 코드를 노려보는 개발자](/images/memes/tagged/debugging2.webp)

NestJS의 `main.ts`를 열어봤다.

### ❌ Before — methods만 추가했을 때

```typescript
// main.ts
app.enableCors({
  origin: 'http://localhost:3002',

---

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

`methods`에 PATCH를 명시했으니 될 것 같지만 실제로는 안 됐다.

문제는 `allowedHeaders`를 따로 지정하지 않았다는 것이다. 이 경우 NestJS(Express 내부의 `cors` 패키지)는 기본적으로 `Access-Control-Allow-Headers` 응답 헤더를 클라이언트가 보낸 `Access-Control-Request-Headers`를 그대로 반사(reflect)하는 방식으로 동작한다.

이게 왜 문제냐면, 클라이언트 라이브러리나 브라우저 버전에 따라 요청 헤더가 달라질 수 있다. 내 경우엔 React Admin의 dataProvider가 특정 커스텀 헤더를 같이 보내고 있었는데, 서버 설정이 이를 명시적으로 허용하지 않아서 프리플라이트가 거부됐다.

### ✅ After — allowedHeaders 명시

```typescript
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',

---

') ?? ['http://localhost:3002'],
  methods: ['GET',
'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

---

  allowedHeaders: [
    'Content-Type',
    'Authorization',

---

    'Accept',
    'X-Requested-With',
  ],

---

  credentials: true,
});
```

두 가지를 바꿨다.

첫째, `allowedHeaders`를 명시했다. 브라우저가 "이 헤더들 써도 돼요?" 하고
물으면 서버가 명확하게 "OK"를 내려준다.

둘째, `OPTIONS`를 methods에 추가했다. 프리플라이트 자체가 OPTIONS 요청이기 때문에
이걸 빠트리면 프리플라이트 자체가 막힌다. (NestJS가 내부적으로 처리해주기도 하지만, 명시적으로 적어두는 게 안전하다.)

셋째, `origin`을 환경변수로 뺐다. 하드코딩된 origin은 배포 환경에서 반드시 사고를 친다. `CORS_ORIGIN` 환경변수에 콤마로 구분한 도메인 목록을 넣으면 여러 origin을 허용할 수 있다.

> **팁:** `allowedHeaders`에 `*`(와일드카드)를 쓰면 모든 헤더를 허용하지만, `credentials: true`와 함께 쓰면 브라우저가 이를 거부한다. 반드시 명시적으로 나열해야 한다.

BE 설정을 고치고 나서 Network 탭을 다시 열었다. OPTIONS 요청이 200으로 떨어지고 있었다. 근데 아직도 PATCH는 안 됐다 😅

---

## 🧠 원인 2: Vite 프록시가 넘긴 소문자 메서드

![console.log 47번째 추가하는 중](/images/memes/tagged/debugging1.webp)

에러 메시지를 다시 읽어봤다.

```
Method patch is not allowed
```

이번엔 메서드가 `PATCH`(대문자)가 아니라 `patch`(소문자)다.

HTTP 스펙에서 메서드는 대소문자를 구분한다. RFC 7231 기준으로 HTTP 메서드는 대문자여야 한다. 브라우저는 대소문자를 알아서 정규화해주지만,
Vite 6.x 프록시를 통해 나가는 경우 그대로 전달될 수 있다.

### 원인을 추적하는 과정

Network 탭에서 요청 헤더를 열어보니 `Request Method: patch`로 찍혀 있었다. React Admin의 커스텀 dataProvider 코드를 뒤져봤다.

### ❌ Before — 소문자 메서드 그대로 전달

```typescript
// dataProvider.ts
const response = await httpClient(fullUrl, {
  method: method,  // "patch" — 소문자 그대로 사용

---

  body: bodyStr,
  headers: headers,
});
```

React Admin 내부에서 메서드 문자열을 소문자로 관리하고
있었고, 그걸 그대로 fetch에 넘기고 있었다.

### ✅ After — toUpperCase() 변환

```typescript
// dataProvider.ts
const httpMethod = method.toUpperCase();  // "patch" → "PATCH"

const response = await httpClient(fullUrl, {
  method: httpMethod,
  body: bodyStr,

---

  headers: headers as HeadersInit,
});
```

`toUpperCase()` 한 줄로 해결됐다. 황당할 정도로 간단한 수정이었다.

> **주의:** 서드파티 dataProvider를 커스터마이징하면 이런 엣지케이스가 숨어 있는 경우가 많다. 라이브러리 내부 구현을 믿지 말고 Network 탭으로 실제 요청을 직접 확인하는 습관이 중요하다.

---

## 🛠️ 해결: CORS 완벽 설정 체크리스트

![버그 잡고 퇴근하는 개발자](/images/memes/tagged/fixed4.webp)

두 가지 원인을 모두 잡고 나서 최종 설정을 정리했다.

### NestJS main.ts 최종 설정

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    // 환경변수에서 콤마 구분 도메인 파싱
    origin: process.env.CORS_ORIGIN?.split(',

---

') ?? ['http://localhost:3002'],
    methods: ['GET',
'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

---

    allowedHeaders: [
      'Content-Type',
      'Authorization',

---

      'Accept',
      'X-Requested-With',
    ],

---

    // 쿠키/세션 기반 인증을 쓰면 true, JWT Bearer 토큰만 쓰면 false도 무방
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
```

### Vite proxy 설정 (개발 환경)

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {

---

    proxy: {
      '/api': {
        target: 'http://localhost:3000',

---

        changeOrigin: true,
        // 필요시 rewrite
        // rewrite: (path) => path.replace(/^\/api/, '')

---

      },
    },
  },

---

});
```

프록시를 쓰면 브라우저 입장에서는 FE와 BE가 같은 origin처럼 보인다. 개발 환경에서 CORS를 완전히 우회하는 가장 깔끔한 방법이다.

> **팁:** 프록시를 쓰면 개발 환경에선 CORS 에러가 사라지지만, 프로덕션 배포 시에는 Nginx나 API Gateway에서 CORS를 별도로 처리해야 한다. 개발 환경이 해결됐다고 프로덕션도 해결됐다고 착각하지 말 것.

### 환경변수 설정 예시

```bash
# .env.development
CORS_ORIGIN=http://localhost:3002,http://localhost:5173

# .env.production
CORS_ORIGIN=https://admin.example.com,
https://app.example.com
```

콤마로 구분해서 여러 origin을 허용할 수 있다. 스테이징,
프로덕션 origin을 한 줄에 관리하면 편하다.

---

## 🔎 예방: CORS 디버깅 3단계

![새벽 3시 디버깅하다 잠든 개발자](/images/memes/tagged/facepalm1.webp)

CORS 에러가 생겼을 때 무작정 구글링하기 전에 아래 순서대로 확인하면 대부분은 30분 안에 해결된다.

### Step 1 — Network 탭에서 OPTIONS 요청 확인

Chrome DevTools에서 Network 탭을 열고 `XHR` 또는 `Fetch/XHR` 필터를 걸면 된다. PATCH 요청 직전에 OPTIONS 요청이 날아가고 있어야 한다.

- OPTIONS 응답 코드가 `200`이 아니면 → 서버가 프리플라이트를 거부하는 중
- OPTIONS 요청이 아예 없으면 → 프리플라이트가 필요 없는 단순 요청이거나, 요청이 Vite 프록시에서 막히는 중

### Step 2 — 응답 헤더에서 허용 목록 확인

OPTIONS 응답 헤더에서 아래 세 가지를 확인한다.

```
Access-Control-Allow-Origin: http://localhost:3002
Access-Control-Allow-Methods: GET,
HEAD, POST, PUT, PATCH, DELETE, OPTIONS

---

Access-Control-Allow-Headers: Content-Type,
Authorization, Accept
```

실제 요청의 메서드나 헤더가 위 목록에 없으면 브라우저가 차단한다. 소문자 메서드가 섞여 있지는 않은지도 같이 확인한다.

### Step 3 — 대소문자 및 라이브러리 내부 확인

에러 메시지에 `patch`(소문자)가 보이면 클라이언트 코드 문제다. 서드파티 HTTP 클라이언트나 dataProvider 내부에서 소문자 메서드를 넘기지 않는지 확인해야 한다.

> **팁:** `console.log(method)` 하나만 찍어봐도 소문자인지 바로 보인다. 디버깅의 기본은 눈으로 확인하는 것이다.

### ❌ 이런 코드가 보이면 위험

```typescript
// 안티패턴 1: allowedHeaders 없이 methods만 나열
app.enableCors({
  origin: '*',

---

  methods: ['GET', 'POST', 'PATCH'],
  // allowedHeaders 없음 → 프리플라이트에서 헤더 검증 실패 가능
});

// 안티패턴 2: origin을 와일드카드 + credentials 조합
app.enableCors({
  origin: '*',          // credentials: true와 함께 쓰면 브라우저가 거부

---

  credentials: true,    // 이 조합은 실제로 동작하지 않음
});

// 안티패턴 3: 소문자 메서드 그대로 fetch에 전달
fetch(url, { method: 'patch' });  // 일부 환경에서 문제 발생
```

### ✅ 안전한 패턴

```typescript
// NestJS: 명시적 설정 + 환경변수
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(','),

---

  methods: ['GET',
'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type',

---

'Authorization', 'Accept'],
  credentials: true,
});

// 클라이언트: 메서드는 반드시 대문자
fetch(url, { method: method.toUpperCase() });
```

---

## ✅ 정리

![리팩토링 완료 후 깔끔해진 코드](/images/memes/tagged/fixed12.webp)

| 증상 | 원인 | 해결 |
|------|------|------|
| PATCH만 CORS 에러 (Content-Type 관련) | `allowedHeaders` 누락 | 허용할 헤더 명시적으로 나열 |
| 에러 메시지에 소문자 `patch` 표시 | 서드파티 dataProvider가 소문자 메서드 전달 | `toUpperCase()` 변환 추가 |
| OPTIONS 요청이 403/405 | `OPTIONS` 메서드가 허용 목록에 없음 | methods 배열에 `OPTIONS` 추가 |
| 개발 환경 CORS 지옥 반복 | FE↔BE 포트가 달라서 cross-origin 발생 | Vite proxy 설정으로 우회 |
| `origin: '*'` + `credentials: true` 조합 | 스펙 위반 — 브라우저가 거부 | origin을 명시적 도메인으로 변경 |

CORS는 이해하면 단순한데,
모르면 반나절 날린다. "curl은 되는데 브라우저에서 안 된다" → 이 문장이 보이면 100% CORS다 😤

---
