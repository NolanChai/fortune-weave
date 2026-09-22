export {};

const controls = document.querySelector<HTMLElement>('#suitability-controls');
const query = document.querySelector<HTMLInputElement>('#suitability-query');
const spoilerToggle = document.querySelector<HTMLInputElement>('#suitability-spoilers');
const columns = [...document.querySelectorAll<HTMLElement>('[data-class-column]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('.class-family-filters button')];
const tierFilters = [...document.querySelectorAll<HTMLButtonElement>('[data-suitability-tier]')];
const resultStatus = document.querySelector<HTMLElement>('#suitability-status');
const empty = document.querySelector<HTMLElement>('#suitability-empty');
let family = 'all';
let tier = 'advanced';
let active: { trigger: HTMLButtonElement; note: HTMLElement } | undefined;
let pinned = false;
let closeTimer: ReturnType<typeof setTimeout>;

function closeNote() {
  clearTimeout(closeTimer);
  active?.note.hidePopover();
  active?.trigger.setAttribute('aria-expanded', 'false');
  active = undefined;
  pinned = false;
}

function positionNote(trigger: HTMLButtonElement, note: HTMLElement) {
  const margin = 12;
  const gap = 6;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  note.style.maxWidth = `${viewportWidth - margin * 2}px`;
  note.style.maxHeight = `${viewportHeight - margin * 2}px`;
  const anchor = (trigger.querySelector('.fit-portrait') ?? trigger).getBoundingClientRect();
  const bounds = note.getBoundingClientRect();
  const right = anchor.right + gap;
  const left = anchor.left - bounds.width - gap;
  let x: number;
  let y: number;

  if (right + bounds.width <= viewportWidth - margin) {
    x = right;
    y = anchor.top;
  } else if (left >= margin) {
    x = left;
    y = anchor.top;
  } else {
    x = anchor.left + (anchor.width - bounds.width) / 2;
    const triggerBounds = trigger.getBoundingClientRect();
    const below = triggerBounds.bottom + gap;
    const above = triggerBounds.top - bounds.height - gap;
    y = below + bounds.height <= viewportHeight - margin || triggerBounds.top < viewportHeight - triggerBounds.bottom
      ? below
      : above;
  }

  note.style.left = `${Math.max(margin, Math.min(x, viewportWidth - bounds.width - margin))}px`;
  note.style.top = `${Math.max(margin, Math.min(y, viewportHeight - bounds.height - margin))}px`;
}

function openNote(trigger: HTMLButtonElement, note: HTMLElement) {
  clearTimeout(closeTimer);
  if (active?.trigger === trigger) return;
  closeNote();
  active = { trigger, note };
  note.showPopover();
  trigger.setAttribute('aria-expanded', 'true');
  positionNote(trigger, note);
}

function scheduleClose() {
  clearTimeout(closeTimer);
  if (pinned) return;
  closeTimer = setTimeout(() => {
    if (!active || active.note.matches(':hover') || active.trigger.matches(':hover')) return;
    if (!active.note.contains(document.activeElement) && document.activeElement !== active.trigger) closeNote();
  }, 220);
}

function closeAfterFocusLeaves(event: FocusEvent) {
  if (!active) return;
  const current = active;
  const next = event.relatedTarget;
  if (next instanceof Node) {
    if (!current.note.contains(next) && !current.trigger.contains(next)) closeNote();
    return;
  }
  // A click on the note's text can blur its trigger without focusing another element.
  setTimeout(() => {
    if (active !== current || current.note.contains(document.activeElement) || document.activeElement === current.trigger) return;
    if (!document.hasFocus() || (!pinned && !current.note.matches(':hover'))) closeNote();
  }, 0);
}

document.querySelectorAll<HTMLButtonElement>('[data-fit-trigger]').forEach((trigger) => {
  const note = document.getElementById(trigger.getAttribute('aria-controls')!)!;
  trigger.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && !pinned && !active?.note.contains(document.activeElement)) openNote(trigger, note);
  });
  trigger.addEventListener('pointerleave', scheduleClose);
  trigger.addEventListener('focus', () => openNote(trigger, note));
  trigger.addEventListener('focusout', closeAfterFocusLeaves);
  trigger.addEventListener('click', () => {
    if (active?.trigger === trigger && pinned) closeNote();
    else { openNote(trigger, note); pinned = true; }
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    openNote(trigger, note);
    note.focus({ preventScroll: true });
  });
  note.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  note.addEventListener('pointerleave', scheduleClose);
  note.addEventListener('focusout', closeAfterFocusLeaves);
});

document.addEventListener('pointerdown', (event) => {
  if (event.target instanceof Node && !active?.note.contains(event.target) && !active?.trigger.contains(event.target)) closeNote();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && active) {
    event.preventDefault();
    if (active.note.contains(document.activeElement)) active.trigger.focus({ preventScroll: true });
    closeNote();
  }
});

function filterClasses() {
  closeNote();
  const term = query?.value.trim().toLocaleLowerCase() ?? '';
  let count = 0;
  columns.forEach((column) => {
    const classMatches = column.dataset.className?.includes(term);
    let visiblePicks = 0;
    column.querySelectorAll<HTMLElement>('[data-character]').forEach((pick) => {
      const eligible = pick.dataset.part === '1' || spoilerToggle?.checked;
      pick.hidden = !eligible || (!classMatches && !pick.dataset.search?.includes(term));
      if (!pick.hidden) visiblePicks++;
    });
    column.querySelectorAll<HTMLElement>('[data-rank-row]').forEach((row) => {
      row.hidden = !row.querySelector('[data-character]:not([hidden])');
    });
    column.hidden = column.dataset.tier !== tier || (family !== 'all' && !column.dataset.family?.split(' ').includes(family)) || visiblePicks === 0;
    if (!column.hidden) count++;
  });
  if (resultStatus) resultStatus.textContent = `${count} ${count === 1 ? 'class' : 'classes'}`;
  if (empty) empty.hidden = count > 0;
}

filters.forEach((button) => button.addEventListener('click', () => {
  family = button.dataset.family ?? 'all';
  filters.forEach((filter) => filter.setAttribute('aria-pressed', String(filter === button)));
  filterClasses();
}));
query?.addEventListener('input', filterClasses);
spoilerToggle?.addEventListener('change', filterClasses);
tierFilters.forEach((button) => button.addEventListener('click', () => {
  tier = button.dataset.suitabilityTier!;
  tierFilters.forEach((filter) => filter.setAttribute('aria-pressed', String(filter === button)));
  filterClasses();
}));
document.addEventListener('classes-view-change', closeNote);
window.addEventListener('resize', closeNote);
document.addEventListener('scroll', (event) => {
  if (!(event.target instanceof Node) || !active?.note.contains(event.target)) closeNote();
}, true);
if (controls) controls.hidden = false;
if (spoilerToggle) spoilerToggle.checked = false;
filterClasses();
