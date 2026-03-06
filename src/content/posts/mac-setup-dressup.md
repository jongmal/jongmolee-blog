---
title: "맥 초기 세팅: 드레스업 패키지로 맥북 꾸미기"
description: "홈브루 명령어 한 줄로 맥북을 꾸미는 드레스업 패키지 총정리. 메뉴 바 정리, 폰트 설치, UI 유틸리티, 배터리 모니터링까지 다뤄요."
date: 2026-03-06
tags: ["macOS", "Homebrew", "유틸리티"]
slug: "mac-setup-dressup"
category: "개인 칼럼"
series: "맥 초기 세팅"
seriesOrder: 2
status: publish
---

맥 초기 세팅 시리즈 두 번째, **맥북 드레스업 패키지 소개** 편이에요.

지난 편에서 홈브루(Homebrew) 설치를 마쳤다면, 이제 그 위에 예쁘고 실용적인 옷을 입혀줄 차례예요. 맥북을 선택하는 이유 중 하나가 깔끔한 UI인데, 쓰다 보면 메뉴 바가 아이콘으로 꽉 차거나, 외부 모니터 설정이 번거로울 때가 있잖아요.

오늘은 **터미널 명령어 한 줄**로 맥북의 감성과 편의성을 동시에 잡는 드레스업 패키지들을 소개할게요.

---

## 1. 🗂️ 깔끔한 메뉴 바의 완성 (노치 대응)

최신 맥북의 노치 때문에 메뉴 바 아이콘이 가려지는 건 진짜 불편한 문제예요. 아래 두 앱이 확실한 해결책이에요.

### Bartender 5

메뉴 바 아이콘을 숨기거나 그룹화해 깔끔하게 관리해 줘요. 배터리 잔량이나 특정 앱 실행 시에만 아이콘이 표시되도록 세밀하게 설정할 수 있어요.

단축키 토글 기능도 있는데 (솔직히 이게 제일 편함), 한 번 쓰면 못 놓게 되더라고요. 유료지만 충분히 값을 해요.

