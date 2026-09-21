const panel = document.querySelector<HTMLElement>('.character-panel');

if (panel) {
  const root = panel;
  const tabs = Array.from(panel.querySelectorAll<HTMLAnchorElement>('[role="tab"]'));
  const screens = Array.from(panel.querySelectorAll<HTMLElement>('.character-screen'));
  const label = panel.querySelector<HTMLElement>('#screen-name')!;
  const tablist = panel.querySelector<HTMLElement>('[role="tablist"]')!;
  const navigation = panel.querySelector<HTMLElement>('.panel-navigation')!;
  const sectionNavigation = panel.querySelector<HTMLElement>('.all-section-nav')!;
  const viewSwitch = document.querySelector<HTMLElement>('.view-switch')!;
  const viewButtons = Array.from(viewSwitch.querySelectorAll<HTMLButtonElement>('[data-character-view]'));
  let current = 0;
  let view: 'panels' | 'all' = 'panels';

  function render() {
    const all = view === 'all';
    root.dataset.view = view;
    screens.forEach((screen, i) => {
      screen.hidden = !all && i !== current;
      screen.setAttribute('role', all ? 'region' : 'tabpanel');
      screen.setAttribute('aria-labelledby', `${all ? 'section' : 'tab'}-${screen.id}`);
    });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
    });
    label.textContent = tabs[current].title;
    navigation.hidden = all;
    sectionNavigation.hidden = !all;
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.characterView === view)));
  }

  function updateUrl() {
    const url = new URL(location.href);
    if (view === 'all') url.searchParams.set('view', 'all');
    else url.searchParams.delete('view');
    url.hash = tabs[current].hash;
    history.replaceState(null, '', url);
  }

  function select(index: number, focus = false) {
    current = (index + tabs.length) % tabs.length;
    render();
    if (root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    if (focus) tabs[current].focus({ preventScroll: true });
    updateUrl();
  }

  function selectFromLocation() {
    view = new URL(location.href).searchParams.get('view') === 'all' ? 'all' : 'panels';
    const index = tabs.findIndex((tab) => tab.hash === location.hash);
    current = index < 0 ? 0 : index;
    render();
  }

  viewSwitch.hidden = false;
  viewButtons.forEach((button) => button.addEventListener('click', () => {
    view = button.dataset.characterView === 'all' ? 'all' : 'panels';
    render();
    updateUrl();
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start', behavior: 'instant' });
  }));

  tabs.forEach((tab, index) => tab.addEventListener('click', (event) => {
    event.preventDefault();
    select(index);
  }));
  panel.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => select(current + Number(button.dataset.direction)));
  });
  tablist.addEventListener('keydown', (event) => {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
    if (!Object.hasOwn(keys, event.key)) return;
    event.preventDefault();
    select(keys[event.key], true);
  });
  window.addEventListener('hashchange', selectFromLocation);
  window.addEventListener('popstate', selectFromLocation);
  window.addEventListener('pageshow', selectFromLocation);
  selectFromLocation();
}
