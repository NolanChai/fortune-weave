const input = document.querySelector<HTMLInputElement>('#class-query')!;
const route = document.querySelector<HTMLSelectElement>('#class-route')!;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tier-filters button'));
const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-tier-group]'), (element) => ({
  element,
  tier: element.dataset.tierGroup!,
  rows: Array.from(element.querySelectorAll<HTMLTableRowElement>('[data-class]'), (row) => ({
    element: row,
    search: `${row.textContent} ${row.dataset.aliases}`.replace(/\s+/g, ' ').toLowerCase(),
    routes: row.dataset.routes!.split(',').filter(Boolean),
    standard: row.dataset.standard === 'true',
  })),
}));
let selectedTier = 'all';

function filterClasses() {
  const query = input.value.trim().replace(/\s+/g, ' ').toLowerCase();
  let count = 0;
  for (const group of groups) {
    let groupCount = 0;
    for (const row of group.rows) {
      const matchesTier = selectedTier === 'all' || selectedTier === group.tier;
      const matchesRoute = route.value === 'all' || (route.value === 'standard' ? row.standard : row.routes.includes(route.value));
      const visible = matchesTier && matchesRoute && row.search.includes(query);
      row.element.hidden = !visible;
      if (visible) groupCount++;
    }
    group.element.hidden = groupCount === 0;
    count += groupCount;
  }
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.tier === selectedTier));
  document.querySelector<HTMLElement>('#class-empty')!.hidden = count > 0;
  document.querySelector<HTMLElement>('#class-status')!.textContent = `${count} ${count === 1 ? 'class' : 'classes'} shown`;
}

function clearFilters() {
  selectedTier = 'all';
  input.value = '';
  route.value = 'all';
  filterClasses();
}

for (const button of buttons) button.addEventListener('click', () => {
  selectedTier = button.dataset.tier!;
  filterClasses();
});
input.addEventListener('input', filterClasses);
route.addEventListener('change', filterClasses);
document.querySelector('#clear-class-filters')!.addEventListener('click', clearFilters);
for (const link of document.querySelectorAll<HTMLAnchorElement>('.tier-overview a')) {
  link.addEventListener('click', clearFilters);
}
document.querySelector<HTMLElement>('#class-controls')!.hidden = false;
window.addEventListener('pageshow', filterClasses);
document.addEventListener('class-requirements-reset', clearFilters);
filterClasses();

export {};
