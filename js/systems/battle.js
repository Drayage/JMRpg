import { jobs } from "../data/jobs.js?v=20260607-15";
import { skills } from "../data/skills.js?v=20260607-15";
import { getDamageMultiplier, getPoisonMultiplier, getRelicIncomingDamageMultiplier } from "./relics.js";
import { getEffectiveActivationChance } from "./skills.js";
import { getEffectiveStats, addStats } from "./stats.js";

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
  const enemyStats = scaleEnemyStats(getEnemyBaseStats(enemy), options);
  const order = playerStats.SPD >= enemyStats.SPD ? ["player", "enemy"] : ["enemy", "player"];

  return {
    enemyId: enemy.id,
    enemy,
    category: options.category,
    elite: Boolean(options.elite),
    boss: Boolean(options.boss),
    final: Boolean(options.final),
    difficultyScale: options.difficultyScale ?? 1,
    traits: getEnemyTraits(enemy),
    turn: options.showReadyTurn ? 0 : 1,
    readyActionShown: !options.showReadyTurn,
    actorIndex: 0,
    order,
    finished: false,
    won: false,
    player: createFighter(playerStats),
    foe: createFighter(enemyStats),
    skillUses: {},
    extraActions: { player: 0, enemy: 0 },
    extraActionUses: { player: 0, enemy: 0 },
    startEffects: { player: 0, enemy: 0 },
    lastAction: {
      turn: 0,
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

  if (!battle.readyActionShown) {
    battle.readyActionShown = true;
    battle.lastAction = withHpSnapshot({
      turn: 0,
      actor: "system",
      skillId: null,
      text: `Both sides are preparing to fight ${battle.enemyId}.`,
      damage: 0,
      heal: 0,
      miss: false,
      crit: false,
      block: false,
      status: null
    }, battle);
    battle.history.unshift(battle.lastAction);
    return battle.lastAction;
  }

  if (battle.turn === 0) {
    battle.turn = 1;
  }

  const actor = battle.order[battle.actorIndex];
  const actorFighter = actor === "player" ? battle.player : battle.foe;
  const startAction = battle.startEffects[actor] === battle.turn ? null : applyActionStartEffects(actorFighter, actor, battle);
  battle.startEffects[actor] = battle.turn;
  if (startAction) {
    battle.lastAction = withHpSnapshot({ turn: battle.turn, ...startAction }, battle);
    battle.history.unshift(battle.lastAction);
    if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
      finishBattle(battle);
    }
    return battle.lastAction;
  }

  let action;
  if (actor === "player") {
    action = resolvePlayerTurn(state, battle, battle.player, battle.foe, battle.traits);
  } else {
    action = resolveEnemyTurn(state, battle, battle.player, battle.foe, battle.enemyId);
  }

  battle.lastAction = withHpSnapshot({ turn: battle.turn, actor, ...action }, battle);
  battle.history.unshift(battle.lastAction);
  resolveSummonActions(battle, actor);
  const extraActions = battle.extraActions?.[actor] ?? 0;
  if (extraActions > 0) {
    battle.extraActions[actor] = extraActions - 1;
  } else {
    battle.actorIndex += 1;
  }

  if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
    finishBattle(battle);
    return battle.lastAction;
  }

  if (battle.actorIndex >= battle.order.length) {
    for (const endAction of applyEndTurnEffects(battle)) {
      battle.lastAction = withHpSnapshot({ turn: battle.turn, ...endAction }, battle);
      battle.history.unshift(battle.lastAction);
    }
    for (const runeAction of triggerRunes(battle.player, battle.foe, "turn_end", battle, "player")) {
      battle.lastAction = withHpSnapshot({ turn: battle.turn, ...runeAction }, battle);
      battle.history.unshift(battle.lastAction);
    }
    for (const runeAction of triggerRunes(battle.foe, battle.player, "turn_end", battle, "enemy")) {
      battle.lastAction = withHpSnapshot({ turn: battle.turn, ...runeAction }, battle);
      battle.history.unshift(battle.lastAction);
    }
    if (battle.player.hp <= 0 || battle.foe.hp <= 0) {
      finishBattle(battle);
      return battle.lastAction;
    }
    tickStatuses(battle.player);
    tickStatuses(battle.foe);
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
    poison: 0,
    statuses: [],
    typedStatuses: {},
    resources: {},
    runes: [],
    summons: []
  };
}

function withHpSnapshot(action, battle) {
  return {
    ...action,
    statuses: {
      player: [
        ...battle.player.statuses.map((status) => ({ id: status.id, turns: status.turns })),
        ...typedStatusSnapshot(battle.player)
      ],
      enemy: [
        ...battle.foe.statuses.map((status) => ({ id: status.id, turns: status.turns })),
        ...typedStatusSnapshot(battle.foe)
      ]
    },
    shield: {
      player: Math.max(0, Math.ceil(battle.player.guard)),
      enemy: Math.max(0, Math.ceil(battle.foe.guard))
    },
    summons: {
      player: battle.player.summons.map((summon) => ({ id: summon.id, hp: Math.max(0, Math.ceil(summon.hp)), maxHp: summon.maxHp, role: summon.role })),
      enemy: battle.foe.summons.map((summon) => ({ id: summon.id, hp: Math.max(0, Math.ceil(summon.hp)), maxHp: summon.maxHp, role: summon.role }))
    },
    resources: {
      player: { ...battle.player.resources },
      enemy: { ...battle.foe.resources }
    },
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
  const powerScale = 0.78 + difficultyScale * 0.28;
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
  return options.final ? 2.75 : options.boss ? 2.35 : options.elite ? 2.45 : 1.9;
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
  const activeSkills = state.player.equippedSkills
    .map((id) => skills[id])
    .filter((skill) => skill && skill.id !== "basic_attack" && !skill.basicAttackReplacement && skill.type !== "passive");
  const priority = activeSkills.filter((skill) => skill.priority && canUseBattleSkill(battle, skill));

  for (const skill of priority) {
    if (conditionMet(skill, player, foe, battle) && rollSkill(state, battle, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
  }

  let pool = [...activeSkills.filter((skill) => !skill.priority && canUseBattleSkill(battle, skill))];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, player, foe, battle) && rollSkill(state, battle, skill)) {
      return executeSkill(state, battle, skill, player, foe, traits);
    }
    pool.splice(index, 1);
  }

  return executeSkill(state, battle, getFallbackSkill(state), player, foe, traits);
}

function getFallbackSkill(state) {
  const replacement = state.player.equippedSkills
    .map((id) => skills[id])
    .find((skill) => skill?.basicAttackReplacement);
  if (replacement) {
    return replacement;
  }
  return skills.basic_attack;
}

