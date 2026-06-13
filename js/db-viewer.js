import { jobs } from "./data/jobs.js?v=20260607-15";
import { relics } from "./data/relics.js?v=20260607-15";
import { monsters } from "./data/monsters.js?v=20260607-15";
import { bosses } from "./data/bosses.js";
import { skills } from "./data/skills.js?v=20260607-15";
import { ko } from "./i18n/ko.js?v=20260607-15";

const app = document.querySelector("#db-app");
const params = new URLSearchParams(window.location.search);
const tabs = ["jobs", "skills", "relics", "monsters", "bosses", "routes"];
const initialTab = tabs.includes(params.get("tab")) ? params.get("tab") : "jobs";

const state = {
  tab: initialTab,
  query: "",
  tier: "all",
  type: "all",
  category: "all",
  tag: "all",
  selectedId: null,
  returnScrollY: 0
};

function render() {
  app.innerHTML = `
    <section class="db-shell">
      <header class="db-header">
        <div>
          <h1>RPG Database Viewer</h1>
          <p class="small muted">Jobs ${Object.keys(jobs).length} / Skills ${Object.keys(skills).length} / Relics ${Object.keys(relics).length} / Monsters ${Object.keys(monsters).length}</p>
        </div>
        <a class="button-link" href="./index.html?v=20260607-15">Game</a>
      </header>
      <div class="db-controls panel">
        <div class="segmented">
          ${tabs.map((tab) => `<button class="${state.tab === tab ? "primary" : ""}" data-tab="${tab}">${titleCase(tab)}</button>`).join("")}
        </div>
        <input id="db-search" type="search" placeholder="Search id, name, tag, requirement" value="${escapeHtml(state.query)}">
        ${filtersForTab()}
      </div>
      ${state.tab === "routes" ? routePanel() : `
        <div class="db-layout">
          <section id="db-list-panel" class="panel db-list">${listPanel()}</section>
          <section id="db-detail-panel" class="panel db-detail">${detailPanel()}</section>
        </div>
      `}
    </section>
  `;
}

function filtersForTab() {
  if (state.tab === "jobs") return jobFilters();
  if (state.tab === "skills") return skillFilters();
  if (state.tab === "relics") return relicFilters();
  if (state.tab === "monsters") return monsterFilters();
  if (state.tab === "bosses") return bossFilters();
  return routeFilters();
}

function jobFilters() {
  const tiers = ["all", ...new Set(Object.values(jobs).map((job) => String(job.tier)).sort((a, b) => Number(a) - Number(b)))];
  return `
    <select data-filter="tier">
      ${tiers.map((tier) => `<option value="${tier}" ${state.tier === tier ? "selected" : ""}>Tier ${tier}</option>`).join("")}
    </select>
    <select data-filter="tag">
      ${tagOptions(Object.values(jobs).flatMap((job) => job.themes ?? []))}
    </select>
  `;
}

function skillFilters() {
  const types = ["all", ...new Set(Object.values(skills).map((skill) => skill.type).sort())];
  return `
    <select data-filter="type">
      ${types.map((type) => `<option value="${type}" ${state.type === type ? "selected" : ""}>${type}</option>`).join("")}
    </select>
    <select data-filter="tag">
      ${tagOptions(Object.values(skills).flatMap((skill) => skill.tags ?? []))}
    </select>
  `;
}

function relicFilters() {
  const categories = ["all", ...new Set(Object.values(relics).map((relic) => relic.category).filter(Boolean).sort())];
  return `
    <select data-filter="category">
      ${categories.map((category) => `<option value="${category}" ${state.category === category ? "selected" : ""}>Category ${category}</option>`).join("")}
    </select>
    <select data-filter="tag">
      ${tagOptions(Object.values(relics).flatMap((relic) => relic.tags ?? []))}
    </select>
  `;
}

function monsterFilters() {
  const categories = ["all", ...new Set(Object.values(monsters).map((monster) => monster.category).filter(Boolean).sort())];
  return `
    <select data-filter="category">
      ${categories.map((category) => `<option value="${category}" ${state.category === category ? "selected" : ""}>Category ${category}</option>`).join("")}
    </select>
    <select data-filter="type">
      ${["all", "physical", "magic", "mixed"].map((type) => `<option value="${type}" ${state.type === type ? "selected" : ""}>Damage ${type}</option>`).join("")}
    </select>
  `;
}

