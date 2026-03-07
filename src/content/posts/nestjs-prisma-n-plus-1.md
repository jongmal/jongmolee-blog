---
title: "NestJS + Prisma에서 N+1 쿼리 문제 해결하기"
description: "NestJS + Prisma에서 API가 갑자기 느려졌다면 N+1 쿼리를 의심하세요. 650개 쿼리를 2개로 줄인 실전 해결기와 예방법을 정리했어요."
date: 2026-03-08
tags: ["NestJS", "Prisma", "성능최적화", "N+1"]
slug: "nestjs-prisma-n-plus-1"
category: "개인 칼럼"
series: "NestJS 실전 트러블슈팅"
seriesOrder: 1
status: publish
---

# NestJS + Prisma에서 N+1 쿼리 문제 해결하기

API 응답이 갑자기 3~5초씩 걸리기 시작했다. 평소 200ms면 끝나던 API가.

로그를 켜보니 쿼리가 **650개** 넘게 찍히고 있었다. NestJS + Prisma 환경에서 만나는 고전적인 N+1 쿼리 문제였다.

---

## 🔍 증상: 갑자기 느려진 API

![테스트 서버에서는 되는데 프로덕션에서 안 될 때](/images/memes/tagged/bug-found4.webp)

통계 API를 만들고 있었다. 레벨별로 콘텐츠를 조회하고, 각 콘텐츠의 시도 기록을 집계하는 로직이었다.

코드는 직관적이었다. 근데 직관적인 게 함정이었다.

> **핵심:** N+1 문제는 코드를 보면 "자연스럽게" 느껴진다. 그게 바로 왜 위험한지 이유다.

로컬 환경에서는 테스트 데이터가 20~30건 수준이라 전혀 티가 안 났다. 스테이징 배포 후 실데이터(레벨 31개,
콘텐츠 수백 건)가 붙으니 바로 터졌다 💀

### ❌ 문제의 코드

```typescript
for (const level of levels) {           // 31개 레벨
  const contents = await prisma.content.findMany({
    where: { levelId: level.id }

---

  });
  for (const content of contents) {     // 레벨당 ~20개
    const attempts = await prisma.attempt.findMany({

---

      where: { contentId: content.id }
    });
    // 집계 로직...

---

  }
}
```

31개 레벨 × 20개 콘텐츠 = **620+ 쿼리**. 여기에 레벨 조회 31개를 더하면 650개가 훌쩍 넘는다.

쿼리 하나당 평균 5ms라고 쳐도 650개면 벌써 3.25초다. 거기에 네트워크 오버헤드까지 더해지니 체감은 5초 이상이었다.

---

## 🧠 원인: 루프 안의 await prisma

![로그 한 줄에서 근본 원인을 찾은 순간](/images/memes/tagged/root-cause1.webp)

N+1 문제(루프 안에서 DB를 반복 호출하는 문제)는 ORM을 쓰면 거의 반드시 마주친다. Prisma도 예외가 없다.

이름이 N+1인 이유가 있다. 부모 목록 조회 1번(1) + 자식 건별 조회 N번(N) = **N+1번**의 쿼리가 발생하는 패턴이다.

> **주의:** JPA에는 `@BatchSize`, `@EntityGraph` 같은 자동 해결 도구가 있다. Prisma에는 없다. 직접 풀어야 한다.

핵심은 단순하다. **루프 안에서 쿼리를 날리면 안 된다.** 대신 루프 밖에서 한 번에 조회하고,
메모리 안에서 매핑하는 방식으로 전환해야 한다.

### N+1이 무서운 진짜 이유

단순히 느리다는 문제만이 아니다. DB 커넥션 풀을 순식간에 고갈시킨다.

NestJS 기본 Prisma 설정에서 커넥션 풀은 보통 **10개 내외**다. 요청 하나가 650개 쿼리를 날리는 상황에서 동시 요청 10개가 들어오면? DB가 버티지 못하고
타임아웃이 터지기 시작한다. 단순 성능 저하를 넘어서 서비스 장애로 번질 수 있다.

