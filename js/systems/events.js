import { bosses } from "../data/bosses.js?v=20260607-14";
import { eventTemplates } from "../data/events.js?v=20260607-14";
import { jobs } from "../data/jobs.js?v=20260607-14";
import { monsters } from "../data/monsters.js?v=20260607-14";
import { skills } from "../data/skills.js?v=20260607-14";
import { addRelic, getAdvancedEventWeightMultiplier, getEventXpMultiplier, getPositiveEventRewardMultiplier, getRandomUnownedRelic, rejectRelic } from "./relics.js?v=20260607-14";
import { addStats, createBaseStats, scoreStats } from "./stats.js";
import { getAvailableAdvancedJobs, getAvailableBasicJobs, grantJobXp, updateJobDiscovery } from "./jobs.js";
import { createBattle, estimateWinRate, getBattleReward } from "./battle.js?v=20260607-14";

export function generateChoices(state) {
  if (state.gameOver) {
    return [];
  }
  if (state.day === 10 && state.actionInDay === 1 && !state.defeatedBosses.includes("oathbreaker")) {
    return [createBossChoice(state, "oathbreaker")];
  }
  if (state.day === 20 && state.actionInDay === 1 && !state.defeatedBosses.includes("void_acolyte")) {
    return [createBossChoice(state, "void_acolyte")];
  }
  if (state.day === 30 && state.actionInDay === 3) {
    return [createBossChoice(state, state.finalBossId, true)];
  }

  const choices = [];
  let attempts = 0;
  const choiceLimit = 3 + getEventChoiceBonus(state);
  while (choices.length < choiceLimit && attempts < 100) {
    attempts += 1;
    const template = weightedTemplate(state);
    const choice = createChoiceFromTemplate(state, template);
    if (!choice) {
      continue;
    }
    if (!choices.some((item) => getChoiceGroup(item) === getChoiceGroup(choice))) {
      choices.push(choice);
    }
  }
  return choices;
}

export function resolveChoice(state, choiceId) {
  const choice = state.choices.find((item) => item.id === choiceId);
  if (!choice) {
    return;
  }
  recordPassedUnchosenJobEvents(state, choiceId);

  if (choice.type === "job_event") {
    state.activeJobEvent = choice;
    state.log.unshift({ type: "event", text: `Opened ${choice.jobTier} job candidates.` });
    return;
  }

  if (choice.type === "training") {
    const xp = Math.round(choice.xp * getEventXpMultiplier(state));
    const xpSummary = grantJobXp(state, xp);
    setActionResult(state, choice, { xpSummary });
  }
  if (choice.type === "hunt_event") {
    state.activeHuntEvent = choice;
    state.log.unshift({ type: "event", text: `Opened ${choice.elite ? "elite" : "normal"} hunt candidates.` });
    return;
  }

  if (choice.type === "boss") {
    const enemy = choice.type === "boss" ? bosses[choice.monsterId] : monsters[choice.monsterId];
    state.battle = createBattle(state, enemy, { category: choice.category, elite: choice.elite, boss: choice.type === "boss", final: choice.final, difficultyScale: choice.difficultyScale });
    state.battleSpeed = "fast";
    state.pendingBattleChoice = choice;
    state.busy = true;
    return { battle: state.battle };
  }
  if (choice.type === "relic") {
    const pendingRelicId = getRandomUnownedRelic(state, choice.category);
    setActionResult(state, choice, { pendingRelicId });
  }
  if (choice.type === "stats") {
    const before = { ...state.player.stats };
    const growth = multiplyGrowth(choice.growth, getPositiveEventRewardMultiplier(state));
    addStats(state.player.stats, growth);
    const statChanges = diffStats(before, state.player.stats);
    markStatsChanged(state, statChanges);
    state.log.unshift({ type: "stats", text: `Gained stats from ${choice.id}.` });
    setActionResult(state, choice, { statChanges });
  }
  if (choice.type === "directional") {
    const xp = Math.round(choice.xp * getEventXpMultiplier(state, choice.category));
    const xpSummary = grantJobXp(state, xp, choice.category);
    setActionResult(state, choice, { xpSummary });
  }
}

