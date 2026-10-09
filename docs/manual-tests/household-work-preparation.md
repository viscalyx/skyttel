# Förberedelse för bevarat hushållsarbete

Operatören använder en separat provinstallation utan verkliga uppgifter.
UI-fallen finns i [bevarat hushållsarbete](household-work.md).
De två [automatiska förberedelseproven](../../tests/integration/household-work-preparation.spec.ts)
kontrollerar de publicerade verktygen i tom och befolkad installation med
Robins meningsfulla separata utkast. De utför inget mänskligt ljudprov.
Kommandon nedan hör till förberedelsen, inte användarens kontroller.

## Väntande radering

Starta den [kontrollerade kostnadsmiljön](costs.md#controlled-cost-fixture)
och anteckna dess `directory`. Förbered de två objekten och stolens privata
förslag enligt ARBETE-07. Behåll båda flikarna och samma databas.
Precis före **Spara hela utkastet** i flik A: kör detta oförändrade utdrag
i **Sources → Snippets**. Invänta konsolens väntandebesked och kontrollera
i **Network** att `map/operations` registrerar status `pending` med HTTP 200.
Anteckna den faktiskt returnerade `operationId`; hitta aldrig på den.

```js
(() => {
  const originalFetch = window.fetch;
  let releaseSave = () => {};
  const held = new Promise((resolve) => { releaseSave = resolve; });
  function release(event) {
    if (!event.altKey || !event.shiftKey || event.code !== 'KeyR') return;
    event.preventDefault();
    releaseSave();
    window.removeEventListener('keydown', release);
  }
  window.addEventListener('keydown', release);
  window.fetch = async function (...args) {
    const input = args[0] instanceof Request ? args[0].url : args[0];
    const url = new URL(input, location.href);
    if (url.origin === location.origin &&
        url.pathname.endsWith('/map/save')) {
      window.fetch = originalFetch;
      console.info('ARBETE-07: sparandet väntar');
      await held;
    }
    return originalFetch.apply(this, args);
  };
})();
```

Efter granskning av enbart lampan men före **Radera permanent**, kör följande
i en andra terminal från projektets rot. Sökvägen är `directory` följt av
`/skyttel.db`. Invänta **Läsningen är öppen**.

```sh
printf 'Databasens fullständiga sökväg: '
read -r work_case_database
node --input-type=module -e '
import Database from "better-sqlite3";
const database = new Database(process.argv[1], {
  readonly: true,
  fileMustExist: true,
});
database.exec("BEGIN");
database.prepare("SELECT id FROM map_object LIMIT 1").get();
function release() {
  database.exec("ROLLBACK");
  database.close();
  console.log("Läsningen är avslutad.");
  process.exit(0);
}
process.stdin.resume();
process.stdin.once("data", release);
process.once("SIGINT", release);
console.log("Läsningen är öppen. Tryck Enter först vid steg 7.");
' "$work_case_database"
```

Efter bekräftelsen ska **Network** visa HTTP 202 och samma raderings-ID.
Låt läsaren vara öppen medan båda flikarna avvecklar gammalt arbete.
När UI-fallet ber dig släppa sparandet: tryck Alt+Skift+R i flik A.
Kontrollera HTTP 409 och `content_maintenance` för den gamla `map/save`.
Ingen automatisk omsändning ska ske. Tryck sedan Enter i läsarens terminal
innan **Försök slutföra raderingen**. Resultatet använder samma ID och anger
ett objekt samt noll samband, typer och bilder. Vid avbrott: släpp alltid
begäran och läsaren, slutför ett väntande ärende och avsluta miljön.

## Sammanhängande familjeärende

Starta [den kontrollerade röstmiljön](voice-assistant.md#controlled-voice-fixture)
med en ny installation. Använd inte `seed-family` för ordinarie ARBETE-08/09.
Miljön använder syntetiska mediespår och kontrollerade leverantörer.
Följ dess start, identitetsval, omstart och `quit`. Ingen API-nyckel behövs.
Robin loggar in i en separat profil med `identity robin`; återställ till
`identity alex` efter inloggningen. Bjud in Robin enligt UI-fallet och
lägg **Robins notering** i Robins utkast utan att spara.

Efter Alex första skickade text: använd dess aktuella `held.id` som REQUEST.
Klistra in följande på en enda terminalrad:

```text
tool REQUEST read_type_catalog {}
```

Nästa `held.lastToolResult` innehåller katalogen. Ersätt SUBTYPE, PERSON_TYPE
och PAYMENT_TYPE med respektive faktiskt ID för **Abonnemang**, **Person** och
**Betalar**. SR, PR och RR är deras faktiska revisioner. V och C kommer från
aktuellt `held.draft`; efter ändring används nästa `held.lastToolResult`.
SUB, PERSON och EDGE är nya identifierare för detta prov. Behåll dem genom
kedjan; redan befintliga identiteter får inte användas. Varje rad nedan
släpps för den aktuella REQUEST, aldrig en tidigare begäran.

<!-- markdownlint-disable MD013 -->
```text
tool REQUEST propose_object {"version":V,"contentVersion":C,"id":"SUB","baseRevision":null,"typeRevision":SR,"value":{"typeId":"SUBTYPE","name":"Familjens Molnmusik","description":"","financialFacts":{"price":{"knowledge":"known","value":"179"},"currency":{"knowledge":"known","value":"SEK"},"paymentInterval":{"knowledge":"known","value":"månad"}}}}
reply REQUEST Familjeabonnemanget är föreslaget i ditt privata utkast.
```
<!-- markdownlint-enable MD013 -->

Efter UI-fallets nästa text, eller röstfallets kontrollerade `user` och
`delegate`, släpp i tur och ordning:

<!-- markdownlint-disable MD013 -->
```text
tool REQUEST propose_object {"version":V,"contentVersion":C,"id":"PERSON","baseRevision":null,"typeRevision":PR,"value":{"typeId":"PERSON_TYPE","name":"Kim Exempel","description":""}}
tool REQUEST propose_relationship {"version":V,"contentVersion":C,"id":"EDGE","baseRevision":null,"typeRevision":RR,"value":{"typeId":"PAYMENT_TYPE","sourceId":"PERSON","targetId":"SUB","knowledge":"known"}}
reply REQUEST Kim Exempel betalar Familjens Molnmusik. Förslagen är fortfarande privata.
```
<!-- markdownlint-enable MD013 -->

Röstfallets kontrollerade transkription aktiveras först när mikrofonen är på:

```text
user Kim Exempel betalar familjens Molnmusik.
delegate
```

Efter den manuella rättningen: vänta tills dialogen är stängd och kartan
visar **189**, **SEK**, **månad** och **Rättad för hand**. Skicka sedan
**Spara hela utkastet nu.**. REQUEST, V och C kommer från den nya uppgiftens
aktuella `held.id` och `held.draft`, aldrig från ett tidigare verktygsresultat:

<!-- markdownlint-disable MD013 -->
```text
tool REQUEST save_draft {"version":V,"contentVersion":C,"operationId":"family-save"}
```
<!-- markdownlint-enable MD013 -->

Sparandet kan slutföras direkt. Vänta på det nya sparandets faktiska kvitto
och båda objekt samt relationen i kartan. En tidigare sparbekräftelse får
inte bevisa detta sparande. Vänta inte på en ytterligare `held`-begäran.
Servern tilldelar den beständiga identiteten.
Anteckna den genom **Rapporter → Ändringshistorik → Identifiera sparandet
och användaren**; automationen jämför hela kvittot, användare och tidpunkt.
Släpp inget verktyg efter avslutat arbete. Före omstart stängs mikrofonen av
i UI; `restart` avslutar den gamla serveranslutningen och mediespåren före
omladdning. Efter omstart: vänta tills kartans grafik är synlig och kör nästa
avsnitt. Avsluta med
`quit`; den tillfälliga katalogen ska tas bort. Vid avbrott avslutas miljön
och båda profilerna; nästa prov börjar med ny installation.

## Grafikavbrott utan ljud

För ARBETE-09, precis efter att vardera profilen öppnar hushållet, kör:

<!-- markdownlint-disable MD013 -->
```js
(() => {
  const canvas = document.querySelector('canvas');
  const extension = canvas?.getContext('webgl2')?.getExtension('WEBGL_lose_context');
  if (!extension) throw new Error('WebGL_lose_context saknas i provmiljön');
  extension.loseContext();
})();
```
<!-- markdownlint-enable MD013 -->

Invänta **Grafiken är tillfälligt avbruten. Ditt utkast finns kvar.** innan
arbete genom Tabell. Upprepa i båda profilerna efter respektive omladdning.
Välj aldrig mikrofonen. Den ordinarie automatiska mediegränsen kräver noll
begäranden om mikrofon, röstanslutningar och uppspelningar. **Network** och
geometri är tekniskt underlag; människan kontrollerar nåbara listor och
läsliga värden. Återställ genom avslutad installation, inte återupptagen
grafik mitt i fallet.
