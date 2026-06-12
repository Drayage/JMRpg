const STAT_ALIASES = {
  HP: "HP",
  PA: "PA",
  MA: "MA",
  PD: "PD",
  MD: "MD",
  AR: "ACC",
  CT: "CRT",
  CD: "CRD",
  AV: "EVA"
};

const JOB_HEADING_RE = /^#{3,}\s+\d+(?:\.\d+)+\.\s+(.+)$/;
const CATEGORY_HEADING_RE = /^#{2}\s+\d+\.\s+(.+)$/;
const ANY_HEADING_RE = /^#{2,}\s+/;

export function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|h[1-6]|li|tr|table)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  );
}

export function parseJobPage({ pageTitle, url, html, text }) {
  const visibleText = text ?? htmlToText(html ?? "");
  const lines = normalizeLines(visibleText);
  const modifiedAt = parseModifiedAt(lines);
  const jobs = [];
  let category = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const categoryMatch = line.match(CATEGORY_HEADING_RE);
    if (categoryMatch) {
      category = cleanText(categoryMatch[1]);
      continue;
    }

    const jobMatch = line.match(JOB_HEADING_RE);
    if (!jobMatch) {
      continue;
    }

    const endIndex = findNextHeadingIndex(lines, index + 1);
    const block = lines.slice(index + 1, endIndex);
    jobs.push(parseJobBlock({
      name: cleanText(jobMatch[1]),
      category,
      pageTitle,
      url,
      modifiedAt,
      block
    }));
    index = endIndex - 1;
  }

  return {
    pageTitle,
    url,
    modifiedAt,
    jobCount: jobs.length,
    jobs
  };
}

export function parseJobBlock({ name, category, pageTitle, url, modifiedAt, block }) {
  return {
    id: toSlug(name),
    name,
    category,
    source: { pageTitle, url, modifiedAt },
    prerequisites: parsePrerequisites(block),
    nextJobs: parseNextJobs(block),
    statRequirements: parseStatRequirements(block),
    maxMastery: parseMaxMastery(block),
    growth: parseGrowth(block),
    abilities: parseAbilities(block),
    rawText: block.join("\n").trim()
  };
}

function normalizeLines(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);
}

function cleanLine(value) {
  return value
    .replace(/\u200b/g, "")
    .replace(/\t/g, "  ")
    .trim();
}

function cleanText(value) {
  return value
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function parseModifiedAt(lines) {
  const line = lines.find((candidate) => candidate.startsWith("최근 수정 시각"));
  return line?.replace(/^최근 수정 시각\s*:\s*/, "") ?? null;
}

function findNextHeadingIndex(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (ANY_HEADING_RE.test(lines[index])) {
      return index;
    }
  }
  return lines.length;
}

function parsePrerequisites(block) {
  const values = parseTwoColumnSection(block, "선행 필수 직업", "최소 근력");
  return values.left;
}

function parseNextJobs(block) {
  const values = parseTwoColumnSection(block, "선행 필수 직업", "최소 근력");
  return values.right;
}

function parseTwoColumnSection(block, startNeedle, endNeedle) {
  const start = block.findIndex((line) => line.includes(startNeedle));
  if (start === -1) {
    return { left: [], right: [] };
  }

  const rows = [];
  for (let index = start + 1; index < block.length; index += 1) {
    const line = block[index];
    if (line.includes(endNeedle)) {
      break;
    }
    rows.push(line);
  }

  const left = [];
  const right = [];
  for (const row of rows) {
    const cells = splitTableishRow(row);
    if (cells[0] && cells[0] !== "-") {
      left.push(cells[0]);
    }
    for (const cell of cells.slice(1)) {
      if (cell && cell !== "-") {
        right.push(cell);
      }
    }
  }
  return { left, right };
}

function parseStatRequirements(block) {
  const index = block.findIndex((line) => line.includes("최소 근력") && line.includes("최소 기민") && line.includes("최소 지능"));
  if (index === -1 || !block[index + 1]) {
    return {};
  }

  const [strength, agility, intelligence] = splitTableishRow(block[index + 1]);
  return compactObject({
    strength: parseNumber(strength),
    agility: parseNumber(agility),
    intelligence: parseNumber(intelligence)
  });
}

function parseMaxMastery(block) {
  const inline = block.find((line) => line.startsWith("최대 숙련치"));
  if (!inline) {
    return null;
  }
  return parseNumber(inline.replace("최대 숙련치", ""));
}

function parseGrowth(block) {
  const index = block.findIndex((line) => /^HP PA MA PD MD AR CT CD AV$/.test(line));
  if (index === -1 || !block[index + 1]) {
    return {};
  }

  const labels = block[index].split(" ");
  const values = splitTableishRow(block[index + 1]);
  const growth = {};
  labels.forEach((label, valueIndex) => {
    const parsed = parseNumber(values[valueIndex]);
    if (parsed !== null) {
      growth[STAT_ALIASES[label] ?? label] = parsed;
    }
  });
  return growth;
}

function parseAbilities(block) {
  const start = block.findIndex((line) => line.includes("AP") && line.includes("구분") && line.includes("이름") && line.includes("숙련"));
  if (start === -1) {
    return [];
  }

  const abilities = [];
  let current = null;
  for (let index = start + 1; index < block.length; index += 1) {
    const line = block[index];
    if (line.startsWith("~") || line.startsWith("※")) {
      appendDescription(current, line);
      continue;
    }

    const row = parseAbilityRow(line);
    if (row) {
      current = row;
      abilities.push(current);
      continue;
    }

    appendDescription(current, line);
  }
  return abilities;
}

function parseAbilityRow(line) {
  const full = line.match(/^(-?\d+)\s+(일반|특수|항시)\s+(.+?)\s+([\d,]+)\s+(-|[\d.]+)\s*(.*)$/);
  if (full) {
    return compactObject({
      ap: Number.parseInt(full[1], 10),
      type: full[2],
      name: full[3],
      mastery: parseNumber(full[4]),
      chance: parseNumber(full[5]),
      description: full[6]?.trim() || null
    });
  }

  const growthStage = line.match(/^(.+?)\s+([\d,]+)\s+(.+)$/);
  if (growthStage && /[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/.test(growthStage[1])) {
    return compactObject({
      ap: null,
      type: "성장",
      name: growthStage[1],
      mastery: parseNumber(growthStage[2]),
      chance: null,
      description: growthStage[3]
    });
  }

  return null;
}

function appendDescription(current, line) {
  if (!current || !line) {
    return;
  }
  current.description = [current.description, line].filter(Boolean).join("\n");
}

function splitTableishRow(row) {
  return row
    .split(/\s{2,}|\s+\|\s+/)
    .map((cell) => cleanText(cell))
    .filter(Boolean);
}

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized || normalized === "-") {
    return null;
  }
  const match = normalized.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== null && value !== undefined && value !== ""));
}

function toSlug(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
}