export function selectHuntMonster(state, monsterChoiceId) {
  const huntEvent = state.activeHuntEvent;
  const choice = huntEvent?.monsterOptions.find((item) => item.id === monsterChoiceId);
  if (!choice) {
    return null;
  }
  const enemy = monsters[choice.monsterId];
  state.battle = createBattle(state, enemy, { category: choice.category, elite: choice.elite, difficultyScale: choice.difficultyScale });
  state.battleSpeed = "fast";
  state.pendingBattleChoice = choice;
  state.activeHuntEvent = null;
  state.busy = true;
  return { battle: state.battle };
}

export function refreshHuntWinRates(state) {
  for (const choice of state.choices ?? []) {
    if (choice.type === "hunt_event") {
      refreshMonsterOptions(state, choice.monsterOptions);
    }
  }
  if (state.activeHuntEvent?.monsterOptions) {
    refreshMonsterOptions(state, state.activeHuntEvent.monsterOptions);
  }
}

export function finishBattleAction(state) {
  if (!state.battle?.finished || !state.pendingBattleChoice) {
    return;
  }
  const choice = state.pendingBattleChoice;
  const reward = getBattleReward(state, state.battle);
  const baseXp = reward.won ? getBattleBaseXp(choice, reward) : 0;
  const xp = Math.round(baseXp * getEventXpMultiplier(state, choice.category, { elite: choice.elite }));
  const xpSummary = xp > 0 ? grantJobXp(state, xp, choice.category) : null;
  let relicId = null;

  if (reward.won && choice.type === "hunt" && choice.elite) {
    relicId = getRandomUnownedRelic(state, choice.category);
  }
  if (reward.won && choice.type === "hunt") {
    state.huntWins = (state.huntWins ?? 0) + 1;
    if (choice.elite) {
      state.eliteHuntWins = (state.eliteHuntWins ?? 0) + 1;
    }
  }
  if (reward.won && choice.type === "boss") {
    state.defeatedBosses.push(choice.monsterId);
    if (choice.final) {
      state.gameOver = true;
      state.victory = true;
    }
  }
  if (!reward.won && choice.final) {
    state.gameOver = true;
    state.victory = false;
  }

  state.log.unshift({ type: reward.won ? "win" : "loss", text: `${reward.won ? "Won" : "Lost"} battle against ${choice.monsterId}.` });
  setActionResult(state, choice, { battle: state.battle, xpSummary, noBattleRewards: !reward.won, pendingRelicId: relicId, bossWon: reward.won });
  state.pendingBattleChoice = null;
  state.busy = false;
}

function getBattleBaseXp(choice, reward) {
  if (choice.type === "hunt") {
    return choice.xp ?? 0;
  }
  return reward.xp * (choice.rewardMultiplier ?? 1);
}

export function acceptPendingRelic(state) {
  const relicId = state.actionResult?.pendingRelicId;
  if (!relicId) {
    return null;
  }
  const addedRelicId = addRelic(state, relicId);
  state.actionResult.pendingRelicId = null;
  if (addedRelicId) {
    const beforeUnlockedJobs = [...state.unlockedJobs];
    state.actionResult.relicId = addedRelicId;
    markRelicChanged(state, addedRelicId);
    state.log.unshift({ type: "relic", text: `Found relic ${addedRelicId}.` });
    updateJobDiscovery(state, [], state.actionResult.xpSummary ?? null);
    state.actionResult.jobsUnlocked = state.unlockedJobs.filter((jobId) => !beforeUnlockedJobs.includes(jobId));
  }
  return addedRelicId;
}

