import { skills } from "../data/skills.js?v=20260606-17";
import { getDamageMultiplier, getEliteIncomingDamageMultiplier, getPoisonMultiplier } from "./relics.js";
import { getEffectiveActivationChance } from "./skills.js";
import { getEffectiveStats } from "./stats.js";

export function estimateWinRate(state, enemy, options = {}) {
  const samples = options.samples ?? getWinRateSamples(options);
  let wins = 0;

  for (let index = 0; index < samples; index += 1) {
    if (simulateBattleOutcome(state, enemy, options)) {
      wins += 1;
    }
  }

  return Math.round((wins / samples) * 100);
}

export function createBattle(state, enemy, options = {}) {
  const playerStats = scaleBattleStats(getEffectiveStats(state), 1.75);
  const enemyStats = scaleEnemyStats(enemy.stats, options);
  const order = playerStats.SPD >= enemyStats.SPD ? ["player", "enemy"] : ["enemy", "player"];

  return {
    enemyId: enemy.id,
    enemy,
    category: options.category,
    elite: Boolean(options.elite),
    boss: Boolean(options.boss),
    final: Boolean(options.final),
    traits: enemy.traits ?? [],
    turn: 1,
    actorIndex: 0,
    order,
    finished: false,
    won: false,
    player: createFighter(playerStats),
    foe: createFighter(enemyStats),
    lastAction: {
      actor: "system",
      skillId: null,
      text: `Battle started against ${enemy.id}.`,
      damage: 0,
      heal: 0,
      miss: false,
      crit: false,
      block: false,
      status: null
    },
    history: []
  };
}

export function runBattleStep(state, battle) {
  if (battle.finished) {
    return battle.lastAction;
  }

  const actor = battle.order[battle.actorIndex];
  let action;
  if (actor === "player") {
    action = resolvePlayerTurn(state, battle, battle.player, battle.foe, battle.traits);
  } else {
    action = resolveEnemyTurn(state, battle, battle.player, battle.foe, battle.enemyId);
  }

  battle.lastAction = withHpSnapshot({ turn: battle.turn, actor, ...action }, battle);
  battle.history.unshift(battle.lastAction);
  battle.actorIndex += 1;

  if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
    finishBattle(battle);
    return battle.lastAction;
  }

  if (battle.actorIndex >= battle.order.length) {
    const poisonAction = applyPoison(battle.foe, battle.traits);
    if (poisonAction) {
      battle.lastAction = withHpSnapshot({ turn: battle.turn, actor: "status", ...poisonAction }, battle);
      battle.history.unshift(battle.lastAction);
    }
    battle.actorIndex = 0;
    battle.turn += 1;
  }

  if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
    finishBattle(battle);
  }

  return battle.lastAction;
}

export function getBattleReward(state, battle) {
  const xp = battle.won ? battle.enemy.xp ?? 0 : 0;
  return { won: battle.won, xp, category: battle.category };
}

export function runBattle(state, enemy, options = {}) {
  const battle = createBattle(state, enemy, options);
  let safetySteps = 0;
  while (!battle.finished) {
    runBattleStep(state, battle);
    safetySteps += 1;
    if (safetySteps > 1000) {
      throw new Error(`Battle failed to resolve: ${enemy.id}`);
    }
  }
  const reward = getBattleReward(state, battle);
  state.log.unshift({ type: reward.won ? "win" : "loss", text: `${reward.won ? "Won" : "Lost"} battle against ${enemy.id}.` });
  for (const action of battle.history.slice(0, 12).reverse()) {
    state.log.unshift({ type: "battle", text: action.text });
  }
  return { ...reward, log: battle.history.map((action) => action.text) };
}

function createFighter(stats) {
  return {
    stats,
    hp: stats.HP,
    guard: 0,
    poison: { power: 0, turns: 0 }
  };
}

