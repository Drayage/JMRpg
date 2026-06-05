import { createInitialState } from "./state.js";
import { advanceTime, generateChoices, resolveChoice } from "./systems/events.js";
import { changeJob } from "./systems/jobs.js";
import { equipSkill, unequipSkill } from "./systems/skills.js";
import { render } from "./ui/render.js";

const app = document.querySelector("#app");
let state = createInitialState();
state.choices = generateChoices(state);

function redraw() {
  render(app, state);
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  if (action === "choose-event") {
    resolveChoice(state, target.dataset.choiceId);
  }
  if (action === "change-job") {
    if (changeJob(state, target.dataset.jobId)) {
      advanceTime(state);
    }
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
