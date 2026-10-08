# Separata konsolförberedelser och tekniska kontroller

Utdragen hör till [återimportfallen](household-import.md) och
[flyttfallen](household-recovery.md). Kör endast på påhittat provinnehåll
i respektive profils Console. Varje länk i fallet anger tidpunkt, profil,
indata, förväntat förberedelsebesked och återställning. Följ den ordningen;
ett utdrag är inte ett fristående UI-test och ersätter inte fallens knappar.

Begäransfångst kräver det angivna sparandet eller importförsöket. Upprepning
kräver dess tidigare fångade uppgifter, samma ursprung och aktuell session.
Kontrollerna skriver bara tillstånd eller status; kopiera aldrig cookies,
token eller privata webbläsarsvar till testprotokollet. Efter ett avbrutet
försök återställs fetch genom omladdning. Behåll fångade begäranden tills
deras uttryckliga städsteg; ta sedan bort dem och provinstallationens filer.

UI-resultat och tekniska resultat antecknas separat. HTTP-status, exakta
begäransfält och arkivjämförelser är tekniskt underlag. De påstår ingen
mänsklig observation av skärmläsare, fysisk utrustning eller verklig zoom.

## IMPORT-06: förberedelse 1

```javascript
(() => {
  const slot = prompt('image eller later');
  if (!['image', 'later'].includes(slot)) throw new Error('invalid slot');
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(
      input instanceof Request ? input.clone() : input, init,
    );
    const url = new URL(request.url);
    if (url.origin !== location.origin || request.method !== 'POST'
        || !/^\/api\/households\/[^/]+\/map\/save$/.test(url.pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const body = await request.json();
    const keys = Object.keys(body).sort().join(',');
    if (keys !== 'contentVersion,operationId,version') {
      throw new Error('unexpected save fields; stop this case');
    }
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.receipt?.operationId !== body.operationId) {
      console.error('IMPORT-06: inget lyckat kvitto; kontrollera utfallet');
      return response;
    }
    sessionStorage.setItem(`skyttel-import06-${slot}`, JSON.stringify({
      path: url.pathname, body,
    }));
    console.info(`IMPORT-06: ${slot} sparat`);
    if (slot === 'later') throw new TypeError('Synthetic lost save response');
    return response;
  };
  console.info('IMPORT-06: redo för nästa sparande');
})();
```

## IMPORT-06: förberedelse 2

```javascript
await (async () => {
  const saved = ['image', 'later'].map(slot => ({
    slot,
    ...JSON.parse(sessionStorage.getItem(`skyttel-import06-${slot}`)),
  }));
  const pattern = /^\/api\/households\/[^/]+\/map\/save$/;
  if (saved.some(item => !pattern.test(item.path) || !item.body)
      || saved[0].path !== saved[1].path) {
    throw new Error('missing requests or different household; stop');
  }
  const mapPath = saved[0].path.slice(0, -'/save'.length);
  const read = async path => {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const snapshot = async () => JSON.stringify({
    map: await read(mapPath), history: await read(`${mapPath}/history`),
  });
  const before = await snapshot();
  const build = await read('/api/version');
  for (const item of saved) {
    const response = await fetch(item.path, {
      method: 'POST', credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Skyttel-Build': `${build.commit}:${build.version}`,
      },
      body: JSON.stringify(item.body),
    });
    const result = await response.json();
    console.info('IMPORT-06', item.slot, response.status, result.error);
    if (response.status !== 409
        || !['content_conflict', 'operation_conflict'].includes(result.error)) {
      throw new Error('old save was not rejected by content protection');
    }
    if (await snapshot() !== before) {
      throw new Error('map or history changed after old save retry');
    }
  }
  console.info('IMPORT-06: karta och historik är oförändrade');
})();
```

## IMPORT-06: förberedelse 3

```javascript
for (const slot of ['image', 'later']) {
  sessionStorage.removeItem(`skyttel-import06-${slot}`);
}
```

## IMPORT-09: förberedelse 1

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method !== 'POST'
        || !/\/imports\/[^/]+\/confirm$/.test(new URL(request.url).pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.status !== 'completed') return response;
    console.info('IMPORT-09: slutfört försök', result.id);
    throw new TypeError('Synthetic lost import response');
  };
})();
```

## IMPORT-10: förberedelse 1

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method !== 'POST'
        || !/\/imports$/.test(new URL(request.url).pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || result.status !== 'ready') return response;
    console.info('IMPORT-10: kontrollerad förberedelse', result.id);
    throw new TypeError('Synthetic lost preparation response');
  };
})();
```

