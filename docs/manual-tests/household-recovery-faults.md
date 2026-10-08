# Separat svarsförberedelse för återimport och innehållskoppling

Använd bara ett påhittat provhushåll i Chromium. Detta förbereder en verklig
serverrespons innan den fördröjs eller tappas; vanligt offlineläge provar
en annan felgräns. UI-stegen finns i återimportens och flyttens fall.
Automatisk rökprovning av själva utdraget finns i
[household-recovery-preparation.spec.ts](../../tests/integration/household-recovery-preparation.spec.ts).

## Fördröj eller tappa nästa verkliga svar

1. Öppna rätt hushålls importsida eller sida för innehållskoppling. Kör
   utdraget nedan i Console innan den angivna UI-knappen aktiveras.
2. Ange `prepare-delay` i IMPORT-15 och IMPORT-22–24 före filkontrollen,
   `import-status-drop` i IMPORT-14 före första statushämtningen eller
   `owner-status-drop` i FLYTT-02 före första metadatahämtningen efter
   det oklara ägarbytet. Varje installation av utdraget förbrukas en gång.
3. Vid fördröjning: invänta **Serverns svar väntar**. Flytta fokus enligt
   fallet och tryck Alt+Skift+L i provsidan för att leverera svaret.
   Vid borttappning: invänta **Serverns svar tappat** innan felet bedöms.
   Om ingen verklig lyckad respons kommer ska provet räknas som ej utfört.
4. Utdraget återställer `fetch` när rätt begäran fångas. Ladda om fliken
   om du avbryter innan begäran. Omladdning tar också bort tangentbordsregeln.
   Kör sedan den vanliga statushämtningen; bekräfta aldrig ett oklart försök
   på nytt för att ersätta en utebliven läsning.

```javascript
(() => {
  const mode = prompt('prepare-delay, import-status-drop, owner-status-drop');
  const id = location.pathname.match(/^\/households\/([^/]+)\//)?.[1];
  if (!id || !['prepare-delay', 'import-status-drop',
    'owner-status-drop'].includes(mode)) throw new Error('invalid test input');
  const base = `/api/households/${id}`;
  const originalFetch = window.fetch.bind(window);
  let release;
  const held = new Promise(resolve => { release = resolve; });
  window.addEventListener('keydown', event => {
    if (event.altKey && event.shiftKey && event.code === 'KeyL') {
      event.preventDefault(); release();
    }
  });
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const matches = mode === 'prepare-delay'
      ? request.method === 'POST' && url.pathname === `${base}/imports`
      : request.method === 'GET' && (mode === 'import-status-drop'
        ? url.pathname.startsWith(`${base}/imports/`)
        : url.pathname === `${base}/content-owners`);
    if (url.origin !== location.origin || !matches)
      return originalFetch(input, init);
    window.fetch = originalFetch;
    const response = await originalFetch(input, init);
    const result = await response.clone().json();
    const expected = mode === 'prepare-delay' ? result.status === 'ready'
      : mode === 'import-status-drop' ? result.status === 'completed'
      : Array.isArray(result.identities);
    if (!response.ok || !expected) {
      console.error('Inget lyckat serversvar; provet är inte förberett');
      return response;
    }
    if (mode === 'prepare-delay') {
      console.info('Serverns svar väntar');
      await held;
      return response;
    }
    console.info('Serverns svar tappat');
    throw new TypeError('Synthetic lost recovery response');
  };
})();
```

Utdraget förändrar inte begärans innehåll, medlemskap eller databas.
Det skriver endast förberedelsens tillstånd; kopiera inga cookies, token
eller privata svar till testprotokollet. Den tekniska rökprovningen bevisar
ingen fysisk tangent, skärmläsaruppläsning eller verklig zoom.
