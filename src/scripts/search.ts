const input = document.querySelector<HTMLInputElement>('#query')!;
const container = document.querySelector<HTMLElement>('#bird-time')!;
const panels = Array.from(container.querySelectorAll<HTMLElement>('.panel'));
const status = document.querySelector<HTMLElement>('#search-status')!;
const empty = document.querySelector<HTMLElement>('#empty-results')!;

function filterPanels() {
  const query = input.value.trim().toLowerCase();
  let visiblePanels = 0;
  let visibleEntries = 0;

  for (const panel of panels) {
    const entries = Array.from(panel.querySelectorAll<HTMLElement>('.entry'));
    const nameMatches = panel.dataset.character?.includes(query) ?? false;
    const matches = entries.filter((entry) =>
      entry.textContent?.toLowerCase().includes(query) ?? false
    );
    const visibleEntriesInPanel = nameMatches ? entries : matches;

    entries.forEach((entry) => {
      entry.hidden = !visibleEntriesInPanel.includes(entry);
    });
    panel.hidden = visibleEntriesInPanel.length === 0;

    if (visibleEntriesInPanel.length > 0) {
      visiblePanels++;
      visibleEntries += visibleEntriesInPanel.length;
    }
  }

  container.hidden = visiblePanels === 0;
  empty.hidden = visiblePanels !== 0;
  status.textContent = `${visiblePanels} ${visiblePanels === 1 ? 'character' : 'characters'} · ${visibleEntries} ${visibleEntries === 1 ? 'quote' : 'quotes'} shown`;
}

document.querySelector<HTMLElement>('#search-control')!.hidden = false;
input.addEventListener('input', filterPanels);
window.addEventListener('pageshow', filterPanels);
filterPanels();

export {};
