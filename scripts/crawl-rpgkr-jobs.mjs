import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseJobPage } from "./rpgkr-job-parser.mjs";

const DEFAULT_BASE_URL = "https://www.namu.moe";
const DEFAULT_OUTPUT = "js/data/rpgkr-wiki-jobs.json";
const DEFAULT_DELAY_MS = 1200;
const USER_AGENT = "JOBMASTERRPG crawler (+local data import; contact project maintainer)";

const DEFAULT_PAGES = [
  "RPG.kr/직업/공통 & 기타 계열",
  "RPG.kr/직업/PA 계열",
  "RPG.kr/직업/AGI 계열",
  "RPG.kr/직업/MA 계열",
  "RPG.kr/직업/TS 계열",
  "RPG.kr/직업/미구현"
];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
  const outputPath = resolve(options.out ?? DEFAULT_OUTPUT);
  const pages = options.pages?.length ? options.pages : DEFAULT_PAGES;
  const delayMs = Number(options.delay ?? DEFAULT_DELAY_MS);

  if (!options.ignoreRobots) {
    await assertRobotsAllowed(baseUrl, pages);
  }

  const pageResults = [];
  for (const [index, pageTitle] of pages.entries()) {
    if (index > 0 && delayMs > 0) {
      await sleep(delayMs);
    }
    const url = buildWikiUrl(baseUrl, pageTitle);
    const html = await fetchText(url, options.cacheDir);
    pageResults.push(parseJobPage({ pageTitle, url, html }));
  }

  const jobs = pageResults.flatMap((page) => page.jobs).map(toBenchmarkJob);
  const payload = {
    crawledAt: new Date().toISOString(),
    profile: "benchmark-features",
    source: {
      baseUrl,
      pages: pageResults.map(({ pageTitle, url, modifiedAt, jobCount }) => ({ pageTitle, url, modifiedAt, jobCount })),
      license: "원문은 나무위키/나무모에 미러의 CC BY-NC-SA 2.0 KR 고지를 따릅니다. 재배포 전 라이선스와 출처 표기를 확인하세요.",
      note: "이 파일은 벤치마킹용 특징 DB입니다. 원문 수치(AP, 숙련치, 확률, 요구 스탯, 계수)는 저장하지 않습니다."
    },
    jobs
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Saved ${jobs.length} jobs from ${pageResults.length} pages to ${outputPath}`);
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") {
      options.out = args[++index];
    } else if (arg === "--base-url") {
      options.baseUrl = args[++index];
    } else if (arg === "--delay") {
      options.delay = args[++index];
    } else if (arg === "--cache-dir") {
      options.cacheDir = args[++index];
    } else if (arg === "--page") {
      options.pages = [...(options.pages ?? []), args[++index]];
    } else if (arg === "--ignore-robots") {
      options.ignoreRobots = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

export function toBenchmarkJob(job) {
  const requiredStats = Object.keys(job.statRequirements ?? {});
  const growthStats = Object.keys(job.growth ?? {});
  const abilities = (job.abilities ?? []).map((ability) => ({
    type: ability.type,
    name: stripProgressionSuffix(ability.name),
    tags: inferAbilityTags(`${ability.name} ${ability.description ?? ""}`),
    description: sanitizeFeatureText(ability.description)
  }));

  return {
    id: job.id,
    name: job.name,
    category: job.category,
    source: job.source,
    prerequisites: sanitizeJobRefs(job.prerequisites),
    nextJobs: sanitizeJobRefs(job.nextJobs),
    requiredStats,
    growthStats,
    abilityTypes: [...new Set(abilities.map((ability) => ability.type).filter(Boolean))],
    featureTags: [...new Set(abilities.flatMap((ability) => ability.tags))].sort(),
    abilities
  };
}

function sanitizeJobRefs(values = []) {
  return values
    .map((value) => sanitizeFeatureText(value)?.replace(/\bM(?:aster)?\b/gi, "").trim())
    .filter(Boolean);
}

function sanitizeFeatureText(value) {
  if (!value) {
    return null;
  }
  const sanitized = value
    .replace(/\b(?:PA|MA|PD|MD|HP|AR|CT|CD|AV)\s*[*x×]\s*/gi, "$1 계수 ")
    .replace(/[가-힣A-Za-z]+\s*[*x×]\s*[+-]?\d+(?:\.\d+)?/g, "계수 기반")
    .replace(/[+-]?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%p|%|초|턴|배|만큼)?/g, "")
    .replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,:;!?])/g, "$1")
    .trim();
  return sanitized || null;
}

function stripProgressionSuffix(value) {
  return sanitizeFeatureText(value)?.replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/g, "").trim() ?? value;
}

function inferAbilityTags(text) {
  const normalized = text.toLowerCase();
  const rules = [
    ["physical", /물리|pa|근력|공격력/],
    ["magic", /마법|ma|지능/],
    ["defense", /방어|보호|피해 감소|guard|pd|md/],
    ["heal", /회복|치유|흡혈|생명력 회복/],
    ["delay", /딜레이|행동간격|dly|속도/],
    ["critical", /치명|크리|ct|cd/],
    ["evasion", /회피|av/],
    ["accuracy", /명중|ar/],
    ["passive-stat", /hp|pa|ma|pd|md|ar|ct|cd|av|\+|증가|감소/],
    ["summon", /소환|해골|정령|분신/],
    ["status", /중독|출혈|기절|저주|상태|버프|디버프/],
    ["resource", /ap|행동력/]
  ];
  return rules.filter(([, pattern]) => pattern.test(normalized)).map(([tag]) => tag);
}

function printHelp() {
  console.log(`Usage: node scripts/crawl-rpgkr-jobs.mjs [options]

Options:
  --out <path>          Output JSON path. Default: ${DEFAULT_OUTPUT}
  --base-url <url>      Wiki mirror base URL. Default: ${DEFAULT_BASE_URL}
  --page <title>        Crawl one page title. Can be repeated.
  --delay <ms>          Delay between page requests. Default: ${DEFAULT_DELAY_MS}
  --cache-dir <path>    Read/write fetched HTML cache files.
  --ignore-robots       Skip robots.txt check.
  --help                Show this help.
`);
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/g, "");
}

function buildWikiUrl(baseUrl, pageTitle) {
  return `${baseUrl}/w/${encodeURIComponent(pageTitle).replace(/%2F/g, "/")}`;
}

async function fetchText(url, cacheDir) {
  const cachePath = cacheDir ? resolve(cacheDir, `${safeFilename(url)}.html`) : null;
  if (cachePath) {
    try {
      return await readFile(cachePath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url}`);
  }
  const text = await response.text();

  if (cachePath) {
    await mkdir(dirname(cachePath), { recursive: true });
    await writeFile(cachePath, text, "utf8");
  }
  return text;
}

async function assertRobotsAllowed(baseUrl, pages) {
  const robotsUrl = `${baseUrl}/robots.txt`;
  const response = await fetch(robotsUrl, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    console.warn(`robots.txt unavailable (${response.status}); continuing with conservative delay.`);
    return;
  }

  const rules = parseRobots(await response.text());
  for (const pageTitle of pages) {
    const path = new URL(buildWikiUrl(baseUrl, pageTitle)).pathname;
    const blockedBy = rules.disallow.find((rule) => path.startsWith(rule));
    if (blockedBy) {
      throw new Error(`robots.txt disallows ${path} by rule ${blockedBy}. Use another permitted source or pass --ignore-robots only if you have permission.`);
    }
  }
}

function parseRobots(text) {
  const disallow = [];
  let applies = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) {
      continue;
    }
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) {
      applies = value === "*" || /jobmasterrpg/i.test(value);
      continue;
    }
    if (applies && /^disallow$/i.test(key) && value) {
      disallow.push(value);
    }
  }
  return { disallow };
}

function safeFilename(value) {
  return value.replace(/[^a-z0-9가-힣._-]+/gi, "_").slice(0, 180);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
