import { bosses } from "../data/bosses.js";
import { jobs } from "../data/jobs.js?v=20260607-15";
import { monsters } from "../data/monsters.js?v=20260607-15";
import { relics } from "../data/relics.js?v=20260607-15";
import { skills } from "../data/skills.js?v=20260607-15";
import { getCurrentJobProgress, getEffectiveJobXpRequired, getJobRequirementHints, getJobState, isJobDiscovered, isJobUnlocked } from "../systems/jobs.js";
import { canUseSkill, getEffectiveApCost, getEquippedApCost, getEquippedSlotCount, getSkillEquipBlockReason, getSkillEstimate, skillSlotLimits } from "../systems/skills.js";
import { getRelicCurrentValue } from "../systems/relics.js";
import { getStalemateDamageMultiplier } from "../systems/battle.js";
import { clampPercent, getEffectiveStats, statKeys } from "../systems/stats.js";
import { ko } from "../i18n/ko.js?v=20260607-15";

export function statusPanel(state) {
  const progress = getCurrentJobProgress(state);
  const currentJob = jobs[state.currentJobId];
  const currentJobXpRequired = getEffectiveJobXpRequired(currentJob);
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
    <p class="small muted">${state.player.currentJobXp}/${currentJobXpRequired} XP${nextMilestone ? ` / ${nextMilestone.percent}% ${milestoneName(nextMilestone)}` : ""}</p>
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
    ${state.activeJobEvent ? activeJobEventPanel(state) : state.activeHuntEvent ? activeHuntEventPanel(state) : `
      <div class="choice-list">
        ${state.choices.length ? state.choices.map((choice) => choiceButton(choice, state)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
      </div>
    `}
  `);
}

function activeHuntEventPanel(state) {
  const event = state.activeHuntEvent;
  return `
    <div class="card stack">
      <div class="title-row">
        <h3>${eventName(event.templateId)}</h3>
        <span class="tag warn">${event.elite ? "Elite" : "Hunt"}</span>
      </div>
      <p class="small muted">${eventDesc(event.templateId)}</p>
      <div class="choice-list">
        ${event.monsterOptions.map((choice) => monsterChoiceButton(choice, state)).join("")}
      </div>
    </div>
  `;
}

export function jobsPanel(state) {
  const visibleJobs = Object.values(jobs).filter((job) => isJobDiscovered(state, job.id));
  return panel(`
    <div class="title-row"><h2>${ko.ui.jobOptions}</h2></div>
    <div class="stack">
      ${visibleJobs.length ? visibleJobs.map((job) => jobOption(state, job, false)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
    </div>
  `, "jobs-panel");
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

export function battleLogModal(state) {
  if (!state.showBattleLog || !state.actionResult?.battle) {
    return "";
  }
  const battle = state.actionResult.battle;
  const turnRows = battleTimelineRows(battle);
  return `
    <div class="modal-backdrop" data-action="close-battle-log">
      <section class="modal" role="dialog" aria-modal="true" aria-label="${ko.ui.battleLog}">
        <div class="title-row">
          <h2>${ko.ui.battleLog}</h2>
          <button data-action="close-battle-log">${ko.ui.closeBattleLog ?? "Close"}</button>
        </div>
        <div class="battle-log-header">
          <span></span>
          <span>${ko.ui.player}</span>
          <span>${monsterOrBossName(battle.enemyId)}</span>
        </div>
        <div class="modal-log battle-timeline">
          ${turnRows.length ? turnRows.map((row) => battleTimelineRow(row)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
        </div>
      </section>
    </div>
  `;
}

function battleTimelineRows(battle) {
  const rowsByTurn = new Map();
  for (const entry of [...(battle.history ?? [])].reverse()) {
    const turn = entry.turn ?? "-";
    if (!rowsByTurn.has(turn)) {
      rowsByTurn.set(turn, { turn, player: [], enemy: [], status: [], hp: null });
    }
    const row = rowsByTurn.get(turn);
    if (entry.hp) {
      row.hp = entry.hp;
    }
    if (entry.actor === "player") {
      row.player.push(entry);
    } else if (entry.actor === "enemy") {
      row.enemy.push(entry);
    } else {
      row.status.push(entry);
    }
  }
  return [...rowsByTurn.values()];
}

function battleTimelineRow(row) {
  return `
    <div class="timeline-turn">
      <div class="timeline-turn-label">
        <strong>${ko.ui.turn} ${row.turn}</strong>
        ${row.hp ? `<p class="small muted">${ko.ui.player} HP ${row.hp.player.current}/${row.hp.player.max}<br>${ko.ui.enemy} HP ${row.hp.enemy.current}/${row.hp.enemy.max}</p>` : ""}
      </div>
      <div class="timeline-side player-side">
        ${row.player.length ? row.player.map((entry) => battleTimelineEntry(entry)).join("") : `<span class="muted small">-</span>`}
      </div>
      <div class="timeline-side enemy-side">
        ${row.enemy.length ? row.enemy.map((entry) => battleTimelineEntry(entry)).join("") : `<span class="muted small">-</span>`}
      </div>
      ${row.status.length ? `<div class="timeline-status">${row.status.map((entry) => battleTimelineEntry(entry)).join("")}</div>` : ""}
    </div>
  `;
}

function battleTimelineEntry(entry) {
  return `
    <div class="timeline-entry">
      <p>${formatLogText(entry.text)}</p>
      <div class="tag-list">
        ${entry.skillId ? tag(skillName(entry.skillId), "warn") : ""}
        ${entry.damage ? tag(`${ko.ui.damage} ${entry.damage}`, "danger") : ""}
        ${entry.heal ? tag(`${ko.ui.heal} ${entry.heal}`, "ok") : ""}
        ${entry.miss ? tag(ko.ui.miss) : ""}
        ${entry.crit ? tag(ko.ui.crit, "danger") : ""}
        ${entry.block ? tag(ko.ui.block, "ok") : ""}
        ${entry.status ? tag(`${ko.ui.statusEffect}: ${entry.status}`, "warn") : ""}
      </div>
    </div>
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
      ${result.battle ? `<button class="primary" data-action="open-battle-log">${ko.ui.viewBattleLog ?? "View Battle Log"}</button>` : ""}
      ${result.noBattleRewards ? resultLine(ko.ui.noBattleRewards ?? "No rewards", ko.ui.defeat ?? "Defeat") : ""}
      ${result.jobChangedTo ? resultLine(ko.ui.jobChanged, jobName(result.jobChangedTo)) : ""}
      ${result.jobSkipped ? resultLine(ko.ui.noJobChange ?? "No Job Change", ko.ui.skipped ?? "Skipped") : ""}
      ${xpResultRows(result.xpSummary)}
      ${statResultRows(result.statChanges ?? result.xpSummary?.statChanges)}
      ${skillResultRows(result.xpSummary)}
      ${unlockResultRows(result.xpSummary)}
      ${directUnlockResultRows(result)}
      ${result.pendingRelicId ? pendingRelicChoice(result.pendingRelicId) : ""}
      ${result.relicId ? resultLine(ko.ui.relics, `${relicName(result.relicId)} - ${relicDesc(result.relicId)}`) : ""}
      ${result.relicDeclinedId ? resultLine(ko.ui.declinedRelic ?? "Declined Relic", `${relicName(result.relicDeclinedId)} - ${relicDesc(result.relicDeclinedId)}`) : ""}
    </div>
  `);
}

function activeJobEventPanel(state) {
  const event = state.activeJobEvent;
  const jobOptions = event.jobOptions.filter((jobId) => isJobUnlocked(state, jobId));
  return `
    <div class="card stack">
      <div class="title-row">
        <h3>${eventName(event.templateId)}</h3>
        <span class="tag warn">${event.jobTier}</span>
      </div>
      <p class="small muted">${eventDesc(event.templateId)}</p>
      ${jobOptions.length ? jobOptions.map((jobId) => jobOption(state, jobs[jobId], true)).join("") : `<p class="muted">${ko.ui.noChoices}</p>`}
      <button data-action="skip-job-change">${ko.ui.skipJobChange ?? "Skip Job Change"}</button>
    </div>
  `;
}

function jobOption(state, job, canChangeFromEvent) {
  const jobState = getJobState(state, job.id);
  const discovered = isJobDiscovered(state, job.id);
  const unlocked = isJobUnlocked(state, job.id);
  const mastered = state.masteredJobs.includes(job.id);
  const current = state.currentJobId === job.id;
  const percent = current ? getCurrentJobProgress(state) : 0;
  if (!discovered) {
    return "";
  }
  const milestones = job.milestones.map((milestone) => {
    if (milestone.type === "skill") {
      return `${milestone.percent}% ${skillName(milestone.skillId)} - ${skillDesc(milestone.skillId)}`;
    }
    return `${milestone.percent}% ${ko.ui.mastered}, AP +${job.apReward}`;
  }).join(" / ");
  const advanced = Object.values(jobs)
    .filter((candidate) => isJobDiscovered(state, candidate.id) && (candidate.requires?.masteredAll?.includes(job.id) || candidate.requires?.masteredAny?.includes(job.id)))
    .map((candidate) => jobName(candidate.id))
    .join(", ");
  const buttonDisabled = !canChangeFromEvent || !unlocked || current;
  const hints = getJobRequirementHints(job);

  return `
    <div class="card job-option ${changedClass(state.changed.jobs?.[job.id])}">
      <div>
        <div class="split-row"><h3>${jobName(job.id)}</h3><span class="tag ${mastered ? "ok" : unlocked ? "warn" : ""}">${jobState}</span></div>
        <p class="small muted">${jobDesc(job.id)}</p>
        <p class="small">XP ${getEffectiveJobXpRequired(job)} / ${growthText(job.growth)}</p>
        ${hints.length ? `<p class="small muted">Requirements: ${hints.join(" / ")}</p>` : ""}
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
  const usable = canUseSkill(state, skillId);
  const action = equipped ? "unequip-skill" : "equip-skill";
  const equipBlockReason = equipped ? null : getSkillEquipBlockReason(state, skillId);
  const disabled = Boolean(equipBlockReason);
  return `
    <div class="card skill-row ${changedClass(state.changed.skills?.[skillId])}">
      <div>
        <div class="split-row"><h3>${skillName(skillId)}</h3><span class="tag">${estimate.apCost} AP</span></div>
        <p class="small muted">${skillDesc(skillId)}</p>
        <div class="tag-list">
          ${tag(skill.type)}
          ${(skill.tags ?? []).map((tagId) => tag(tagId)).join("")}
          ${skillFeatureTags(skill)}
          ${estimate.onTheme ? tag("job theme", "ok") : tag("off theme", "warn")}
          ${mastered ? tag(ko.ui.mastered, "ok") : usable ? tag(ko.ui.currentJobOnly, "warn") : tag(ko.ui.locked, "danger")}
        </div>
        ${skill.type === "passive" ? passiveSkillDetails(skill) : activeSkillDetails(estimate)}
        <p class="small muted">AP Cost: ${estimate.baseApCost}${estimate.baseApCost !== estimate.apCost ? ` -> ${estimate.apCost}` : ""}</p>
        ${equipBlockReason ? `<p class="small danger-text">${equipBlockReasonText(equipBlockReason)}</p>` : ""}
        ${estimate.condition ? `<p class="small muted">Condition: ${conditionText(estimate.condition)}</p>` : ""}
        ${progressBar(mastery, 100, "mastery")}
        <p class="small muted">${mastered ? ko.ui.mastered : `${mastery}%`}</p>
      </div>
      <button data-action="${action}" data-skill-id="${skillId}" ${disabled ? "disabled" : ""}>${equipped ? ko.ui.unequip : ko.ui.equip}</button>
    </div>
  `;
}

function equipBlockReasonText(reason) {
  if (reason.type === "slot") {
    return `장착 불가: ${ko.tags?.[reason.skillType] ?? reason.skillType} 슬롯 ${reason.current}/${reason.limit}`;
  }
  if (reason.type === "ap") {
    return `장착 불가: AP ${reason.currentAp}+${reason.cost}/${reason.totalAp}`;
  }
  if (reason.type === "unavailable") {
    return "장착 불가: 마스터하지 않았고 현재 직업의 스킬도 아닙니다.";
  }
  return "장착 불가";
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

function monsterChoiceButton(choice, state) {
  return `
    <button class="choice" data-action="choose-monster" data-monster-choice-id="${choice.id}">
      <div class="split-row"><h3>${monsterName(choice.monsterId)}</h3><span class="tag warn">${ko.ui.choose}</span></div>
      <p class="small muted">${eventName(choice.templateId)}</p>
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
    ${estimate.inverseScaleStat ? `<p class="small muted">Inverse Scaling: low ${estimate.inverseScaleStat} adds +${Math.round(estimate.inverseScaleBonus)} effective ${estimate.scalingStat} before scaling.</p>` : ""}
    ${estimate.absolute ? `<p class="small muted">Absolute Damage: ignores defense, block, critical, resistance, and damage multipliers.</p>` : ""}
    ${estimate.inverseCrit ? `<p class="small muted">Reverse Crit: lower CRT increases critical chance. Formula: ${estimate.inverseCritBase ?? 42} - CRT, minimum ${estimate.inverseCritFloor ?? 5}%.</p>` : ""}
    ${estimate.maxHpValue ? `<p class="small">MHP Bonus: +${estimate.maxHpValue}</p>` : ""}
    ${estimate.repeatChancePenalty ? `<p class="small muted">${ko.ui.repeatChancePenalty ?? "Repeated uses"}: -${Math.round(estimate.repeatChancePenalty * 100)}% / ${ko.ui.minChance ?? "Min"} ${Math.round((estimate.minChance ?? 0) * 100)}%</p>` : ""}
    ${estimate.maxUses ? `<p class="small muted">${ko.ui.oncePerBattle ?? "Battle Limit"}: ${estimate.maxUses} / battle</p>` : ""}
    ${estimate.statusEffects.length ? `<p class="small muted">${ko.ui.statusEffect}: ${estimate.statusEffects.map((effect) => statusEffectText(effect)).join(" / ")}</p>` : ""}
    <p class="small muted">${label}: ${estimate.finalValue}</p>
  `;
}

function passiveSkillDetails(skill) {
  const stats = Object.entries(skill.passiveStats ?? {}).map(([key, value]) => formatStatDelta(key, value)).join(", ");
  const perRelic = Object.entries(skill.passivePerRelicStats ?? {}).map(([key, value]) => formatStatDelta(key, value)).join(", ");
  const eventWeights = Object.entries(skill.eventWeightMultipliers ?? {}).map(([key, value]) => `${key} x${value}`).join(", ");
  return `
    <p class="small">Passive Bonus: ${stats || "No passive stat bonus"}</p>
    ${perRelic ? `<p class="small muted">Per Relic Bonus: ${perRelic} each, up to ${skill.passivePerRelicCap ?? "no"} relics</p>` : ""}
    ${skill.eventChoiceBonus ? `<p class="small muted">Event Choices: +${skill.eventChoiceBonus}</p>` : ""}
    ${eventWeights ? `<p class="small muted">Event Weights: ${eventWeights}</p>` : ""}
  `;
}

function formatStatDelta(key, value) {
  return `${key} ${value > 0 ? "+" : ""}${value}`;
}

function skillFeatureTags(skill) {
  const features = [];
  if (skill.id !== "basic_attack" && skill.type === "active" && skill.apCost === 0 && skill.chance >= 1) {
    features.push(tag(ko.ui.basicAttackReplacement ?? "Basic Attack Replacement", "ok"));
  }
  if (skill.priority) {
    features.push(tag(ko.ui.prioritySkill ?? "Priority", "warn"));
  }
  if (skill.condition) {
    features.push(tag(ko.ui.conditionalSkill ?? "Conditional"));
  }
  if ((skill.effects ?? []).some((effect) => effect.type === "heal")) {
    features.push(tag(ko.ui.heal));
  }
  if ((skill.effects ?? []).some((effect) => effect.type === "guard")) {
    features.push(tag(ko.ui.block));
  }
  if ((skill.effects ?? []).some((effect) => effect.type === "poison")) {
    features.push(tag(ko.ui.statusEffect));
  }
  if ((skill.effects ?? []).some((effect) => effect.type === "status")) {
    features.push(tag(ko.ui.statusEffect, "warn"));
  }
  if (skill.maxUses) {
    features.push(tag(ko.ui.oncePerBattle ?? "Limited", "danger"));
  }
  return features.join("");
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
        ${fighter.poison ? tag(`${ko.statuses?.poison ?? "독"} ${fighter.poison}`, "warn") : ""}
        ${Object.entries(fighter.typedStatuses ?? {}).map(([id, status]) => tag(`${displayLabel(id)} ${status.amount}${status.turns ? `/${status.turns}T` : ""}`, "warn")).join("")}
        ${(fighter.summons ?? []).length ? tag(`${ko.effects?.summon ?? "소환"} ${(fighter.summons ?? []).length}`, "ok") : ""}
        ${Object.entries(fighter.resources ?? {}).filter(([, value]) => value > 0).map(([id, value]) => tag(`${displayLabel(id)} ${value}`, "ok")).join("")}
        ${(fighter.statuses ?? []).map((status) => tag(`${displayLabel(status.id)} ${status.permanent ? ko.ui.battleLong : status.turns}`, "warn")).join("")}
      </div>
    </div>
  `;
}

function statusEffectText(effect) {
  if (effect.type === "typed_status") {
    return `${displayLabel(effect.kind)} ${effect.amount}${effect.turns ? ` ${effect.turns}T` : ""}`;
  }
  if (effect.type === "poison") {
    return `${ko.statuses?.poison ?? "독"} ${effect.amount ?? effect.power ?? 0}`;
  }
  if (effect.type === "summon") {
    return `${ko.effects?.summon ?? "소환"} ${displayLabel(effect.summonId)}`;
  }
  if (effect.type === "rune") {
    return `${ko.effects?.rune ?? "룬 설치"} ${displayLabel(effect.runeId)}`;
  }
  if (effect.type === "shield") {
    return `${ko.effects?.shield ?? ko.ui.block} ${effect.amount ?? 0}`;
  }
  if (effect.type === "resource") {
    return `${ko.effects?.resource ?? "자원"} ${displayLabel(effect.key)} +${effect.amount ?? 0}`;
  }
  if (effect.type === "consume_resource") {
    return `${ko.effects?.consume_resource ?? "자원 소비"} ${displayLabel(effect.key)}`;
  }
  if (effect.type === "consume_status") {
    return `${ko.effects?.consume_status ?? "상태 소비"} ${displayLabel(effect.kind)}`;
  }
  if (effect.type === "clear_resource") {
    return `${ko.effects?.clear_resource ?? "자원 초기화"} ${displayLabel(effect.key)}`;
  }
  if (effect.type === "extra_action") {
    return `${ko.effects?.extra_action ?? "재행동"} ${Math.round((effect.chance ?? 1) * 100)}%`;
  }
  if (effect.type === "sacrifice") {
    return `${ko.effects?.sacrifice ?? "HP 소모"} ${Math.round((effect.ratio ?? 0) * 100)}%`;
  }
  if (effect.type === "stat_tradeoff") {
    return `${ko.effects?.stat_tradeoff ?? "능력치 전환"} ${Object.entries(effect.statMods ?? {}).map(([key, value]) => `${ko.stats[key] ?? key}${value > 0 ? "+" : ""}${value}`).join(", ")}`;
  }
  const parts = [`${effect.id} ${effect.permanent ? (ko.ui.battleLong ?? "battle-long") : `${effect.turns ?? 1}T`}`];
  if (effect.damageMultiplier && effect.damageMultiplier !== 1) {
    parts.push(`DMG x${effect.damageMultiplier}`);
  }
  if (effect.damageTakenMultiplier && effect.damageTakenMultiplier !== 1) {
    parts.push(`Taken x${effect.damageTakenMultiplier}`);
  }
  if (effect.defenseMultiplier && effect.defenseMultiplier !== 1) {
    parts.push(`DEF x${effect.defenseMultiplier}`);
  }
  if (effect.skillChanceMultiplier && effect.skillChanceMultiplier !== 1) {
    parts.push(`Skill chance x${effect.skillChanceMultiplier}`);
  }
  const stats = Object.entries(effect.statMods ?? {}).map(([key, value]) => `${key}${value > 0 ? "+" : ""}${value}`);
  if (stats.length) {
    parts.push(stats.join(", "));
  }
  return parts.join(" ");
}

function choicePreviewTags(choice, state) {
  const tags = [];
  if (choice.jobOptions) {
    tags.push(tag(choice.jobOptions.map((jobId) => jobName(jobId)).join(", ") || ko.ui.noChoices, choice.jobOptions.length ? "warn" : "danger"));
  }
  if (choice.monsterOptions) {
    tags.push(tag(`${ko.ui.enemy ?? "Enemy"} 3 ${ko.ui.choose}`, "warn"));
  }
  if (choice.winRate !== null && choice.winRate !== undefined) {
    tags.push(tag(`${ko.ui.winRate} ${choice.winRate}%`, choice.winRate >= 60 ? "ok" : choice.winRate <= 35 ? "danger" : "warn"));
  }
  if (choice.difficulty) {
    tags.push(tag(difficultyName(choice.difficulty), choice.difficulty === "dangerous" ? "danger" : choice.difficulty === "easy" ? "ok" : "warn"));
  }
  if (choice.xp) {
    tags.push(tag(`${ko.ui.xpReward} ${choice.xp}`));
  }
  if (choice.category && (choice.type !== "hunt" || choice.elite)) {
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
    const possiblePercent = Math.min(100, Math.floor(((state.player.currentJobXp + (choice.xp ?? 0)) / getEffectiveJobXpRequired(currentJob)) * 100));
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

function directUnlockResultRows(result) {
  const jobsUnlocked = result.jobsUnlocked ?? [];
  return jobsUnlocked.length ? resultLine(ko.ui.unlocked, jobsUnlocked.map((jobId) => jobName(jobId)).join(", ")) : "";
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

function panel(content, className = "") {
  return `<section class="panel ${className}">${content}</section>`;
}

function tag(text, tone = "") {
  return `<span class="tag ${tone}">${displayLabel(text)}</span>`;
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

function difficultyName(difficulty) {
  if (difficulty === "easy") {
    return ko.ui.easyHunt ?? "Easy";
  }
  if (difficulty === "dangerous") {
    return ko.ui.dangerousHunt ?? "Dangerous";
  }
  return ko.ui.normalHunt ?? "Normal";
}

function conditionText(condition) {
  if (condition.type === "hp_below") {
    return `플레이어 HP <= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_above") {
    return `적 HP >= ${Math.round(condition.value * 100)}%`;
  }
  if (condition.type === "enemy_hp_below") {
    return `적 HP <= ${Math.round(condition.value * 100)}%`;
  }
  return displayLabel(condition.type);
}

function jobName(id) {
  return ko.jobs[id]?.name ?? id;
}

function jobDesc(id) {
  return ko.jobs[id]?.desc ?? "";
}

function skillName(id) {
  return ko.skills[id]?.name ?? ko.enemySkills?.[id] ?? displayLabel(id);
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
  const replacements = {
    ...Object.fromEntries(Object.keys(jobs).map((id) => [id, jobName(id)])),
    ...Object.fromEntries(Object.keys(skills).map((id) => [id, skillName(id)])),
    ...Object.fromEntries(Object.keys(ko.enemySkills ?? {}).map((id) => [id, skillName(id)])),
    ...Object.fromEntries(Object.keys(relics).map((id) => [id, relicName(id)])),
    ...Object.fromEntries(Object.keys(monsters).map((id) => [id, monsterName(id)])),
    ...Object.fromEntries(Object.keys(bosses).map((id) => [id, bossName(id)]))
  };
  for (const [id, label] of Object.entries(replacements).sort((a, b) => b[0].length - a[0].length)) {
    output = replaceToken(output, id, label);
  }
  output = output
    .replace(/\bused\b/g, "사용")
    .replace(/\bdealt\b/g, "피해")
    .replace(/\bfor\b/g, "")
    .replace(/\bdamage\b/g, "피해")
    .replace(/\bcritical\b/g, "치명타")
    .replace(/\bmissed\b/g, "빗나감")
    .replace(/\brecovered\b/g, "회복")
    .replace(/\bhealed\b/g, "회복")
    .replace(/\bgained\b/g, "획득")
    .replace(/\bblock\b/g, "보호막")
    .replace(/\bshield\b/g, "보호막")
    .replace(/\bafter\b/g, "후");
  return output;
}

function replaceToken(text, token, label) {
  const escaped = token.replace(/[.*+?^${}()|[]\]/g, "\\$&");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?=$|[^A-Za-z0-9_])`, "g"), `$1${label}`);
}

function displayLabel(text) {
  return ko.tags?.[text] ?? ko.statuses?.[text] ?? ko.effects?.[text] ?? text;
}
