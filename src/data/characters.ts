import cai from '../../data/characters/cai.json';
import peter from '../../data/characters/peter.json';
import tialla from '../../data/characters/tialla.json';
import guzran from '../../data/characters/guzran.json';

export const HIGH_GROWTH_RATE = 45;

interface Stat {
  name: string;
  value: number | string;
  icon: string;
  boosted?: boolean;
}

interface Item {
  name: string;
  durability: string;
  graphic: string;
  inactive?: boolean;
}

interface ReferenceSource {
  name: string;
  url: string;
  scope: string;
}

interface ReferenceStats {
  checkedAt: string;
  level?: number;
  class?: string;
  movement?: number;
  movementBonus?: number;
  movementBonusAbility?: string;
  build?: number;
  values: { name: string; base?: number; growth: number }[];
  baseSource?: ReferenceSource;
  growthSource: ReferenceSource;
  abilitySource: ReferenceSource;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  source: { type: string; note: string };
  class: string;
  classDescription: string;
  classMasteryPoints?: number;
  hp: number;
  maxHp: number;
  level: number;
  movement: number;
  movementBoosted?: boolean;
  build: number;
  rating: number;
  ratingBoosted?: boolean;
  combatStats: Stat[];
  basicStats: Stat[];
  equipped: Item;
  items: Item[];
  bloodmarks: { name: string; graphic: string }[];
  personalAbility: string;
  equippedAbility: string;
  combatArts: { name: string; cost: number; graphic: string }[];
  attackMagic: Item[];
  assistMagic: Item[];
  flierSpecialties: number;
  portraitDescription: string;
  skillRanksDescription: string;
  blaze?: typeof cai.blaze;
  referenceStats?: ReferenceStats;
  history: { year: number; text: string }[];
  birthday: string;
  age: number;
  height: string;
  affiliation: string;
  likes: string;
  dislikes: string;
  interests: string;
}

export const characters: Character[] = [cai, peter, tialla, guzran];
