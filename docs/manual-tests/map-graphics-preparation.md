# Förbered kontrollerat grafikavbrott

Använd endast en isolerad provinstallation med syntetiska hushållsdata.
Starta om installationen mellan fallen och avsluta dess launcher med
`quit`. Koden körs i Chromes utvecklarkonsol vid den angivna tidpunkten;
den ändrar grafikens tillgänglighet, inte hushållets fakta eller utkast.

## LISTA-04 och LISTA-08

Förbered hushållet enligt LISTA-03. Öppna Tabell, sök Lo Exempel och välj
Person i Filter. Besök kartan med radens kartknapp och återvänd med
Tabell. Vid början av steg 3 kör du följande kod:

```javascript
const skyttelCanvas = document.querySelector('.spatial-surface canvas');
if (!skyttelCanvas) throw new Error('Öppna kartan före tabellen.');
const skyttelGraphics = skyttelCanvas.getContext('webgl2')
  ?.getExtension('WEBGL_lose_context');
if (!skyttelGraphics) throw new Error('WebGL-avbrott saknas.');
skyttelGraphics.loseContext();
```

Lämna utvecklarverktygen och utför återstående UI-steg. När provet är
klart återställer du grafiken med `skyttelGraphics.restoreContext()`
och startar om provinstallationen. En vanlig nätverksfrånkoppling
framkallar inte detta grafikfel.

## RYMD-04

Förbered två objektförslag enligt rymdkartans allmänna förberedelse.
Vid steg 3 ska det vanliga objektformuläret fortfarande innehålla
Oskickad mobiltext. Kör följande kod i utvecklarkonsolen:

```javascript
const skyttelGraphics = document.querySelector('canvas')
  .getContext('webgl2').getExtension('WEBGL_lose_context');
skyttelGraphics.loseContext();
setTimeout(() => skyttelGraphics.restoreContext(), 4000);
```

Lämna utvecklarverktygen. Läs avbrottsbeskedet innan grafiken återställs
och fortsätt sedan med formuläret i steg 4. Om återställningen inte
sker, kör `skyttelGraphics.restoreContext()` innan du avslutar provet.
Anteckna fysisk orientering och långtryck separat i RYMD-11.

## RYMD-09

Förbered de tio sparade objekten och deras täta placeringar enligt fallet.
Efter dess karturval i steg 2, före övergången till Tabell i steg 3,
kör koden under [LISTA-04 och LISTA-08](#lista-04-och-lista-08) i
utvecklarkonsolen. Läs avbrottsbeskedet och utför tabellsteget.
Inför steg 4 kör du `skyttelGraphics.restoreContext()`, stänger
utvecklarverktygen och återgår till kartan. Avsluta sedan installationen
med `quit`; använd en ny förberedelse för den andra bredden.
