export {};

type ClassView = 'suitability' | 'requirements';
const panels = {
  suitability: document.querySelector<HTMLElement>('#class-suitability-panel')!,
  requirements: document.querySelector<HTMLElement>('#class-requirements-panel')!,
};
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-classes-view]')];

function restoreView(scrollToTarget = false) {
  const url = new URL(location.href);
  const targetId = url.hash.slice(1);
  const target = targetId ? document.getElementById(targetId) : null;
  const requirementTarget = target && panels.requirements.contains(target);
  const view: ClassView = requirementTarget || url.searchParams.get('view') === 'requirements' ? 'requirements' : 'suitability';
  for (const [name, panel] of Object.entries(panels)) panel.hidden = name !== view;
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.classes-view-nav a')) {
    if (link.dataset.classesView === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.dispatchEvent(new Event('classes-view-change'));
  if (requirementTarget) {
    document.dispatchEvent(new Event('class-requirements-reset'));
    if (scrollToTarget) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}

for (const link of links) link.addEventListener('click', (event) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState(null, '', link.href);
  restoreView(true);
});
window.addEventListener('popstate', () => restoreView(true));
window.addEventListener('hashchange', () => restoreView(true));
restoreView(true);
