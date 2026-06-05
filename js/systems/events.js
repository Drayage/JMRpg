import { bosses } from "../data/bosses.js";
import { eventTemplates } from "../data/events.js";
import { monsters } from "../data/monsters.js";
import { addRelic, getRandomRelic, getXpMultiplier } from "./relics.js";
import { addStats } from "./stats.js";
import { getAvailableAdvancedJobs, getAvailableBasicJobs, grantJobXp } from "./jobs.js";
import { estimateWinRate, runBattle } from "./battle.js";

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
  while (choices.length < 3) {
    const template = weightedTemplate();
    const choice = createChoiceFromTemplate(state, template);
    if (!choice) {
      continue;
    }
    if (!choices.some((item) => item.id === choice.id && item.monsterId === choice.monsterId)) {
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
    grantJobXp(state, choice.xp);
  }
  if (choice.type === "hunt" || choice.type === "boss") {
    const enemy = choice.type === "boss" ? bosses[choice.monsterId] : monsters[choice.monsterId];
    const result = runBattle(state, enemy, { category: choice.category });
    grantJobXp(state, result.xp, choice.category);
    if (result.won && choice.type === "hunt") {
      const relicId = addRelic(state, getRandomRelic(choice.category));
      state.log.unshift({ type: "relic", text: `Found relic ${relicId}.` });
    }
    if (result.won && choice.type === "boss") {
      state.defeatedBosses.push(choice.monsterId);
      if (choice.final) {
        state.gameOver = true;
        state.victory = true;
      }
    }
    if (!result.won && choice.final) {
      state.gameOver = true;
      state.victory = false;
    }
  }
  if (choice.type === "relic") {
    const relicId = addRelic(state, getRandomRelic(choice.category));
    state.log.unshift({ type: "relic", text: `Found relic ${relicId}.` });
  }
  if (choice.type === "stats") {
    addStats(state.player.stats, choice.growth);
    state.log.unshift({ type: "stats", text: `Gained stats from ${choice.id}.` });
  }
  if (choice.type === "directional") {
    const xp = Math.round(choice.xp * getXpMultiplier(state, choice.category));
    grantJobXp(state, xp, choice.category);
    if (Math.random() < 0.45) {
      const relicId = addRelic(state, getRandomRelic(choice.category));
      state.log.unshift({ type: "relic", text: `Found relic ${relicId}.` });
    }
  }

  advanceTime(state);
}

export function advanceTime(state) {
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
    const monster = chooseMonster(state, template.elite);
    const category = monster.relicCategories[Math.floor(Math.random() * monster.relicCategories.length)];
    return {
      id: `${template.id}_${monster.id}`,
      templateId: template.id,
      type: "hunt",
      monsterId: monster.id,
      elite: template.elite,
      category,
      xp: monster.xp,
      winRate: estimateWinRate(state, monster)
    };
  }
  if (template.type === "relic") {
    const categories = ["holy", "melee", "magic", "poison", "dragon", "dark"];
    return { ...template, id: `${template.id}_${Math.random()}`, templateId: template.id, category: categories[Math.floor(Math.random() * categories.length)] };
  }
  if (template.type === "stats") {
    return { ...template, id: `${template.id}_${Math.random()}`, templateId: template.id, growth: randomStatGrowth() };
  }
  return { ...template, id: template.id };
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
    winRate: null
  };
}

function chooseMonster(state, elite) {
  const targetLevel = Math.max(1, Math.floor((state.day + 2) / 3) + (elite ? 2 : 0));
  const pool = Object.values(monsters).filter((monster) => monster.level <= targetLevel + 2 && monster.level >= targetLevel - 2);
  return pool[Math.floor(Math.random() * pool.length)] ?? Object.values(monsters)[0];
}

function weightedTemplate() {
  const total = eventTemplates.reduce((sum, template) => sum + template.weight, 0);
  let roll = Math.random() * total;
  for (const template of eventTemplates) {
    roll -= template.weight;
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