function bossFilters() {
  return `
    <select data-filter="tier" disabled>
      <option>Boss traits</option>
    </select>
    <select data-filter="tag">
      ${tagOptions(Object.values(bosses).flatMap((boss) => boss.traits ?? []))}
    </select>
  `;
}

function routeFilters() {
  return `
    <select data-filter="tag">
      ${tagOptions(Object.values(jobs).flatMap((job) => job.themes ?? []))}
    </select>
    <select disabled>
      <option>Job requirements</option>
    </select>
  `;
}

function tagOptions(tags) {
  const uniqueTags = ["all", ...new Set(tags.filter(Boolean).sort())];
  return uniqueTags.map((tagName) => `<option value="${tagName}" ${state.tag === tagName ? "selected" : ""}>Tag ${tagName}</option>`).join("");
}

function listPanel() {
  if (state.tab === "jobs") return jobList();
  if (state.tab === "skills") return skillList();
  if (state.tab === "relics") return relicList();
  if (state.tab === "monsters") return monsterList();
  if (state.tab === "bosses") return bossList();
  return "";
}

function routePanel() {
  return `
    <section class="panel route-panel">
      <div class="title-row">
        <div>
          <h2>Job Route Map</h2>
          <p class="small muted">Solid lines show direct job requirements. Skill, stat, tag, and relic requirements are listed on each selected job.</p>
        </div>
        <span class="tag">${Object.keys(jobs).length} jobs</span>
      </div>
      ${routeMap()}
      <div id="db-route-detail" class="route-selected">
        ${state.selectedId && jobs[state.selectedId] ? jobDetail(jobs[state.selectedId]) : `<h2>Route Detail</h2><p class="muted">Select a job node.</p>`}
      </div>
    </section>
  `;
}

function routeMap() {
  const jobValues = Object.values(jobs).sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
  const tiers = [...new Set(jobValues.map((job) => job.tier))].sort((a, b) => a - b);
  const nodesByTier = new Map(tiers.map((tier) => [tier, jobValues.filter((job) => job.tier === tier)]));
  const nodeWidth = 154;
  const nodeHeight = 54;
  const tierGap = 210;
  const rowGap = 74;
  const leftPad = 28;
  const topPad = 54;
  const maxRows = Math.max(...[...nodesByTier.values()].map((tierJobs) => tierJobs.length));
  const width = leftPad * 2 + (tiers.length - 1) * tierGap + nodeWidth;
  const height = topPad + Math.max(1, maxRows) * rowGap + 30;
  const positions = new Map();
  for (const [tierIndex, tier] of tiers.entries()) {
    const tierJobs = nodesByTier.get(tier);
    const tierOffset = Math.max(0, (maxRows - tierJobs.length) * rowGap * 0.5);
    for (const [rowIndex, job] of tierJobs.entries()) {
      positions.set(job.id, {
        x: leftPad + tierIndex * tierGap,
        y: topPad + tierOffset + rowIndex * rowGap
      });
    }
  }
  const edges = jobValues.flatMap((job) => jobReferences(job)
    .filter((sourceId) => positions.has(sourceId))
    .map((sourceId) => ({ sourceId, targetId: job.id })));
  return `
    <div class="route-scroll" style="--route-width: ${width}px; --route-height: ${height}px;">
      <div class="route-canvas" style="width: ${width}px; height: ${height}px;">
        <svg class="route-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
          <defs>
            <marker id="route-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 z"></path>
            </marker>
          </defs>
          ${edges.map((edge) => routeEdge(edge, positions, nodeWidth, nodeHeight)).join("")}
        </svg>
        ${tiers.map((tier, index) => `<div class="route-tier-label" style="left: ${leftPad + index * tierGap}px; top: 18px;">Tier ${tier}</div>`).join("")}
        ${jobValues.map((job) => routeNode(job, positions.get(job.id), nodeWidth, nodeHeight)).join("")}
      </div>
    </div>
  `;
}

