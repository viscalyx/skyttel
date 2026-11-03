// THROWAWAY data boundary. The real App, routes, workspace and readers render it.
import { defaultConversationPreferences } from '../shared/conversation-preferences.js';
import type { MapState } from '../shared/map.js';
import { defaultViewSettings, type PersonalView } from '../shared/personal-view.js';
import { storageConsentInformationVersion } from '../shared/storage-consent.js';

export const modelPrototypeEnabled =
  import.meta.env.DEV &&
  import.meta.env.MODE === 'development' &&
  location.pathname.startsWith('/households/prototype');
const household = { id: 'prototype', name: 'Hushållet Lind', role: 'administrator' };
const type = (id: string, name: string) => ({
  id,
  name,
  householdId: household.id,
  revision: 1,
  description: '',
});
const person = type('person', 'Person');
const subscription = type('subscription', 'Abonnemang');
const service = type('service', 'Tjänst');
export const prototypeMap: MapState = {
  userId: 'alex',
  contentVersion: 0,
  types: [person, subscription, service],
  relationshipTypes: [type('pays', 'Betalar'), type('concerns', 'Gäller')],
  objects: [
    {
      id: 'alex',
      householdId: household.id,
      revision: 1,
      typeId: 'person',
      name: 'Alex',
      iconId: 'person',
    },
    {
      id: 'lo',
      householdId: household.id,
      revision: 1,
      typeId: 'person',
      name: 'Lo',
      iconId: 'person',
    },
    {
      id: 'music',
      householdId: household.id,
      revision: 1,
      typeId: 'subscription',
      name: 'Musikabonnemang',
    },
    {
      id: 'video',
      householdId: household.id,
      revision: 1,
      typeId: 'subscription',
      name: 'Filmabonnemang',
    },
    {
      id: 'music-service',
      householdId: household.id,
      revision: 1,
      typeId: 'service',
      name: 'Musiktjänst',
    },
    {
      id: 'video-service',
      householdId: household.id,
      revision: 1,
      typeId: 'service',
      name: 'Filmtjänst',
    },
  ],
  relationships: [
    {
      id: 'r1',
      householdId: household.id,
      revision: 1,
      typeId: 'pays',
      sourceId: 'alex',
      targetId: 'music',
    },
    {
      id: 'r2',
      householdId: household.id,
      revision: 1,
      typeId: 'pays',
      sourceId: 'lo',
      targetId: 'video',
    },
    {
      id: 'r3',
      householdId: household.id,
      revision: 1,
      typeId: 'concerns',
      sourceId: 'music',
      targetId: 'music-service',
    },
    {
      id: 'r4',
      householdId: household.id,
      revision: 1,
      typeId: 'concerns',
      sourceId: 'video',
      targetId: 'video-service',
    },
  ],
  draft: {
    version: 1,
    changes: [
      {
        id: 'new-subscription',
        before: null,
        after: { typeId: 'subscription', name: 'Tidningsabonnemang' },
        type: subscription,
      },
    ],
  },
};

export function installModelPrototypeFixture() {
  // Browser prerequisites belong to the fixture too, and never reach disk.
  for (const name of ['localStorage', 'sessionStorage']) {
    const data = new Map<string, string>();
    if (name === 'localStorage')
      data.set(
        'skyttel-storage-consent',
        JSON.stringify({
          schemaVersion: 1,
          informationVersion: storageConsentInformationVersion,
          preferences: false,
          decidedAt: Date.now(),
        }),
      );
    Object.defineProperty(window, name, {
      configurable: true,
      value: {
        get length() {
          return data.size;
        },
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, String(value));
        },
        removeItem: (key: string) => {
          data.delete(key);
        },
        clear: () => data.clear(),
        key: (index: number) => [...data.keys()][index] ?? null,
      },
    });
  }
  const original = window.fetch.bind(window);
  let mode = 'light';
  let preferences = { ...defaultConversationPreferences };
  let view: PersonalView = {
    contentVersion: 0,
    positions: [],
    settings: { ...defaultViewSettings, allLabels: true, version: 0 },
  };
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (!url.pathname.startsWith('/api/')) return original(input, init);
    const path = url.pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const json = Response.json;
    if (path === '/api/bootstrap')
      return json({
        status: 'ready',
        providers: ['google', 'microsoft'],
        operator: false,
        user: { id: 'alex', name: 'Alex Lind' },
        loginId: 'prototype-login',
        household,
      });
    if (path === '/api/browser-binding/preference')
      return json({
        userId: 'alex',
        remembered: false,
        sessionId: 'prototype-login',
        bindingId: 'prototype-binding',
        expiresAt: Date.now() + 28_800_000,
        inactiveAfterMs: 3_600_000,
      });
    if (path.startsWith('/api/browser-binding/'))
      return json({
        state: 'active',
        serverTime: Date.now(),
        expiresAt: Date.now() + 28_800_000,
        reason: 'absolute',
        sessionId: 'prototype-login',
        bindingId: 'prototype-binding',
        bindingRevision: 1,
      });
    if (path === '/api/theme-preference') {
      if (body.mode) mode = body.mode;
      return json({ userId: 'alex', mode });
    }
    if (path === '/api/households/prototype') return json({ household });
    if (path.endsWith('/conversation-preferences')) {
      preferences = { ...preferences, ...body };
      return json(preferences);
    }
    if (path.endsWith('/map/view')) {
      if (body.settings) view = { ...view, settings: { ...view.settings, ...body.settings } };
      return json(view);
    }
    if (path.endsWith('/map/view/settings')) {
      view = {
        ...view,
        settings: { ...view.settings, ...body.settings, version: view.settings.version + 1 },
      };
      return json(view.settings);
    }
    if (path.endsWith('/map/view/position')) {
      const position = { id: body.id, ...body.position, version: (body.version ?? 0) + 1 };
      view = { ...view, positions: [...view.positions.filter((p) => p.id !== body.id), position] };
      return json(position);
    }
    if (path.endsWith('/map/operations')) return json({ operations: [] });
    if (path.endsWith('/map')) return json(prototypeMap);
    if (path.endsWith('/map/history')) return json({ operations: [], hasMore: false });
    console.info('Prototype fixture has no response for', path);
    return json({ error: 'Den här åtgärden ingår inte i prototypen.' }, { status: 501 });
  };
}
