const input = document.querySelector<HTMLInputElement>('#query')!;
const table = document.querySelector<HTMLTableElement>('#bird-time')!;
const searchStatus = document.querySelector<HTMLElement>('#search-status')!;
const empty = document.querySelector<HTMLElement>('#empty-results')!;

const groups = Array.from(table.tBodies, (body) => ({
  body,
  name: body.dataset.character!,
  heading: body.querySelector<HTMLTableCellElement>('th')!,
  rows: Array.from(body.rows, (row) => ({
    element: row,
    search: Array.from(row.querySelectorAll('td'), (cell) => cell.textContent)
      .join(' ').toLowerCase(),
  })),
}));

function filterRows() {
  const query = input.value.trim().toLowerCase();
  let visibleCharacters = 0;

  for (const group of groups) {
    const nameMatches = group.name.includes(query);
    const matches = group.rows.filter((row) => nameMatches || row.search.includes(query));
    const visibleRows = new Set(matches);
    group.body.hidden = matches.length === 0;
    for (const row of group.rows) row.element.hidden = !visibleRows.has(row);

    if (matches.length > 0) {
      visibleCharacters++;
      // A filtered table still needs its character header on the first visible row.
      matches[0].element.prepend(group.heading);
      group.heading.rowSpan = matches.length;
    }
  }

  table.hidden = visibleCharacters === 0;
  empty.hidden = visibleCharacters !== 0;
  searchStatus.textContent = `${visibleCharacters} ${visibleCharacters === 1 ? 'character' : 'characters'} shown`;
}

document.querySelector<HTMLElement>('#search-control')!.hidden = false;
input.addEventListener('input', filterRows);
window.addEventListener('pageshow', filterRows);
filterRows();

export {};
