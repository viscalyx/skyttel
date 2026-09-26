import type { StudyObject, StudyPosition, StudyRelationship } from './map-study-types.js';
import { navObjects } from './NavigationPrototypePages.js';

// Fyra visuella grupper i en verklig volym; placeringen tillför inga typer eller samband.
// Centrum bildar en oregelbunden tetraeder, inte en skiva sedd från sidan.
const clusterCenters: StudyPosition[] = [
  { x: -520, y: 360, z: 420 },
  { x: 520, y: 300, z: -460 },
  { x: -380, y: -460, z: -420 },
  { x: 420, y: -380, z: 480 },
];

function inCluster(cluster: number, offset: StudyPosition): StudyPosition {
  const center = clusterCenters[cluster];
  return { x: center.x + offset.x, y: center.y + offset.y, z: center.z + offset.z };
}

const basePositions: StudyPosition[] = [
  inCluster(0, { x: 50, y: 100, z: 150 }),
  inCluster(1, { x: -100, y: 130, z: -110 }),
  inCluster(1, { x: 110, y: -100, z: 150 }),
  inCluster(2, { x: 0, y: 0, z: 0 }),
  inCluster(0, { x: -150, y: -80, z: -20 }),
  inCluster(0, { x: 100, y: -200, z: -160 }),
  inCluster(3, { x: -100, y: 70, z: -100 }),
  inCluster(3, { x: 130, y: -120, z: 160 }),
];

// En deterministisk följd fyller varje grupp åt alla håll och på olika radier.
// Varken kartans täthet eller privata förslag ingår i positionsberäkningen.
function fraction(index: number, base: number) {
  let result = 0;
  let weight = 1;
  while (index > 0) {
    weight /= base;
    result += (index % base) * weight;
    index = Math.floor(index / base);
  }
  return result;
}

function samplePosition(index: number): StudyPosition {
  const cluster = (index - 8) % clusterCenters.length;
  const sample = Math.floor((index - 8) / clusterCenters.length) + 1;
  const height = 2 * fraction(sample, 2) - 1;
  const angle = Math.PI * 2 * fraction(sample, 3) + cluster * 0.71;
  const radius = 105 + 235 * Math.cbrt(fraction(sample, 5));
  const horizontal = Math.sqrt(1 - height * height);
  const offset = {
    x: radius * horizontal * Math.cos(angle),
    y: radius * horizontal * Math.sin(angle),
    z: radius * height,
  };
  // Olika axelordning gör att gruppernas punkter inte bildar parallella skikt.
  return inCluster(cluster, cluster % 2 ? { x: offset.z, y: offset.x, z: offset.y } : offset);
}
const baseEdges: StudyRelationship[] = [
  { id: 'party', from: 'alex', to: 'subscription', label: 'står på avtalet' },
  { id: 'uses', from: 'lo', to: 'music', label: 'använder' },
  { id: 'access', from: 'subscription', to: 'music', label: 'ger tillgång till' },
  { id: 'payment', from: 'subscription', to: 'bank', label: 'betalas från' },
  { id: 'belongs', from: 'account', to: 'music', label: 'hör till' },
  { id: 'account-user', from: 'alex', to: 'account', label: 'använder' },
  { id: 'login', from: 'email', to: 'account', label: 'inloggningsadress för' },
  { id: 'card-bank', from: 'card', to: 'bank', label: 'kopplat till' },
];
const examples = [
  ['Blå cykeln', 'Fordon'],
  ['Lägenheten vid parken', 'Bostad'],
  ['Garaget', 'Garage'],
  ['Elavtalet', 'Avtal'],
  ['Hemförsäkringen', 'Avtal'],
  ['Molnarkivet', 'Tjänst'],
  ['Läslyktan', 'Tjänst'],
  ['Resekortet', 'Kort'],
] as const;

export function studyData(density: 'sparse' | 'dense' | 'large', proposals: boolean) {
  const count = density === 'sparse' ? 8 : density === 'dense' ? 56 : 500;
  const objects: StudyObject[] = navObjects.map((object, index) => ({
    ...object,
    position: basePositions[index],
  }));
  for (let index = 8; index < count; index++) {
    const [baseName, type] = examples[(index - 8) % examples.length];
    objects.push({
      id: `sample-${index}`,
      name: `${baseName} ${Math.floor((index - 8) / 8) + 1}`,
      type,
      description: 'Påhittat hushållsinnehåll för att pröva en tät karta.',
      relation: 'Kopplingar visas nedan.',
      position: samplePosition(index),
      ended: index === 12,
    });
  }
  const relationships = baseEdges.map((edge) => ({ ...edge }));
  for (let index = 8; index < count; index++) {
    relationships.push(
      {
        id: `owner-${index}`,
        from: index % 2 ? 'alex' : 'lo',
        to: objects[index].id,
        label: 'använder',
      },
      {
        id: `link-${index}`,
        from: objects[index].id,
        to: objects[Math.max(8, index - 1) === index ? 0 : index - 1].id,
        label: 'hör ihop med',
      },
      {
        id: `context-${index}`,
        from: objects[index].id,
        to: index % 2 ? 'bank' : 'subscription',
        label: 'hör ihop med',
      },
    );
  }
  // Mätlägets extra tvärkopplingar ger exakt 500 objekt och 1 500 samband.
  if (density === 'large') {
    for (let index = 0; relationships.length < 1500; index++) {
      relationships.push({
        id: `cross-${index}`,
        from: objects[index + 8].id,
        to: objects[index + 40].id,
        label: 'hör ihop med',
      });
    }
  }
  if (proposals) {
    objects[3] = {
      ...objects[3],
      change: 'changed',
      description: 'Privat förslag: 199 kr/månad. Sparat värde: 189 kr/månad.',
    };
    const payment = relationships.find((edge) => edge.id === 'payment');
    if (payment) payment.change = 'removed';
    relationships.push({
      id: 'payment-new',
      from: 'subscription',
      to: 'card',
      label: 'betalas med',
      change: 'added',
    });
    objects.push({
      id: 'film',
      name: 'Filmlyktan',
      type: 'Tjänst',
      description: 'Nytt privat förslag; ännu inte i hushållets gemensamma karta.',
      relation: 'Lo använder Filmlyktan.',
      position: inCluster(1, { x: 260, y: 120, z: -240 }),
      change: 'added',
    });
    relationships.push({
      id: 'film-user',
      from: 'lo',
      to: 'film',
      label: 'använder',
      change: 'added',
    });
  }
  return { objects, relationships };
}

export function changeLabel(change?: 'added' | 'changed' | 'removed') {
  return change === 'added'
    ? '+ Nytt förslag'
    : change === 'changed'
      ? '✎ Ändrat förslag'
      : change === 'removed'
        ? '× Föreslås tas bort'
        : '';
}