> 🔗 [Bartender 5 공식 사이트](https://www.macbartender.com/Bartender5/) — 30일 무료 체험 가능

![Bartender 스왑 기능](/images/mac-setup-dressup/20260306231402.png)

*메뉴 바 아이콘을 조건별로 표시하거나 숨길 수 있어요.*

![Bartender 메뉴 바 정리](/images/mac-setup-dressup/20260306231410.png)

```bash
brew install --cask bartender
```

### Hidden Bar

Bartender의 가벼운 **무료** 대안이에요. 토글 바를 기준으로 왼쪽 아이콘을 클릭 한 번에 숨겨주는 방식이에요. 세밀한 설정은 없지만, 간단히 정리만 원한다면 이걸로 충분해요.

> 🔗 [App Store에서 Hidden Bar 보기](https://apps.apple.com/kr/app/hidden-bar/id1452453066?mt=12)

![Hidden Bar 스크린샷](/images/mac-setup-dressup/20260306231747.png)

*드래그로 숨길 아이콘을 선택하면 끝. 심플 그 자체.*

```bash
brew install --cask hiddenbar
```

> **💡 팁:** 유료가 부담이면 Hidden Bar로 시작하고, 더 세밀한 제어가 필요해지면 Bartender로 갈아타는 것도 좋아요.

---

## 2. 🔤 폰트도 터미널로? (글꼴 설치 자동화)

디자인의 완성은 서체예요. 폰트 파일을 일일이 내려받아 서체 관리자에 등록할 필요 없이, 홈브루로 바로 설치할 수 있어요 🎉

### Pretendard (프리텐다드)

가독성이 뛰어나 맥 사용자들에게 가장 사랑받는 한국어 서체예요. 한글과 영문 모두 균형 잡힌 자형이라 어디에 써도 자연스러워요.

```bash
brew install --cask font-pretendard
```

설치 후 서체 관리자에서 확인해 볼까요?

![스팟라이트에서 서체 관리자 검색](/images/mac-setup-dressup/20260306232548.png)

*스팟라이트(cmd + 스페이스)에서 "서체 관리자"를 검색하세요.*

![서체관리자에서 설치된 폰트 확인](/images/mac-setup-dressup/20260306232626.png)

*서체 관리자에서 Pretendard를 검색하면 설치된 폰트를 확인할 수 있어요.*

> **⚠️ 주의:** 맥북 시스템 폰트는 순정 상태에서 변경이 불가능해요. 문서 편집기나 에디터 등 폰트를 지원하는 앱에서만 적용 가능해요.

---

## 3. ⚡ 업무 효율을 높여주는 UI 유틸리티

작지만 강력한 도구들이에요. 하나씩 소개할게요.

### Itsycal

메뉴 바에 아주 작은 달력을 띄워줘요. 시계를 클릭하면 미니 달력이 팝업으로 나타나고, 캘린더 앱과 연동돼서 일정도 바로 확인할 수 있어요.

![Itsycal 스크린샷](/images/mac-setup-dressup/20260306232817.png)

*메뉴 바에서 날짜 클릭 한 번으로 일정까지 확인.*

```bash
brew install --cask itsycal
```

### MonitorControl

맥북 키보드의 밝기·음량 키로 **외부 모니터까지 제어**해요. DDC(디스플레이 데이터 채널) 프로토콜을 이용해 모니터 자체 밝기를 조절하는 방식이에요.

외부 모니터를 쓴다면 진짜 필수예요 ✨

![MonitorControl 스크린샷](/images/mac-setup-dressup/20260306232832.png)

*모니터 OSD 버튼 없이 키보드로 밝기·음량 조절이 돼요.*

```bash
brew install --cask monitorcontrol
```

### HazeOver

작업 중인 창 외의 배경을 어둡게 만들어 집중력을 극대화해 줘요. 어둡기 정도를 슬라이더로 조절할 수 있어서 취향껏 설정 가능해요.

![HazeOver 스크린샷](/images/mac-setup-dressup/20260306233013.png)

*비활성 창이 자연스럽게 어두워지면서 현재 작업에 집중할 수 있어요.*

```bash
brew install --cask hazeover
```

> **💡 팁:** 세 개 한꺼번에 설치하고 싶다면:
> ```bash
> brew install --cask itsycal monitorcontrol hazeover
> ```

---

## 4. 🩺 내 맥북의 건강 상태 모니터링

맥북의 하드웨어 상태를 실시간으로 체크하는 도구들이에요.

### coconutBattery

배터리의 효율, 충·방전 사이클, 제조일 등 상세한 건강 정보를 보여줘요. 중고 맥북 살 때 이걸로 배터리 상태 먼저 확인하는 게 국룰이에요 ㅋㅋ

![coconutBattery 스크린샷](/images/mac-setup-dressup/20260306235126.png)
*배터리 설계 용량 대비 현재 최대 충전량, 사이클 수를 한눈에 확인할 수 있어요.*

```bash
brew install --cask coconutbattery
```

> **💡 팁:** coconutBattery에서 배터리 최대 충전 용량을 꼭 확인해 보세요. 설계 용량 대비 **80% 이하**면 교체를 고려할 시점이에요.

### RunCat

메뉴 바에서 달리는 고양이로 CPU 사용량을 보여주는 앱이에요. 오래전부터 많은 맥 유저들의 메뉴 바를 채워온 귀여운 하드웨어 모니터링 도구예요. CPU 부하가 높아질수록 고양이가 빠르게 달려요 🐱

![RunCat 스크린샷](/images/mac-setup-dressup/20260306235237.png)
*CPU 사용량에 따라 달리는 속도가 바뀌어요. 메모리, 디스크 사용량도 확인 가능.*

```bash
brew install --cask runcat
```

---

## 🎯 마무리

오늘 소개한 패키지들을 한 줄로 정리하면:

```bash
brew install --cask bartender hiddenbar font-pretendard itsycal monitorcontrol hazeover coconutbattery runcat
```

이 한 줄이면 메뉴 바 정리, 폰트 설치, UI 유틸리티, 배터리 모니터링까지 전부 끝이에요.

다음 편은 **#3. 개발자를 위한 필수 패키지**예요. 터미널 설정과 에디터, 개발 보조 도구들을 깊이 있게 다뤄볼게요. 기대해 주세요!
