export type Inventory = Record<string, number>;
export const MAX_GIFT_QUANTITY = 99;
export const INVENTORY_KEY = 'fortune-weave:gifts:v1';

// Saved browser data may outlive the catalog or have been edited outside this page.
export function parseInventory(raw: string | null, giftIds: ReadonlySet<string>): Inventory {
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved.quantities || typeof saved.quantities !== 'object'
      || Array.isArray(saved.quantities)) return {};
    return Object.fromEntries(Object.entries(saved.quantities).filter(([id, quantity]) =>
      giftIds.has(id) && Number.isInteger(quantity) && Number(quantity) > 0
      && Number(quantity) <= MAX_GIFT_QUANTITY).map(([id, quantity]) => [id, Number(quantity)]));
  } catch {
    return {};
  }
}

export function serializeInventory(quantities: Inventory): string {
  return JSON.stringify({ version: 1, quantities });
}

export function normalizeQuantity(value: string): number {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? Math.min(MAX_GIFT_QUANTITY, Math.max(0, Math.floor(quantity))) : 0;
}
