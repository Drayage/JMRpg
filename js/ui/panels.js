import { bosses } from "../data/bosses.js";
import { jobs } from "../data/jobs.js";
import { monsters } from "../data/monsters.js";
import { relics } from "../data/relics.js";
import { skills } from "../data/skills.js";
import { getCurrentJobProgress, isJobUnlocked } from "../systems/jobs.js";
import { canEquipSkill, getEffectiveApCost, getEquippedApCost, getEquippedSlotCount, getSkillEstimate, skillSlotLimits } from "../systems/skills.js";
import { getRelicCurrentValue } from "../systems/relics.js";
import { getStalemateDamageMultiplier } from "../systems/battle.js";
import { clampPercent, getEffectiveStats, statKeys } from "../systems/stats.js";
import { ko } from "../i18n/ko.js";

export function statusPanel(state) {
  const progress = getCurrentJobProgress(state);
  const currentJob = jobs[state.currentJobId];
  const nextMilestone = currentJob.milestones.find((milestone) => milestone.percent > progress);
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
    <div class="split-row ${changedClass(state.changed.ap)}">
      <span>${ko.ui.ap}</span>
      <strong>${getEquippedApCost(state)} / ${state.player.ap}</strong>
    </div>
    ${progressBar(getEquippedApCost(state), Math.max(1, state.player.ap), "ap")}
    <p class="small muted">${jobDesc(currentJob.id)}</p>
    <div class="${changedClass(state.changed.jobXp)}">${progressBar(progress, 100, "job-xp")}</div>
    <p class="small muted">${state.player.currentJobXp}/${currentJob.xpRequired} XP${nextMilestone ? ` / ${nextMilestone.percent}% ${milestoneName(nextMilestone)}` : ""}</p>
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
        <div class="stat ${changedClass(state.changed.stats?.[key])}">
          <span>${ko.stats[key]}</span>
          <strong>${Math.round(effective[key])}</strong>
        </div>
      `).join("")}
    </div>
  `);
}