export function declinePendingRelic(state) {
  const relicId = state.actionResult?.pendingRelicId;
  if (!relicId) {
    return null;
  }
  const rejectedRelicId = rejectRelic(state, relicId);
  state.actionResult.pendingRelicId = null;
  if (rejectedRelicId) {
    state.actionResult.relicDeclinedId = rejectedRelicId;
    state.log.unshift({ type: "relic", text: `Declined relic ${rejectedRelicId}.` });
  }
  return rejectedRelicId;
}

export function skipJobChange(state) {
  if (!state.activeJobEvent) {
    return false;
  }
  const event = state.activeJobEvent;
  recordPassedAdvancedJobOffers(state, event);
  state.activeJobEvent = null;
  setActionResult(state, { templateId: event.templateId, type: "job_change" }, { jobSkipped: true });
  state.log.unshift({ type: "event", text: "Skipped job change." });
  return true;
}

export function recordPassedAdvancedJobOffers(state, event, selectedJobId = null, sourceJobId = state.currentJobId) {
  if (!event || event.jobTier !== "advanced" || !state.masteredJobs.includes(sourceJobId)) {
    return;
  }
  state.advancedJobOfferFatigue = state.advancedJobOfferFatigue ?? {};
  state.advancedJobOfferFatigue[sourceJobId] = state.advancedJobOfferFatigue[sourceJobId] ?? {};
  for (const jobId of event.jobOptions ?? []) {
    if (jobId === selectedJobId) {
      continue;
    }
    state.advancedJobOfferFatigue[sourceJobId][jobId] = (state.advancedJobOfferFatigue[sourceJobId][jobId] ?? 0) + 1;
  }
}

function recordPassedUnchosenJobEvents(state, selectedChoiceId) {
  for (const choice of state.choices ?? []) {
    if (choice.id === selectedChoiceId) {
      continue;
    }
    recordPassedAdvancedJobOffers(state, choice);
  }
}

export function continueAction(state) {
  if (state.actionResult?.pendingRelicId) {
    return;
  }
  const changedJob = Boolean(state.actionResult?.jobChangedTo);
  state.actionResult = null;
  state.showBattleLog = false;
  state.battle = null;
  state.pendingBattleChoice = null;
  state.activeJobEvent = null;
  state.activeHuntEvent = null;
  state.changed = {};
  advanceTime(state, { changedJob });
}

export function advanceTime(state, options = {}) {
  if (state.gameOver) {
    state.choices = [];
    return;
  }
  if (state.day >= 30 && state.actionInDay >= 3) {
    state.gameOver = true;
    state.victory = false;
    state.choices = [];
    return;
  }
  if (state.actionInDay >= 3) {
    state.day += 1;
    state.actionInDay = 1;
  } else {
    state.actionInDay += 1;
  }
  if (!options.changedJob) {
    state.actionsSinceJobChange += 1;
  }
  state.choices = generateChoices(state);
}

function createChoiceFromTemplate(state, template) {
  if (template.id === "basic_job_training") {
    return generateBasicJobEvent(state);
  }
  if (template.id === "advanced_job_training") {
    return generateAdvancedJobEvent(state);
  }
  if (template.type === "hunt") {
    if (template.elite && (state.huntWins ?? 0) <= 0) {
      return null;
    }
    return {
      id: `${template.id}_${Math.random()}`,
      templateId: template.id,
      type: "hunt_event",
      elite: template.elite,
      monsterOptions: createMonsterOptions(state, template)
    };
  }
  if (template.type === "relic") {
    const categories = ["job", "mastery", "ap", "holy", "dark", "dragon", "summon", "critical", "poison", "bleed", "risk"];
    return { ...template, id: `${template.id}_${Math.random()}`, templateId: template.id, category: categories[Math.floor(Math.random() * categories.length)] };
  }
  if (template.type === "stats") {
    return { ...template, id: `${template.id}_${Math.random()}`, templateId: template.id, growth: randomStatGrowth() };
  }
  return { ...template, id: template.id };
}

