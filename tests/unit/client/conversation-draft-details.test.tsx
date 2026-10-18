import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ConversationDraft } from '../../../src/client/ConversationDraft.js';
import { DraftChangeSummary } from '../../../src/client/DraftChangeSummary.js';
import type { DraftChange, MapDraft, ObjectType } from '../../../src/shared/map.js';

afterEach(cleanup);
const type: ObjectType = {
  id: 'account',
  householdId: 'linden',
  revision: 1,
  name: 'Konto',
  description: '',
  
};

test('the draft shows checked before-and-after facts, uncertainty, custom values and identity without hiding removals', () => {
  const change: DraftChange = {
    id: 'account-1',
    type,
    beforeType: {
      ...type,
      name: 'Äldre kontotyp',
      
    },
    before: {
      id: 'account-1',
      householdId: 'linden',
      revision: 1,
      typeId: type.id,
      name: 'Gamla kontot',
      
      identity: 'unspecified',
      lifecycle: 'ended',
      profileImageId: 'old-image',
      
      
    properties:[{id:"insured",label:"insured",kind:"boolean",value:false},{id:"amount",label:"amount",kind:"number",value:0},{id:"note",label:"note",kind:"text",value:''},{id:"removed",label:"removed",kind:"text",value:'Gammalt'}]},
    after: {
      typeId: type.id,
      name: 'Nya kontot',
      
      identity: 'unresolved',
      lifecycle: 'active',
      profileImageId: 'new-image',
      
      
    properties:[{id:'description',label:'Beskrivning',kind:'text',value:'Kontot rättas'},{id:"insured",label:"insured",kind:"boolean",value:true},{id:"amount",label:"amount",kind:"number",value:24},{id:"date",label:"date",kind:"text",value:'2026-10-03'},{id:"note",label:"note",kind:"text",value:'Ny uppgift'}]},
  };
  render(<ConversationDraft draft={{ version: 1, changes: [change] }} />);
  const row = within(screen.getByRole('table', { name: 'Osparade ändringar' })).getByRole('row', {
    name: /Nya kontot/,
  });
  const text = row.textContent;
  for (const detail of [
    'Ändra',
    'Namn: Gamla kontot → Nya kontot',
    'Beskrivning: Ej uppgivet → Kontot rättas',
    'Objekttyp: Äldre kontotyp → Konto',
    'Pris: Okänt → 120',
    'Valuta: Uttryckligen inget → SEK',
    'Senast uppgiven skuld: 100 (2026-01-01) → 90 (osäkert uppgivet) (2026-10-03)',
    'Utnyttjad kredit: Ej uppgivet → Uttryckligen inget',
    'Försäkrat: Nej → Ja',
    'Belopp: 0 → 24',
    'Uppgivet datum: Ej uppgivet → 2026-10-03',
    'Anteckning: Ej uppgivet → Ny uppgift',
    'Borttaget fält: Gammalt → Ej uppgivet',
    'Gäller: Upphört → Aktuellt',
    'Identitet: Ospecificerat objekt → Olöst identitet',
    'Profilbild: Bild finns → Ny bild',
  ])
    expect(text).toContain(detail);
});

