---
title: "맥 세팅 자동화: 홈브루 설치 및 기초 가이드"
description: "터미널 명령어 한 줄로 맥북 앱 설치를 자동화하는 홈브루(Homebrew) 설치법과 기본 사용법"
date: 2026-03-06
tags: ["macOS", "Homebrew", "자동화"]
slug: "mac-setup-homebrew"
category: "개인 칼럼"
series: "맥 세팅 자동화"
seriesOrder: 1
status: publish
---

## 홈브루(Homebrew)란?

쉽게 말해 홈브루는 **"터미널판 앱스토어"**라고 생각하시면 됩니다.

원래 맥에서 프로그램을 깔려면 브라우저를 열고, 홈페이지를 찾아 들어가서, 설치 파일을 다운로드하고, 드래그 앤 드롭으로 설치하는 과정을 거쳐야 하죠. 하지만 홈브루가 있다면 터미널에 명령어 한 줄만 입력하는 것으로 이 모든 과정이 끝납니다.

## 홈브루 설치

맥의 **터미널(Terminal)** 앱을 실행한 후, 아래 명령어를 붙여넣고 엔터:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

> 설치 중 비밀번호를 물어보면 맥 로그인 비밀번호를 입력하세요. 글자가 화면에 보이지 않아도 입력되고 있는 것이니 당황하지 마세요!

### 환경 변수 등록

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

`brew -v` 입력했을 때 버전이 나오면 성공!

## 간단 사용법

Rectangle(창 분할 도구) 설치로 테스트:

```bash
brew install --cask rectangle
```

마우스 클릭 한 번 없이 설치 완료.

## 자동 업데이트 설정

```bash
brew install pinentry-mac terminal-notifier
brew autoupdate start --upgrade --immediate --cleanup --sudo
```

컴퓨터를 켤 때, 24시간마다 자동으로 업데이트와 최적화가 진행됩니다.

---

다음 편에서는 **맥북 드레스업 패키지**들을 소개합니다.
