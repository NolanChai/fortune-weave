type Recruitment = {
  routes: ReadonlyArray<{ id: string; name: string }>;
  characters: ReadonlyArray<{ id: string; partOneRoutes: readonly string[] | null }>;
};

export function parseRecipientFilters(params: URLSearchParams, recruitment: Recruitment) {
  const requestedRoute = params.get('route');
  const route = recruitment.routes.some(({ id }) => id === requestedRoute) ? requestedRoute! : '';
  const ids = new Set(recruitment.characters.map(({ id }) => id));
  const excluded = new Set((params.get('exclude') ?? '').split(',').filter((id) => ids.has(id)));
  return { route, excluded };
}

export function eligibleRecipients(route: string, recruitment: Recruitment): Set<string> {
  return new Set(recruitment.characters
    // Unverified availability stays selectable; only confirmed restrictions hide a character.
    .filter(({ partOneRoutes }) => !route || partOneRoutes === null || partOneRoutes.includes(route))
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