function getChoiceGroup(choice) {
  if (choice.type === "job_event" || choice.tags?.includes("job")) {
    return "job";
  }
  if (choice.type === "hunt_event" || choice.type === "hunt" || choice.tags?.includes("hunt")) {
    return "hunt";
  }
  return choice.tags?.[0] ?? choice.type ?? choice.templateId;
}

export function generateBasicJobEvent(state) {
  const jobOptions = sampleWeightedJobs(state, getAvailableBasicJobs(state), 3, getBasicJobOptionWeight);
  if (jobOptions.length === 0) {
    return null;
  }
  return {
    id: `basic_job_${Math.random()}`,
    templateId: "basic_job_training",
    type: "job_event",
    jobTier: "basic",
    jobOptions
  };
}

export function generateAdvancedJobEvent(state) {
  const jobOptions = sampleWeightedJobs(state, getAvailableAdvancedJobs(state), 3, getAdvancedJobOptionWeight);
  if (jobOptions.length === 0) {
    return null;
  }
  return {
    id: `advanced_job_${Math.random()}`,
    templateId: "advanced_job_training",
    type: "job_event",
    jobTier: "advanced",
    jobOptions
  };
}

function createBossChoice(state, bossId, final = false) {
  const boss = bosses[bossId];
  const difficultyScale = getBossDifficultyScale(state, final);
  return {
    id: `boss_${bossId}`,
    templateId: final ? "final_boss" : "mid_boss",
    type: "boss",
    monsterId: bossId,
    final,
    category: boss.relicCategories[0],
    xp: boss.xp,
    difficultyScale,
    enemyDamageType: boss.stats.MA > boss.stats.PA ? "magic" : "physical",
    enemyDefenseProfile: boss.stats.MD > boss.stats.PD ? "high_magic_defense" : "high_physical_defense",
    winRate: null
  };
}

function createMonsterOptions(state, template) {
  const slots = [
    { difficulty: "easy", levelOffset: template.elite ? 0 : -1, difficultyScale: 0.88, rewardMultiplier: 0.85 },
    { difficulty: "normal", levelOffset: template.elite ? 1 : 0, difficultyScale: 1, rewardMultiplier: 1 },
    { difficulty: "dangerous", levelOffset: template.elite ? 3 : 2, difficultyScale: 1.28, rewardMultiplier: 1.45 }
  ];
  const usedMonsterIds = new Set();
  return slots.map((slot) => {
    const monster = chooseMonsterForSlot(state, template.elite, slot.levelOffset, usedMonsterIds);
    usedMonsterIds.add(monster.id);
    const category = monster.relicCategories[Math.floor(Math.random() * monster.relicCategories.length)];
    const difficultyScale = getAdaptiveDifficultyScale(state, slot.difficulty, template.elite, slot.difficultyScale);
    return {
      id: `${template.id}_${monster.id}_${Math.random()}`,
      templateId: template.id,
      type: "hunt",
      monsterId: monster.id,
      elite: template.elite,
      difficulty: slot.difficulty,
      difficultyScale,
      rewardMultiplier: slot.rewardMultiplier,
      category,
      xp: getHuntXpReward(monster, template.elite, slot.rewardMultiplier),
      enemyDamageType: getEnemyDamageType(monster),
      enemyDefenseProfile: monster.stats.MD > monster.stats.PD ? "high_magic_defense" : "high_physical_defense",
      winRate: estimateWinRate(state, monster, { elite: template.elite, difficultyScale })
    };
  });
}

function refreshMonsterOptions(state, monsterOptions) {
  for (const option of monsterOptions ?? []) {
    const monster = monsters[option.monsterId];
    if (!monster) {
      continue;
    }
    option.winRate = estimateWinRate(state, monster, { elite: option.elite, difficultyScale: option.difficultyScale });
  }
}

