import assert from "node:assert/strict";
import { toBenchmarkJob } from "../scripts/crawl-rpgkr-jobs.mjs";
import { parseJobPage } from "../scripts/rpgkr-job-parser.mjs";

const fixture = `
최근 수정 시각 : 2026-02-07 22:09:07
# RPG.kr/직업/공통 & 기타 계열
## 1. 모험가 계열
### 1.1. 여행자
선행 필수 직업 후행 가능 직업
(캐릭터 생성)  모험가
최소 근력 최소 기민 최소 지능
-  -  -
최대 숙련치 300
여행을 막 떠난, 떠나려 하는 별다른 특징이 없는 직업입니다.
HP PA MA PD MD AR CT CD AV
+5 -  -  -  -  -  -  -  -
AP 구분 이름 숙련 확률 설명
2  특수  밀치기  100  20  상대의 자세를 무너뜨린다. 물리데미지 : 물리공격력*0.8
사용자 공격속도*0.5만큼 딜레이를 준다.
2  항시  인내증강Ⅰ  200  -  HP+2%p
인내증강Ⅱ  1100  HP+4%p
### 1.2. 모험가
선행 필수 직업 후행 가능 직업
여행자 M  숙련자
최소 근력 최소 기민 최소 지능
20  20  20
최대 숙련치 2,000
HP PA MA PD MD AR CT CD AV
+10 -  -  -  -  -  -  -  -
AP 구분 이름 숙련 확률 설명
1  일반  찌르기  1000  35  물리데미지 : 물리공격력*1.0
`;

const result = parseJobPage({
  pageTitle: "RPG.kr/직업/공통 & 기타 계열",
  url: "https://www.namu.moe/w/RPG.kr/%EC%A7%81%EC%97%85/%EA%B3%B5%ED%86%B5%20%26%20%EA%B8%B0%ED%83%80%20%EA%B3%84%EC%97%B4",
  text: fixture
});

assert.equal(result.modifiedAt, "2026-02-07 22:09:07");
assert.equal(result.jobCount, 2);
assert.equal(result.jobs[0].name, "여행자");
assert.equal(result.jobs[0].category, "모험가 계열");
assert.deepEqual(result.jobs[0].prerequisites, ["(캐릭터 생성)"]);
assert.deepEqual(result.jobs[0].nextJobs, ["모험가"]);
assert.deepEqual(result.jobs[0].statRequirements, {});
assert.equal(result.jobs[0].maxMastery, 300);
assert.deepEqual(result.jobs[0].growth, { HP: 5 });
assert.equal(result.jobs[0].abilities[0].name, "밀치기");
assert.equal(result.jobs[0].abilities[0].description.includes("사용자 공격속도"), true);
assert.equal(result.jobs[0].abilities[1].name, "인내증강Ⅰ");
assert.equal(result.jobs[0].abilities[2].type, "성장");
assert.deepEqual(result.jobs[1].statRequirements, { strength: 20, agility: 20, intelligence: 20 });
assert.equal(result.jobs[1].maxMastery, 2000);

const benchmark = toBenchmarkJob(result.jobs[0]);
assert.deepEqual(benchmark.requiredStats, []);
assert.deepEqual(benchmark.growthStats, ["HP"]);
assert.equal("maxMastery" in benchmark, false);
assert.equal("rawText" in benchmark, false);
assert.equal(JSON.stringify(benchmark.abilities).includes("100"), false);
assert.equal(JSON.stringify(benchmark.abilities).includes("20"), false);
assert.equal(benchmark.featureTags.includes("delay"), true);

console.log("rpgkr job parser ok");