function withHpSnapshot(action, battle) {
  return {
    ...action,
    hp: {
      player: {
        current: Math.max(0, Math.ceil(battle.player.hp)),
        max: battle.player.stats.HP
      },
      enemy: {
        current: Math.max(0, Math.ceil(battle.foe.hp)),
        max: battle.foe.stats.HP
      }
    }
  };
}

function scaleBattleStats(stats, hpMultiplier) {
  return { ...stats, HP: Math.round(stats.HP * hpMultiplier) };
}

function scaleEnemyStats(stats, options = {}) {
  const difficultyScale = options.difficultyScale ?? 1;
  const hpScale = getEnemyHpScale(options) * difficultyScale;
  const powerScale = 0.85 + difficultyScale * 0.15;
  return {
    ...stats,
    HP: Math.round(stats.HP * hpScale),
    PA: Math.round(stats.PA * powerScale),
    PD: Math.round(stats.PD * powerScale),
    MA: Math.round(stats.MA * powerScale),
    MD: Math.round(stats.MD * powerScale),
    SPD: Math.round(stats.SPD * powerScale),
    ACC: Math.round(stats.ACC * Math.min(1.08, powerScale)),
    EVA: Math.round(stats.EVA * powerScale),
    CRT: Math.round(stats.CRT * powerScale)
  };
}

function getEnemyHpScale(options = {}) {
  return options.final ? 2.45 : options.boss ? 2.18 : options.elite ? 2.25 : 1.9;
}

function getWinRateSamples(options = {}) {
  return 30;
}

function simulateBattleOutcome(state, enemy, options = {}) {
  const battle = createBattle(state, enemy, options);
  let safetySteps = 0;
  while (!battle.finished && safetySteps < 1000) {
    runBattleStep(state, battle);
    safetySteps += 1;
  }
  return battle.won;
}

function resolvePlayerTurn(state, battle, player, foe, traits) {
  const activeSkills = state.player.equippedSkills.map((id) => skills[id]).filter((skill) => skill && skill.id !== "basic_attack" && skill.type !== "passive");
  const priority = activeSkills.filter((skill) => skill.priority);

  for (const skill of priority) {
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
  }

  let pool = [...activeSkills.filter((skill) => !skill.priority)];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, player, foe) && rollSkill(state, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
    pool.splice(index, 1);
  }

  return executeSkill(state, battle, getFallbackSkill(state), player, foe, traits);
}

function getFallbackSkill(state) {
  const firebolt = skills.firebolt;
  if (state.currentJobId === "wizard") {
    return firebolt;
  }
  return skills.basic_attack;
}

