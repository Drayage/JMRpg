import { createInitialState } from "./state.js?v=20260606-15";
import { acceptPendingRelic, continueAction, declinePendingRelic, finishBattleAction, generateChoices, refreshHuntWinRates, resolveChoice, selectHuntMonster, skipJobChange } from "./systems/events.js?v=20260606-15";
import { runBattleStep } from "./systems/battle.js?v=20260606-15";
import { changeJob } from "./systems/jobs.js?v=20260606-15";
import { equipSkill, unequipSkill } from "./systems/skills.js?v=20260606-15";
import { render } from "./ui/render.js?v=20260606-15";

const app = document.querySelector("#app");
let state = createInitialState();
state.choices = generateChoices(state);
let changeClearTimer = null;

registerServiceWorker();

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
  if (action === "choose-monster") {
    const result = selectHuntMonster(state, target.dataset.monsterChoiceId);
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
  if (action === "skip-job-change") {
    skipJobChange(state);
  }
  if (action === "accept-relic") {
    acceptPendingRelic(state);
  }
  if (action === "decline-relic") {
    declinePendingRelic(state);
  }
  if (action === "continue-action") {
    continueAction(state);
  }
  if (action === "open-battle-log") {
    state.showBattleLog = true;
  }
  if (action === "close-battle-log") {
    if (target.classList.contains("modal-backdrop") && event.target !== target) {
      return;
    }
    state.showBattleLog = false;
  }
  if (action === "set-speed") {
    state.battleSpeed = target.dataset.speed;
  }
  if (action === "equip-skill") {
    if (equipSkill(state, target.dataset.skillId)) {
      refreshHuntWinRates(state);
    }
  }
  if (action === "unequip-skill") {
    if (unequipSkill(state, target.dataset.skillId)) {
      refreshHuntWinRates(state);
    }
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js?v=20260606-15").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
