import { INVENTORY_KEY, MAX_GIFT_QUANTITY, normalizeQuantity, parseInventory, serializeInventory } from '../data/gift-inventory';
import { applyRecipientSelection, compareRecipients, eligibleRecipients, parseRecipientFilters, parseRecipientSort, recipientRenownOrder, selectedRecipients, type RecipientSort } from '../data/gift-recipients';
import recruitment from '../../data/recruitment.json';

const page = document.querySelector<HTMLElement>('.gift-page');
if (page) {
  const get = <T extends HTMLElement>(selector: string) => page.querySelector<T>(selector)!;
  const characterDialog = get<HTMLDialogElement>('#gift-character-dialog');
  const pickerTrigger = get<HTMLButtonElement>('#gift-characters .character-picker-trigger');
  const recipientPicker = get<HTMLButtonElement>('#inventory-recipient-picker');
  const routeInputs = Array.from(page.querySelectorAll<HTMLInputElement>('input[name="gift-route"]'));
  const requirementBadges = Array.from(page.querySelectorAll<HTMLElement>('[data-recruitment-route]'));
  const negotiations = Array.from(page.querySelectorAll<HTMLElement>('[data-recruitment-negotiation]'));
  const sortButtons = Array.from(page.querySelectorAll<HTMLButtonElement>('[data-recipient-sort]'));
  const pickerSearch = get<HTMLInputElement>('#character-picker-search');
  const applyCharacters = get<HTMLButtonElement>('#apply-character-selection');
  const characterOptions = Array.from(page.querySelectorAll<HTMLElement>('[data-character-option]'));
  const characterSearch = get<HTMLInputElement>('#character-gift-search');
  const inventorySearch = get<HTMLInputElement>('#inventory-gift-search');
  const ownedOnly = get<HTMLInputElement>('#owned-gifts-only');
  const characterPanels = Array.from(page.querySelectorAll<HTMLElement>('[data-character]'));
  const selectedPortraitLinks = Array.from(page.querySelectorAll<HTMLElement>('[data-selected-character]'));
  const characterIds = new Set(characterPanels.map((panel) => panel.dataset.character!));
  let selectedCharacters = new Set<string>();
  let draftCharacters = new Set<string>();
  let pickerMode: 'characters' | 'inventory' = 'characters';
  let pickerReturnFocus = pickerTrigger;
  let route = '';
  let recipientSort: RecipientSort = 'matches';
  let excludedRecipients = new Set<string>();
  let eligible = eligibleRecipients(route, recruitment);
  let inventoryRecipients = new Set(eligible);
  const giftRows = Array.from(page.querySelectorAll<HTMLElement>('[data-inventory-gift]'));
  const recipients = Array.from(page.querySelectorAll<HTMLElement>('[data-recipient]'));
  const giftIds = new Set(giftRows.map((row) => row.dataset.inventoryGift!));
  const giftNames = new Map(giftRows.map((row) => [row.dataset.inventoryGift!, row.querySelector('label')!.textContent!]));
  let inventory = parseInventory(null, giftIds);

  const storageWarning = () => {
    get('#inventory-storage-warning').hidden = false;
    get('.inventory-save-note').hidden = true;
  };
  try { inventory = parseInventory(localStorage.getItem(INVENTORY_KEY), giftIds); }
  catch { storageWarning(); }

  function filterCharacter() {
    for (const panel of characterPanels) {
      panel.hidden = !selectedCharacters.has(panel.dataset.character!);
      if (panel.hidden) continue;
      let shown = 0;
      const gifts = panel.querySelectorAll<HTMLElement>('[data-preferred-gift]');
      for (const gift of gifts) {
        gift.hidden = !gift.dataset.search!.includes(characterSearch.value.trim().toLowerCase());
        if (!gift.hidden) shown++;
      }
      for (const tier of panel.querySelectorAll<HTMLElement>('[data-character-tier]')) {
        tier.hidden = Boolean(characterSearch.value.trim()) && !tier.querySelector('[data-preferred-gift]:not([hidden])');
      }
      panel.querySelector<HTMLElement>('.gift-search-empty')!.hidden = gifts.length === 0 || shown > 0;
    }
  }

  function filterCharacterPicker() {
    let shown = 0;
    for (const option of characterOptions) {
      option.hidden = (pickerMode === 'inventory' && !eligible.has(option.dataset.characterOption!))
        || !option.dataset.name!.includes(pickerSearch.value.trim().toLowerCase());
      const unknown = option.querySelector<HTMLElement>('.character-route-unknown');
      if (unknown) unknown.hidden = pickerMode !== 'inventory' || !route;
      if (!option.hidden) shown++;
    }
    get('.character-picker-empty').hidden = shown > 0;
    get('.character-portrait-grid').hidden = shown === 0;
  }

  function updateDraftSelection() {
    for (const option of characterOptions) option.querySelector('input')!.checked = draftCharacters.has(option.dataset.characterOption!);
    get('#character-draft-count').textContent = `${draftCharacters.size} of ${pickerMode === 'inventory' ? eligible.size : characterIds.size} selected`;
    applyCharacters.disabled = pickerMode === 'characters' && draftCharacters.size === 0;
    applyCharacters.textContent = pickerMode === 'inventory' ? 'Apply selection' : draftCharacters.size > 0
      ? `Show ${draftCharacters.size} ${draftCharacters.size === 1 ? 'character' : 'characters'}` : 'Show characters';
  }

  function openPicker(mode: 'characters' | 'inventory') {
    pickerMode = mode;
    pickerReturnFocus = mode === 'inventory' ? recipientPicker : pickerTrigger;
    draftCharacters = new Set(mode === 'inventory' ? inventoryRecipients : selectedCharacters);
    get('#character-dialog-title').textContent = mode === 'inventory' ? 'Choose recipients' : 'Choose characters';
    const routeName = recruitment.routes.find(({ id }) => id === route)?.name;
    get('#character-dialog-description').textContent = mode === 'characters' ? 'Select characters to compare their gifts.'
      : routeName ? `${routeName}’s route · Part I. Uncheck characters to exclude them from your matches.`
      : 'Uncheck characters to exclude them from your inventory matches.';
    get('#select-all-characters').textContent = mode === 'inventory' && route ? 'All on this route' : 'All characters';
    pickerSearch.value = '';
    filterCharacterPicker();
    updateDraftSelection();
    characterDialog.showModal();
    pickerSearch.focus();
  }
  pickerTrigger.addEventListener('click', () => openPicker('characters'));
  recipientPicker.addEventListener('click', () => openPicker('inventory'));
  get('[data-close-picker]').addEventListener('click', () => characterDialog.close());
  characterDialog.addEventListener('close', () => pickerReturnFocus.focus());
  characterDialog.addEventListener('keydown', (event) => {
    // Search inputs consume Escape to clear text; the modal should close on the first press.
    if (event.key === 'Escape') {
      event.preventDefault();
      characterDialog.close();
      return;
    }
    if (event.key === 'Tab') {
      const controls = Array.from(characterDialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)'))
        .filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  characterDialog.addEventListener('click', (event) => {
    if (event.target !== characterDialog) return;
    const bounds = characterDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) characterDialog.close();
  });
  pickerSearch.addEventListener('input', filterCharacterPicker);
  for (const option of characterOptions) {
    option.querySelector('input')!.addEventListener('change', (event) => {
      const input = event.target as HTMLInputElement;
      if (input.checked) draftCharacters.add(input.value);
      else draftCharacters.delete(input.value);
      updateDraftSelection();
    });
  }
  get('#select-all-characters').addEventListener('click', () => {
    draftCharacters = new Set(pickerMode === 'inventory' ? eligible : characterIds);
    updateDraftSelection();
  });
  get('#clear-character-selection').addEventListener('click', () => {
    draftCharacters.clear();
    updateDraftSelection();
  });
  applyCharacters.addEventListener('click', () => {
    if (pickerMode === 'inventory') {
      excludedRecipients = applyRecipientSelection(excludedRecipients, eligible, draftCharacters);
      saveRecipientFilters();
      characterDialog.close();
      return;
    }
    if (!draftCharacters.size) return;
    const url = new URL(location.href);
    url.searchParams.delete('character');
    url.searchParams.delete('characters');
    const selected = Array.from(characterIds).filter((id) => draftCharacters.has(id));
    url.searchParams.set(selected.length === 1 ? 'character' : 'characters', selected.join(','));
    history.pushState(null, '', url);
    characterSearch.value = '';
    applyLocation();
    characterDialog.close();
  });

  function saveRecipientFilters() {
    const url = new URL(location.href);
    if (route) url.searchParams.set('route', route);
    else {
      url.searchParams.delete('route');
      url.searchParams.delete('sort');
    }
    const excluded = [...characterIds].filter((id) => excludedRecipients.has(id));
    if (excluded.length) url.searchParams.set('exclude', excluded.join(','));
    else url.searchParams.delete('exclude');
    history.pushState(null, '', url);
    applyLocation();
  }
  for (const input of routeInputs) {
    input.addEventListener('change', () => {
      route = input.value;
      saveRecipientFilters();
    });
  }
  get('#reset-recipient-filters').addEventListener('click', () => {
    route = '';
    excludedRecipients.clear();
    saveRecipientFilters();
  });
  for (const button of page.querySelectorAll<HTMLButtonElement>('[data-exclude-recipient]')) {
    button.addEventListener('click', () => {
      excludedRecipients.add(button.dataset.excludeRecipient!);
      saveRecipientFilters();
      // The excluded card is now hidden; keep keyboard focus on a visible control.
      recipientPicker.focus();
    });
  }

  function filterInventory() {
    let shown = 0;
    const query = inventorySearch.value.trim().toLowerCase();
    for (const row of giftRows) {
      row.hidden = !row.dataset.search!.includes(query) || (ownedOnly.checked && !inventory[row.dataset.inventoryGift!]);
      if (!row.hidden) shown++;
    }
    get('#inventory-search-empty').hidden = shown > 0;
  }

  function updateInventory() {
    for (const row of giftRows) {
      const quantity = inventory[row.dataset.inventoryGift!] ?? 0;
      row.querySelector('input')!.value = String(quantity);
      row.classList.toggle('is-owned', quantity > 0);
      row.querySelector<HTMLButtonElement>('[data-adjust="-1"]')!.disabled = quantity === 0;
      row.querySelector<HTMLButtonElement>('[data-adjust="1"]')!.disabled = quantity === MAX_GIFT_QUANTITY;
    }
    const selectedGiftIds = new Set<string>();
    const ranked = recipients.map((recipient) => {
      const id = recipient.dataset.recipient!;
      const included = inventoryRecipients.has(id);
      let loved = 0;
      let liked = 0;
      for (const match of recipient.querySelectorAll<HTMLElement>('[data-match-gift]')) {
        if (included) selectedGiftIds.add(match.dataset.matchGift!);
        const quantity = inventory[match.dataset.matchGift!] ?? 0;
        match.hidden = quantity === 0;
        match.querySelector('.owned-quantity')!.textContent = `×${quantity}`;
        if (quantity > 0) match.dataset.preference === 'loved' ? loved++ : liked++;
      }
      recipient.hidden = !included || loved + liked === 0;
      return { recipient, id, loved, liked, renown: recipientRenownOrder(id, route, recruitment) };
    });
    ranked.sort((a, b) => compareRecipients(a, b, recipientSort));
    get('#gift-recipient-list').append(...ranked.map(({ recipient }) => recipient));
    const count = ranked.filter(({ recipient }) => !recipient.hidden).length;
    const owned = Object.keys(inventory);
    get('#gift-match-status').textContent = owned.length ? `${count} ${count === 1 ? 'character matches' : 'characters match'}` : '';
    get('#inventory-empty').hidden = owned.length > 0 || inventoryRecipients.size === 0;
    get('#inventory-no-matches').hidden = inventoryRecipients.size > 0 && (owned.length === 0 || count > 0);
    get('#inventory-no-matches').textContent = inventoryRecipients.size === 0 ? 'No recipients selected. Choose recipients to see matches.'
      : 'None of the selected characters have documented preferences for these gifts. Try another route or change your selection.';
    const unmatched = owned.filter((id) => !selectedGiftIds.has(id));
    get('#gifts-without-matches').hidden = unmatched.length === 0 || count === 0;
    get('#gifts-without-matches').textContent = `No documented match among selected recipients: ${unmatched.map((id) => giftNames.get(id)).join(', ')}.`;
    filterInventory();
  }

  function setQuantity(id: string, quantity: number) {
    if (quantity > 0) inventory[id] = quantity;
    else delete inventory[id];
    try { localStorage.setItem(INVENTORY_KEY, serializeInventory(inventory)); }
    catch { storageWarning(); }
    updateInventory();
  }

  for (const row of giftRows) {
    const id = row.dataset.inventoryGift!;
    row.querySelector('input')!.addEventListener('input', (event) => {
      setQuantity(id, normalizeQuantity((event.target as HTMLInputElement).value));
    });
    for (const button of row.querySelectorAll<HTMLButtonElement>('[data-adjust]')) {
      button.addEventListener('click', () => setQuantity(id, normalizeQuantity(String((inventory[id] ?? 0) + Number(button.dataset.adjust)))));
    }
  }

  const viewButtons = page.querySelectorAll<HTMLButtonElement>('[data-view]');
  function applyLocation() {
    const params = new URLSearchParams(location.search);
    const inventoryView = params.get('view') === 'inventory';
    ({ route, excluded: excludedRecipients } = parseRecipientFilters(params, recruitment));
    recipientSort = parseRecipientSort(params.get('sort'), route);
    for (const button of sortButtons) {
      const renownButton = button.dataset.recipientSort === 'renown';
      button.setAttribute('aria-pressed', String(renownButton ? recipientSort !== 'matches' : recipientSort === 'matches'));
      button.disabled = renownButton && !route;
      if (renownButton) {
        button.textContent = recipientSort === 'matches' ? 'Renown ↕' : recipientSort === 'renown-asc' ? 'Renown ↑' : 'Renown ↓';
        button.setAttribute('aria-label', recipientSort === 'matches' ? 'Sort by Renown: lowest first'
          : recipientSort === 'renown-asc' ? 'Renown: lowest first; switch to highest first' : 'Renown: highest first; switch to lowest first');
      }
    }
    get('#renown-sort-hint').hidden = Boolean(route);
    eligible = eligibleRecipients(route, recruitment);
    inventoryRecipients = selectedRecipients(eligible, excludedRecipients);
    for (const input of routeInputs) input.checked = input.value === route;
    for (const badge of requirementBadges) badge.hidden = Boolean(route) && badge.dataset.recruitmentRoute !== route;
    for (const section of negotiations) {
      for (const condition of section.querySelectorAll<HTMLElement>('[data-negotiation-routes]')) {
        condition.hidden = Boolean(route) && !condition.dataset.negotiationRoutes!.split(' ').includes(route);
        condition.querySelector<HTMLElement>('[data-negotiation-route-label]')!.hidden = Boolean(route);
      }
      section.hidden = !section.querySelector('[data-negotiation-routes]:not([hidden])');
    }
    get('#recipient-selection-count').textContent = `(${inventoryRecipients.size}/${eligible.size})`;
    get('#reset-recipient-filters').hidden = !route && !excludedRecipients.size;
    get('#inventory-route-note').hidden = !route;
    const requested = params.get('characters') ?? params.get('character') ?? '';
    selectedCharacters = new Set(requested.split(',').filter((id) => characterIds.has(id)));
    if (!selectedCharacters.size) selectedCharacters.add(characterPanels[0].dataset.character!);
    get('.gift-character-grid').classList.toggle('is-comparing', selectedCharacters.size > 1);
    get('.selected-characters').hidden = selectedCharacters.size < 2;
    for (const link of selectedPortraitLinks) link.hidden = !selectedCharacters.has(link.dataset.selectedCharacter!);
    get('#selected-character-count').textContent = `(${selectedCharacters.size})`;
    get('#character-selection-status').textContent = `${selectedCharacters.size} ${selectedCharacters.size === 1 ? 'character shown' : 'characters shown'}.`;
    get('#gift-inventory').hidden = !inventoryView;
    get('#gift-characters').hidden = inventoryView;
    for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === (inventoryView ? 'inventory' : 'characters')));
    filterCharacter();
    updateInventory();
  }
  for (const button of viewButtons) {
    button.addEventListener('click', () => {
      const url = new URL(location.href);
      if (button.dataset.view === 'inventory') url.searchParams.set('view', 'inventory');
      else url.searchParams.delete('view');
      history.pushState(null, '', url);
      applyLocation();
    });
  }
  for (const button of sortButtons) {
    button.addEventListener('click', () => {
      const url = new URL(location.href);
      const requestedSort = button.dataset.recipientSort === 'renown'
        ? recipientSort === 'renown-asc' ? 'renown-desc' : 'renown-asc'
        : 'matches';
      const sort = parseRecipientSort(requestedSort, route);
      if (sort === 'matches') url.searchParams.delete('sort');
      else url.searchParams.set('sort', sort);
      history.pushState(null, '', url);
      applyLocation();
    });
  }
  characterSearch.addEventListener('input', filterCharacter);
  inventorySearch.addEventListener('input', filterInventory);
  ownedOnly.addEventListener('change', filterInventory);
  window.addEventListener('popstate', () => {
    if (characterDialog.open) characterDialog.close();
    applyLocation();
  });
  window.addEventListener('storage', (event) => {
    if (event.key === INVENTORY_KEY || event.key === null) {
      inventory = parseInventory(event.newValue, giftIds);
      updateInventory();
    }
  });
  page.querySelectorAll<HTMLElement>('[data-gift-controls]').forEach((control) => control.hidden = false);
  applyLocation();
}