function resolveEnemyTurn(state, battle, player, foe, enemyId) {
  const enemySkills = getEnemySkills(battle);
  const priority = enemySkills.filter((skill) => skill.priority);

  for (const skill of priority) {
    if (conditionMet(skill, foe, player) && rollEnemySkill(skill)) {
      return executeEnemySkill(state, battle, skill, foe, player, enemyId);
    }
  }

  let pool = [...enemySkills.filter((skill) => !skill.priority)];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, foe, player) && rollEnemySkill(skill)) {
      return executeEnemySkill(state, battle, skill, foe, player, enemyId);
    }
    pool.splice(index, 1);
  }

  if (Math.random() * 100 > Math.max(12, foe.stats.ACC - player.stats.EVA)) {
    return { skillId: null, text: `${enemyId} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  const raw = foe.stats.PA * (0.64 + Math.random() * 0.28) * getEliteIncomingDamageMultiplier(state, battle) * getStalemateDamageMultiplier(battle);
  const blocked = player.guard > 0;
  const damage = Math.max(1, Math.round(raw - player.stats.PD * 0.38 - player.guard));
  player.guard = Math.max(0, player.guard - 4);
  player.hp = Math.max(0, player.hp - damage);
  return {
    skillId: null,
    text: `${enemyId} dealt ${damage} damage${blocked ? " after block" : ""}.`,
    damage,
    heal: 0,
    miss: false,
    crit: false,
    block: blocked,
    status: null
  };
}

function getEnemySkills(battle) {
  const enemy = battle.enemy ?? {};
  const configuredSkills = enemy.skills ?? [];
  const skills = configuredSkills.length > 0 ? configuredSkills : getDefaultEnemySkills(enemy, battle);
  const battleChanceBonus = battle.final ? 0.16 : battle.boss ? 0.12 : battle.elite ? 0.08 : 0;
  const battlePowerBonus = battle.final ? 0.24 : battle.boss ? 0.18 : battle.elite ? 0.12 : 0;

  return skills.map((skill) => ({
    ...skill,
    chance: Math.min(0.9, skill.chance + battleChanceBonus),
    effects: skill.effects.map((effect) => effect.type === "damage" ? { ...effect, power: effect.power + battlePowerBonus } : effect)
  }));
}

function getDefaultEnemySkills(enemy, battle) {
  const category = enemy.category ?? "melee";
  const damageType = enemy.damageType ?? "physical";
  const skillsByCategory = {
    melee: [
      enemySkill("enemy_heavy_swing", 0.46, [{ type: "damage", stat: "PA", power: 1.42, defense: "PD", critBonus: 2 }]),
      enemySkill("enemy_guard_break", 0.34, [{ type: "damage", stat: "PA", power: 1.18, defense: "PD", guardBreak: 6 }])
    ],
    agile: [
      enemySkill("enemy_quick_rend", 0.52, [{ type: "damage", stat: "SPD", power: 1.22, defense: "PD", critBonus: 8 }]),
      enemySkill("enemy_aimed_thrust", 0.38, [{ type: "damage", stat: "ACC", power: 0.92, defense: "PD", critBonus: 12 }])
    ],
    magic: [
      enemySkill("enemy_arcane_bolt", 0.5, [{ type: "damage", stat: "MA", power: 1.45, defense: "MD" }]),
      enemySkill("enemy_mana_burn", 0.34, [{ type: "damage", stat: "MA", power: 1.16, defense: "MD" }, { type: "guard", amount: 3 }])
    ],
    dark: [
      enemySkill("enemy_dark_pulse", 0.5, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.44, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_life_leech", 0.34, [{ type: "damage", stat: "MA", power: 1.1, defense: "MD" }, { type: "heal", power: 0.45 }])
    ],
    poison: [
      enemySkill("enemy_toxic_spit", 0.5, [{ type: "damage", stat: damageType === "physical" ? "PA" : "MA", power: 1.18, defense: damageType === "physical" ? "PD" : "MD" }, { type: "poison", power: 5, turns: 2 }]),
      enemySkill("enemy_venom_sting", 0.4, [{ type: "damage", stat: "ACC", power: 0.96, defense: "PD", critBonus: 6 }])
    ],
    holy: [
      enemySkill("enemy_radiant_smite", 0.48, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.38, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_blessed_guard", 0.34, [{ type: "damage", stat: "MA", power: 1.0, defense: "MD" }, { type: "guard", amount: 5 }])
    ],
    dragon: [
      enemySkill("enemy_flame_breath", 0.48, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.5, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_dragon_claw", 0.38, [{ type: "damage", stat: "PA", power: 1.36, defense: "PD", critBonus: 5 }])
    ],
    summon: [
      enemySkill("enemy_root_crush", 0.46, [{ type: "damage", stat: "PA", power: 1.32, defense: "PD" }, { type: "guard", amount: 4 }]),
      enemySkill("enemy_spirit_swarm", 0.36, [{ type: "damage", stat: "MA", power: 1.18, defense: "MD" }])
    ]
  };

  const chosen = skillsByCategory[category] ?? skillsByCategory.melee;
  const enragePower = battle.final ? 1.9 : battle.boss ? 1.72 : battle.elite ? 1.58 : 1.42;
  return [
    ...chosen,
    enemySkill("enemy_desperation_strike", 0.72, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: enragePower, defense: damageType === "magic" ? "MD" : "PD", critBonus: 10 }], {
      priority: true,
      condition: { type: "hp_below", value: 0.35 }
    })
  ];
}

function enemySkill(id, chance, effects, options = {}) {
  return {
    id,
    chance,
    effects,
    priority: false,
    condition: null,
    ...options
  };
}

function rollEnemySkill(skill) {
  return Math.random() < skill.chance;
}

function executeEnemySkill(state, battle, skill, actor, target, enemyId) {
  if (Math.random() * 100 > Math.max(14, actor.stats.ACC - target.stats.EVA * 0.82)) {
    return { skillId: skill.id, text: `${enemyId} used ${skill.id} but missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }

  const action = { skillId: skill.id, text: "", damage: 0, heal: 0, miss: false, crit: false, block: false, status: null };
  const lines = [];
  const stalemateMultiplier = getStalemateDamageMultiplier(battle);
  const incomingMultiplier = getEliteIncomingDamageMultiplier(state, battle);

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const rawStat = actor.stats[effect.stat] ?? actor.stats.PA;
      const defenseStat = target.stats[effect.defense ?? "PD"] ?? target.stats.PD;
      const blocked = target.guard > 0;
      const critChance = actor.stats.CRT + (effect.critBonus ?? 0);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + actor.stats.CRD / 100 : 1;
      const defenseReduction = defenseStat * (effect.defense === "MD" ? 0.28 : 0.32);
      const damage = Math.max(1, Math.round(rawStat * effect.power * 0.92 * incomingMultiplier * stalemateMultiplier * critMultiplier - defenseReduction - target.guard));
      target.hp = Math.max(0, target.hp - damage);
      target.guard = Math.max(0, target.guard - (effect.guardBreak ?? 4));
      action.damage += damage;
      action.crit = action.crit || crit;
      action.block = action.block || blocked;
      lines.push(`${enemyId} used ${skill.id} for ${damage}${crit ? " critical" : ""} damage${blocked ? " after block" : ""}`);
    }
    if (effect.type === "heal") {
      const healed = Math.round(actor.stats.HP * effect.power * 0.08);
      actor.hp = Math.min(actor.stats.HP, actor.hp + healed);
      action.heal += healed;
      lines.push(`${enemyId} recovered ${healed} HP`);
    }
    if (effect.type === "guard") {
      actor.guard += effect.amount;
      action.block = true;
      lines.push(`${enemyId} gained ${effect.amount} block`);
    }
    if (effect.type === "poison") {
      const poisonDamage = Math.max(1, Math.round(effect.power * (battle.elite ? 1.4 : 1) * (battle.boss ? 1.6 : 1)));
      target.hp = Math.max(0, target.hp - poisonDamage);
      action.damage += poisonDamage;
      action.status = "poison";
      lines.push(`${enemyId} poison dealt ${poisonDamage} damage`);
    }
  }

  action.text = `${lines.join(". ")}.`;
  return action;
}

