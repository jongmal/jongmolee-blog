---
title: "Oracle ARM + Docker로 WordPress 4사이트 운영하기"
description: "Oracle Cloud Free Tier ARM 인스턴스에 Docker로 WordPress 멀티사이트를 올리면서 만난 문제들과 해결 과정. 무료 서버로 블로그 4개 운영하는 실전 인프라 구축기."
date: 2026-03-08
tags: ["Oracle Cloud", "Docker", "WordPress", "ARM", "인프라"]
slug: "oracle-arm-docker-wordpress"
category: "개인 칼럼"
series: "1인 인프라 구축기"
seriesOrder: 1
status: publish
---

# Oracle ARM + Docker로 WordPress 4사이트 운영하기

블로그를 운영하려면 서버가 필요하다. AWS? 월 $20. Vultr? 월 $6. 그런데 Oracle Cloud Free Tier를 쓰면 **ARM 4코어, 24GB RAM, 200GB 디스크를 무료로** 쓸 수 있다.

"무료라니 뭔가 함정이 있겠지" 싶었는데, 진짜 함정이 있었다. 인스턴스 생성부터 WordPress 배포까지 삽질의 연속이었다 🔥

---

## 🔍 증상: ARM이라 안 되는 것들

![프로덕션에서 500 에러가 나고 있습니다](/images/memes/tagged/bug-found1.webp)

Oracle Cloud Free Tier ARM 인스턴스를 생성하고 Docker를 올렸다. `docker compose up -d`를 실행하니 일부 이미지가 pull이 안 된다.

```
no matching manifest for linux/arm64/v8 in the manifest list entries
```

x86 전용 이미지를 ARM에서 당연히 못 돌린다. 공식 이미지 중에서도 ARM을 지원하지 않는 것들이 있었다.

또 다른 문제. Oracle Cloud의 Free Tier ARM 인스턴스는 인기가 많아서 **생성 자체가 안 된다**. "Out of capacity" 에러가 반복적으로 뜬다. 춘천 리전(ap-chuncheon-1)에서 VM.Standard.A1.Flex를 만들려면 타이밍 싸움이 필요했다.

### 인스턴스 스펙

Free Tier로 받은 사양이 이 정도다.

| 항목 | 값 |
|------|---|
| Shape | VM.Standard.A1.Flex |
| CPU | 4 OCPU (ARM) |
| RAM | 24GB |
| Disk | 200GB Boot Volume |
| OS | Ubuntu 24.04 (aarch64) |
| 리전 | ap-chuncheon-1 (춘천) |

솔직히 이 스펙이면 블로그 4개는 커녕 10개도 돌릴 수 있다. 문제는 **이걸 무사히 세팅하는 과정**에 있다.

---

## 🧠 원인: 멀티사이트 Docker 구성의 함정들

![버그 잡고 의기양양한 개발자](/images/memes/tagged/debugging4.webp)

### 함정 1 — "Out of capacity" 인스턴스 생성 실패

PAYG(Pay As You Go)로 전환하면 Free Tier 한도 안에서는 과금이 안 되면서 ARM 인스턴스 가용성이 확보된다. PAYG 전환 후 바로 생성에 성공했다.

단, Budget Alert를 반드시 걸어야 한다. 월 $1 기준 3단계 알림(10%/80%/100%)으로 설정해두면 실수로 유료 리소스를 만들어도 즉시 알 수 있다.

### 함정 2 — ARM에서 Docker 이미지 호환성

WordPress, MariaDB, Redis, Nginx 공식 이미지는 모두 ARM을 지원한다. 하지만 커스텀 이미지를 빌드할 때 base 이미지가 ARM을 지원하는지 반드시 확인해야 한다.

```dockerfile
# Dockerfile.wordpress
FROM wordpress:6-php8.3-fpm

RUN curl -o /usr/local/bin/wp \
    https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp
```

WP-CLI만 추가한 심플한 Dockerfile이다. `wordpress:6-php8.3-fpm`이 멀티아키텍처 이미지라 ARM에서도 문제없이 빌드된다.

### 함정 3 — Nginx ↔ PHP-FPM 경로 불일치

이게 가장 은밀한 함정이었다. 멀티사이트 구성에서 Nginx의 `root`와 FPM 컨테이너 내부 경로가 다르다.