test('the whole draft names additions, removals and changed relationship and type definitions before saving', () => {
  const changedType: ObjectType = {
    ...type,
    name: 'Betalkonto',
    description: 'Ny typbeskrivning',
    
  };
  const oldType: ObjectType = {
    ...type,
    
  };
  const relationshipType = {
    id: 'uses',
    householdId: 'linden',
    revision: 1,
    name: 'Använder',
    description: '',
    forwardLabel: 'använder',
    reverseLabel: 'används av',
    
  };
  const review: MapDraft = {
    version: 2,
    changes: [
      {
        id: 'added',
        before: null,
        after: { typeId: type.id, name: 'Nytt konto',  },
        type,
      },
      {
        id: 'deleted',
        before: {
          id: 'deleted',
          householdId: 'linden',
          revision: 1,
          typeId: type.id,
          name: 'Borttaget konto',
          
        },
        after: null,
        type,
      },
    ],
    relationships: [
      {
        id: 'corrected',
        type: relationshipType,
        beforeType: {
          ...relationshipType,
          
        },
        objectNames: { alex: 'Alex', bike: 'Cykeln' },
        before: {
          id: 'corrected',
          householdId: 'linden',
          revision: 1,
          sourceId: 'alex',
          typeId: 'uses',
          targetId: null,
          
          lifecycle: 'active',
          
        properties:[{id:"old",label:"old",kind:"text",value:'Tas bort'},{id:"shared",label:"shared",kind:"boolean",value:false}]},
        after: {
          sourceId: 'alex',
          typeId: 'uses',
          targetId: 'bike',
          
          lifecycle: 'ended',
          
          
        properties:[{id:"shared",label:"shared",kind:"boolean",value:true}]},
      },
      {
        id: 'new-relation',
        type: relationshipType,
        before: null,
        after: { sourceId: 'alex', typeId: 'uses', targetId: null,  },
        objectNames: { alex: 'Alex' },
      },
      {
        id: 'removed-relation',
        type: { ...relationshipType, forwardLabel: undefined },
        before: {
          id: 'removed-relation',
          householdId: 'linden',
          revision: 1,
          sourceId: 'alex',
          typeId: 'uses',
          targetId: null,
          
        },
        after: null,
        objectNames: { alex: 'Alex' },
      },
    ],
    objectTypes: [
      { id: type.id, before: oldType, after: changedType },
      { id: 'new-type', before: null, after: { ...type, id: 'new-type', name: 'Ny typ' } },
      {
        id: 'removed-type',
        before: { ...type, id: 'removed-type', name: 'Borttagen typ' },
        after: null,
      },
    ],
    relationshipTypes: [
      {
        id: 'uses',
        before: relationshipType,
        after: {
          ...relationshipType,
          description: 'Rättat samband',
          forwardLabel: 'ny framåtriktning',
          reverseLabel: undefined,
        },
      },
    ],
  };
  render(
    <>
      <ConversationDraft draft={review} />
      <DraftChangeSummary review={review} />
    </>,
  );
  const table = screen.getByRole('table', { name: 'Osparade ändringar' });
  for (const detail of [
    'Lägg tillNytt konto',
    'Ta bortBorttaget konto',
    'Gäller: Aktuellt → Upphört',
    'Gammal uppgift: Tas bort → Ej uppgivet',
    'Delat: Nej → Ja',
    'Slutdatum: Ej uppgivet → 2026-10-03',
    'Alex → använder → Uttryckligen inget',
    'Alex → Använder → Olöst identitet',
    'Eget fält: Gammalt fält (text): Tidigare uppgift → Borttaget',
    'Eget fält: Inget → Stängt (ja/nej): Kontot är stängt',
    'Framåtriktning: använder → ny framåtriktning',
    'Omvänd riktning: används av → Ej uppgivet',
  ])
    expect(table.textContent).toContain(detail);
  const summary = screen.getByRole('list', { name: 'Alla föreslagna ändringar' });
  expect(summary.textContent).toContain('Rätta Objekttyp: Konto → Betalkonto');
  expect(summary.textContent).toContain('Lägg till Objekttyp: Ny typ');
  expect(summary.textContent).toContain('Ta bort Objekttyp: Borttagen typ');
  expect(summary.textContent).toContain('Slutdatum: Ej uppgivet → 2026-10-03');
});

test('review retains image removal, lifecycle correction and newly defined optional fields even when older definitions omitted field metadata', () => {
  const plainType: ObjectType = {
    id: 'person',
    householdId: 'linden',
    revision: 1,
    name: 'Person',
    description: '',
  };
  const relationshipType = {
    id: 'knows',
    householdId: 'linden',
    revision: 1,
    name: 'känner',
    description: '',
  };
  const before = {
    id: 'alex',
    householdId: 'linden',
    revision: 1,
    typeId: plainType.id,
    name: 'Alex',
    
    profileImageId: 'image',
  };
  const imageRemoved: DraftChange = {
    id: 'alex',
    type: plainType,
    before,
    after: { typeId: plainType.id, name: 'Alex',  lifecycle: 'ended' },
  };
  const imageAdded: DraftChange = {
    id: 'robin',
    type: plainType,
    before: { ...before, id: 'robin', name: 'Robin', profileImageId: undefined },
    after: { typeId: plainType.id, name: 'Robin',  profileImageId: 'new-image' },
  };
  const draft: MapDraft = {
    version: 2,
    changes: [imageRemoved, imageAdded],
    relationships: [
      {
        id: 'knows-alex',
        type: relationshipType,
        objectNames: { alex: 'Alex', robin: 'Robin' },
        before: {
          id: 'knows-alex',
          householdId: 'linden',
          revision: 1,
          typeId: relationshipType.id,
          sourceId: 'alex',
          targetId: 'robin',
          
          lifecycle: 'ended',
        },
        after: {
          typeId: relationshipType.id,
          sourceId: 'alex',
          targetId: 'robin',
          
          lifecycle: 'active',
        },
      },
    ],
    objectTypes: [
      {
        id: plainType.id,
        before: plainType,
        after: {
          ...plainType,
          revision: 2,
          name: 'Person',
          description: '',
          
        },
      },
    ],
    relationshipTypes: [
      {
        id: relationshipType.id,
        before: {
          ...relationshipType,
          
        },
        after: { ...relationshipType, revision: 2, name: 'känner', description: '' },
      },
    ],
  };
  const page = render(<DraftChangeSummary review={draft} />);
  const summary = screen.getByRole('list', { name: 'Alla föreslagna ändringar' });
  expect(summary.textContent).toContain('Profilbild: Bild finns → Ingen bild');
  expect(summary.textContent).toContain('Profilbild: Ingen bild → Ny bild');
  expect(summary.textContent).toContain('Gäller: Aktuellt → Upphört');
  expect(summary.textContent).toContain('Gäller: Upphört → Aktuellt');
  expect(summary.textContent).toContain('Eget fält: Inget → Födelsedag (datum): Uppgivet datum');
  expect(summary.textContent).toContain('Eget fält: Gammal uppgift (text): Tas bort → Borttaget');
  page.rerender(<ConversationDraft draft={draft} />);
  const table = screen.getByRole('table', { name: 'Osparade ändringar' });
  expect(table.textContent).toContain('Gäller: Upphört → Aktuellt');
  expect(table.textContent).toContain('Profilbild: Bild finns → Ingen bild');
});