function routeEdge(edge, positions, nodeWidth, nodeHeight) {
  const source = positions.get(edge.sourceId);
  const target = positions.get(edge.targetId);
  const startX = source.x + nodeWidth;
  const startY = source.y + nodeHeight / 2;
  const endX = target.x;
  const endY = target.y + nodeHeight / 2;
  const midX = Math.max(startX + 24, startX + (endX - startX) * 0.5);
  return `<path class="route-edge" d="M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}" marker-end="url(#route-arrow)"></path>`;
}

function routeNode(job, position, nodeWidth, nodeHeight) {
  const isMatch = routeNodeMatches(job);
  const isDim = (state.query.trim() || state.tag !== "all") && !isMatch;
  return `
    <button
      class="route-node ${state.selectedId === job.id ? "selected" : ""} ${isDim ? "dim" : ""}"
      data-route-select="${job.id}"
      style="left: ${position.x}px; top: ${position.y}px; width: ${nodeWidth}px; min-height: ${nodeHeight}px;"
      title="${escapeHtml(routeNodeTitle(job))}">
      <strong>${jobName(job.id)}</strong>
      <span class="small muted">${job.id}</span>
      <span class="route-node-tags">${(job.themes ?? []).slice(0, 3).join(" / ")}</span>
    </button>
  `;
}

function jobList() {
  const filtered = Object.values(jobs)
    .filter((job) => state.tier === "all" || String(job.tier) === state.tier)
    .filter((job) => state.tag === "all" || (job.themes ?? []).includes(state.tag))
    .filter((job) => matchesQuery([job.id, jobName(job.id), jobDesc(job.id), ...(job.themes ?? []), ...requirementText(job.requires ?? {})]))
    .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
  return `
    <div class="title-row">
      <h2>Jobs</h2>
      <span class="tag">${filtered.length}</span>
    </div>
    <div class="db-row-list">
      ${filtered.map((job) => jobRow(job)).join("") || `<p class="muted">No jobs</p>`}
    </div>
  `;
}

function skillList() {
  const filtered = Object.values(skills)
    .filter((skill) => state.type === "all" || skill.type === state.type)
    .filter((skill) => state.tag === "all" || (skill.tags ?? []).includes(state.tag))
    .filter((skill) => matchesQuery([skill.id, skillName(skill.id), skillDesc(skill.id), skill.type, ...(skill.tags ?? []), effectSummary(skill)]))
    .sort((a, b) => typeRank(a.type) - typeRank(b.type) || (a.apCost ?? 0) - (b.apCost ?? 0) || a.id.localeCompare(b.id));
  return `
    <div class="title-row">
      <h2>Skills</h2>
      <span class="tag">${filtered.length}</span>
    </div>
    <div class="db-row-list">
      ${filtered.map((skill) => skillRow(skill)).join("") || `<p class="muted">No skills</p>`}
    </div>
  `;
}

function relicList() {
  const filtered = Object.values(relics)
    .filter((relic) => state.category === "all" || relic.category === state.category)
    .filter((relic) => state.tag === "all" || (relic.tags ?? []).includes(state.tag))
    .filter((relic) => matchesQuery([relic.id, relicName(relic.id), relicDesc(relic.id), relic.category, ...(relic.tags ?? []), ...ruleText(relic.rules ?? [])]))
    .sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  return entityList("Relics", filtered, relicRow);
}

function monsterList() {
  const filtered = Object.values(monsters)
    .filter((monster) => state.category === "all" || monster.category === state.category)
    .filter((monster) => state.type === "all" || monster.damageType === state.type)
    .filter((monster) => matchesQuery([monster.id, monsterName(monster.id), monster.category, monster.damageType, ...(monster.traits ?? []), ...(monster.relicCategories ?? [])]))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
  return entityList("Monsters", filtered, monsterRow);
}

function bossList() {
  const filtered = Object.values(bosses)
    .filter((boss) => state.tag === "all" || (boss.traits ?? []).includes(state.tag))
    .filter((boss) => matchesQuery([boss.id, bossName(boss.id), ...(boss.traits ?? []), ...(boss.relicCategories ?? [])]))
    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99) || a.id.localeCompare(b.id));
  return entityList("Bosses", filtered, bossRow);
}

function entityList(title, values, rowRenderer) {
  return `
    <div class="title-row">
      <h2>${title}</h2>
      <span class="tag">${values.length}</span>
    </div>
    <div class="db-row-list">
      ${values.map((value) => rowRenderer(value)).join("") || `<p class="muted">No ${title.toLowerCase()}</p>`}
    </div>
  `;
}

