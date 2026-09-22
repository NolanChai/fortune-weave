const input = document.querySelector<HTMLInputElement>('#query')!;
const container = document.querySelector<HTMLElement>('#bird-time')!;
const panels = Array.from(container.querySelectorAll<HTMLElement>('.panel'), (panel) => ({
  element: panel,
  name: panel.dataset.character ?? '',
  entries: Array.from(panel.querySelectorAll<HTMLElement>('.entry'), (entry) => ({
    element: entry,
    text: entry.textContent?.toLowerCase() ?? '',
  })),
}));
const status = document.querySelector<HTMLElement>('#search-status')!;
const empty = document.querySelector<HTMLElement>('#empty-results')!;

function filterPanels() {
  const query = input.value.trim().toLowerCase();
  let visiblePanels = 0;
  let visibleEntries = 0;

  for (const panel of panels) {
    const nameMatches = panel.name.includes(query);
    let matchedEntries = 0;
    for (const entry of panel.entries) {
      entry.element.hidden = !nameMatches && !entry.text.includes(query);
      if (!entry.element.hidden) matchedEntries++;
    }
    panel.element.hidden = matchedEntries === 0;
    if (matchedEntries > 0) {
      visiblePanels++;
      visibleEntries += matchedEntries;
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
