# jongmolee.com Astro 전환 플랜

## 개요
jongmolee.com을 WordPress → Astro 정적 블로그로 전환.
개인 칼럼 전용 사이트. Obsidian에서 작성, Astro로 빌드, Cloudflare Pages로 배포.

## 기술 스택
- **프레임워크**: Astro v5 + TypeScript strict
- **스타일**: Tailwind CSS v4
- **콘텐츠**: Content Collections (Markdown/MDX)
- **SEO**: @astrojs/sitemap, 자체 메타태그, Schema.org
- **배포**: Cloudflare Pages (GitHub 연동, 자동 빌드)
- **댓글**: Giscus (GitHub Discussions) 또는 utterances
- **분석**: Google Analytics 4 + Search Console (기존 유지)
- **영감**: https://blog.te6.in (Astro, 소스: github.com/te6-in/blog)

## 디렉토리 구조
```
jongmolee-blog/
├── src/
│   ├── content/
│   │   └── posts/          # 마크다운 글 (Obsidian vault에서 복사 또는 심링크)
│   ├── layouts/
│   │   ├── BaseLayout.astro    # HTML 셸, 메타태그, GA4
│   │   └── PostLayout.astro    # 포스트 전용 (TOC, 시리즈 네비, 공유)
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PostCard.astro      # 목록용 카드
│   │   ├── SeriesNav.astro     # 시리즈 네비게이션
│   │   ├── TOC.astro           # 목차 (te6 스타일)
│   │   ├── TagList.astro
│   │   └── SEOHead.astro       # OG, Twitter, Schema.org
│   ├── pages/
│   │   ├── index.astro         # 메인 (최신 글 목록)
│   │   ├── posts/[...slug].astro  # 개별 포스트
│   │   ├── tags/[tag].astro    # 태그별 목록
│   │   ├── series/[name].astro # 시리즈별 목록
│   │   └── rss.xml.ts          # RSS 피드
│   └── styles/
│       └── global.css          # Tailwind import + 커스텀
├── public/
│   ├── images/                 # 포스트 이미지
│   ├── favicon.ico
│   └── robots.txt
├── astro.config.mjs
├── content.config.ts           # Content Collection 스키마
└── docs/
    └── PLAN.md                 # 이 파일
```

## Content Collection 스키마 (구현 완료)
```typescript
z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  slug: z.string().optional(),
  category: z.string().default('개인 칼럼'),
  series: z.string().optional(),        // 시리즈명
  seriesOrder: z.number().optional(),   // 시리즈 내 순서
  status: z.enum(['draft', 'publish']).default('draft'),
  image: z.string().optional(),         // 대표 이미지
  imageAlt: z.string().optional(),
})
```

## 시리즈 기능
- frontmatter의 `series` + `seriesOrder`로 자동 그룹핑
- `SeriesNav.astro`: 이전/다음 편 네비게이션 + 전체 목차
- `/series/[name]` 페이지: 시리즈 전체 목록
- 예: `series: "맥 세팅 자동화"`, `seriesOrder: 1`

## 구현 체크리스트

### Phase 1: 기본 골격 (MVP)
- [x] Astro 프로젝트 초기화 (Tailwind, Sitemap, MDX)
- [x] Content Collection 스키마 정의
- [ ] BaseLayout.astro (HTML, 메타태그, 다크모드)
- [ ] PostLayout.astro (포스트 렌더링)
- [ ] index.astro (글 목록)
- [ ] posts/[...slug].astro (개별 포스트)
- [ ] 기본 스타일 (Tailwind typography)
- [ ] 테스트 포스트 1개 작성 → dev 확인

### Phase 2: SEO & 배포
- [ ] SEOHead.astro (OG, Twitter Card, Schema.org Article)
- [ ] robots.txt, sitemap 확인
- [ ] RSS 피드 (rss.xml.ts)
- [ ] GA4 스크립트 삽입
- [ ] Cloudflare Pages 연결 (GitHub repo → 자동 배포)
- [ ] jongmolee.com DNS 전환 (WP → Cloudflare Pages)
- [ ] 기존 WP 포스트 없으므로 리다이렉트 불필요

### Phase 3: UI 고도화
- [ ] TOC 컴포넌트 (스크롤 추적, te6 스타일)
- [ ] 시리즈 네비게이션 컴포넌트
- [ ] 태그 페이지 (/tags/[tag])
- [ ] 시리즈 페이지 (/series/[name])
- [ ] 다크모드 토글
- [ ] 코드 블록 복사 버튼
- [ ] 공유 버튼
- [ ] 반응형 사이드바 (데스크탑에서 TOC 고정)

### Phase 4: 파이프라인 연동
- [ ] blog-pipeline에 `publish/astro.ts` 추가
- [ ] config.ts에 lee engine:'astro' 설정
- [ ] Obsidian vault → src/content/posts/ 심링크 또는 복사 스크립트
- [ ] `bp scan` 구현 (status:publish 감지 → git commit+push)
- [ ] Giscus 댓글 연동

### Phase 5: 마무리
- [ ] Oracle 서버에서 wordpress 컨테이너 제거 (lee용)
- [ ] Cloudflare DNS A레코드 → Pages 전환
- [ ] 성능 테스트 (Lighthouse 90+ 목표)
- [ ] MEMORY.md, infra docs 업데이트

## Obsidian ↔ Astro 연동 방안

### 옵션 A: 심링크 (추천)
```bash
# Obsidian vault의 drafts/ 중 status:publish만 Astro가 읽도록
ln -s ~/Documents/obsidian/jongmolee-vault/drafts src/content/posts
```
- Obsidian에서 작성 → 저장 즉시 Astro dev에 반영
- `status: draft`는 빌드 시 필터링

### 옵션 B: bp scan (자동화)
- 크론으로 vault 스캔 → `status: publish` 파일을 Astro repo에 복사 → git push
- 파이프라인 기존 구조 활용

## 참고 자료
- te6 블로그 소스: https://github.com/te6-in/blog
- Astro Content Collections: https://docs.astro.build/en/guides/content-collections/
- Cloudflare Pages + Astro: https://docs.astro.build/en/guides/deploy/cloudflare/

## 주의사항
- jongmolife.com, jongmoit.com은 WP 유지 (자동 파이프라인)
- jongmolee.com만 Astro 전환
- WP 컨테이너 제거는 Astro 배포 안정화 후 (Phase 5)
- Cloudflare Pages는 무료 (월 500회 빌드, 충분)