function jobRow(job) {
  return `
    <button class="db-row ${state.selectedId === job.id ? "selected" : ""}" data-select="${job.id}">
      <div class="split-row">
        <strong>${jobName(job.id)}</strong>
        <span class="tag warn">T${job.tier}</span>
      </div>
      <p class="small muted">${job.id}</p>
      <div class="tag-list">${(job.themes ?? []).map((theme) => tag(theme)).join("")}</div>
    </button>
  `;
}

function skillRow(skill) {
  return `
    <button class="db-row ${state.selectedId === skill.id ? "selected" : ""}" data-select="${skill.id}">
      <div class="split-row">
        <strong>${skillName(skill.id)}</strong>
        <span class="tag warn">${skill.apCost ?? 0} AP</span>
      </div>
      <p class="small muted">${skill.id}</p>
      <div class="tag-list">${tag(skill.type)}${(skill.tags ?? []).map((skillTag) => tag(skillTag)).join("")}</div>
    </button>
  `;
}

function relicRow(relic) {
  return `
    <button class="db-row ${state.selectedId === relic.id ? "selected" : ""}" data-select="${relic.id}">
      <div class="split-row">
        <strong>${relicName(relic.id)}</strong>
        <span class="tag warn">${relic.category}</span>
      </div>
      <p class="small muted">${relic.id}</p>
      <div class="tag-list">${(relic.tags ?? []).map((item) => tag(item)).join("")}</div>
    </button>
  `;
}

function monsterRow(monster) {
  return `
    <button class="db-row ${state.selectedId === monster.id ? "selected" : ""}" data-select="${monster.id}">
      <div class="split-row">
        <strong>${monsterName(monster.id)}</strong>
        <span class="tag warn">Lv ${monster.level}</span>
      </div>
      <p class="small muted">${monster.id}</p>
      <div class="tag-list">${tag(monster.category)}${tag(monster.damageType)}${(monster.relicCategories ?? []).map((item) => tag(item)).join("")}</div>
    </button>
  `;
}

function bossRow(boss) {
  return `
    <button class="db-row ${state.selectedId === boss.id ? "selected" : ""}" data-select="${boss.id}">
      <div class="split-row">
        <strong>${bossName(boss.id)}</strong>
        <span class="tag danger">Day ${boss.day}</span>
      </div>
      <p class="small muted">${boss.id}</p>
      <div class="tag-list">${(boss.traits ?? []).map((item) => tag(traitName(item))).join("")}</div>
    </button>
  `;
}

function detailPanel() {
  const tools = detailTools();
  if (!state.selectedId) {
    return `${tools}<h2>Detail</h2><p class="muted">Select an item.</p>`;
  }
  if (state.tab === "jobs") {
    return `${tools}${jobs[state.selectedId] ? jobDetail(jobs[state.selectedId]) : `<p class="muted">Missing job</p>`}`;
  }
  if (state.tab === "skills") {
    return `${tools}${skills[state.selectedId] ? skillDetail(skills[state.selectedId]) : `<p class="muted">Missing skill</p>`}`;
  }
  if (state.tab === "relics") {
    return `${tools}${relics[state.selectedId] ? relicDetail(relics[state.selectedId]) : `<p class="muted">Missing relic</p>`}`;
  }
  if (state.tab === "monsters") {
    return `${tools}${monsters[state.selectedId] ? monsterDetail(monsters[state.selectedId]) : `<p class="muted">Missing monster</p>`}`;
  }
  if (state.tab === "bosses") {
    return `${tools}${bosses[state.selectedId] ? bossDetail(bosses[state.selectedId]) : `<p class="muted">Missing boss</p>`}`;
  }
  return `${tools}<p class="muted">Missing item</p>`;
}

function detailTools() {
  return `
    <div class="db-detail-tools">
      <button type="button" data-scroll-target="list">목록으로</button>
      <button type="button" data-scroll-target="top">맨 위로</button>
    </div>
  `;
}