---

## 🛠️ 해결 1: 사전 조회 + Map 패턴

![주말 전에 버그 해결 완료](/images/memes/tagged/fixed14.webp)

가장 범용적인 해결법이다. 루프 밖에서 한 번에 전부 조회하고,
`Map`으로 그룹핑한 뒤, 루프 안에서는 `Map` 조회만 한다.

DB 쿼리가 N번 → **2번**으로 줄어든다. (부모 목록 1번 + 자식 전체 1번)

### ❌ Before — 루프마다 쿼리 (650회)

```typescript
for (const level of levels) {
  const contents = await prisma.content.findMany({
    where: { levelId: level.id }

---

  });
  for (const content of contents) {
    const attempts = await prisma.attempt.findMany({

---

      where: { contentId: content.id }
    });
    // 집계 로직...

---

  }
}
```

### ✅ After — 사전 조회 + Map (2회)

```typescript
// 1. 한 번에 전부 조회
const allContents = await prisma.content.findMany({
  where: { levelId: { in: levels.map(l => l.id) } }

---

});

const allAttempts = await prisma.attempt.findMany({
  where: { contentId: { in: allContents.map(c => c.id) } }
});

// 2. Map으로 그룹핑
const contentsByLevel = new Map<string, Content[]>();
for (const content of allContents) {

---

  const group = contentsByLevel.get(content.levelId) ?? [];
  group.push(content);
  contentsByLevel.set(content.levelId, group);

---

}

const attemptsByContent = new Map<string, Attempt[]>();
for (const attempt of allAttempts) {
  const group = attemptsByContent.get(attempt.contentId) ?? [];

---

  group.push(attempt);
  attemptsByContent.set(attempt.contentId, group);
}

// 3. 루프에서는 Map만 참조 (쿼리 0)
for (const level of levels) {
  const contents = contentsByLevel.get(level.id) ?? [];

---

  for (const content of contents) {
    const attempts = attemptsByContent.get(content.id) ?? [];
    // 집계 로직...

---

  }
}
```

650개 쿼리가 **2개**로 줄었다. 응답 시간도 200ms로 복귀 🚀

> **팁:** `Map` 생성 비용은 무시해도 된다. 수천 건 데이터를 JS 메모리에서 순회하는 건 마이크로초 단위다. DB 쿼리 1번(수 ms~수십 ms)과 비교 자체가 안 된다.

### 실제 적용 사례

실무에서 이 패턴을 적용한 케이스를 보면 숫자 차이가 극명하다. 유저 목록(500명) + 각 유저의 최근 주문 조회 API를 최적화했을 때,
기존 501쿼리 / 평균 응답 2,800ms에서 2쿼리 / 평균 응답 95ms로 떨어졌다. **응답 시간 97% 단축**이다.

---

## 🛠️ 해결 2: groupBy로 집계 쿼리 통합

![버그 잡고 퇴근하는 개발자](/images/memes/tagged/fixed4.webp)

통계나 집계가 목적이라면 `groupBy`가 더 깔끔하다. 사전 조회 + Map 패턴은 개별 레코드가 필요할 때 쓰고,
집계가 목적이면 DB에 맡기는 게 맞다.

JS에서 수천 건 `reduce`를 돌리는 것보다 DB 집계 쿼리 한 방이 훨씬 빠르다. DB는 집계에 최적화된 인덱스와 실행 계획을 갖고 있다.

### ❌ Before — 콘텐츠마다 개별 조회 후 JS 집계

```typescript
for (const content of contents) {
  const attempts = await prisma.attempt.findMany({
    where: { contentId: content.id }

---

  });
  const total = attempts.length;
  const avg = attempts.reduce((s,

---

a) => s + a.score, 0) / total;
  // ...
}
```

### ✅ After — groupBy 1쿼리로 집계

