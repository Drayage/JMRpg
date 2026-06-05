import { bosses } from "../data/bosses.js";
import { jobs } from "../data/jobs.js";
import { monsters } from "../data/monsters.js";
import { relics } from "../data/relics.js";
import { skills } from "../data/skills.js";
import { getCurrentJobProgress, isJobUnlocked } from "../systems/jobs.js";
import { canEquipSkill, getEquippedApCost } from "../systems/skills.js";
import { clampPercent, getEffectiveStats, statKeys } from "../systems/stats.js";
import { ko } from "../i18n/ko.js";

export function statusPanel(state) {
  const progress = getCurrentJobProgress(state);
  const currentJob = jobs[state.currentJobId];
  return panel(`
    <div class="title-row">
      <h1>${ko.ui.title}</h1>
      <span class="tag warn">${ko.ui.day} ${state.day}</span>
    </div>
    <div class="split-row">
      <span>${ko.ui.actionsLeft}</span>
      <strong>${state.actionInDay}/3</strong>
    </div>
    <div class="split-row">
      <span>${ko.ui.currentJob}</span>
      <strong>${jobName(currentJob.id)}</strong>
    </div>
    <div class="split-row">
      <span>${ko.ui.ap}</span>
      <strong>${getEquippedApCost(state)} / ${state.player.ap}</strong>
    </div>
    <p class="small muted">${jobDesc(currentJob.id)}</p>
    <div class="bar" title="${progress}%"><span style="width: ${progress}%"></span></div>
    <p class="small muted">${state.player.currentJobXp}/${currentJob.xpRequired} XP</p>
  `);
}

export function bossPanel(state) {
  const boss = bosses[state.finalBossId];
  return panel(`
    <div class="title-row">
      <h2>${ko.ui.bossReveal}</h2>
      <span class="tag danger">${ko.ui.finalBattle}</span>
    </div>
    <h3>${bossName(boss.id)}</h3>
    <div class="tag-list">
      ${boss.traits.map((trait) => tag(ko.traits[trait] ?? trait, "danger")).join("")}
    </div>
  `);
}

export function statsPanel(state) {
  const effective = getEffectiveStats(state);
  return panel(`
    <div class="title-row"><h2>${ko.ui.stats}</h2><span class="tag">${ko.ui.available}</span></div>
    <div class="stat-grid">
      ${statKeys.map((key) => `
        <div class="stat">
          <span>${ko.stats[key]}</span>
          <strong>${Math.round(effective[key])}</strong>
        </div>
      `).join("")}
    </div>
  `);
}