function resolveEnemyTurn(state, battle, player, foe, enemyId) {
  const enemySkills = getEnemySkills(battle);
  const priority = enemySkills.filter((skill) => skill.priority);

  for (const skill of priority) {
    if (conditionMet(skill, foe, player, battle) && rollEnemySkill(skill, foe)) {
      return executeEnemySkill(state, battle, skill, foe, player, enemyId);
    }
  }

  let pool = [...enemySkills.filter((skill) => !skill.priority)];
  while (pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    const skill = pool[index];
    if (conditionMet(skill, foe, player, battle) && rollEnemySkill(skill, foe)) {
      return executeEnemySkill(state, battle, skill, foe, player, enemyId);
    }
    pool.splice(index, 1);
  }

  const dodgeStatus = player.statuses.find((s) => s.guaranteedDodge);
  if (dodgeStatus) {
    player.statuses = player.statuses.filter((s) => s !== dodgeStatus);
    return { skillId: null, text: `${enemyId} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  if (Math.random() * 100 > Math.max(12, getBattleStat(foe, "ACC") - getBattleStat(player, "EVA"))) {
    return { skillId: null, text: `${enemyId} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  const raw = getBattleStat(foe, "PA") * (0.64 + Math.random() * 0.28) * getOutgoingDamageMultiplier(foe) * getIncomingDamageMultiplier(player) * getRelicIncomingDamageMultiplier(state, battle) * getStalemateDamageMultiplier(battle);
  const mitigated = Math.max(1, Math.round(raw - getBattleStat(player, "PD") * getDefenseMultiplier(player) * 0.38));
  const result = dealDamage(player, mitigated, { shieldBreak: 4 });
  return {
    skillId: null,
    text: `${enemyId} dealt ${result.hpDamage} damage${result.shieldAbsorbed ? `; shield absorbed ${result.shieldAbsorbed}` : ""}.`,
    damage: result.hpDamage,
    heal: 0,
    miss: false,
    crit: false,
    block: result.shieldAbsorbed > 0,
    shieldAbsorbed: result.shieldAbsorbed,
    status: null
  };
}

function getEnemySkills(battle) {
  const enemy = battle.enemy ?? {};
  const configuredSkills = (enemy.skills ?? [])
    .map((skill) => typeof skill === "string" ? skills[skill] : skill)
    .filter(Boolean);
  const jobSkills = getEnemyJobSkills(enemy);
  const enemySkillList = configuredSkills.length > 0
    ? configuredSkills
    : jobSkills.length > 0
      ? jobSkills
      : getDefaultEnemySkills(enemy, battle);
  const difficultyChanceBonus = Math.max(0, (battle.difficultyScale ?? 1) - 1) * 0.08;
  const difficultyPowerBonus = Math.max(0, (battle.difficultyScale ?? 1) - 1) * 0.1;
  const battleChanceBonus = (battle.final ? 0.24 : battle.boss ? 0.18 : battle.elite ? 0.14 : 0.04) + difficultyChanceBonus;
  const battlePowerBonus = (battle.final ? 0.34 : battle.boss ? 0.25 : battle.elite ? 0.18 : 0.06) + difficultyPowerBonus;

  return enemySkillList
    .filter((skill) => skill.type !== "passive" && !skill.basicAttackReplacement)
    .map((skill) => ({
      ...skill,
      chance: Math.min(0.96, skill.chance + battleChanceBonus),
      effects: (skill.effects ?? []).map((effect) => effect.type === "damage" ? { ...effect, power: effect.power + battlePowerBonus } : effect)
    }));
}

function getEnemyJobSkills(enemy) {
  const job = jobs[enemy.jobId];
  if (!job) {
    return [];
  }
  const skillIds = enemy.jobSkillIds?.length
    ? enemy.jobSkillIds
    : (job.milestones ?? [])
      .filter((milestone) => milestone.type === "skill")
      .map((milestone) => milestone.skillId);
  return skillIds.map((skillId) => skills[skillId]).filter(Boolean);
}

// Hybrid stats: hand-authored monster stats + the job's passive stat block
// layered on, before difficulty scaling. Passives never enter the active
// skill pool (getEnemySkills filters type === "passive").
function getEnemyBaseStats(enemy) {
  const base = { ...enemy.stats };
  if (!enemy.jobId) {
    return base;
  }
  for (const skill of getEnemyJobSkills(enemy)) {
    if (skill.type === "passive") {
      addStats(base, skill.passiveStats ?? {});
    }
  }
  return base;
}

// Merge hand-authored traits with weaknesses/resistances auto-derived from
// the assigned job's themes, so a job-bearing enemy enters the counter web.
function getEnemyTraits(enemy) {
  return [...new Set([...(enemy.traits ?? []), ...deriveJobTraits(jobs[enemy.jobId])])];
}

function deriveJobTraits(job) {
  if (!job) {
    return [];
  }
  const themes = job.themes ?? [];
  const has = (theme) => themes.includes(theme);
  const traits = new Set();

  // Damage axis: a job resists the axis it specializes in and is weak to the
  // other. A pure-physical job (or a status it shares with physical bruisers,
  // e.g. fracture/shield_break) must not be classed as a caster.
  const isMagic = has("magic") || has("ma");
  const isPhysical = has("physical") || has("pd") || has("shield") || has("frontline")
    || has("absolute") || has("swordsmanship") || has("shield_break") || has("evasion")
    || has("ranged") || has("reverse_crit") || has("enemy_current_hp");
  if (isMagic && !isPhysical) {
    traits.add("magic_resistance");
    traits.add("physical_weakness");
  } else if (isPhysical && !isMagic) {
    traits.add("physical_resistance");
    traits.add("magic_weakness");
  }

  // Flavor overlays, independent of the damage axis.
  if (has("decay") || has("dark") || has("life_cost") || has("max_hp") || has("curse") || has("weaken")) {
    traits.add("dark_resistance");
    traits.add("poison_immunity");
    traits.add("holy_vulnerability");
  }
  if (has("heal") || has("holy") || has("judgment")) {
    traits.add("magic_resistance");
    traits.add("dark_weakness");
  }
  if (has("evasion") || has("rhythm")) {
    traits.add("critical_weakness");
  }
  if (has("dragon") || has("pd_to_pa")) {
    traits.add("dragon_resistance");
  }
  if (has("summon") || has("legion") || has("contract")) {
    traits.add("summon_resistance");
  }
  if (has("poison")) {
    traits.add("poison_immunity");
  }

  // Resolve same-axis contradictions: resistance wins over weakness.
  if (traits.has("physical_resistance")) {
    traits.delete("physical_weakness");
  }
  if (traits.has("magic_resistance")) {
    traits.delete("magic_weakness");
  }
  return [...traits];
}

function getDefaultEnemySkills(enemy, battle) {
  const category = enemy.category ?? "melee";
  const damageType = enemy.damageType ?? "physical";
  const skillsByCategory = {
    melee: [
      enemySkill("enemy_heavy_swing", 0.56, [{ type: "damage", stat: "PA", power: 1.42, defense: "PD", critBonus: 2 }]),
      enemySkill("enemy_guard_break", 0.46, [{ type: "damage", stat: "PA", power: 1.18, defense: "PD", guardBreak: 6 }]),
      enemySkill("enemy_war_cry", 0.36, [{ type: "status", id: "war_cry", target: "self", turns: 3, statMods: { PA: 4 }, damageMultiplier: 1.08 }])
    ],
    agile: [
      enemySkill("enemy_quick_rend", 0.6, [{ type: "damage", stat: "SPD", power: 1.22, defense: "PD", critBonus: 8 }]),
      enemySkill("enemy_aimed_thrust", 0.48, [{ type: "damage", stat: "ACC", power: 0.92, defense: "PD", critBonus: 12 }]),
      enemySkill("enemy_blur_step", 0.38, [{ type: "status", id: "blur_step", target: "self", turns: 2, statMods: { SPD: 4, EVA: 5 } }])
    ],
    magic: [
      enemySkill("enemy_arcane_bolt", 0.58, [{ type: "damage", stat: "MA", power: 1.45, defense: "MD" }]),
      enemySkill("enemy_mana_burn", 0.45, [{ type: "damage", stat: "MA", power: 1.16, defense: "MD" }, { type: "guard", amount: 3 }]),
      enemySkill("enemy_arcane_seal", 0.36, [{ type: "status", id: "arcane_seal", target: "foe", turns: 2, damageTakenMultiplier: 1.08 }])
    ],
    dark: [
      enemySkill("enemy_dark_pulse", 0.58, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.44, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_life_leech", 0.44, [{ type: "damage", stat: "MA", power: 1.1, defense: "MD" }, { type: "heal", power: 0.45 }]),
      enemySkill("enemy_dread_mark", 0.38, [{ type: "status", id: "dread_mark", target: "foe", turns: 2, damageTakenMultiplier: 1.1, statMods: { MD: -3 } }])
    ],
    poison: [
      enemySkill("enemy_toxic_spit", 0.58, [{ type: "damage", stat: damageType === "physical" ? "PA" : "MA", power: 1.18, defense: damageType === "physical" ? "PD" : "MD" }, { type: "poison", power: 5, turns: 2 }]),
      enemySkill("enemy_venom_sting", 0.5, [{ type: "damage", stat: "ACC", power: 0.96, defense: "PD", critBonus: 6 }]),
      enemySkill("enemy_sickening_cloud", 0.38, [{ type: "status", id: "sickening_cloud", target: "foe", turns: 2, damageMultiplier: 0.92 }])
    ],
    holy: [
      enemySkill("enemy_radiant_smite", 0.56, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.38, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_blessed_guard", 0.46, [{ type: "damage", stat: "MA", power: 1.0, defense: "MD" }, { type: "guard", amount: 5 }]),
      enemySkill("enemy_judgment_mark", 0.36, [{ type: "status", id: "judgment_mark", target: "foe", turns: 2, statMods: { MD: -3, EVA: -3 } }])
    ],
    dragon: [
      enemySkill("enemy_flame_breath", 0.58, [{ type: "damage", stat: damageType === "magic" ? "MA" : "PA", power: 1.5, defense: damageType === "magic" ? "MD" : "PD" }]),
      enemySkill("enemy_dragon_claw", 0.48, [{ type: "damage", stat: "PA", power: 1.36, defense: "PD", critBonus: 5 }]),
      enemySkill("enemy_scale_harden", 0.36, [{ type: "guard", amount: 8 }, { type: "status", id: "scale_harden", target: "self", turns: 2, defenseMultiplier: 1.12 }])
    ],
    summon: [
      enemySkill("enemy_root_crush", 0.56, [{ type: "damage", stat: "PA", power: 1.32, defense: "PD" }, { type: "guard", amount: 4 }]),
      enemySkill("enemy_spirit_swarm", 0.46, [{ type: "damage", stat: "MA", power: 1.18, defense: "MD" }]),
      enemySkill("enemy_pack_howl", 0.38, [{ type: "status", id: "pack_howl", target: "self", turns: 3, damageMultiplier: 1.08, statMods: { ACC: 4 } }])
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

function statModsLog(statMods = {}) {
  return Object.entries(statMods)
    .map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`)
    .join(", ");
}

function statusLog(effect) {
  const statText = statModsLog(effect.statMods);
  const durationText = effect.permanent ? "" : ` ${effect.turns ?? 1}T`;
  const nonStatParts = [];
  if (effect.damageMultiplier && effect.damageMultiplier !== 1) nonStatParts.push(`damage x${effect.damageMultiplier}`);
  if (effect.damageTakenMultiplier && effect.damageTakenMultiplier !== 1) nonStatParts.push(`taken x${effect.damageTakenMultiplier}`);
  if (effect.defenseMultiplier && effect.defenseMultiplier !== 1) nonStatParts.push(`defense x${effect.defenseMultiplier}`);
  if (effect.skillChanceMultiplier && effect.skillChanceMultiplier !== 1) nonStatParts.push(`skill chance x${effect.skillChanceMultiplier}`);
  if (statText && nonStatParts.length === 0) {
    return `${statText}${durationText}`;
  }
  return [effect.id, statText, ...nonStatParts].filter(Boolean).join(" ") + durationText;
}

function rollEnemySkill(skill, actor) {
  return Math.random() < skill.chance * getSkillChanceMultiplier(actor);
}

function executeEnemySkill(state, battle, skill, actor, target, enemyId) {
  const dodgeStatus = target.statuses.find((s) => s.guaranteedDodge);
  if (dodgeStatus) {
    target.statuses = target.statuses.filter((s) => s !== dodgeStatus);
    return { skillId: skill.id, text: `${enemyId} used ${skill.id} but missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  if (Math.random() * 100 > Math.max(14, getBattleStat(actor, "ACC") - getBattleStat(target, "EVA") * 0.82)) {
    return { skillId: skill.id, text: `${enemyId} used ${skill.id} but missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }

  const action = { skillId: skill.id, text: "", damage: 0, heal: 0, miss: false, crit: false, block: false, status: null };
  const lines = [];
  const stalemateMultiplier = getStalemateDamageMultiplier(battle);
  const incomingMultiplier = getRelicIncomingDamageMultiplier(state, battle);

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const base = getEffectBaseStat(actor, effect) * effect.power * 0.64;
      const extraBase = getDamageExtraBase(actor, target, effect);
      if (effect.absolute) {
        const rawDamage = Math.max(1, Math.round((base + extraBase) * getOutgoingDamageMultiplier(actor) * getIncomingDamageMultiplier(target) * incomingMultiplier * stalemateMultiplier));
        const result = dealDamage(target, rawDamage, { shieldBreak: effect.guardBreak ?? 4, burn: effect.burn });
        action.damage += result.hpDamage;
        action.block = action.block || result.shieldAbsorbed > 0;
        action.shieldAbsorbed = (action.shieldAbsorbed ?? 0) + result.shieldAbsorbed;
        lines.push(`${enemyId} used ${skill.id} for ${result.hpDamage} absolute damage${result.shieldAbsorbed ? `; shield absorbed ${result.shieldAbsorbed}` : ""}`);
        if (effect.lifeSteal) {
          const stolen = applyHeal(actor, Math.round(result.hpDamage * effect.lifeSteal), { overheal: false });
          action.heal += stolen;
          lines.push(`${enemyId} stole ${stolen} HP`);
        }
        continue;
      }
      const defenseStat = getBattleStat(target, effect.defense ?? "PD") ?? getBattleStat(target, "PD");
      const blocked = target.guard > 0;
      const critChance = getEffectCritChance(actor, effect);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + getBattleStat(actor, "CRD") / 100 : 1;
      const defenseReduction = defenseStat * getDefenseMultiplier(target) * (effect.defense === "MD" ? 0.28 : 0.32);
      const rawDamage = Math.max(1, Math.round((base + extraBase) * getOutgoingDamageMultiplier(actor) * getIncomingDamageMultiplier(target) * incomingMultiplier * stalemateMultiplier * critMultiplier - defenseReduction));
      const result = dealDamage(target, rawDamage, { shieldBreak: effect.guardBreak ?? 4, burn: effect.burn });
      action.damage += result.hpDamage;
      action.crit = action.crit || crit;
      action.block = action.block || result.shieldAbsorbed > 0 || blocked;
      action.shieldAbsorbed = (action.shieldAbsorbed ?? 0) + result.shieldAbsorbed;
      lines.push(`${enemyId} used ${skill.id} for ${result.hpDamage}${crit ? " critical" : ""} damage${result.shieldAbsorbed ? `; shield absorbed ${result.shieldAbsorbed}` : ""}`);
    }
    if (effect.type === "heal") {
      const healed = Math.round(getBattleStat(actor, effect.stat ?? "MA") * effect.power * (effect.healScale ?? 0.72) + actor.stats.HP * (effect.maxHpRatio ?? 0));
      const actualHeal = applyHeal(actor, healed, effect);
      action.heal += actualHeal;
      lines.push(`${enemyId} recovered ${actualHeal} HP`);
    }
    if (effect.type === "guard") {
      actor.guard += effect.amount;
      action.block = true;
      action.shieldGained = (action.shieldGained ?? 0) + effect.amount;
      lines.push(`${enemyId} gained ${effect.amount} block`);
    }
    if (effect.type === "shield") {
      const gained = applyShield(actor, effect);
      action.block = true;
      action.shieldGained = (action.shieldGained ?? 0) + gained;
      lines.push(`${enemyId} gained ${gained} shield`);
    }
    if (effect.type === "dispel") {
      const targetFighter = effect.target === "self" ? actor : target;
      const removed = dispelStatuses(targetFighter, effect);
      if (removed > 0) {
        lines.push(`${enemyId} removed ${removed} status effects`);
      }
    }
    if (effect.type === "poison") {
      const poisonAmount = Math.max(1, Math.round((effect.amount ?? effect.power ?? 1) * (battle.elite ? 1.4 : 1) * (battle.boss ? 1.6 : 1)));
      target.poison += poisonAmount;
      action.status = "poison";
      lines.push(`${enemyId} applied ${poisonAmount} poison`);
    }
    if (effect.type === "status") {
      const targetFighter = effect.target === "self" ? actor : target;
      applyStatus(targetFighter, effect);
      action.status = effect.id;
      action.statusText = statusLog(effect);
      lines.push(`${enemyId} applied ${statusLog(effect)}`);
    }
    if (effect.type === "typed_status") {
      const targetFighter = effect.target === "self" ? actor : target;
      applyTypedStatus(targetFighter, effect);
      action.status = effect.kind;
      action.statusText = effect.kind;
      lines.push(`${enemyId} applied ${effect.kind}`);
    }
    if (effect.type === "summon") {
      const added = addSummons(actor, effect, actor);
      lines.push(`${enemyId} summoned ${added} allies`);
    }
    if (effect.type === "rune") {
      addRune(actor, effect);
      lines.push(`${enemyId} installed ${effect.runeId}`);
    }
    if (effect.type === "resource") {
      const gained = addResource(actor, effect.key, effect.amount);
      lines.push(`${enemyId} gained ${gained} ${effect.key}`);
    }
    if (effect.type === "consume_resource") {
      const spent = consumeResource(actor, effect.key);
      const rawDamage = Math.max(1, Math.round(spent * effect.power + getBattleStat(actor, effect.stat ?? "PA") * 0.35));
      const result = dealDamage(target, rawDamage, { shieldBreak: 8 });
      action.damage += result.hpDamage;
      lines.push(`${enemyId} spent ${spent} ${effect.key} for ${result.hpDamage}${effect.absolute ? " absolute" : ""} damage`);
    }
    if (effect.type === "consume_status") {
      const targetFighter = effect.target === "self" ? actor : target;
      const consumed = consumeTypedStatus(targetFighter, effect.kind);
      if (consumed > 0) {
        const result = dealDamage(target, consumed * (effect.power ?? 1), { shieldBreak: 6, ignoreShield: effect.ignoreShield });
        action.damage += result.hpDamage;
        lines.push(`${enemyId} consumed ${effect.kind} for ${result.hpDamage} damage`);
      }
    }
    if (effect.type === "clear_resource") {
      const spent = consumeResource(actor, effect.key);
      lines.push(`${enemyId} cleared ${spent} ${effect.key}`);
    }
    if (effect.type === "stat_tradeoff") {
      applyStatus(actor, {
        id: effect.id ?? `${skill.id}_tradeoff`,
        target: "self",
        turns: effect.turns ?? 999,
        permanent: effect.permanent ?? true,
        stack: effect.stack ?? false,
        statMods: effect.statMods ?? {}
      });
      lines.push(`${enemyId} changed stance`);
    }
    if (effect.type === "extra_action" && (battle.extraActionUses?.enemy ?? 0) < (effect.limit ?? 10) && Math.random() < (effect.chance ?? 1)) {
      battle.extraActions.enemy = Math.min(10, (battle.extraActions.enemy ?? 0) + 1);
      battle.extraActionUses.enemy = (battle.extraActionUses.enemy ?? 0) + 1;
      lines.push(`${enemyId} gained an extra action`);
    }
    if (effect.type === "sacrifice") {
      const cost = Math.max(1, Math.round(actor.stats.HP * effect.ratio));
      actor.hp = Math.max(1, actor.hp - cost);
      lines.push(`${enemyId} consumed ${cost} HP`);
    }
  }

  action.text = `${lines.join(". ")}.`;
  return action;
}

function executeSkill(state, battle, skill, player, foe, traits) {
  const guaranteedHit = skill.effects?.some((e) => e.guaranteedHit);
  if (!guaranteedHit && skillRequiresAccuracy(skill) && Math.random() * 100 > Math.max(8, getBattleStat(player, "ACC") - getBattleStat(foe, "EVA") + (skill.hitBonus ?? 0))) {
    return { skillId: skill.id, text: `${skill.id} missed.`, damage: 0, heal: 0, miss: true, crit: false, block: false, status: null };
  }
  battle.skillUses[skill.id] = (battle.skillUses[skill.id] ?? 0) + 1;

  const action = { skillId: skill.id, text: "", damage: 0, heal: 0, miss: false, crit: false, block: false, status: null };
  const lines = [];

  for (const effect of skill.effects ?? []) {
    if (effect.type === "damage") {
      const base = getEffectBaseStat(player, effect) * effect.power * 0.64;
      const extraBase = getDamageExtraBase(player, foe, effect);
      if (effect.absolute) {
        const rawDamage = Math.max(1, Math.round(base + extraBase));
        const result = dealDamage(foe, rawDamage, { shieldBreak: effect.shieldBreak ?? 6, aoe: effect.aoe });
        action.damage += result.hpDamage;
        action.shieldAbsorbed = (action.shieldAbsorbed ?? 0) + result.shieldAbsorbed;
        lines.push(`${skill.id} dealt ${result.hpDamage} absolute damage${result.shieldAbsorbed ? `; shield absorbed ${result.shieldAbsorbed}` : ""}`);
        if (effect.lifeSteal) {
          const stolen = applyHeal(player, Math.round(result.hpDamage * effect.lifeSteal), { overheal: false });
          action.heal += stolen;
          lines.push(`${skill.id} stole ${stolen} HP`);
        }
        triggerRunes(foe, player, "on_hit", battle, "enemy");
        continue;
      }
      const relicMultiplier = getDamageMultiplier(state, { player, battle, skill });
      const stalemateMultiplier = getStalemateDamageMultiplier(battle);
      const traitMultiplier = getTraitDamageMultiplier(skill, traits);
      const critChance = getEffectCritChance(player, effect) - (traits.includes("critical_resistance") ? 10 : 0);
      const crit = Math.random() * 100 < Math.max(0, critChance);
      const critMultiplier = crit ? 1 + getBattleStat(player, "CRD") / 100 : 1;
      const defense = skill.tags?.includes("magic") ? getBattleStat(foe, "MD") : getBattleStat(foe, "PD");
      const rawDamage = Math.max(1, Math.round((base + extraBase) * getOutgoingDamageMultiplier(player) * getIncomingDamageMultiplier(foe) * relicMultiplier * stalemateMultiplier * traitMultiplier * critMultiplier - defense * getDefenseMultiplier(foe) * 0.34));
      const result = dealDamage(foe, rawDamage, { shieldBreak: effect.shieldBreak ?? 6, aoe: effect.aoe, burn: skill.tags?.includes("fire") || skill.tags?.includes("burn") });
      action.damage += result.hpDamage;
      action.crit = action.crit || crit;
      action.block = action.block || result.shieldAbsorbed > 0;
      action.shieldAbsorbed = (action.shieldAbsorbed ?? 0) + result.shieldAbsorbed;
      lines.push(`${skill.id} dealt ${result.hpDamage}${crit ? " critical" : ""} damage${result.shieldAbsorbed ? `; shield absorbed ${result.shieldAbsorbed}` : ""}`);
      if (effect.lifeSteal) {
        const stolen = applyHeal(player, Math.round(result.hpDamage * effect.lifeSteal), { overheal: false });
        action.heal += stolen;
        lines.push(`${skill.id} stole ${stolen} HP`);
      }
      for (const runeAction of triggerRunes(player, foe, "after_damage", battle, "player")) {
        lines.push(runeAction.text);
        action.damage += runeAction.damage;
      }
    }
    if (effect.type === "heal") {
      const healed = Math.round(getBattleStat(player, effect.stat) * effect.power * (effect.healScale ?? 0.72) + player.stats.HP * (effect.maxHpRatio ?? 0));
      const actualHeal = applyHeal(player, healed, effect);
      action.heal += actualHeal;
      lines.push(`${skill.id} healed ${actualHeal} HP`);
    }
    if (effect.type === "guard") {
      player.guard += effect.amount;
      action.block = true;
      action.shieldGained = (action.shieldGained ?? 0) + effect.amount;
      lines.push(`${skill.id} gained ${effect.amount} block`);
    }
    if (effect.type === "shield") {
      const gained = applyShield(player, effect);
      action.block = true;
      action.shieldGained = (action.shieldGained ?? 0) + gained;
      lines.push(`${skill.id} gained ${gained} shield`);
    }
    if (effect.type === "dispel") {
      const targetFighter = effect.target === "self" ? player : foe;
      const removed = dispelStatuses(targetFighter, effect);
      if (removed > 0) {
        lines.push(`${skill.id} removed ${removed} status effects`);
      }
    }
    if (effect.type === "poison" && !traits.includes("poison_immunity")) {
      const poisonAmount = Math.round((effect.amount ?? effect.power ?? 1) * getPoisonMultiplier(state));
      foe.poison += poisonAmount;
      action.status = "poison";
      lines.push(`${skill.id} applied ${poisonAmount} poison`);
    }
    if (effect.type === "status") {
      const targetFighter = effect.target === "self" ? player : foe;
      applyStatus(targetFighter, effect);
      action.status = effect.id;
      action.statusText = statusLog(effect);
      lines.push(`${skill.id} applied ${statusLog(effect)}`);
    }
    if (effect.type === "typed_status") {
      const targetFighter = effect.target === "self" ? player : foe;
      applyTypedStatus(targetFighter, effect);
      action.status = effect.kind;
      action.statusText = effect.kind;
      lines.push(`${skill.id} applied ${effect.kind}`);
    }
    if (effect.type === "summon") {
      const added = addSummons(player, effect, player);
      lines.push(`${skill.id} summoned ${added} allies`);
    }
    if (effect.type === "rune") {
      addRune(player, effect);
      lines.push(`${skill.id} installed ${effect.runeId}`);
    }
    if (effect.type === "resource") {
      const gained = addResource(player, effect.key, effect.amount);
      lines.push(`${skill.id} gained ${gained} ${effect.key}`);
    }
    if (effect.type === "consume_resource") {
      const spent = consumeResource(player, effect.key);
      const rawDamage = Math.max(1, Math.round(spent * effect.power + getBattleStat(player, effect.stat ?? "PA") * 0.35));
      const result = dealDamage(foe, rawDamage, { shieldBreak: 8 });
      action.damage += result.hpDamage;
      lines.push(`${skill.id} spent ${spent} ${effect.key} for ${result.hpDamage}${effect.absolute ? " absolute" : ""} damage`);
    }
    if (effect.type === "consume_status") {
      const targetFighter = effect.target === "self" ? player : foe;
      const consumed = consumeTypedStatus(targetFighter, effect.kind);
      if (consumed > 0) {
        const result = dealDamage(foe, consumed * (effect.power ?? 1), { shieldBreak: 6, ignoreShield: effect.ignoreShield });
        action.damage += result.hpDamage;
        lines.push(`${skill.id} consumed ${effect.kind} for ${result.hpDamage} damage`);
      }
    }
    if (effect.type === "clear_resource") {
      const spent = consumeResource(player, effect.key);
      lines.push(`${skill.id} cleared ${spent} ${effect.key}`);
    }
    if (effect.type === "stat_tradeoff") {
      applyStatus(player, {
        id: effect.id ?? `${skill.id}_tradeoff`,
        target: "self",
        turns: effect.turns ?? 999,
        permanent: effect.permanent ?? true,
        stack: effect.stack ?? false,
        statMods: effect.statMods ?? {}
      });
      lines.push(`${skill.id} changed stance`);
    }
    if (effect.type === "extra_action" && (battle.extraActionUses?.player ?? 0) < (effect.limit ?? 10) && Math.random() < (effect.chance ?? 1)) {
      battle.extraActions.player = Math.min(10, (battle.extraActions.player ?? 0) + 1);
      battle.extraActionUses.player = (battle.extraActionUses.player ?? 0) + 1;
      lines.push(`${skill.id} granted an extra action`);
    }
    if (effect.type === "sacrifice") {
      const cost = Math.max(1, Math.round(player.stats.HP * effect.ratio));
      player.hp = Math.max(1, player.hp - cost);
      lines.push(`${skill.id} consumed ${cost} HP`);
    }
  }

  action.text = `${lines.join(". ")}.`;
  return action;
}

function applyActionStartEffects(fighter, actor, battle) {
  const bleed = getTypedStatus(fighter, "bleed");
  if (!bleed) {
    return null;
  }
  const damage = Math.max(1, Math.round(bleed.amount * (1 + getBattleStat(fighter, "SPD") / 140)));
  const result = dealDamage(fighter, damage, { ignoreShield: true });
  return {
    actor: "status",
    skillId: null,
    text: `${actor} suffered ${result.hpDamage} bleed damage while acting.`,
    damage: result.hpDamage,
    heal: 0,
    miss: false,
    crit: false,
    block: false,
    status: "bleed"
  };
}

function applyEndTurnEffects(battle) {
  const actions = [];
  for (const [actor, fighter] of [["player", battle.player], ["enemy", battle.foe]]) {
    let totalDamage = 0;
    const burn = getTypedStatus(fighter, "burn");
    if (burn) {
      totalDamage += dealDamage(fighter, burn.amount, { burn: true }).hpDamage;
    }
    const decay = getTypedStatus(fighter, "decay");
    if (decay) {
      totalDamage += dealDamage(fighter, decay.amount, { ignoreShield: true }).hpDamage;
    }
    const regen = getTypedStatus(fighter, "regeneration")?.amount ?? 0;
    if (fighter.poison > 0) {
      const poisonDamage = Math.max(0, fighter.poison - regen);
      if (poisonDamage > 0) {
        totalDamage += dealDamage(fighter, poisonDamage, { ignoreShield: true }).hpDamage;
      }
    } else if (regen > 0) {
      applyHeal(fighter, regen, { overheal: false });
    }
    if (totalDamage > 0) {
      actions.push({
        actor: "status",
        skillId: null,
        text: `${actor} suffered ${totalDamage} ongoing damage.`,
        damage: totalDamage,
        heal: regen > 0 && fighter.poison <= 0 ? regen : 0,
        miss: false,
        crit: false,
        block: false,
        status: "ongoing"
      });
    }
  }
  return actions;
}

function dealDamage(target, rawDamage, options = {}) {
  let damage = Math.max(0, Math.round(rawDamage));
  if (options.burn && target.guard > 0) {
    damage = Math.ceil(damage * 0.5);
  }
  let shieldAbsorbed = 0;
  if (!options.ignoreShield && target.guard > 0) {
    shieldAbsorbed = Math.min(target.guard, damage);
    target.guard -= shieldAbsorbed;
    damage -= shieldAbsorbed;
  } else if (options.shieldBreak) {
    target.guard = Math.max(0, target.guard - options.shieldBreak);
  }
  let summonDamage = 0;
  if (!options.aoe && target.summons.length > 0 && damage > 0) {
    const protector = target.summons[0];
    const share = protector.share ?? 0.5;
    summonDamage = Math.round(damage * share);
    protector.hp -= summonDamage;
    damage -= summonDamage;
    const before = target.summons.length;
    const failedContract = target.summons.some((summon) => summon.hp <= 0 && summon.contract);
    target.summons = target.summons.filter((summon) => summon.hp > 0);
    if (failedContract || target.summons.length < before && target.summons.every((summon) => !summon.contract)) {
      target.resources.contract_failed = failedContract ? 1 : target.resources.contract_failed ?? 0;
    }
  }
  if (options.aoe && target.summons.length > 0) {
    for (const summon of target.summons) {
      summon.hp -= damage;
    }
    const failedContract = target.summons.some((summon) => summon.hp <= 0 && summon.contract);
    target.summons = target.summons.filter((summon) => summon.hp > 0);
    if (failedContract) {
      target.resources.contract_failed = 1;
    }
  }
  target.hp = Math.max(0, target.hp - damage);
  return { hpDamage: damage, shieldAbsorbed, summonDamage };
}

function applyHeal(fighter, amount, effect = {}) {
  const decay = getTypedStatus(fighter, "decay")?.amount ?? 0;
  const decayPenalty = Math.min(0.8, decay / 100);
  const healAmount = Math.max(0, Math.round(amount * (1 - decayPenalty)));
  const poisonRemoved = Math.min(fighter.poison, Math.floor(healAmount * 0.5));
  fighter.poison = Math.max(0, fighter.poison - poisonRemoved);
  const cap = effect.overheal ? fighter.stats.HP * 2 : fighter.stats.HP;
  const before = fighter.hp;
  fighter.hp = Math.min(cap, fighter.hp + healAmount);
  return Math.round(fighter.hp - before);
}

function applyShield(fighter, effect) {
  const statBonus = effect.stat ? getBattleStat(fighter, effect.stat) * (effect.power ?? 0) : 0;
  const gained = Math.max(0, Math.round((effect.amount ?? 0) + statBonus));
  fighter.guard += gained;
  return gained;
}

function applyTypedStatus(fighter, effect) {
  let kind = effect.kind;
  if (kind === "element_random") {
    const elements = ["burn", "freeze", "shock", "fracture"];
    kind = elements[Math.floor(Math.random() * elements.length)];
  }
  const current = fighter.typedStatuses[kind] ?? { amount: 0, turns: effect.turns ?? null };
  fighter.typedStatuses[kind] = {
    amount: current.amount + Math.max(0, Math.round(effect.amount ?? 0)),
    turns: effect.turns === null || effect.turns === undefined ? null : Math.max(current.turns ?? 0, effect.turns)
  };
}

function getTypedStatus(fighter, kind) {
  return fighter.typedStatuses?.[kind] ?? null;
}

function typedStatusSnapshot(fighter) {
  return Object.entries(fighter.typedStatuses ?? {}).map(([id, status]) => ({ id, turns: status.turns, amount: status.amount }));
}

function addResource(fighter, key, amount) {
  const gained = Math.max(0, Math.round(amount));
  fighter.resources[key] = (fighter.resources[key] ?? 0) + gained;
  return gained;
}

function consumeResource(fighter, key) {
  const spent = Math.max(0, Math.round(fighter.resources[key] ?? 0));
  fighter.resources[key] = 0;
  return spent;
}

function consumeTypedStatus(fighter, kind) {
  const status = getTypedStatus(fighter, kind);
  if (!status) {
    return 0;
  }
  const amount = Math.max(0, Math.round(status.amount ?? 0));
  delete fighter.typedStatuses[kind];
  return amount;
}

function addSummons(fighter, effect, owner) {
  const maxSummons = 100;
  const available = Math.max(0, maxSummons - fighter.summons.length);
  const count = Math.min(available, effect.count ?? 1);
  const stat = effect.stat ?? "MA";
  for (let index = 0; index < count; index += 1) {
    const maxHp = Math.max(8, Math.round((owner.stats.HP * 0.18) + getBattleStat(owner, stat) * (effect.elite ? 1.6 : 1.0)));
    fighter.summons.push({
      id: `${effect.summonId}_${Date.now()}_${index}`,
      role: effect.role ?? "striker",
      hp: maxHp,
      maxHp,
      stat,
      power: Math.max(1, Math.round(getBattleStat(owner, stat) * (effect.elite ? 0.55 : 0.35))),
      cadence: effect.role === "legion" ? 2 : 1,
      share: effect.role === "tank" ? 0.7 : effect.role === "striker" ? 0.3 : 0.5,
      contract: Boolean(effect.contract)
    });
  }
  return count;
}

function resolveSummonActions(battle, actor) {
  const owner = actor === "player" ? battle.player : battle.foe;
  const target = actor === "player" ? battle.foe : battle.player;
  for (const summon of owner.summons) {
    if (battle.turn % summon.cadence !== 0) {
      continue;
    }
    dealDamage(target, summon.power, { shieldBreak: 2 });
  }
}

function addRune(fighter, effect) {
  if (fighter.runes.length >= (effect.maxInstalled ?? 100)) {
    return false;
  }
  fighter.runes.push({ id: effect.runeId, trigger: effect.trigger, effects: effect.effects ?? [] });
  return true;
}

function triggerRunes(owner, target, trigger, battle, actor) {
  const actions = [];
  const remaining = [];
  for (const rune of owner.runes) {
    if (rune.trigger !== trigger) {
      remaining.push(rune);
      continue;
    }
    let damage = 0;
    for (const effect of rune.effects) {
      if (effect.type === "damage") {
        damage += dealDamage(target, getBattleStat(owner, effect.stat) * effect.power * 0.5, { shieldBreak: 3 }).hpDamage;
      }
      if (effect.type === "shield") {
        applyShield(owner, effect);
      }
      if (effect.type === "typed_status") {
        applyTypedStatus(target, effect);
      }
    }
    actions.push({ actor, skillId: rune.id, text: `${rune.id} triggered for ${damage} damage.`, damage, heal: 0, miss: false, crit: false, block: false, status: "rune" });
  }
  owner.runes = remaining;
  return actions;
}

function finishBattle(battle) {
  battle.finished = true;
  battle.won = battle.foe.hp <= 0;
}

function rollSkill(state, battle, skill) {
  return Math.random() < getBattleActivationChance(state, battle, skill);
}

function canUseBattleSkill(battle, skill) {
  return !skill.maxUses || (battle.skillUses?.[skill.id] ?? 0) < skill.maxUses;
}

function getBattleActivationChance(state, battle, skill) {
  const baseChance = getEffectiveActivationChance(state, skill.id);
  const uses = battle.skillUses?.[skill.id] ?? 0;
  const penalty = (skill.repeatChancePenalty ?? 0) * uses;
  return Math.max(skill.minChance ?? 0.08, baseChance - penalty);
}

function applyStatus(fighter, effect) {
  const status = {
    id: effect.id,
    turns: effect.turns ?? 1,
    permanent: Boolean(effect.permanent),
    statMods: effect.statMods ?? {},
    damageMultiplier: effect.damageMultiplier ?? 1,
    damageTakenMultiplier: effect.damageTakenMultiplier ?? 1,
    defenseMultiplier: effect.defenseMultiplier ?? 1,
    skillChanceMultiplier: effect.skillChanceMultiplier ?? 1,
    guaranteedDodge: Boolean(effect.guaranteedDodge)
  };
  const existing = fighter.statuses.find((item) => item.id === status.id);
  if (effect.stack && existing) {
    existing.turns = Math.max(existing.turns, status.turns);
    existing.permanent = existing.permanent || status.permanent;
    existing.statMods = mergeStatMods(existing.statMods, status.statMods);
    existing.damageMultiplier *= status.damageMultiplier;
    existing.damageTakenMultiplier *= status.damageTakenMultiplier;
    existing.defenseMultiplier *= status.defenseMultiplier;
    existing.skillChanceMultiplier *= status.skillChanceMultiplier;
    return;
  }
  fighter.statuses = fighter.statuses.filter((item) => item.id !== status.id);
  fighter.statuses.push(status);
}

function mergeStatMods(first = {}, second = {}) {
  const result = { ...first };
  for (const [key, value] of Object.entries(second)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
}

function dispelStatuses(fighter, effect) {
  const before = fighter.statuses.length;
  if (effect.positiveOnly) {
    fighter.statuses = fighter.statuses.filter((status) => !isPositiveStatus(status));
  } else {
    fighter.statuses = [];
  }
  return before - fighter.statuses.length;
}

function isPositiveStatus(status) {
  return Object.values(status.statMods ?? {}).some((value) => value > 0) ||
    (status.damageMultiplier ?? 1) > 1 ||
    (status.defenseMultiplier ?? 1) > 1 ||
    (status.skillChanceMultiplier ?? 1) > 1 ||
    (status.damageTakenMultiplier ?? 1) < 1;
}

function tickStatuses(fighter) {
  fighter.statuses = fighter.statuses
    .map((status) => status.permanent ? status : { ...status, turns: status.turns - 1 })
    .filter((status) => status.turns > 0);
  for (const [kind, status] of Object.entries(fighter.typedStatuses ?? {})) {
    if (status.turns === null || status.turns === undefined) {
      continue;
    }
    status.turns -= 1;
    if (status.turns <= 0) {
      delete fighter.typedStatuses[kind];
    }
  }
}

function skillRequiresAccuracy(skill) {
  return (skill.effects ?? []).some((effect) => effect.type === "damage" || effect.type === "poison" || effect.type === "typed_status" || (effect.type === "status" && effect.target !== "self"));
}

function getBattleStat(fighter, key) {
  return Math.max(0, Math.round((fighter.stats[key] ?? 0) + fighter.statuses.reduce((sum, status) => sum + (status.statMods?.[key] ?? 0), 0) + getTypedStatMod(fighter, key)));
}

function getOutgoingDamageMultiplier(fighter) {
  return fighter.statuses.reduce((multiplier, status) => multiplier * (status.damageMultiplier ?? 1), 1);
}

function getIncomingDamageMultiplier(fighter) {
  return fighter.statuses.reduce((multiplier, status) => multiplier * (status.damageTakenMultiplier ?? 1), 1);
}

function getDefenseMultiplier(fighter) {
  return fighter.statuses.reduce((multiplier, status) => multiplier * (status.defenseMultiplier ?? 1), 1);
}

function getSkillChanceMultiplier(fighter) {
  const silence = getTypedStatus(fighter, "silence") ? 0.72 : 1;
  const misfortune = getTypedStatus(fighter, "misfortune") ? 0.92 : 1;
  return fighter.statuses.reduce((multiplier, status) => multiplier * (status.skillChanceMultiplier ?? 1), 1) * silence * misfortune;
}

function getEffectCritChance(fighter, effect) {
  if (effect.inverseCrit) {
    return Math.max(effect.inverseCritFloor ?? 5, (effect.inverseCritBase ?? 42) - getBattleStat(fighter, "CRT") + (effect.critBonus ?? 0));
  }
  return getBattleStat(fighter, "CRT") + (effect.critBonus ?? 0) + (getTypedStatus(fighter, "shock")?.amount ?? 0);
}

function getEffectBaseStat(fighter, effect) {
  const main = getBattleStat(fighter, effect.stat) ?? getBattleStat(fighter, "PA");
  if (!effect.inverseScaleStat) {
    return main;
  }
  const lowStatBonus = Math.max(0, (effect.inverseScaleBase ?? 30) - getBattleStat(fighter, effect.inverseScaleStat)) * (effect.inverseScalePower ?? 1);
  return main + lowStatBonus;
}

function getTypedStatMod(fighter, key) {
  let mod = 0;
  const freeze = getTypedStatus(fighter, "freeze")?.amount ?? 0;
  const shock = getTypedStatus(fighter, "shock")?.amount ?? 0;
  const fracture = getTypedStatus(fighter, "fracture")?.amount ?? 0;
  const weaken = getTypedStatus(fighter, "weaken")?.amount ?? 0;
  const blind = getTypedStatus(fighter, "blind")?.amount ?? 0;
  const misfortune = getTypedStatus(fighter, "misfortune")?.amount ?? 0;
  if (key === "SPD" || key === "EVA") mod -= freeze;
  if (key === "CRT" || key === "CRD") mod -= shock;
  if (key === "MA" || key === "MD") mod -= fracture;
  if (key === "PA") mod -= weaken;
  if (key === "ACC") mod -= blind * 2;
  if (key === "CRT" || key === "EVA") mod -= misfortune;
  return mod;
}

function getDamageExtraBase(actor, target, effect) {
  let extra = 0;
  if (effect.missingHpPower) {
    extra += actor.stats.HP * Math.max(0, 1 - actor.hp / actor.stats.HP) * effect.missingHpPower;
  }
  if (effect.lowMaPower) {
    extra += Math.max(0, 40 - getBattleStat(actor, "MA")) * effect.lowMaPower * getBattleStat(actor, "PA");
  }
  if (effect.statusCountPower) {
    extra += (Object.keys(actor.typedStatuses ?? {}).length + actor.statuses.length) * effect.statusCountPower * getBattleStat(actor, "PA");
  }
  if (effect.enemyCurrentHpPower) {
    extra += target.hp * effect.enemyCurrentHpPower;
  }
  if (effect.enemyMissingHpPower) {
    extra += (target.stats.HP - target.hp) * effect.enemyMissingHpPower;
  }
  if (effect.currentHpPower) {
    extra += actor.hp * effect.currentHpPower;
  }
  if (effect.poisonPower) {
    extra += target.poison * effect.poisonPower;
  }
  if (effect.resourcePower) {
    extra += (actor.resources[effect.resourceKey] ?? 0) * effect.resourcePower * getBattleStat(actor, effect.stat ?? "PA");
  }
  if (effect.targetStatusPower) {
    extra += (getTypedStatus(target, effect.targetStatus)?.amount ?? 0) * effect.targetStatusPower;
  }
  if (effect.shieldPower) {
    extra += Math.max(0, target.guard ?? 0) * effect.shieldPower;
  }
  if (effect.lowEvaPower) {
    extra += Math.max(0, (effect.lowEvaBase ?? 30) - getBattleStat(actor, "EVA")) * effect.lowEvaPower;
  }
  if (effect.swordsmanshipPower) {
    extra += (actor.resources.swordsmanship ?? 0) * effect.swordsmanshipPower * getBattleStat(actor, "PA");
  }
  if (effect.balancePower) {
    const gap = Math.abs(getBattleStat(actor, "PA") - getBattleStat(actor, "MA"));
    extra += Math.max(0, 40 - gap) * effect.balancePower * Math.min(getBattleStat(actor, "PA"), getBattleStat(actor, "MA"));
  }
  if (effect.pdToPa) {
    extra += getBattleStat(actor, "PD") * effect.pdToPa;
  }
  if (effect.maxHpPower) {
    extra += actor.stats.HP * effect.maxHpPower;
  }
  if (effect.evadeBonusPower) {
    extra += getBattleStat(actor, "EVA") * effect.evadeBonusPower;
  }
  if (effect.runeCountPower) {
    extra += actor.runes.length * effect.runeCountPower * getBattleStat(actor, "MA");
  }
  if (effect.elementResonancePower) {
    const elements = ["burn", "freeze", "shock", "fracture"];
    const count = elements.filter((e) => getTypedStatus(target, e)).length;
    extra += count * effect.elementResonancePower * getBattleStat(actor, "MA");
  }
  return extra;
}

function conditionMet(skill, player, foe, battle) {
  if (!skill.condition) {
    return true;
  }
  if (skill.condition.type === "battle_start") {
    return (battle?.turn ?? 1) <= (skill.condition.turn ?? 1);
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
  if (skill.condition.type === "has_resource") {
    return (player.resources?.[skill.condition.key] ?? 0) >= (skill.condition.amount ?? 1);
  }
  if (skill.condition.type === "target_has_status") {
    return Boolean(getTypedStatus(foe, skill.condition.kind));
  }
  if (skill.condition.type === "target_has_shield") {
    return (foe.guard ?? 0) > (skill.condition.amount ?? 0);
  }
  if (skill.condition.type === "self_has_status") {
    return Boolean(getTypedStatus(player, skill.condition.kind));
  }
  if (skill.condition.type === "has_summon") {
    return player.summons.length > 0;
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
  if (traits.includes("physical_weakness") && skill.tags?.includes("physical")) {
    multiplier *= 1.25;
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
