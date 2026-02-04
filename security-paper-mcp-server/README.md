# Security Paper Search MCP Server

보안 학회 논문을 검색하는 MCP (Model Context Protocol) 서버입니다.

## 지원 컨퍼런스

### Top-Tier (4대 학회)
- **S&P** (IEEE Symposium on Security and Privacy)
- **USENIX Security** (USENIX Security Symposium)
- **CCS** (ACM Conference on Computer and Communications Security)
- **NDSS** (Network and Distributed System Security Symposium)

### Second-Tier
- **ACSAC** (Annual Computer Security Applications Conference)
- **RAID** (Research in Attacks, Intrusions and Defenses)
- **ESORICS** (European Symposium on Research in Computer Security)

## 설치

```bash
npm install
npm run build
```

## Claude Code에서 사용하기

`~/.claude/claude_desktop_config.json` 또는 `settings.json`에 추가:

```json
{
  "mcpServers": {
    "security-papers": {
      "command": "node",
      "args": ["<절대경로>/security-paper-mcp-server/dist/index.js"]
    }
  }
}
```

## 제공 도구 (Tools)

### 1. search_papers
논문 검색 (키워드, 저자, 연도, 컨퍼런스 필터)

```
search_papers(
  keyword: "fuzzing",        // 검색 키워드
  author: "John Smith",      // 저자명
  yearFrom: 2022,            // 시작 연도
  yearTo: 2024,              // 종료 연도
  conferences: ["sp", "ccs"], // 특정 컨퍼런스
  tier: "top",               // top, second, all
  limit: 50                  // 최대 결과 수
)
```

### 2. get_conference_papers
특정 컨퍼런스의 특정 연도 논문 조회

```
get_conference_papers(
  conference: "sp",  // sp, usenix, ccs, ndss, acsac, raid, esorics
  year: 2024
)
```

### 3. list_conferences
지원되는 컨퍼런스 목록 확인

```
list_conferences()
```

### 4. get_stats
검색 결과 통계 (연도별, 컨퍼런스별)

```
get_stats(
  keyword: "malware",
  tier: "top"
)
```

## 사용 예시

Claude에게 다음과 같이 요청하면 됩니다:

- "2024년 S&P 논문 중 fuzzing 관련 논문 찾아줘"
- "CCS와 NDSS에서 발표된 malware 분석 논문 검색해줘"
- "2022년부터 2024년까지 top-tier 학회의 LLM 보안 관련 논문 찾아줘"
- "USENIX Security 2023 논문 목록 보여줘"

## 데이터 소스

이 서버는 [DBLP](https://dblp.org) API를 사용하여 논문 정보를 검색합니다.

## 개발

```bash
# 개발 모드 실행
npm run dev

# 빌드
npm run build

# 실행
npm start
```

## 라이선스

MIT