```
Nginx (jongmolife.com) → root /var/www/html-life
FPM 컨테이너 내부      → /var/www/html (고정)
```

Nginx에서 `$document_root`를 `SCRIPT_FILENAME`에 넘기면 FPM이 `/var/www/html-life/index.php`를 찾지만, 실제 파일은 `/var/www/html/index.php`에 있다. 결과는 빈 화면.

```nginx
# ❌ 이렇게 하면 두 번째 사이트가 안 된다
fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;

# ✅ FPM 컨테이너 기준 경로를 별도로 지정
set $fpm_root /var/www/html;
fastcgi_param SCRIPT_FILENAME $fpm_root$fastcgi_script_name;
```

한 줄 차이로 사이트 전체가 동작하거나 안 하거나다.

### 함정 4 — Redis DB 번호 분리

Redis 인스턴스 하나로 여러 WordPress를 서빙하면 캐시 키가 충돌한다. DB 번호로 분리해야 한다.

```php
// jongmolee.com — Redis DB 0 (기본값)
define('WP_REDIS_HOST', 'redis');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_PASSWORD', '${REDIS_PASSWORD}');

// jongmolife.com — Redis DB 1로 분리
define('WP_REDIS_HOST', 'redis');
define('WP_REDIS_PORT', 6379);
define('WP_REDIS_PASSWORD', '${REDIS_PASSWORD}');
define('WP_REDIS_DATABASE', 1);
```

이걸 빠트리면 A 사이트 캐시를 B 사이트가 읽어서 이상한 페이지가 뜬다. 은근히 발견이 늦어지는 버그다.

---

## 🛠️ 해결: Docker Compose 멀티사이트 아키텍처

![주말 전에 버그 해결 완료](/images/memes/tagged/fixed14.webp)

최종 구성은 이렇다.

```
                    ┌──────────────┐
   Cloudflare ──→   │    Nginx     │ :80/:443
  (2+ 도메인)       │   (alpine)   │
                    └───┬──────┬───┘
                        │      │
              ┌─────────▼┐  ┌─▼──────────┐
              │ wordpress │  │ wordpress  │
              │ (lee.com) │  │   -life    │
              │ FPM:9000  │  │ FPM:9000   │
              └──┬────┬───┘  └──┬────┬────┘
                 │    │         │    │
              ┌──▼────▼─────────▼────▼──┐
              │       MariaDB (11)      │
              │  DB: wordpress          │
              │  DB: wordpress_life     │
              ├─────────────────────────┤
              │     Redis (7-alpine)    │
              │  DB 0: lee  DB 1: life  │
              └─────────────────────────┘
```

### docker-compose.yml 핵심 구조

```yaml
services:
  # MariaDB — 양 사이트 공유
  db:
    image: mariadb:11
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Redis — 오브젝트 캐시 (DB 번호로 사이트 분리)
  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}

  # WordPress (jongmolee.com)
  wordpress:
    build:
      context: .
      dockerfile: Dockerfile.wordpress
    depends_on:
      db:
        condition: service_healthy
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
    volumes:
      - wordpress-data:/var/www/html
      - ./wp-content:/var/www/html/wp-content

  # WordPress (jongmolife.com) — DB와 Redis DB 번호만 다름
  wordpress-life:
    build:
      context: .
      dockerfile: Dockerfile.wordpress
    depends_on:
      db:
        condition: service_healthy
    environment:
      WORDPRESS_DB_HOST: db:3306
      WORDPRESS_DB_NAME: wordpress_life
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
    volumes:
      - wordpress-life-data:/var/www/html
      - ./wp-content-life:/var/www/html/wp-content

  # Nginx — SSL 종단 + 리버스 프록시
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs:ro
```

사이트를 추가하려면 `wordpress-*` 서비스를 복제하고, Nginx 설정에 서버 블록을 하나 더 추가하면 된다. 5분이면 사이트 하나가 더 생긴다.

### 비밀번호 관리 — 셸 특수문자의 저주

`.env`에 `openssl rand -base64 32`로 생성한 비밀번호를 넣었다가 사고가 났다. base64에는 `=`, `+`, `/` 같은 문자가 포함되는데, Docker Compose가 이걸 셸 변수로 확장할 때 잘린다.

