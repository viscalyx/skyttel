import type { StudyObject, StudyPosition, StudyRelationship } from './map-study-types.js';
import { navObjects } from './NavigationPrototypePages.js';

const basePositions: StudyPosition[] = [
  { x: -260, y: 160, z: 10 },
  { x: 270, y: 175, z: -40 },
  { x: 280, y: -5, z: 10 },
  { x: 0, y: 0, z: 0 },
  { x: -280, y: -45, z: 30 },
  { x: -265, y: -240, z: -25 },
  { x: 60, y: -245, z: 10 },
  { x: 315, y: -235, z: 45 },
];
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
    const ring = Math.floor((index - 8) / 16);
    const angle = (index - 8) * 2.399963;
    const radius = 540 + ring * 160;
    objects.push({
      id: `sample-${index}`,
      name: `${baseName} ${Math.floor((index - 8) / 8) + 1}`,
      type,
      description: 'Påhittat hushållsinnehåll för att pröva en tät karta.',
      relation: 'Kopplingar visas nedan.',
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: ((index % 5) - 2) * 95,
      },
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
      position: { x: 455, y: 280, z: -20 },
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
      ? '~ Ändrat förslag'
      : change === 'removed'
        ? '× Föreslås tas bort'
        : '';
}
