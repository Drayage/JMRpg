import {
  bossPanel,
  choicesPanel,
  gameOverPanel,
  jobsPanel,
  logPanel,
  battleLogModal,
  relicsPanel,
  skillsPanel,
  statsPanel,
  statusPanel
} from "./panels.js?v=20260621-1";

export function render(app, state) {
  app.innerHTML = `
    <div class="column">
      ${statusPanel(state)}
      ${bossPanel(state)}
      ${statsPanel(state)}
    </div>
    <div class="column">
      ${gameOverPanel(state)}
      ${choicesPanel(state)}
      ${jobsPanel(state)}
    </div>
    <div class="column">
      ${skillsPanel(state)}
      ${relicsPanel(state)}
      ${logPanel(state)}
    </div>
    ${battleLogModal(state)}
  `;
}