export function choicesPanel(state) {
  return panel(`
    <div class="title-row"><h2>${ko.ui.eventChoices}</h2></div>
    ${state.activeJobEvent ? activeJobEventPanel(state) : `
      <div class="choice-list">
        ${state.choices.length ? state.choices.map((choice) => choiceButton(choice)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
      </div>
    `}
  `);
}

export function jobsPanel(state) {
  return panel(`
    <div class="title-row"><h2>${ko.ui.jobOptions}</h2></div>
    <div class="stack">
      ${Object.values(jobs).map((job) => jobOption(state, job, false)).join("")}
    </div>
  `);
}

export function skillsPanel(state) {
  const learned = state.player.learnedSkills.filter((skillId) => skillId !== "basic_attack");
  return panel(`
    <div class="title-row">
      <h2>${ko.ui.learnedSkills}</h2>
      <span class="tag">${getEquippedApCost(state)} / ${state.player.ap} AP</span>
    </div>
    <div class="stack">
      ${learned.length ? learned.map((skillId) => skillRow(state, skillId)).join("") : `<p class="muted">${ko.ui.noSkills}</p>`}
    </div>
  `);
}

export function relicsPanel(state) {
  return panel(`
    <div class="title-row"><h2>${ko.ui.relics}</h2><span class="tag">${state.player.relics.length}</span></div>
    <div class="stack">
      ${state.player.relics.length ? state.player.relics.map((relicId) => relicRow(relicId)).join("") : `<p class="muted">${ko.ui.noRelics}</p>`}
    </div>
  `);
}

export function logPanel(state) {
  return panel(`
    <div class="title-row"><h2>${ko.ui.battleLog}</h2></div>
    <div class="log">
      ${state.log.slice(0, 80).map((entry) => `<div class="log-entry">${formatLogText(entry.text)}</div>`).join("")}
    </div>
  `);
}

export function gameOverPanel(state) {
  if (!state.gameOver) {
    return "";
  }
  return `
    <section class="panel game-over">
      <div class="title-row">
        <h2>${ko.ui.gameOver}</h2>
        <span class="tag ${state.victory ? "ok" : "danger"}">${state.victory ? ko.ui.victory : ko.ui.defeat}</span>
      </div>
      <button class="primary" data-action="restart">Restart</button>
    </section>
  `;
}

function activeJobEventPanel(state) {
  const event = state.activeJobEvent;
  return `
    <div class="card stack">
      <div class="title-row">
        <h3>${eventName(event.templateId)}</h3>
        <span class="tag warn">${event.jobTier}</span>
      </div>
      <p class="small muted">${eventDesc(event.templateId)}</p>
      ${event.jobOptions.map((jobId) => jobOption(state, jobs[jobId], true)).join("")}
    </div>
  `;
}

function jobOption(state, job, canChangeFromEvent) {
  const unlocked = isJobUnlocked(state, job.id);
  const mastered = state.masteredJobs.includes(job.id);
  const current = state.currentJobId === job.id;
  const percent = current ? getCurrentJobProgress(state) : 0;
  const milestones = job.milestones.map((milestone) => {
    if (milestone.type === "skill") {
      return `${milestone.percent}% ${skillName(milestone.skillId)}`;
    }
    return `${milestone.percent}% ${ko.ui.mastered}, AP +${job.apReward}`;
  }).join(" / ");
  const advanced = Object.values(jobs)
    .filter((candidate) => candidate.requires?.masteredAll?.includes(job.id) || candidate.requires?.masteredAny?.includes(job.id))
    .map((candidate) => jobName(candidate.id))
    .join(", ");
  const buttonDisabled = !canChangeFromEvent || !unlocked || current;

  return `
    <div class="card job-option">
      <div>
        <div class="split-row"><h3>${jobName(job.id)}</h3><span class="tag ${mastered ? "ok" : unlocked ? "warn" : ""}">${mastered ? ko.ui.mastered : unlocked ? ko.ui.available : ko.ui.locked}</span></div>
        <p class="small muted">${jobDesc(job.id)}</p>
        <p class="small">XP ${job.xpRequired} / ${growthText(job.growth)}</p>
        <p class="small muted">${milestones}</p>
        ${advanced ? `<p class="small muted">Advanced: ${advanced}</p>` : ""}
        ${current ? `<div class="bar"><span style="width: ${percent}%"></span></div>` : ""}
      </div>
      <button data-action="change-job" data-job-id="${job.id}" ${buttonDisabled ? "disabled" : ""}>${ko.ui.changeJob}</button>
    </div>
  `;
}

function skillRow(state, skillId) {
  const skill = skills[skillId];
  const equipped = state.player.equippedSkills.includes(skillId);
  const mastered = (state.player.skillMastery[skillId] ?? 0) >= 100;
  const mastery = state.player.skillMastery[skillId] ?? 0;
  const action = equipped ? "unequip-skill" : "equip-skill";
  const disabled = !equipped && !canEquipSkill(state, skillId);
  return `
    <div class="card skill-row">
      <div>
        <div class="split-row"><h3>${skillName(skillId)}</h3><span class="tag">${skill.apCost} AP</span></div>
        <p class="small muted">${skillDesc(skillId)}</p>
        <p class="small">${skill.type} / ${skill.scalingStat ?? "passive"} / ${Math.round((skill.chance ?? 1) * 100)}%</p>
        <div class="bar"><span style="width: ${clampPercent(mastery)}%"></span></div>
        <p class="small muted">${mastered ? ko.ui.mastered : `${mastery}%`}</p>
      </div>
      <button data-action="${action}" data-skill-id="${skillId}" ${disabled ? "disabled" : ""}>${equipped ? ko.ui.unequip : ko.ui.equip}</button>
    </div>
  `;
}

function choiceButton(choice) {
  const title = choice.type === "hunt" ? monsterName(choice.monsterId) : choice.type === "boss" ? bossName(choice.monsterId) : eventName(choice.templateId ?? choice.id);
  const desc = choice.type === "hunt" || choice.type === "boss" ? eventName(choice.templateId) : eventDesc(choice.templateId ?? choice.id);
  return `
    <button class="choice" data-action="choose-event" data-choice-id="${choice.id}">
      <div class="split-row"><h3>${title}</h3><span class="tag warn">${ko.ui.choose}</span></div>
      <p class="small muted">${desc}</p>
      <div class="meta">
        ${choice.jobOptions ? tag(choice.jobOptions.map((jobId) => jobName(jobId)).join(", ") || ko.ui.noChoices, choice.jobOptions.length ? "warn" : "danger") : ""}
        ${choice.winRate !== null && choice.winRate !== undefined ? tag(`${ko.ui.winRate} ${choice.winRate}%`, choice.winRate >= 60 ? "ok" : choice.winRate <= 35 ? "danger" : "warn") : ""}
        ${choice.xp ? tag(`${ko.ui.xpReward} ${choice.xp}`) : ""}
        ${choice.category ? tag(`${ko.ui.relicCategory}: ${ko.categories[choice.category] ?? choice.category}`) : ""}
      </div>
    </button>
  `;
}

function relicRow(relicId) {
  const relic = relics[relicId];
  return `
    <div class="card relic-row">
      <div>
        <h3>${relicName(relicId)}</h3>
        <p class="small muted">${relicDesc(relicId)}</p>
      </div>
      <span class="tag">${ko.categories[relic.category] ?? relic.category}</span>
    </div>
  `;
}

function growthText(growth) {
  return Object.entries(growth).map(([key, value]) => `${key}+${value}`).join(", ");
}

function panel(content) {
  return `<section class="panel">${content}</section>`;
}

function tag(text, tone = "") {
  return `<span class="tag ${tone}">${text}</span>`;
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

function eventName(id) {
  return ko.events[id]?.name ?? id;
}

function eventDesc(id) {
  return ko.events[id]?.desc ?? "";
}

function formatLogText(text) {
  let output = text;
  for (const id of Object.keys(jobs)) {
    output = output.replaceAll(id, jobName(id));
  }
  for (const id of Object.keys(skills)) {
    output = output.replaceAll(id, skillName(id));
  }
  for (const id of Object.keys(relics)) {
    output = output.replaceAll(id, relicName(id));
  }
  for (const id of Object.keys(monsters)) {
    output = output.replaceAll(id, monsterName(id));
  }
  for (const id of Object.keys(bosses)) {
    output = output.replaceAll(id, bossName(id));
  }
  return output;
}
