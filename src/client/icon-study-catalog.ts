// Kastbar lokal katalog. Ursprung, låst version och licens finns i icon-study-assets/SOURCE.md.
import source from './icon-study-assets/lucide-icons.json' with { type: 'json' };

export type IconStudyNode = [
  'path' | 'circle' | 'rect' | 'line' | 'ellipse' | 'polyline' | 'polygon',
  Record<string, string>,
];

export type IconStudyIcon = {
  id: string;
  label: string;
  keywords: string[];
  nodes: IconStudyNode[];
};

const labels: Record<string, string> = {
  music: 'Musik',
  'music-2': 'Musiknoter',
  house: 'Hus',
  'house-plug': 'Hus med elanslutning',
  car: 'Bil',
  bike: 'Cykel',
  bus: 'Buss',
  train: 'Tåg',
  plane: 'Flygplan',
  user: 'Person',
  'user-round': 'Person (rund)',
  users: 'Personer',
  key: 'Nyckel',
  'key-round': 'Nyckel (rund)',
  laptop: 'Bärbar dator',
  monitor: 'Bildskärm',
  computer: 'Dator',
  phone: 'Telefon',
  smartphone: 'Mobiltelefon',
  'credit-card': 'Betalkort',
  calendar: 'Kalender',
  'calendar-clock': 'Kalender och klocka',
  'calendar-sync': 'Återkommande kalender',
  receipt: 'Kvitto',
  'file-text': 'Dokument',
  'file-signature': 'Undertecknat dokument',
  landmark: 'Bank',
  wallet: 'Plånbok',
  mail: 'E-post',
  headphones: 'Hörlurar',
  tv: 'TV',
  building: 'Byggnad',
  'building-2': 'Byggnader',
  shield: 'Sköld',
  'shield-check': 'Skydd',
  plug: 'Kontakt',
  'solar-panel': 'Solpanel',
  wrench: 'Verktyg',
  briefcase: 'Portfölj',
  heart: 'Hjärta',
  dog: 'Hund',
  cat: 'Katt',
  baby: 'Barn',
  book: 'Bok',
  'shopping-cart': 'Kundvagn',
};

const swedishTerms: Record<string, string[]> = {
  music: ['musik', 'låt', 'sång', 'noter'],
  note: ['musik', 'not'],
  audio: ['ljud', 'musik'],
  headphones: ['hörlurar', 'musik', 'ljud'],
  house: ['hus', 'hem', 'bostad'],
  home: ['hem', 'hus', 'bostad'],
  building: ['byggnad', 'hus', 'bostad'],
  garage: ['garage', 'bil'],
  car: ['bil', 'fordon'],
  vehicle: ['fordon', 'bil'],
  bike: ['cykel', 'fordon'],
  user: ['person', 'människa', 'användare'],
  users: ['personer', 'familj', 'hushåll'],
  person: ['person', 'människa'],
  key: ['nyckel', 'lås'],
  lock: ['lås', 'säkerhet'],
  computer: ['dator'],
  laptop: ['dator', 'bärbar'],
  monitor: ['dator', 'skärm', 'bildskärm'],
  smartphone: ['telefon', 'mobil', 'mobiltelefon'],
  phone: ['telefon', 'samtal'],
  card: ['kort', 'betalkort'],
  credit: ['kredit', 'kort'],
  payment: ['betalning', 'betalningsmedel'],
  bank: ['bank', 'bankkonto'],
  wallet: ['plånbok', 'pengar'],
  calendar: ['kalender', 'datum', 'abonnemang'],
  repeat: ['återkommande', 'abonnemang'],
  subscription: ['abonnemang'],
  receipt: ['kvitto', 'avtal', 'abonnemang'],
  contract: ['avtal'],
  document: ['dokument', 'avtal'],
  signature: ['underskrift', 'avtal'],
  mail: ['e-post', 'epost', 'brev'],
  shield: ['skydd', 'försäkring'],
  plug: ['el', 'elavtal', 'kontakt'],
  solar: ['sol', 'solpanel', 'solceller'],
  tools: ['verktyg'],
  wrench: ['verktyg', 'service'],
  briefcase: ['arbete', 'företag'],
  dog: ['hund', 'djur'],
  cat: ['katt', 'djur'],
  baby: ['barn', 'familj'],
  shopping: ['köp', 'handel', 'butik'],
  book: ['bok', 'läsning'],
  heart: ['hjärta', 'hälsa'],
};

// SVG-element och attribut valideras när det låsta underlaget importeras.
const rawCatalog = source as unknown as {
  id: string;
  tags: string[];
  categories: string[];
  aliases: string[];
  nodes: IconStudyNode[];
}[];

export const iconStudyCatalog: IconStudyIcon[] = rawCatalog.map((icon) => {
  const english = [icon.id, ...icon.tags, ...icon.categories, ...icon.aliases];
  const words = new Set(english.flatMap((value) => value.toLocaleLowerCase('en').split(/[\s-]+/)));
  const aliases = Object.entries(swedishTerms).flatMap(([term, terms]) =>
    words.has(term) ? terms : [],
  );
  return {
    id: icon.id,
    label: labels[icon.id] ?? icon.id.replaceAll('-', ' '),
    keywords: [...new Set([...english, ...aliases])],
    nodes: icon.nodes,
  };
});

const byId = new Map(iconStudyCatalog.map((icon) => [icon.id, icon]));

export function findIconStudyIcon(id: string | null | undefined) {
  return id ? byId.get(id) : undefined;
}