function jobDetail(job) {
  const skillIds = job.milestones.filter((milestone) => milestone.type === "skill").map((milestone) => milestone.skillId);
  const childJobs = Object.values(jobs).filter((candidate) => jobReferences(candidate).includes(job.id));
  return `
    <div class="title-row">
      <div>
        <h2>${jobName(job.id)}</h2>
        <p class="small muted">${job.id}</p>
      </div>
      <span class="tag warn">Tier ${job.tier}</span>
    </div>
    <p>${jobDesc(job.id)}</p>
    <div class="db-section">
      <h3>Growth</h3>
      <p class="small">${statText(job.growth)}</p>
    </div>
    <div class="db-section">
      <h3>Requirements</h3>
      ${requirementText(job.requires ?? {}).map((line) => `<p class="small">${line}</p>`).join("") || `<p class="small muted">None</p>`}
    </div>
    <div class="db-section">
      <h3>Milestones</h3>
      ${job.milestones.map((milestone) => milestoneText(milestone)).join("")}
    </div>
    <div class="db-section">
      <h3>Skills</h3>
      ${skillIds.map((skillId) => linkedSkillSummary(skillId)).join("")}
    </div>
    <div class="db-section">
      <h3>Unlocks Into</h3>
      ${childJobs.map((child) => `<button class="inline-link" data-jump-tab="jobs" data-select="${child.id}">${jobName(child.id)} <span class="muted">T${child.tier}</span></button>`).join("") || `<p class="small muted">No direct child jobs</p>`}
    </div>
  `;
}

function skillDetail(skill) {
  const sourceJobs = Object.values(jobs).filter((job) => job.milestones.some((milestone) => milestone.skillId === skill.id));
  return `
    <div class="title-row">
      <div>
        <h2>${skillName(skill.id)}</h2>
        <p class="small muted">${skill.id}</p>
      </div>
      <span class="tag warn">${skill.apCost ?? 0} AP</span>
    </div>
    <p>${skillDesc(skill.id)}</p>
    <div class="tag-list">${tag(skill.type)}${(skill.tags ?? []).map((skillTag) => tag(skillTag)).join("")}</div>
    <div class="db-section">
      <h3>Rules</h3>
      <p class="small">${skillRules(skill).join("</p><p class=\"small\">")}</p>
    </div>
    <div class="db-section">
      <h3>Effects</h3>
      ${(skill.effects ?? []).map((effect) => `<p class="small">${effectText(effect)}</p>`).join("") || passiveDetail(skill)}
    </div>
    <div class="db-section">
      <h3>Source Jobs</h3>
      ${sourceJobs.map((job) => `<button class="inline-link" data-jump-tab="jobs" data-select="${job.id}">${jobName(job.id)} <span class="muted">T${job.tier}</span></button>`).join("") || `<p class="small muted">No job source</p>`}
    </div>
  `;
}

function relicDetail(relic) {
  return `
    <div class="title-row">
      <div>
        <h2>${relicName(relic.id)}</h2>
        <p class="small muted">${relic.id}</p>
      </div>
      <span class="tag warn">${relic.category}</span>
    </div>
    <p>${relicDesc(relic.id)}</p>
    <div class="tag-list">${(relic.tags ?? []).map((item) => tag(item)).join("")}</div>
    <div class="db-section">
      <h3>Rules</h3>
      ${ruleText(relic.rules ?? []).map((line) => `<p class="small">${line}</p>`).join("") || `<p class="small muted">No rules</p>`}
    </div>
    ${rawData(relic)}
  `;
}

function monsterDetail(monster) {
  return `
    <div class="title-row">
      <div>
        <h2>${monsterName(monster.id)}</h2>
        <p class="small muted">${monster.id}</p>
      </div>
      <span class="tag warn">Lv ${monster.level}</span>
    </div>
    <div class="tag-list">${tag(monster.category)}${tag(monster.damageType)}${(monster.traits ?? []).map((item) => tag(traitName(item))).join("")}</div>
    <div class="db-section">
      <h3>Stats</h3>
      <p class="small">${statText(monster.stats)}</p>
    </div>
    <div class="db-section">
      <h3>Rewards</h3>
      <p class="small">XP ${monster.xp ?? 0}</p>
      <p class="small">Relic categories: ${(monster.relicCategories ?? []).join(", ") || "none"}</p>
    </div>
    ${rawData(monster)}
  `;
}