export function choicesPanel(state) {
  if (state.actionResult) {
    return resultPanel(state);
  }
  if (state.battle) {
    return battlePanel(state);
  }
  return panel(`
    <div class="title-row"><h2>${ko.ui.eventChoices}</h2></div>
    ${state.activeJobEvent ? activeJobEventPanel(state) : `
      <div class="choice-list">
        ${state.choices.length ? state.choices.map((choice) => choiceButton(choice, state)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
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
    <div class="tag-list">
      ${Object.entries(skillSlotLimits).map(([type, limit]) => tag(`${type}: ${getEquippedSlotCount(state, type)}/${limit}`)).join("")}
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
      ${state.player.relics.length ? state.player.relics.map((relicId) => relicRow(state, relicId)).join("") : `<p class="muted">${ko.ui.noRelics}</p>`}
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

function battlePanel(state) {
  const battle = state.battle;
  const action = battle.lastAction;
  return panel(`
    <div class="title-row">
      <h2>${ko.ui.battle}</h2>
      <div class="speed-controls">
        ${["normal", "fast", "instant"].map((speed) => `<button class="${state.battleSpeed === speed ? "primary" : ""}" data-action="set-speed" data-speed="${speed}">${ko.ui[speed]}</button>`).join("")}
      </div>
    </div>
    <div class="battle-board">
      ${fighterBox(ko.ui.player, battle.player, "player")}
      ${fighterBox(monsterOrBossName(battle.enemyId), battle.foe, "enemy")}
    </div>
    <div class="card">
      <div class="split-row"><strong>${ko.ui.turn} ${battle.turn}</strong><span class="tag warn">${ko.ui.actor}: ${actorName(action.actor)}</span></div>
      <p>${formatLogText(action.text)}</p>
      <div class="tag-list">
        ${battle.turn > 50 ? tag(`Stalemate damage x${getStalemateDamageMultiplier(battle).toFixed(2)}`, "danger") : ""}
        ${action.skillId ? tag(`${ko.ui.skillUsed}: ${skillName(action.skillId)}`, "warn") : ""}
        ${action.damage ? tag(`${ko.ui.damage} ${action.damage}`, "danger") : ""}
        ${action.heal ? tag(`${ko.ui.heal} ${action.heal}`, "ok") : ""}
        ${action.miss ? tag(ko.ui.miss) : ""}
        ${action.crit ? tag(ko.ui.crit, "danger") : ""}
        ${action.block ? tag(ko.ui.block, "ok") : ""}
        ${action.status ? tag(`${ko.ui.statusEffect}: ${action.status}`, "warn") : ""}
      </div>
    </div>
    <div class="stack">
      ${battle.history.slice(0, 6).map((item) => `<div class="log-entry">${formatLogText(item.text)}</div>`).join("")}
    </div>
  `);
}

function resultPanel(state) {
  const result = state.actionResult;
  const choice = result.choice ?? {};
  const waitingForRelicDecision = Boolean(result.pendingRelicId);
  return panel(`
    <div class="title-row">
      <h2>${ko.ui.eventResult}</h2>
      ${waitingForRelicDecision ? "" : `<button class="primary" data-action="continue-action">${ko.ui.continue}</button>`}
    </div>
    <div class="card stack">
      <h3>${resultTitle(choice, result)}</h3>
      ${result.battle ? battleResultRows(result) : ""}
      ${result.jobChangedTo ? resultLine(ko.ui.jobChanged, jobName(result.jobChangedTo)) : ""}
      ${result.jobSkipped ? resultLine(ko.ui.noJobChange ?? "No Job Change", ko.ui.skipped ?? "Skipped") : ""}
      ${xpResultRows(result.xpSummary)}
      ${statResultRows(result.statChanges ?? result.xpSummary?.statChanges)}
      ${skillResultRows(result.xpSummary)}
      ${unlockResultRows(result.xpSummary)}
      ${result.pendingRelicId ? pendingRelicChoice(result.pendingRelicId) : ""}
      ${result.relicId ? resultLine(ko.ui.relics, `${relicName(result.relicId)} - ${relicDesc(result.relicId)}`) : ""}
      ${result.relicDeclinedId ? resultLine(ko.ui.declinedRelic ?? "Declined Relic", `${relicName(result.relicDeclinedId)} - ${relicDesc(result.relicDeclinedId)}`) : ""}
    </div>
  `);
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
      <button data-action="skip-job-change">${ko.ui.skipJobChange ?? "Skip Job Change"}</button>
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
      return `${milestone.percent}% ${skillName(milestone.skillId)} - ${skillDesc(milestone.skillId)}`;
    }
    return `${milestone.percent}% ${ko.ui.mastered}, AP +${job.apReward}`;
  }).join(" / ");
  const advanced = Object.values(jobs)
    .filter((candidate) => candidate.requires?.masteredAll?.includes(job.id) || candidate.requires?.masteredAny?.includes(job.id))
    .map((candidate) => jobName(candidate.id))
    .join(", ");
  const buttonDisabled = !canChangeFromEvent || !unlocked || current;

  return `
    <div class="card job-option ${changedClass(state.changed.jobs?.[job.id])}">
      <div>
        <div class="split-row"><h3>${jobName(job.id)}</h3><span class="tag ${mastered ? "ok" : unlocked ? "warn" : ""}">${mastered ? ko.ui.mastered : unlocked ? ko.ui.available : ko.ui.locked}</span></div>
        <p class="small muted">${jobDesc(job.id)}</p>
        <p class="small">XP ${job.xpRequired} / ${growthText(job.growth)}</p>
        <p class="small muted">${milestones}</p>
        ${advanced ? `<p class="small muted">Advanced: ${advanced}</p>` : ""}
        ${current ? progressBar(percent, 100, "job-xp") : ""}
      </div>
      <button data-action="change-job" data-job-id="${job.id}" ${buttonDisabled ? "disabled" : ""}>${ko.ui.changeJob}</button>
    </div>
  `;
}

function skillRow(state, skillId) {
  const skill = skills[skillId];
  const estimate = getSkillEstimate(state, skillId);
  const equipped = state.player.equippedSkills.includes(skillId);
  const mastered = (state.player.skillMastery[skillId] ?? 0) >= 100;
  const mastery = state.player.skillMastery[skillId] ?? 0;
  const action = equipped ? "unequip-skill" : "equip-skill";
  const disabled = !equipped && !canEquipSkill(state, skillId);
  return `
    <div class="card skill-row ${changedClass(state.changed.skills?.[skillId])}">
      <div>
        <div class="split-row"><h3>${skillName(skillId)}</h3><span class="tag">${estimate.apCost} AP</span></div>
        <p class="small muted">${skillDesc(skillId)}</p>
        <div class="tag-list">
          ${tag(skill.type)}
          ${(skill.tags ?? []).map((tagId) => tag(tagId)).join("")}
          ${estimate.onTheme ? tag("job theme", "ok") : tag("off theme", "warn")}
        </div>
        ${skill.type === "passive" ? passiveSkillDetails(skill) : activeSkillDetails(estimate)}
        <p class="small muted">AP Cost: ${estimate.baseApCost}${estimate.baseApCost !== estimate.apCost ? ` -> ${estimate.apCost}` : ""}</p>
        ${estimate.condition ? `<p class="small muted">Condition: ${conditionText(estimate.condition)}</p>` : ""}
        ${progressBar(mastery, 100, "mastery")}
        <p class="small muted">${mastered ? ko.ui.mastered : `${mastery}%`}</p>
      </div>
      <button data-action="${action}" data-skill-id="${skillId}" ${disabled ? "disabled" : ""}>${equipped ? ko.ui.unequip : ko.ui.equip}</button>
    </div>
  `;
}

function choiceButton(choice, state) {
  const title = choice.type === "hunt" ? monsterName(choice.monsterId) : choice.type === "boss" ? bossName(choice.monsterId) : eventName(choice.templateId ?? choice.id);
  const desc = choice.type === "hunt" || choice.type === "boss" ? eventName(choice.templateId) : eventDesc(choice.templateId ?? choice.id);
  return `
    <button class="choice" data-action="choose-event" data-choice-id="${choice.id}">
      <div class="split-row"><h3>${title}</h3><span class="tag warn">${ko.ui.choose}</span></div>
      <p class="small muted">${desc}</p>
      <div class="meta">
        ${choicePreviewTags(choice, state)}
      </div>
    </button>
  `;
}

function relicRow(state, relicId) {
  const relic = relics[relicId];
  const values = getRelicCurrentValue(state, relicId);
  return `
    <div class="card relic-row ${changedClass(state.changed.relics?.[relicId])}">
      <div>
        <h3>${relicName(relicId)}</h3>
        <p class="small muted">${relicDesc(relicId)}</p>
        <div class="stack small">
          ${values.map((line) => `<p>${line}</p>`).join("")}
        </div>
      </div>
      <span class="tag">${ko.categories[relic.category] ?? relic.category}</span>
    </div>
  `;
}

function activeSkillDetails(estimate) {
  const label = estimate.effectType === "heal" ? "Estimated Heal" : "Estimated Damage";
  return `
    <p class="small">${ko.ui.skillUsed}: ${Math.round(estimate.activationChance * 100)}% (${Math.round(estimate.baseActivationChance * 100)}% base)</p>
    <p class="small">Formula: ${estimate.scalingStat} ${estimate.scalingValue} x ${estimate.power} = ${estimate.baseValue}</p>
    <p class="small muted">${label}: ${estimate.finalValue}</p>
  `;
}

function passiveSkillDetails(skill) {
  const stats = Object.entries(skill.passiveStats ?? {}).map(([key, value]) => `${key} +${value}`).join(", ");
  return `<p class="small">Passive Bonus: ${stats || "No passive stat bonus"}</p>`;
}

function pendingRelicChoice(relicId) {
  return `
    <div class="result-line">
      <span>${ko.ui.pendingRelic ?? "Relic Choice"}</span>
      <strong>${relicName(relicId)} - ${relicDesc(relicId)}</strong>
    </div>
    <div class="button-row">
      <button class="primary" data-action="accept-relic">${ko.ui.acceptRelic ?? "Take Relic"}</button>
      <button data-action="decline-relic">${ko.ui.declineRelic ?? "Decline Relic"}</button>
    </div>
  `;
}

function fighterBox(name, fighter, tone) {
  return `
    <div class="card fighter ${tone}">
      <div class="split-row"><h3>${name}</h3><strong>${Math.max(0, Math.ceil(fighter.hp))}/${fighter.stats.HP}</strong></div>
      ${progressBar(fighter.hp, fighter.stats.HP, tone)}
      <div class="tag-list">
        ${fighter.guard ? tag(`${ko.ui.block} ${fighter.guard}`, "ok") : ""}
        ${fighter.poison.turns ? tag(`poison ${fighter.poison.turns}`, "warn") : ""}
      </div>
    </div>
  `;
}

function choicePreviewTags(choice, state) {
  const tags = [];
  if (choice.jobOptions) {
    tags.push(tag(choice.jobOptions.map((jobId) => jobName(jobId)).join(", ") || ko.ui.noChoices, choice.jobOptions.length ? "warn" : "danger"));
  }
  if (choice.winRate !== null && choice.winRate !== undefined) {
    tags.push(tag(`${ko.ui.winRate} ${choice.winRate}%`, choice.winRate >= 60 ? "ok" : choice.winRate <= 35 ? "danger" : "warn"));
  }
  if (choice.xp) {
    tags.push(tag(`${ko.ui.xpReward} ${choice.xp}`));
  }
  if (choice.category) {
    tags.push(tag(`${ko.ui.relicCategory}: ${ko.categories[choice.category] ?? choice.category}`));
  }
  if (choice.enemyDamageType) {
    tags.push(tag(`${ko.ui.enemyDamageType}: ${damageTypeName(choice.enemyDamageType)}`));
  }
  if (choice.enemyDefenseProfile) {
    tags.push(tag(`${ko.ui.enemyDefenseProfile}: ${defenseProfileName(choice.enemyDefenseProfile)}`));
  }
  if (choice.type === "training" || choice.type === "directional") {
    const currentJob = jobs[state.currentJobId];
    const currentPercent = getCurrentJobProgress(state);
    const possiblePercent = Math.min(100, Math.floor(((state.player.currentJobXp + (choice.xp ?? 0)) / currentJob.xpRequired) * 100));
    const milestone = currentJob.milestones.find((item) => item.percent > currentPercent && item.percent <= possiblePercent);
    tags.push(tag(`${ko.ui.jobXp}: ${jobName(currentJob.id)} +${choice.xp ?? 0}`));
    if (milestone) {
      tags.push(tag(`${ko.ui.possibleMilestone}: ${milestoneName(milestone)}`, "ok"));
    }
  }
  return tags.join("");
}

function xpResultRows(summary) {
  if (!summary) {
    return "";
  }
  const rows = [
    resultLine(ko.ui.jobXp, `${jobName(summary.jobId)} +${summary.xpGained} (${summary.jobXpBefore} -> ${summary.jobXpAfter})`)
  ];
  if (summary.pendingJobXp) {
    rows.push(resultLine("Carryover", `+${summary.pendingJobXp}`));
  }
  if (summary.apGained) {
    rows.push(resultLine(ko.ui.ap, `+${summary.apGained}`));
  }
  return rows.join("");
}

function statResultRows(changes) {
  if (!changes || Object.keys(changes).length === 0) {
    return "";
  }
  return resultLine(ko.ui.statChanges, Object.entries(changes).map(([key, value]) => `${ko.stats[key] ?? key} +${value}`).join(", "));
}

function skillResultRows(summary) {
  if (!summary || Object.keys(summary.skillMasteryChanges).length === 0) {
    return "";
  }
  return resultLine(ko.ui.skillMastery, Object.entries(summary.skillMasteryChanges).map(([skillId, value]) => `${skillName(skillId)} +${value}`).join(", "));
}

function unlockResultRows(summary) {
  if (!summary) {
    return "";
  }
  const items = [
    ...summary.skillsUnlocked.map((skillId) => `${ko.ui.unlocked}: ${skillName(skillId)}`),
    ...summary.skillsMastered.map((skillId) => `${ko.ui.mastered}: ${skillName(skillId)}`),
    ...summary.jobsUnlocked.map((jobId) => `${ko.ui.unlocked}: ${jobName(jobId)}`),
    summary.jobMastered ? `${ko.ui.mastered}: ${jobName(summary.jobMastered)}` : ""
  ].filter(Boolean);
  return items.length ? resultLine(ko.ui.unlocked, items.join(", ")) : "";
}

function battleResultRows(result) {
  return [
    resultLine(ko.ui.battle, result.battle.won ? ko.ui.victory : ko.ui.defeat),
    resultLine(ko.ui.enemy, monsterOrBossName(result.battle.enemyId)),
    resultLine(ko.ui.turn, `${result.battle.turn}`),
    resultLine(ko.ui.survived, `${Math.max(0, Math.ceil(result.battle.player.hp))}/${result.battle.player.stats.HP}`)
  ].join("");
}

function resultLine(label, value) {
  return `<div class="result-line"><span>${label}</span><strong>${value}</strong></div>`;
}

function resultTitle(choice, result) {
  if (result.jobChangedTo) {
    return `${ko.ui.jobChanged}: ${jobName(result.jobChangedTo)}`;
  }
  if (result.jobSkipped) {
    return ko.ui.skipJobChange ?? "Skip Job Change";
  }
  if (result.battle) {
    const outcome = result.battle.won ? ko.ui.victory : ko.ui.defeat;
    return `${outcome}: ${choice.type === "boss" ? bossName(choice.monsterId) : monsterName(choice.monsterId)}`;
  }
  if (choice.type === "hunt") {
    return monsterName(choice.monsterId);
  }
  if (choice.type === "boss") {
    return bossName(choice.monsterId);
  }
  return eventName(choice.templateId ?? choice.id);
}

function progressBar(value, max, tone) {
  const percent = clampPercent((value / Math.max(1, max)) * 100);
  return `<div class="bar ${tone}"><span style="width: ${percent}%"></span></div>`;
}

function growthText(growth) {
  return Object.entries(growth).map(([key, value]) => `${key}+${value}`).join(", ");
}

function milestoneName(milestone) {
  if (milestone.type === "skill") {
    return skillName(milestone.skillId);
  }
  return ko.ui.mastered;
}

function panel(content) {
  return `<section class="panel">${content}</section>`;
}

function tag(text, tone = "") {
  return `<span class="tag ${tone}">${text}</span>`;
}

function changedClass(active) {
  return active ? "changed" : "";
}

function actorName(actor) {
  if (actor === "player") {
    return ko.ui.player;
  }
  if (actor === "enemy") {
    return ko.ui.enemy;
  }
  return actor;
}

function damageTypeName(type) {
  return type === "magic" ? ko.ui.magic : ko.ui.physical;
}

function defenseProfileName(profile) {
  return profile === "high_magic_defense" ? ko.ui.highMagicDefense : ko.ui.highPhysicalDefense;
}

function conditionText(condition) {
  if (condition.type === "hp_below") {
    return `Player HP <= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_above") {
    return `Enemy HP >= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_below") {
    return `Enemy HP <= ${Math.round(condition.value * 100)}%`;
  }
  return condition.type;
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

function monsterOrBossName(id) {
  return ko.monsters[id]?.name ?? ko.bosses[id]?.name ?? id;
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
