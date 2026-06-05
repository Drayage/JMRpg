import { bosses } from "../data/bosses.js?v=20260605-5";
import { eventTemplates } from "../data/events.js?v=20260605-5";
import { monsters } from "../data/monsters.js?v=20260605-5";
import { addRelic, getAdvancedEventWeightMultiplier, getEventXpMultiplier, getPositiveEventRewardMultiplier, getRandomUnownedRelic, rejectRelic } from "./relics.js?v=20260605-5";
import { addStats } from "./stats.js";
import { getAvailableAdvancedJobs, getAvailableBasicJobs, grantJobXp, updateJobDiscovery } from "./jobs.js";
import { createBattle, estimateWinRate, getBattleReward } from "./battle.js?v=20260605-5";

export function generateChoices(state) {
  if (state.gameOver) {
    return [];
  }
  if (state.day === 10 && state.actionInDay === 1 && !state.defeatedBosses.includes("oathbreaker")) {
    return [createBossChoice("oathbreaker")];
  }
  if (state.day === 20 && state.actionInDay === 1 && !state.defeatedBosses.includes("void_acolyte")) {
    return [createBossChoice("void_acolyte")];
  }
  if (state.day === 30 && state.actionInDay === 3) {
    return [createBossChoice(state.finalBossId, true)];
  }

  const choices = [];
  let attempts = 0;
  while (choices.length < 3 && attempts < 80) {
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
    state.battle = createBattle(state, enemy, { category: choice.category, elite: choice.elite, boss: choice.type === "boss", final: choice.final });
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
  state.pendingBattleChoice = choice;
  state.activeHuntEvent = null;
  state.busy = true;
  return { battle: state.battle };
}

export function finishBattleAction(state) {
  if (!state.battle?.finished || !state.pendingBattleChoice) {
    return;
  }
  const choice = state.pendingBattleChoice;
  const reward = getBattleReward(state, state.battle);
  const xp = Math.round(reward.xp * (choice.rewardMultiplier ?? 1) * getEventXpMultiplier(state, choice.category, { elite: choice.elite }));
  const xpSummary = xp > 0 ? grantJobXp(state, xp, choice.category) : null;
  let relicId = null;

  if (reward.won && choice.type === "hunt") {
    relicId = getRandomUnownedRelic(state, choice.category);
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
  state.activeJobEvent = null;
  setActionResult(state, { templateId: event.templateId, type: "job_change" }, { jobSkipped: true });
  state.log.unshift({ type: "event", text: "Skipped job change." });
  return true;
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
    return {
      id: `${template.id}_${Math.random()}`,
      templateId: template.id,
      type: "hunt_event",
      elite: template.elite,
      monsterOptions: createMonsterOptions(state, template)
    };
  }
  if (template.type === "relic") {
    const categories = ["holy", "melee", "magic", "poison", "dragon", "dark", "summon"];
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
  const jobOptions = sampleJobs(getAvailableBasicJobs(state), 3);
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
  const jobOptions = sampleJobs(getAvailableAdvancedJobs(state), 3);
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

function createBossChoice(bossId, final = false) {
  const boss = bosses[bossId];
  return {
    id: `boss_${bossId}`,
    templateId: final ? "final_boss" : "mid_boss",
    type: "boss",
    monsterId: bossId,
    final,
    category: boss.relicCategories[0],
    xp: boss.xp,
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
    return {
      id: `${template.id}_${monster.id}_${Math.random()}`,
      templateId: template.id,
      type: "hunt",
      monsterId: monster.id,
      elite: template.elite,
      difficulty: slot.difficulty,
      difficultyScale: slot.difficultyScale,
      rewardMultiplier: slot.rewardMultiplier,
      category,
      xp: Math.round(monster.xp * slot.rewardMultiplier),
      enemyDamageType: getEnemyDamageType(monster),
      enemyDefenseProfile: monster.stats.MD > monster.stats.PD ? "high_magic_defense" : "high_physical_defense",
      winRate: estimateWinRate(state, monster, { elite: template.elite, difficultyScale: slot.difficultyScale })
    };
  });
}

function chooseMonsterForSlot(state, elite, levelOffset, usedMonsterIds) {
  const targetLevel = Math.max(1, Math.floor((state.day + 2) / 3) + (elite ? 2 : 0) + levelOffset);
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
    weight: template.id === "advanced_job_training" ? template.weight * getAdvancedEventWeightMultiplier(state) : template.weight
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