function bossDetail(boss) {
  return `
    <div class="title-row">
      <div>
        <h2>${bossName(boss.id)}</h2>
        <p class="small muted">${boss.id}</p>
      </div>
      <span class="tag danger">Day ${boss.day}</span>
    </div>
    <div class="tag-list">${(boss.traits ?? []).map((item) => tag(traitName(item))).join("")}</div>
    <div class="db-section">
      <h3>Stats</h3>
      <p class="small">${statText(boss.stats)}</p>
    </div>
    <div class="db-section">
      <h3>Rewards</h3>
      <p class="small">XP ${boss.xp ?? 0}</p>
      <p class="small">Relic categories: ${(boss.relicCategories ?? []).join(", ") || "none"}</p>
    </div>
    ${rawData(boss)}
  `;
}

function linkedSkillSummary(skillId) {
  const skill = skills[skillId];
  if (!skill) {
    return `<p class="small danger-text">${skillId} missing</p>`;
  }
  return `
    <button class="inline-link db-skill-summary" data-jump-tab="skills" data-select="${skillId}">
      <strong>${skillName(skillId)}</strong>
      <span class="muted">${skill.id} / ${skill.type} / ${skill.apCost ?? 0} AP</span>
      <span class="small">${skillDesc(skillId)}</span>
    </button>
  `;
}

function milestoneText(milestone) {
  if (milestone.type === "skill") {
    return `<p class="small">${milestone.percent}%: ${skillName(milestone.skillId)} <span class="muted">${milestone.skillId}</span></p>`;
  }
  return `<p class="small">${milestone.percent}%: ${milestone.type}</p>`;
}

function skillRules(skill) {
  return [
    `Type: ${skill.type}`,
    `AP Cost: ${skill.apCost ?? 0}`,
    skill.chance !== undefined ? `Activation: ${Math.round(skill.chance * 100)}%` : null,
    skill.priority ? "Priority skill" : null,
    skill.maxUses ? `Max uses: ${skill.maxUses} / battle` : null,
    skill.condition ? `Condition: ${conditionText(skill.condition)}` : null,
    skill.scalingStat ? `Scaling stat: ${skill.scalingStat}` : null
  ].filter(Boolean);
}

function effectText(effect) {
  if (effect.type === "damage") {
    const extras = [
      effect.critBonus ? `crit +${effect.critBonus}` : null,
      effect.absolute ? "absolute" : null,
      effect.inverseCrit ? `reverse crit base ${effect.inverseCritBase}` : null,
      effect.inverseScaleStat ? `inverse ${effect.inverseScaleStat}` : null
    ].filter(Boolean).join(", ");
    return `Damage: ${effect.stat} x ${effect.power}${extras ? ` (${extras})` : ""}`;
  }
  if (effect.type === "heal") {
    return `Heal: ${effect.stat} x ${effect.power}${effect.maxHpRatio ? ` + MHP ${Math.round(effect.maxHpRatio * 100)}%` : ""}`;
  }
  if (effect.type === "guard") {
    return `Block: +${effect.amount}`;
  }
  if (effect.type === "poison") {
    return `Poison: ${effect.amount ?? effect.power} ${effect.turns ? `for ${effect.turns}T` : ""}`;
  }
  if (effect.type === "typed_status") {
    return `Typed status ${effect.target ?? "foe"}: ${effect.kind} ${effect.amount} ${effect.turns ? `${effect.turns}T` : ""}`;
  }
  if (effect.type === "shield") {
    return `Shield: ${effect.amount ?? 0}${effect.stat ? ` + ${effect.stat} x ${effect.power ?? 0}` : ""}`;
  }
  if (effect.type === "summon") {
    return `Summon: ${effect.summonId} ${effect.role ?? ""} x${effect.count ?? 1}`;
  }
  if (effect.type === "resource") {
    return `Resource: ${effect.key} +${effect.amount ?? 0}`;
  }
  if (effect.type === "consume_resource") {
    return `Consume resource: ${effect.key} x ${effect.power ?? 0}${effect.absolute ? " absolute" : ""}`;
  }
  if (effect.type === "clear_resource") {
    return `Clear resource: ${effect.key}`;
  }
  if (effect.type === "rune") {
    return `Rune: ${effect.runeId} on ${effect.trigger}`;
  }
  if (effect.type === "extra_action") {
    return `Extra action: ${Math.round((effect.chance ?? 1) * 100)}%, limit ${effect.limit ?? "none"}`;
  }
  if (effect.type === "sacrifice") {
    return `Sacrifice: ${Math.round((effect.ratio ?? 0) * 100)}% HP`;
  }
  if (effect.type === "stat_tradeoff") {
    return `Stat tradeoff: ${statText(effect.statMods ?? {})}`;
  }
  if (effect.type === "status") {
    return `Status ${effect.target}: ${effect.id} ${effect.turns}T ${statusBits(effect).join(", ")}`;
  }
  if (effect.type === "dispel") {
    return `Dispel ${effect.target}${effect.positiveOnly ? " positive statuses" : ""}`;
  }
  return JSON.stringify(effect);
}

