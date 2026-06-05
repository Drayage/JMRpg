import { createInitialState } from "./state.js";
import { continueAction, finishBattleAction, generateChoices, resolveChoice } from "./systems/events.js";
import { runBattleStep } from "./systems/battle.js";
import { changeJob } from "./systems/jobs.js";
import { equipSkill, unequipSkill } from "./systems/skills.js";
import { render } from "./ui/render.js";

const app = document.querySelector("#app");
let state = createInitialState();
state.choices = generateChoices(state);
let changeClearTimer = null;

function redraw() {
  render(app, state);
  scheduleChangeClear();
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }
  if (state.busy && target.dataset.action !== "set-speed") {
    return;
  }

  const action = target.dataset.action;
  if (action === "choose-event") {
    const result = resolveChoice(state, target.dataset.choiceId);
    redraw();
    if (result?.battle) {
      runVisibleBattle();
      return;
    }
  }
  if (action === "change-job") {
    if (changeJob(state, target.dataset.jobId)) {
      state.actionResult = {
        choice: { templateId: "job_change", type: "job_change" },
        jobChangedTo: target.dataset.jobId
      };
    }
  }
  if (action === "continue-action") {
    continueAction(state);
  }
  if (action === "set-speed") {
    state.battleSpeed = target.dataset.speed;
  }
  if (action === "equip-skill") {
    equipSkill(state, target.dataset.skillId);
  }
  if (action === "unequip-skill") {
    unequipSkill(state, target.dataset.skillId);
  }
  if (action === "restart") {
    state = createInitialState();
    state.choices = generateChoices(state);
  }

  redraw();
});

redraw();

async function runVisibleBattle() {
  while (state.battle && !state.battle.finished) {
    runBattleStep(state, state.battle);
    redraw();
    await waitForBattleSpeed();
  }
  finishBattleAction(state);
  redraw();
}

function waitForBattleSpeed() {
  const delays = {
    normal: 480,
    fast: 300,
    instant: 0
  };
  return new Promise((resolve) => setTimeout(resolve, delays[state.battleSpeed] ?? delays.fast));
}

function scheduleChangeClear() {
  if (!state.changed || Object.keys(state.changed).length === 0) {
    return;
  }
  clearTimeout(changeClearTimer);
  changeClearTimer = setTimeout(() => {
    state.changed = {};
    render(app, state);
  }, 950);
}