function executeSkill(state, battle, skill, player, foe, traits) {
  if (Math.random() * 100 > Math.max(8, player.stats.ACC - foe.stats.EVA)) {
    return { skillId: skill.id, text: `${skill.id} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }

  const action = { skillId: skill.id, text: "", damage: 0, heal: 0, miss: false, crit: false, block: false, status: null };
  const lines = [];

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const base = player.stats[effect.stat] * effect.power * 0.64;
      const relicMultiplier = getDamageMultiplier(state, { player, battle, skill });
      const stalemateMultiplier = getStalemateDamageMultiplier(battle);
      const traitMultiplier = getTraitDamageMultiplier(skill, traits);
      const critChance = player.stats.CRT + (effect.critBonus ?? 0) - (traits.includes("critical_resistance") ? 10 : 0);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + player.stats.CRD / 100 : 1;
      const defense = skill.tags?.includes("magic") ? foe.stats.MD : foe.stats.PD;
      const damage = Math.max(1, Math.round(base * relicMultiplier * stalemateMultiplier * traitMultiplier * critMultiplier - defense * 0.34));
      foe.hp = Math.max(0, foe.hp - damage);
      action.damage += damage;
      action.crit = action.crit || crit;
      lines.push(`${skill.id} dealt ${damage}${crit ? " critical" : ""} damage`);
    }
    if (effect.type === "heal") {
      const healed = Math.round(player.stats[effect.stat] * effect.power * 0.72);
      player.hp = Math.min(player.stats.HP, player.hp + healed);
      action.heal += healed;
      lines.push(`${skill.id} healed ${healed} HP`);
    }
    if (effect.type === "guard") {
      player.guard += effect.amount;
      action.block = true;
      lines.push(`${skill.id} gained ${effect.amount} block`);
    }
    if (effect.type === "poison" && !traits.includes("poison_immunity")) {
      foe.poison = { power: Math.round(effect.power * getPoisonMultiplier(state)), turns: effect.turns };
      action.status = "poison";
      lines.push(`${skill.id} applied poison`);
    }
  }

  action.text = `${lines.join(". ")}.`;
  return action;
}

function applyPoison(foe, traits) {
  if (traits.includes("poison_immunity") || foe.poison.turns <= 0) {
    return null;
  }
  foe.hp = Math.max(0, foe.hp - foe.poison.power);
  foe.poison.turns -= 1;
  return {
    skillId: null,
    text: `Poison dealt ${foe.poison.power} damage.`,
    damage: foe.poison.power,
    heal: 0,
    miss: false,
    crit: false,
    block: false,
    status: "poison"
  };
}

function finishBattle(battle) {
  battle.finished = true;
  battle.won = battle.foe.hp <= 0;
}

function rollSkill(state, skill) {
  return Math.random() < getEffectiveActivationChance(state, skill.id);
}

function conditionMet(skill, player, foe) {
  if (!skill.condition) {
    return true;
  }
  if (skill.condition.type === "hp_below") {
    return player.hp / player.stats.HP <= skill.condition.value;
  }
  if (skill.condition.type === "enemy_hp_above") {
    return foe.hp / foe.stats.HP >= skill.condition.value;
  }
  if (skill.condition.type === "enemy_hp_below") {
    return foe.hp / foe.stats.HP <= skill.condition.value;
  }
  return true;
}

function getTraitDamageMultiplier(skill, traits) {
  let multiplier = 1;
  if ((traits.includes("holy_vulnerability") || traits.includes("holy_weakness")) && skill.tags?.includes("holy")) {
    multiplier *= 1.35;
  }
  if (traits.includes("dark_weakness") && skill.tags?.includes("dark")) {
    multiplier *= 1.3;
  }
  if ((traits.includes("magic_weakness") || traits.includes("fire_weakness")) && skill.tags?.includes("magic")) {
    multiplier *= 1.25;
  }
  if (traits.includes("critical_weakness") && skill.tags?.includes("critical")) {
    multiplier *= 1.3;
  }
  if (traits.includes("summon_weakness") && skill.tags?.includes("summon")) {
    multiplier *= 1.3;
  }
  if (traits.includes("physical_resistance") && skill.tags?.includes("physical")) {
    multiplier *= 0.72;
  }
  if (traits.includes("magic_resistance") && skill.tags?.includes("magic")) {
    multiplier *= 0.75;
  }
  if (traits.includes("dark_resistance") && skill.tags?.includes("dark")) {
    multiplier *= 0.75;
  }
  if (traits.includes("dragon_resistance") && skill.tags?.includes("dragon")) {
    multiplier *= 0.75;
  }
  if (traits.includes("summon_resistance") && skill.tags?.includes("summon")) {
    multiplier *= 0.78;
  }
  if (traits.includes("poison_immunity") && skill.tags?.includes("poison")) {
    multiplier *= 0.65;
  }
  return multiplier;
}

export function getStalemateDamageMultiplier(battle) {
  if (battle.turn <= 50) {
    return 1;
  }
  if (battle.turn <= 75) {
    return 1 + (battle.turn - 50) * 0.04;
  }
  return 2 + (battle.turn - 75) * 0.08;
}