function ruleText(rules) {
  return rules.map((rule) => Object.entries(rule)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
    .join(" / "));
}

function passiveDetail(skill) {
  const lines = [];
  if (skill.passiveStats) {
    lines.push(`Stats: ${statText(skill.passiveStats)}`);
  }
  if (skill.passivePerRelicStats) {
    lines.push(`Per relic: ${statText(skill.passivePerRelicStats)} up to ${skill.passivePerRelicCap ?? "unlimited"}`);
  }
  if (skill.eventChoiceBonus) {
    lines.push(`Event choices: +${skill.eventChoiceBonus}`);
  }
  if (skill.eventWeightMultipliers) {
    lines.push(`Event weights: ${Object.entries(skill.eventWeightMultipliers).map(([key, value]) => `${key} x${value}`).join(", ")}`);
  }
  return lines.map((line) => `<p class="small">${line}</p>`).join("") || `<p class="small muted">No effects</p>`;
}

function statusBits(effect) {
  return [
    effect.permanent ? "battle-long" : null,
    effect.damageMultiplier ? `damage x${effect.damageMultiplier}` : null,
    effect.damageTakenMultiplier ? `taken x${effect.damageTakenMultiplier}` : null,
    effect.defenseMultiplier ? `defense x${effect.defenseMultiplier}` : null,
    effect.skillChanceMultiplier ? `skill chance x${effect.skillChanceMultiplier}` : null,
    effect.statMods ? statText(effect.statMods) : null
  ].filter(Boolean);
}

function requirementText(requires) {
  return [
    listRequirement("Master all", requires.masteredAll),
    listRequirement("Master any", requires.masteredAny),
    listRequirement("Visit all", requires.visitedAll),
    listRequirement("Visit any", requires.visitedAny),
    listRequirement("Skill master all", requires.skillMasteredAll),
    listRequirement("Skill master any", requires.skillMasteredAny),
    listRequirement("Tags", requires.requiredTags),
    listRequirement("Relic categories", requires.relicCategoriesAny),
    requires.minVisitedJobs ? `Min visited jobs: ${requires.minVisitedJobs}` : null,
    requires.minMasteredJobs ? `Min mastered jobs: ${requires.minMasteredJobs}` : null,
    requires.statThresholds ? `Stats: ${statText(requires.statThresholds)}` : null
  ].filter(Boolean);
}

function routeNodeMatches(job) {
  const tagMatch = state.tag === "all" || (job.themes ?? []).includes(state.tag);
  return tagMatch && matchesQuery([job.id, jobName(job.id), jobDesc(job.id), ...(job.themes ?? []), ...requirementText(job.requires ?? {})]);
}

function routeNodeTitle(job) {
  const requirements = requirementText(job.requires ?? {});
  return [
    `${jobName(job.id)} / ${job.id}`,
    `Tier ${job.tier}`,
    requirements.length ? requirements.join(" | ") : "No requirements"
  ].join("\n");
}

function listRequirement(label, values) {
  return values?.length ? `${label}: ${values.join(", ")}` : null;
}

function jobReferences(job) {
  const requires = job.requires ?? {};
  return [
    ...(requires.masteredAll ?? []),
    ...(requires.masteredAny ?? []),
    ...(requires.visitedAll ?? []),
    ...(requires.visitedAny ?? [])
  ];
}

function statText(stats = {}) {
  return Object.entries(stats).map(([key, value]) => `${key}${value > 0 ? "+" : ""}${value}`).join(", ");
}