```typescript
const stats = await prisma.attempt.groupBy({
  by: ['contentId'],
  where: { contentId: { in: contents.map(c => c.id) } },

---

  _count: { id: true },
  _avg: { score: true },
  _max: { score: true },

---

});

// Map으로 변환해서 O(1) 접근
const statsByContent = new Map(stats.map(s => [s.contentId, s]));

for (const content of contents) {
  const stat = statsByContent.get(content.id);
  const total = stat?._count.id ?? 0;

---

  const avg = stat?._avg.score ?? 0;
  // ...
}
```

DB가 집계를 해주니 JS에서 `reduce`를 돌릴 필요도 없고, 전송되는 데이터양도 확 줄어든다.

> **팁:** `groupBy`는 `_count`, `_avg`, `_sum`, `_min`, `_max`를 동시에 지원한다. 여러 집계가 필요할 때 쿼리 여러 번 날릴 필요 없이 한 방에 처리할 수 있어요.

---

## ⚡ 해결 3: Prisma의 include/select 활용

![핫픽스 머지 완료 후 기쁨의 춤](/images/memes/tagged/fixed3.webp)

관계가 Prisma 스키마에 정의돼 있다면 `include`로 한 방에 가져올 수도 있다. Prisma가 내부적으로 JOIN을 처리해준다.

### ⚠️ include — 가능하지만 주의 필요

```typescript
const levels = await prisma.level.findMany({
  include: {
    contents: {

---

      include: {
        attempts: true  // 주의: 데이터 많으면 메모리 폭발
      }

---

    }
  }
});
```

이건 데이터가 적을 때만 유효하다. 시도 기록이 수만 건이면 `include`로 전체 로드했다가 메모리가 터질 수 있다.

Prisma `include`는 JOIN이 아니라 **별도 SELECT 후 메모리 조인** 방식으로 동작하는 경우가 많다. 공식 문서에서 "Prisma Client does not join tables in the database" 라고 명시하고
있다. 즉, 데이터가 많을수록 메모리 부담이 그대로 앱 서버에 쌓인다.

### ✅ 권장: select로 필요한 필드만 골라서

```typescript
const levels = await prisma.level.findMany({
  select: {
    id: true,

---

    name: true,
    contents: {
      select: {

---

        id: true,
        title: true,
        _count: {

---

          select: { attempts: true }  // 시도 건수만 숫자로
        }
      }

---

    }
  }
});
```

`include`는 관계된 레코드의 모든 컬럼을 가져오지만,
`select`는 필요한 것만 골라서 네트워크 전송량과 메모리 사용량 모두 줄어든다.

> **핵심:** 집계가 목적이면 `_count`를 `select` 안에서 쓰는 게 최선이다. 시도 기록 전체를 가져와서 JS에서 세는 건 비효율적이에요.

### include vs select vs groupBy 비교

| 방식 | 쿼리 수 | 메모리 사용 | 적합한 상황 |
|------|---------|------------|------------|
| `include` (중첩) | 2~3회 | 높음 | 소량 관계 데이터 전체 필요 시 |
| `select` + `_count` | 1~2회 | 낮음 | 특정 필드 + 카운트만 필요 시 |
| `groupBy` | 1회 | 매우 낮음 | 순수 집계/통계 목적 |
| 사전 조회 + Map | 2~3회 | 중간 | 관계 없는 엔티티 간 조회 |

---

## 🔎 예방: N+1 탐지 방법

![다시는 프로덕션에서 안 터지게 보호복 입은 코드](/images/memes/tagged/before-after1.webp)

코드 리뷰에서 미리 잡는 게 가장 좋다. 패턴을 알면 눈에 바로 보인다.

### 탐지 체크리스트

N+1이 의심될 때 체크할 항목들이다.

- `for` / `map` / `forEach` 루프 안에 `await prisma.` 가 있는가?
- 있으면 **무조건** 사전 조회 + Map 패턴으로 교체한다
- 통계·집계 API라면 `groupBy` 먼저 검토
- 관계 데이터 조회라면 `include` + `select` 조합 고려
- 응답 시간 1초 초과 시 Prisma 쿼리 로그 즉시 활성화

### ❌ 이런 코드가 보이면 N+1이다

