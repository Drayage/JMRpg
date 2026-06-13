import assert from "node:assert/strict";
import { skills } from "../js/data/skills.js?v=test";
import { monsters } from "../js/data/monsters.js?v=test";
import { createInitialState } from "../js/state.js";
import { createBattle, runBattleStep } from "../js/systems/battle.js";
import { finishBattleAction } from "../js/systems/events.js";

function withRandomSequence(values, fn) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)];
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

function makeState(jobId, equippedSkills) {
  const state = createInitialState();
  state.currentJobId = jobId;
  state.player.learnedSkills = ["basic_attack", ...equippedSkills];
  state.player.equippedSkills = ["basic_attack", ...equippedSkills];
  state.player.skillMastery = Object.fromEntries(equippedSkills.map((skillId) => [skillId, 100]));
  state.player.ap = 99;
  return state;
}

const trainingDummy = monsters.training_dummy ?? Object.values(monsters)[0];

{
  const state = makeState("mystic", []);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  const action = runBattleStep(state, battle);
  assert.equal(action.skillId, "basic_attack");
}

{
  const state = makeState("mystic", ["mystic_init"]);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  const action = runBattleStep(state, battle);
  assert.equal(action.skillId, "mystic_init");
  assert.equal(skills.mystic_init.basicAttackReplacement, true);
}

{
  const state = makeState("destroyer", ["destroyer_core"]);
  const battle = createBattle(state, trainingDummy);
  battle.order = ["player"];
  battle.foe.guard = 10;
  const action = withRandomSequence([0, 0.99], () => runBattleStep(state, battle));
  assert.equal(action.skillId, "destroyer_core");
  assert.equal(action.miss, true);
  assert.equal(battle.skillUses.destroyer_core ?? 0, 0);
}

{
  const state = makeState("warrior", []);
  const battle = createBattle(state, trainingDummy);
  battle.foe.hp = 0;
  battle.finished = true;
  battle.won = true;
  state.battle = battle;
  state.pendingBattleChoice = null;
  state.busy = true;
  finishBattleAction(state);
  assert.equal(state.busy, false);
  assert.equal(state.actionResult?.battle, battle);
  assert.equal(state.actionResult?.bossWon, true);
}

for (const skill of Object.values(skills)) {
  if (skill.system || skill.basicAttackReplacement || skill.maxUses === 1 || skill.condition) {
    continue;
  }
  if (skill.type === "active") {
    assert.ok(skill.chance <= 0.55, `${skill.id} repeat active chance is too high: ${skill.chance}`);
  }
}

console.log("combat skill rules ok");
