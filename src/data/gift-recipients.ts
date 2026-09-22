type Recruitment = {
  routes: ReadonlyArray<{ id: string; name: string }>;
  characters: ReadonlyArray<{
    id: string;
    partOneRoutes: readonly string[] | null;
    requirements: ReadonlyArray<{ routeId: string; status: string; renown: number | null }>;
  }>;
};

export type RecipientSort = 'matches' | 'renown-asc' | 'renown-desc';
type RecipientRank = { id: string; loved: number; liked: number; renown: number | null };

export function parseRecipientSort(value: string | null, route: string): RecipientSort {
  return route && (value === 'renown-asc' || value === 'renown-desc') ? value : 'matches';
}

export function recipientRenownOrder(id: string, route: string, recruitment: Recruitment): number | null {
  const requirement = recruitment.characters.find((character) => character.id === id)?.requirements
    .find((row) => row.routeId === route);
  // Automatic joins sort below numeric gates; this is not a reported Renown value.
  if (requirement?.status === 'automatic') return 0;
  return requirement?.status === 'recruit' ? requirement.renown : null;
}

export function compareRecipients(a: RecipientRank, b: RecipientRank, sort: RecipientSort): number {
  if (sort !== 'matches') {
    if (a.renown === null && b.renown !== null) return 1;
    if (b.renown === null && a.renown !== null) return -1;
    if (a.renown !== null && b.renown !== null && a.renown !== b.renown) {
      return sort === 'renown-asc' ? a.renown - b.renown : b.renown - a.renown;
    }
  }
  return b.loved - a.loved || b.liked - a.liked || a.id.localeCompare(b.id);
}

export function parseRecipientFilters(params: URLSearchParams, recruitment: Recruitment) {
  const requestedRoute = params.get('route');
  const route = recruitment.routes.some(({ id }) => id === requestedRoute) ? requestedRoute! : '';
  const ids = new Set(recruitment.characters.map(({ id }) => id));
  const excluded = new Set((params.get('exclude') ?? '').split(',').filter((id) => ids.has(id)));
  return { route, excluded };
}

export function eligibleRecipients(route: string, recruitment: Recruitment, includeLater = false): Set<string> {
  return new Set(recruitment.characters
    // Unverified availability stays selectable; only confirmed restrictions hide a character.
    .filter(({ partOneRoutes }) => partOneRoutes === null || (partOneRoutes.length === 0
      ? includeLater
      : !route || partOneRoutes.includes(route)))
    .map(({ id }) => id));
}

export function selectedRecipients(eligible: ReadonlySet<string>, excluded: ReadonlySet<string>): Set<string> {
  return new Set([...eligible].filter((id) => !excluded.has(id)));
}

export function applyRecipientSelection(
  excluded: ReadonlySet<string>, eligible: ReadonlySet<string>, selected: ReadonlySet<string>,
): Set<string> {
  const next = new Set(excluded);
  // Editing one route must preserve exclusions for characters outside that route.
  for (const id of eligible) {
    if (selected.has(id)) next.delete(id);
    else next.add(id);
  }
  return next;
}