function getHuntXpReward(monster, elite, rewardMultiplier = 1) {
  const huntMultiplier = elite ? 0.62 : 0.48;
  return Math.max(8, Math.round(monster.xp * rewardMultiplier * huntMultiplier));
}

function getAdaptiveDifficultyScale(state, difficulty, elite, baseScale) {
  const growthRatio = getPermanentStatGrowthRatio(state);
  const pressureByDifficulty = {
    easy: 0.1,
    normal: 0.52,
    dangerous: 0.92
  };
  const pressure = (pressureByDifficulty[difficulty] ?? 0.45) + (elite ? 0.32 : 0);
  const cap = difficulty === "easy" ? 0.18 : elite ? 1.15 : difficulty === "dangerous" ? 0.92 : 0.65;
  const dayPressure = Math.max(0, state.day - 18) * (elite ? 0.035 : difficulty === "dangerous" ? 0.025 : difficulty === "normal" ? 0.014 : 0.004);
  const bonus = Math.min(cap, growthRatio * pressure + dayPressure);
  return Number((baseScale + bonus).toFixed(2));
}

function getBossDifficultyScale(state, final = false) {
  const growthRatio = getPermanentStatGrowthRatio(state);
  const dayBonus = Math.min(0.28, Math.max(0, state.day - 10) * 0.012);
  const growthBonus = Math.min(final ? 0.35 : 0.25, growthRatio * 0.3);
  const finalBonus = final ? 0.12 : 0;
  return Number((1 + dayBonus + growthBonus + finalBonus).toFixed(2));
}

function getPermanentStatGrowthRatio(state) {
  const baseScore = scoreStats(createBaseStats());
  const currentScore = scoreStats(state.player.stats);
  return Math.max(0, (currentScore - baseScore) / Math.max(1, baseScore));
}

function chooseMonsterForSlot(state, elite, levelOffset, usedMonsterIds) {
  const lateLevelBoost = state.day >= 25 ? 1 : 0;
  const targetLevel = Math.max(1, Math.floor((state.day + 2) / 3) + lateLevelBoost + (elite ? 2 : 0) + levelOffset);
  const available = Object.values(monsters).filter((monster) => !usedMonsterIds.has(monster.id));
  const exactPool = available.filter((monster) => monster.level === targetLevel);
  if (exactPool.length > 0) {
    return exactPool[Math.floor(Math.random() * exactPool.length)];
  }
  return available
    .sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel) || a.level - b.level)[0] ?? Object.values(monsters)[0];
}

function getEnemyDamageType(monster) {
  if (monster.damageType && monster.damageType !== "mixed") {
    return monster.damageType;
  }
  return monster.stats.MA > monster.stats.PA ? "magic" : "physical";
}