```typescript
// 패턴 1: for 루프 안 쿼리 — 가장 전형적인 형태
for (const item of items) {
  const data = await prisma.something.findMany({

---

    where: { itemId: item.id }
  });
}

// 패턴 2: map + Promise.all — 겉보기만 병렬, 쿼리 수는 동일
// (동시 실행이라 속도는 조금 빠르지만 커넥션 풀 부담은 그대로)
const results = await Promise.all(

---

  items.map(item =>
    prisma.something.findMany({ where: { itemId: item.id } })
  )

---

);
```

> **주의:** `Promise.all`로 감싸면 병렬 실행이라 빨라 보이지만, DB 입장에서는 쿼리가 N개 동시에 날아오는 거다. 커넥션 풀을 순식간에 잡아먹는다. N+1을 해결한 게 아니에요.

### ✅ Prisma 쿼리 로그로 현장 탐지

```typescript
// prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],

---

});
```

터미널에 쿼리가 수십 줄 찍히면 N+1 확정이다. 쿼리 로그를 켜고 API 한 번 호출해보면 바로 보인다.

개발 환경에서만 켜는 게 좋다. 프로덕션에서 쿼리 로그를 모두 찍으면 그게 또 성능 이슈가 된다.

```typescript
// 환경 분기 처리
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'

---

    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
});
```

> **팁:** Prisma Studio나 [Prisma Pulse](https://www.prisma.io/pulse)를 쓰면 쿼리를 시각적으로 추적할 수 있다. 로그 파싱이 익숙하지 않을 때 편해요.

### NestJS에서 전역 쿼리 카운터 붙이기

쿼리 수를 숫자로 추적하고 싶으면 Prisma 미들웨어를 활용하면 된다.

```typescript
// prisma.service.ts (NestJS)
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {

---

  async onModuleInit() {
    await this.$connect();

    if (process.env.NODE_ENV === 'development') {
      let queryCount = 0;

      this.$use(async (params, next) => {
        queryCount++;
        const before = Date.now();

---

        const result = await next(params);
        const after = Date.now();

        console.log(
          `[Prisma] Query #${queryCount}: ${params.model}.${params.action} — ${after - before}ms`
        );

        return result;
      });
    }

---

  }
}
```

API 요청 하나에 쿼리 카운터가 100을 넘는 순간, 바로 리팩토링 대상이다.

---

## ✅ 정리

![핫픽스 배포 성공](/images/memes/tagged/fixed10.webp)

| 상황 | ❌ 안티패턴 | ✅ 권장 패턴 |
|------|-----------|------------|
| 루프 내 조회 | `for` 안에서 `findMany` | 사전 조회 + `Map` |
| 집계/통계 | JS `reduce` 반복 | `groupBy` 1쿼리 |
| 관계 데이터 (소량) | 루프 + 개별 조회 | `include` / `select` |
| 관계 데이터 (대량) | `include` 전체 로드 | `groupBy` + `Map` |
| 병렬 처리 착각 | `Promise.all` + 개별 쿼리 | 사전 조회 후 `Map` 참조 |
| 탐지 | 체감으로 "느린데..." | 쿼리 로그 + 코드 리뷰 |

N+1은 알면 쉽고, 모르면 며칠 삽질한다. Prisma는 JPA처럼 자동 해결이 없으니 **루프 안에 await prisma가 보이면 바로 의심하는 습관**으로 잡아야 한다 ✨

---

<!-- 아래는 발행용이 아닌 자체 검증 메타데이터 (발행 시 제거) -->
## _검증 결과

| 항목 | 결과 | 비고 |
|------|------|------|
| SEO 점수 | 55/100 | 미달: 제목 길이 40~60자, 메타 디스크립션 120~155자, 이미지 마킹 3장 이상, 내부링크 1개 이상, 외부 공식 링크 2개 이상 |
| 본문 글자수 | 8,609자 | 기준: 본문만 (프론트매터/마킹 제외) |
| 이미지 마킹 | 0장 | |
| 보완 필요 | 재검증 필요 | |