## IMPORT-17: förberedelse 1

```javascript
const originalFetch = window.fetch;
let cancelledId;
let hideRead = true;
window.fetch = async (...args) => {
  const request = new Request(...args);
  const url = new URL(request.url);
  const cancelRoute = /\/imports\/[^/]+\/cancel$/.test(url.pathname);
  if (request.method === 'POST' && cancelRoute) {
    const response = await originalFetch(...args);
    const result = await response.clone().json();
    if (!response.ok || result.cancelled !== true) return response;
    cancelledId = url.pathname.replace(/\/cancel$/, '');
    console.log('Avbrott utfört, svar dolt');
    throw new TypeError('Synthetic lost cancellation response');
  }
  if (request.method === 'GET' && url.pathname === cancelledId && hideRead) {
    hideRead = false;
    throw new TypeError('Synthetic failed status read');
  }
  return originalFetch(...args);
};
```

## IMPORT-19: förberedelse 1

```javascript
const originalFetch = window.fetch;
const heldReply = new Promise((resolve) => {
  window.releaseImportReply = resolve;
});
window.fetch = async (...args) => {
  const request = new Request(...args);
  const response = await originalFetch(...args);
  const isCancel = /\/imports\/[^/]+\/cancel$/.test(new URL(request.url).pathname);
  if (request.method === 'POST' && isCancel) {
    window.fetch = originalFetch;
    const result = await response.clone().json();
    if (!response.ok || result.cancelled !== true) return response;
    console.log('Avbrottet är utfört, svaret väntar');
    await heldReply;
    if (request.signal.aborted) throw new DOMException('Avbruten', 'AbortError');
  }
  return response;
};
```

## IMPORT-20: förberedelse 1

```javascript
const originalFetch = window.fetch;
const heldStatus = new Promise((resolve) => {
  window.releaseImportStatus = resolve;
});
window.fetch = async (...args) => {
  const request = new Request(...args);
  const response = await originalFetch(...args);
  const isStatus = /\/imports\/[^/]+$/.test(new URL(request.url).pathname);
  if (request.method === 'GET' && isStatus) {
    window.fetch = originalFetch;
    const result = await response.clone().json();
    if (response.status !== 404 || result.error !== 'import_unavailable') {
      return response;
    }
    console.log('Försöket saknas, svaret väntar');
    await heldStatus;
    if (request.signal.aborted) throw new DOMException('Avbruten', 'AbortError');
  }
  return response;
};
```

## IMPORT-21: förberedelse 1

```js
(() => {
  const prefix = 'skyttel-import:';
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  let blocked = 'removeItem';
  window.addEventListener('keydown', (event) => {
    if (!event.altKey || !event.shiftKey) return;
    if (event.code === 'KeyS') blocked = 'setItem';
    else if (event.code === 'KeyR') blocked = 'removeItem';
    else if (event.code === 'KeyA') blocked = '';
    else return;
    event.preventDefault();
  });
  Storage.prototype.setItem = function (key, value) {
    if (key.startsWith(prefix) && blocked === 'setItem')
      throw new DOMException('Kontrollerat lagringsfel', 'QuotaExceededError');
    return originalSet.call(this, key, value);
  };
  Storage.prototype.removeItem = function (key) {
    if (key.startsWith(prefix) && blocked === 'removeItem')
      throw new DOMException('Kontrollerat lagringsfel', 'SecurityError');
    return originalRemove.call(this, key);
  };
})();
```

## FLYTT-01: förberedelse 1