function weightedTemplate(state) {
  const weighted = eventTemplates.map((template) => ({
    template,
    weight: (template.id === "advanced_job_training" ? template.weight * getAdvancedEventWeightMultiplier(state) : template.weight) * getTemplateWeightMultiplier(state, template.id)
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const { template, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) {
      return template;
    }
  }
  return eventTemplates[0];
}

function getEquippedPassiveSkills(state) {
  return state.player.equippedSkills
    .map((skillId) => skills[skillId])
    .filter((skill) => skill?.type === "passive");
}

function getEventChoiceBonus(state) {
  return Math.min(1, getEquippedPassiveSkills(state).reduce((sum, skill) => sum + (skill.eventChoiceBonus ?? 0), 0));
}

function getTemplateWeightMultiplier(state, templateId) {
  return getEquippedPassiveSkills(state).reduce((multiplier, skill) => multiplier * (skill.eventWeightMultipliers?.[templateId] ?? 1), 1);
}

function randomStatGrowth() {
  const options = [
    { HP: 16, PA: 2 },
    { HP: 12, PD: 3 },
    { MA: 3, MD: 2 },
    { SPD: 3, EVA: 2 },
    { ACC: 4, CRT: 2 },
    { PA: 2, CRD: 8 }
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function sampleJobs(jobIds, limit) {
  const pool = [...jobIds];
  const result = [];
  while (pool.length > 0 && result.length < limit) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function sampleWeightedJobs(state, jobIds, limit, weightFn = getAdvancedJobOptionWeight) {
  const pool = [...jobIds];
  const result = [];
  while (pool.length > 0 && result.length < limit) {
    const total = pool.reduce((sum, jobId) => sum + weightFn(state, jobId), 0);
    let roll = Math.random() * total;
    let selectedIndex = 0;
    for (let index = 0; index < pool.length; index += 1) {
      roll -= weightFn(state, pool[index]);
      if (roll <= 0) {
        selectedIndex = index;
        break;
      }
    }
    result.push(pool.splice(selectedIndex, 1)[0]);
  }
  return result;
}

function getBasicJobOptionWeight(state, jobId) {
  const job = jobs[jobId];
  if (!job) {
    return 1;
  }
  const skillMultiplier = getMasteredJobSkillMultiplier(state, job);
  return Math.max(0.35, (1 + (job.tier ?? 1)) * skillMultiplier);
}

function getAdvancedJobOptionWeight(state, jobId) {
  const job = jobs[jobId];
  if (!job) {
    return 1;
  }
  const requires = job.requires ?? {};
  const currentThemes = jobs[state.currentJobId]?.themes ?? [];
  const requiredJobIds = [
    ...(requires.masteredAll ?? []),
    ...(requires.masteredAny ?? []),
    ...(requires.visitedAll ?? []),
    ...(requires.visitedAny ?? [])
  ];
  const visitedMatches = requiredJobIds.filter((id) => state.visitedJobs.includes(id)).length;
  const masteredMatches = requiredJobIds.filter((id) => state.masteredJobs.includes(id)).length;
  const themeMatches = (job.themes ?? []).filter((theme) => currentThemes.includes(theme)).length;
  const fatigue = state.advancedJobOfferFatigue?.[state.currentJobId]?.[jobId] ?? 0;
  const fatigueMultiplier = Math.max(0.28, 0.75 ** fatigue);
  const skillMultiplier = getMasteredJobSkillMultiplier(state, job);
  return Math.max(0.25, (1 + job.tier * 1.4 + visitedMatches * 1.2 + masteredMatches * 2.4 + themeMatches * 0.8) * fatigueMultiplier * skillMultiplier);
}

function getMasteredJobSkillMultiplier(state, job) {
  if (!state.masteredJobs.includes(job.id)) {
    return 1;
  }
  const skillIds = job.milestones
    .filter((milestone) => milestone.type === "skill")
    .map((milestone) => milestone.skillId);
  if (skillIds.length === 0) {
    return 0.18;
  }
  const unfinishedSkills = skillIds.filter((skillId) => (state.player.skillMastery[skillId] ?? 0) < 100);
  return unfinishedSkills.length > 0 ? 0.45 : 0.15;
}

function multiplyGrowth(growth, multiplier) {
  return Object.fromEntries(Object.entries(growth).map(([key, value]) => [key, Math.round(value * multiplier)]));
}

function setActionResult(state, choice, payload) {
  state.actionResult = {
    choice,
    ...payload
  };
}

function diffStats(before, after) {
  const changes = {};
  for (const [key, value] of Object.entries(after)) {
    const diff = Math.round(value - (before[key] ?? 0));
    if (diff !== 0) {
      changes[key] = diff;
    }
  }
  return changes;
}

function markStatsChanged(state, statChanges) {
  state.changed = { ...state.changed, stats: { ...(state.changed.stats ?? {}) } };
  for (const key of Object.keys(statChanges)) {
    state.changed.stats[key] = true;
  }
}

function markRelicChanged(state, relicId) {
  state.changed = {
    ...state.changed,
    relics: { ...(state.changed.relics ?? {}), [relicId]: true }
  };
}
