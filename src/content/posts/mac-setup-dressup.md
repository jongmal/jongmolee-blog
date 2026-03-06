---
title: "맥 세팅 자동화: 드레스업 패키지 추천"
description: "메뉴 바 정리부터 폰트 설치까지, 맥북을 예쁘고 편리하게 꾸미는 도구들"
date: 2026-03-06
tags: ["macOS", "유틸리티", "자동화"]
slug: "mac-setup-dressup"
category: "개인 칼럼"
series: "맥 세팅 자동화"
seriesOrder: 2
status: publish
---

## 메뉴 바 정리

최신 맥북의 노치 디자인 때문에 메뉴 바 아이콘이 가려지죠?

- **Bartender 5**: 메뉴 바 아이콘을 숨기거나 그룹화
- **Hidden Bar**: 가벼운 무료 대안

```bash
brew install --cask bartender
```

## 폰트 설치 자동화

```bash
brew install --cask font-pretendard
```

일일이 폰트 파일을 내려받을 필요 없습니다.

## UI 유틸리티

- **Itsycal**: 메뉴 바 미니 달력
- **MonitorControl**: 외부 모니터 밝기/음량 제어
- **HazeOver**: 비활성 창 어둡게 → 집중력 UP

```bash
brew install --cask itsycal monitorcontrol hazeover
```

## 맥북 건강 체크

- **Macs Fan Control**: 온도 확인, 팬 속도 조절
- **coconutBattery**: 배터리 상세 상태

```bash
brew install --cask macs-fan-control coconutbattery
```

---

다음 편에서는 **개발자를 위한 필수 패키지**를 다룹니다.
