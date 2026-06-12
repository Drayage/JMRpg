import { jobs } from "./data/jobs.js?v=20260607-14";
import { skills } from "./data/skills.js?v=20260607-14";
import { ko } from "./i18n/ko.js?v=20260607-14";

const app = document.querySelector("#db-app");
const params = new URLSearchParams(window.location.search);
const initialTab = ["jobs", "skills", "routes"].includes(params.get("tab")) ? params.get("tab") : "jobs";

const state = {
  tab: initialTab,
  query: "",
  tier: "all",
  type: "all",
  tag: "all",
  selectedId: null
};

function render() {
  app.innerHTML = `
    <section class="db-shell">
      <header class="db-header">
        <div>
          <h1>RPG Database Viewer</h1>
          <p class="small muted">Jobs ${Object.keys(jobs).length} / Skills ${Object.keys(skills).length}</p>
        </div>
        <a class="button-link" href="./index.html?v=20260607-14">Game</a>
      </header>
      <div class="db-controls panel">
        <div class="segmented">
          <button class="${state.tab === "jobs" ? "primary" : ""}" data-tab="jobs">Jobs</button>
          <button class="${state.tab === "skills" ? "primary" : ""}" data-tab="skills">Skills</button>
          <button class="${state.tab === "routes" ? "primary" : ""}" data-tab="routes">Routes</button>
        </div>
        <input id="db-search" type="search" placeholder="Search id, name, tag, requirement" value="${escapeHtml(state.query)}">
        ${state.tab === "jobs" ? jobFilters() : state.tab === "skills" ? skillFilters() : routeFilters()}
      </div>
      ${state.tab === "routes" ? routePanel() : `
        <div class="db-layout">
          <section class="panel db-list">${state.tab === "jobs" ? jobList() : skillList()}</section>
          <section class="panel db-detail">${detailPanel()}</section>
        </div>
      `}
    </section>
  `;
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
      <div class="route-selected">
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

function detailPanel() {
  if (!state.selectedId) {
    return `<h2>Detail</h2><p class="muted">Select a ${state.tab === "jobs" ? "job" : "skill"}.</p>`;
  }
  if (state.tab === "jobs") {
    return jobs[state.selectedId] ? jobDetail(jobs[state.selectedId]) : `<p class="muted">Missing job</p>`;
  }
  return skills[state.selectedId] ? skillDetail(skills[state.selectedId]) : `<p class="muted">Missing skill</p>`;
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
    return `Poison: ${effect.power} for ${effect.turns}T`;
  }
  if (effect.type === "status") {
    return `Status ${effect.target}: ${effect.id} ${effect.turns}T ${statusBits(effect).join(", ")}`;
  }
  if (effect.type === "dispel") {
    return `Dispel ${effect.target}${effect.positiveOnly ? " positive statuses" : ""}`;
  }
  return JSON.stringify(effect);
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

function tag(text) {
  return `<span class="tag">${text}</span>`;
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
  const tab = event.target.closest("[data-tab]")?.dataset.tab;
  if (tab) {
    state.tab = tab;
    state.selectedId = null;
    state.tag = "all";
    render();
    return;
  }
  const routeSelected = event.target.closest("[data-route-select]")?.dataset.routeSelect;
  if (routeSelected) {
    state.selectedId = routeSelected;
    render();
    return;
  }
  const jumpTab = event.target.closest("[data-jump-tab]")?.dataset.jumpTab;
  const selected = event.target.closest("[data-select]")?.dataset.select;
  if (selected) {
    if (jumpTab) {
      state.tab = jumpTab;
      state.tag = "all";
      state.type = "all";
      state.tier = "all";
    }
    state.selectedId = selected;
    render();
  }
});

render();