```bash
# ❌ base64 — 특수문자 포함 가능
openssl rand -base64 32
# aB3+cD4/eF5=gH6... → Docker Compose에서 = 이후가 잘릴 수 있음

# ✅ hex — 알파벳 + 숫자만
openssl rand -hex 32
# 4a8f2c... → 특수문자 없음, 안전
```

교훈: `.env` 파일의 비밀번호는 **hex로만 생성**한다. 셸, Docker, PHP 어디서든 파싱 문제가 없다.

---

## 🔎 예방: 인프라 체크리스트

![다시는 프로덕션에서 안 터지게 보호복 입은 코드](/images/memes/tagged/before-after1.webp)

Free Tier ARM으로 WordPress를 올릴 때 이 체크리스트를 따라가면 삽질을 대폭 줄일 수 있다.

### 서버 초기 세팅

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 스왑 설정 (메모리가 넉넉해도 OOM 방지용)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 방화벽 (Oracle Cloud iptables)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 7 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# SSH 보안 강화
sudo sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### WordPress 초기 설정 자동화

```bash
# WP-CLI로 설치 마법사를 CLI에서 완료
docker compose exec -T wordpress wp core install \
  --url="https://jongmolee.com" \
  --title="블로그 제목" \
  --admin_user="$(openssl rand -hex 8)" \
  --admin_password="$(openssl rand -hex 16)" \
  --admin_email="me@example.com" \
  --allow-root

# 퍼머링크 설정
docker compose exec -T wordpress wp rewrite structure '/%postname%/' --allow-root

# 불필요한 기본 콘텐츠 삭제
docker compose exec -T wordpress wp post delete 1 2 3 --force --allow-root
```

> **중요:** `admin_password`를 생성한 직후 macOS Keychain이든 비밀번호 관리자든 **즉시 저장**해야 한다. "나중에 하지" 하면 비밀번호를 아는 사람이 아무도 없는 사태가 벌어진다. 실제로 겪었다 😇

### 모니터링 3종 세트

```bash
# 1. 헬스체크 크론 (5분 간격, 실패 시 Telegram 알림)
*/5 * * * * curl -sf https://jongmolee.com/wp-json/ > /dev/null || \
  curl -s "https://api.telegram.org/bot$TOKEN/sendMessage" \
  -d "chat_id=$CHAT_ID&text=⚠️ jongmolee.com DOWN"

# 2. 자동 백업 (매일 03:00 KST)
0 18 * * * cd ~/wordpress && ./scripts/backup.sh  # UTC 18 = KST 03

# 3. Watchtower (이미지 업데이트 모니터링, 자동 업데이트는 안 함)
docker run -d --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower --monitor-only --schedule "0 0 4 * * *"
```

---

## ✅ 정리

![버그 잡고 퇴근하는 개발자](/images/memes/tagged/fixed4.webp)

| 증상 | 원인 | 해결 |
|------|------|------|
| ARM에서 Docker 이미지 pull 실패 | x86 전용 이미지 | 멀티아키텍처 공식 이미지 사용 |
| "Out of capacity" 인스턴스 생성 불가 | Free Tier ARM 가용성 부족 | PAYG 전환 + Budget Alert 설정 |
| 두 번째 사이트 빈 화면 | Nginx root와 FPM 내부 경로 불일치 | `$fpm_root` 변수로 FPM 경로 지정 |
| 사이트 간 캐시 오염 | Redis DB 번호 미분리 | `WP_REDIS_DATABASE` 사이트별 설정 |
| `.env` 비밀번호 잘림 | base64 특수문자 셸 파싱 실패 | `openssl rand -hex` 사용 |
| WP 어드민 로그인 불가 | 비밀번호 미보관 | 생성 즉시 Keychain 저장 필수 |

Oracle Cloud Free Tier ARM은 진짜 무료이면서 스펙도 넉넉하다. 다만 "무료"의 대가는 삽질 시간이다. Docker 기반으로 구성하면 사이트 추가가 5분이고, 서버를 날려도 `docker compose up -d` 한 방이면 복구된다.

월 서버비 0원으로 블로그 4개를 돌리고 있다. 최고의 가성비 인프라다 💪

---