function conditionText(condition) {
  if (condition.type === "hp_below") {
    return `Player HP <= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_below") {
    return `Enemy HP <= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_above") {
    return `Enemy HP >= ${Math.round(condition.value * 100)}%`;
  }
  return JSON.stringify(condition);
}

function effectSummary(skill) {
  return [
    ...(skill.effects ?? []).map(effectText),
    skill.passiveStats ? statText(skill.passiveStats) : ""
  ].join(" ");
}

function rawData(value) {
  return `
    <details class="db-section">
      <summary>Raw Data</summary>
      <pre class="db-raw">${escapeHtml(JSON.stringify(value, null, 2))}</pre>
    </details>
  `;
}

function typeRank(type) {
  return { active: 0, special: 1, passive: 2 }[type] ?? 9;
}

function matchesQuery(values) {
  if (!state.query.trim()) {
    return true;
  }
  const query = state.query.trim().toLowerCase();
  return values.join(" ").toLowerCase().includes(query);
}

function jobName(id) {
  return ko.jobs[id]?.name ?? id;
}

function jobDesc(id) {
  return ko.jobs[id]?.desc ?? "";
}

function skillName(id) {
  return ko.skills[id]?.name ?? id;
}

function skillDesc(id) {
  return ko.skills[id]?.desc ?? "";
}

function relicName(id) {
  return ko.relics[id]?.name ?? id;
}

function relicDesc(id) {
  return ko.relics[id]?.desc ?? "";
}

function monsterName(id) {
  return ko.monsters[id]?.name ?? id;
}

function bossName(id) {
  return ko.bosses[id]?.name ?? id;
}

function traitName(id) {
  return ko.traits[id] ?? id;
}

function tag(text) {
  return `<span class="tag">${escapeHtml(text)}</span>`;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function rememberScrollPosition() {
  state.returnScrollY = window.scrollY || 0;
}

function isMobileDbLayout() {
  return window.matchMedia?.("(max-width: 980px)").matches ?? false;
}

function scrollToDbTarget(target, force = false) {
  if (!force && !isMobileDbLayout()) {
    return;
  }
  if (target === "list") {
    window.scrollTo({ top: state.returnScrollY || 0, behavior: "smooth" });
    return;
  }
  if (target === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const selector = target === "route-detail" ? "#db-route-detail" : "#db-detail-panel";
  const element = document.querySelector(selector);
  element?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function scrollAfterRender(target) {
  requestAnimationFrame(() => scrollToDbTarget(target));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

app.addEventListener("input", (event) => {
  if (event.target.id === "db-search") {
    const cursor = event.target.selectionStart;
    state.query = event.target.value;
    state.selectedId = null;
    render();
    const search = document.querySelector("#db-search");
    search?.focus();
    search?.setSelectionRange(cursor, cursor);
  }
});

app.addEventListener("change", (event) => {
  const filter = event.target.dataset.filter;
  if (!filter) {
    return;
  }
  state[filter] = event.target.value;
  state.selectedId = null;
  render();
});

app.addEventListener("click", (event) => {
  const scrollTarget = event.target.closest("[data-scroll-target]")?.dataset.scrollTarget;
  if (scrollTarget) {
    scrollToDbTarget(scrollTarget, true);
    return;
  }
  const tab = event.target.closest("[data-tab]")?.dataset.tab;
  if (tab) {
    state.tab = tab;
    state.selectedId = null;
    state.tag = "all";
    state.category = "all";
    state.type = "all";
    state.tier = "all";
    render();
    return;
  }
  const routeSelected = event.target.closest("[data-route-select]")?.dataset.routeSelect;
  if (routeSelected) {
    rememberScrollPosition();
    state.selectedId = routeSelected;
    render();
    scrollAfterRender("route-detail");
    return;
  }
  const jumpTab = event.target.closest("[data-jump-tab]")?.dataset.jumpTab;
  const selected = event.target.closest("[data-select]")?.dataset.select;
  if (selected) {
    rememberScrollPosition();
    if (jumpTab) {
      state.tab = jumpTab;
      state.tag = "all";
      state.category = "all";
      state.type = "all";
      state.tier = "all";
    }
    state.selectedId = selected;
    render();
    scrollAfterRender("detail");
  }
});

render();