```javascript
await (async () => {
  const slot = prompt('source eller destination');
  const id = prompt('Hushållets ID från adressen');
  if (!['source', 'destination'].includes(slot) || !/^[\w-]+$/.test(id)) {
    throw new Error('invalid test input');
  }
  const path = `/api/households/${id}/map`;
  const read = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const state = await read(path);
  const build = await read('/api/version');
  const body = { version: state.draft.version,
    contentVersion: state.contentVersion, operationId: crypto.randomUUID() };
  const response = await fetch(`${path}/operations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json',
      'X-Skyttel-Build': `${build.commit}:${build.version}` },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.operation?.status !== 'pending') {
    throw new Error('pending preparation failed; stop this case');
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(body)],
    { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `skyttel-move-${slot}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.info('FLYTT-01: känt väntande försök förberett');
})();
```

## FLYTT-01: förberedelse 2

```javascript
await (async () => {
  const id = prompt('Tredje hushållets ID från adressen');
  if (!/^[\w-]+$/.test(id)) throw new Error('invalid household');
  const input = document.createElement('input');
  input.type = 'file'; input.multiple = true; input.accept = '.json';
  const files = await new Promise(resolve => {
    input.onchange = () => resolve([...input.files]); input.click();
  });
  if (files.length !== 2) throw new Error('select both original requests');
  const path = `/api/households/${id}/map`;
  const read = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`read failed: ${response.status}`);
    return response.json();
  };
  const snapshot = async () => JSON.stringify({ map: await read(path),
    history: await read(`${path}/history`) });
  const before = await snapshot();
  const state = await read(path);
  const build = await read('/api/version');
  for (const file of files) {
    const body = JSON.parse(await file.text());
    const fields = Object.keys(body).sort().join(',');
    if (fields !== 'contentVersion,operationId,version') {
      throw new Error('unexpected request fields');
    }
    const response = await fetch(`${path}/save`, {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        'X-Skyttel-Build': `${build.commit}:${build.version}` },
      body: JSON.stringify({ ...body, contentVersion: state.contentVersion }),
    });
    const result = await response.json();
    console.info('FLYTT-01', file.name, response.status, result.error);
    if (response.status !== 409 || result.error !== 'content_conflict'
        || await snapshot() !== before) {
      throw new Error('retired retry changed content');
    }
  }
  console.info('FLYTT-01: båda avvisade, karta och historik oförändrade');
})();
```

## FLYTT-02: förberedelse 1

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.method !== 'POST'
        || !/\/content-owners\/assign$/.test(new URL(request.url).pathname)) {
      return originalFetch(input, init);
    }
    window.fetch = originalFetch;
    const body = await request.json();
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    if (!response.ok || !result.identities?.some(identity =>
      identity.id === body.identityId && identity.userId === body.userId)) {
      return response;
    }
    console.info('FLYTT-02: kopplingen finns på servern');
    throw new TypeError('Synthetic lost ownership response');
  };
})();
```

## FLYTT-01: arkivjämförelse

Ange de tre privata ZIP-filernas absoluta sökvägar i terminalen. Kopiera
dem vid behov till provkatalogen via VS Code; öppna inga verkliga hushållsarkiv.
Kontrollen skriver bara ut ett godkänt besked, inte privata innehållsvärden.

```sh
printf 'Source ZIP path: '; read -r SKYTTEL_MOVE_SOURCE_ZIP
printf 'Target ZIP path: '; read -r SKYTTEL_MOVE_TARGET_ZIP
printf 'Third ZIP path: '; read -r SKYTTEL_MOVE_THIRD_ZIP
export SKYTTEL_MOVE_SOURCE_ZIP SKYTTEL_MOVE_TARGET_ZIP SKYTTEL_MOVE_THIRD_ZIP
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
const archives = ['SOURCE', 'TARGET', 'THIRD'].map(name => {
  const parts = unzipSync(readFileSync(process.env[`SKYTTEL_MOVE_${name}_ZIP`]));
  const content = JSON.parse(Buffer.from(parts['content.json']).toString());
  return { parts, content };
});
const normalize = rows => rows.map(({ householdId, ...row }) => row);
const source = archives[0];
for (const current of archives.slice(1)) {
  assert.deepEqual(current.parts['images.bin'], source.parts['images.bin']);
  for (const key of ['objects', 'objectTypes', 'objectTypeFields', 'saves']) {
    assert.deepEqual(normalize(current.content[key]), normalize(source.content[key]));
  }
  const pending = current.content.operations.filter(row => row.status === 'pending');
  assert.equal(pending.length, 2);
  assert.ok(current.content.drafts.some(row => row.changes.some(change =>
    change.after?.name === 'Nytt privat arbete')));
}
console.log('FLYTT-01: bilder, identiteter, definitioner och historik bevarade.');
JS
unset SKYTTEL_MOVE_SOURCE_ZIP SKYTTEL_MOVE_TARGET_ZIP SKYTTEL_MOVE_THIRD_ZIP
```
