# Förbered kontrollerade assistentfall

Den här guiden ger terminalklientens fulla syntetiska indata och tekniska
jämförelser för assistentfallen. Klienten skickar MCP-anrop utan modell.
Webbläsarsteg och synliga resultat står i respektive manuellt fall.
Använd inga verkliga hushållsuppgifter och spara inte terminalutskrifter.

## Installation, medgivande och städning

Följ [den kontrollerade klientguiden](assistant-advanced.md#controlled-mcp-client)
för ny databas, konfigurerad Google-/Microsoft-inloggning, lokal adress,
portvidarebefordran och omstart med samma databas. Använd ny databas och
nya anslutningar per fall. Vid slutet: återkalla anslutningen i Skyttel,
kontrollera nekad ny läsning, kör `quit`, stäng det privata fönstret och
ta bort bara den tillfälliga databasens katalog enligt klientguiden.

För AI-01–06 begär klienten endast läsåtkomst. Starta terminal B så här:

```sh
node --import tsx scripts/manual-mcp-client.ts http://localhost:3301 47731 read
```

Skapa **Hushållet Linden** i stället för **MCP-prov** i dessa fall.
Robin kopierar sitt användar-ID från startsidan i sin separata profil;
Alex bjuder in detta ID genom hushållets administration och Robin
accepterar koden. Robin skapar dessutom **Hushållet Eken** i sin profil.
Skapa Alex privata förslag **Alex privata förslag** och Robins
**Robins privata förslag**, båda typ Person och tom beskrivning, genom
**Nytt objekt → Lägg i utkastet och stäng** i respektive profil.
Spara dem inte. När ett fall återkallar Robins medlemskap, bjud in Robin
igen med en ny kod före nästa fall. Anslut läsklienten i rätt persons
profil och välj alltid Linden i medgivandet.

Öppna klientens utskrivna auktoriseringsadress. För AI-01 lämnar du
medgivandet ogodkänt och väljer sedan **Nej, anslut inte**; klienten
avslutas utan åtkomst. Starta en ny process för nästa fall. För andra
läsfall väljer du provhushållet, markerar AI-valet och väljer
**Godkänn läsåtkomst**. `tools` ska erbjuda enbart `read_map` och
`read_my_draft`. Varken webbinloggning eller en skrivklients gamla
medgivande ersätter detta läsmedgivande.

För AI-08–11 och MCP-fallen används kartarbete. Utelämnad sista parameter
betyder `write`, precis som följande uttryckliga kommando:

```sh
node --import tsx scripts/manual-mcp-client.ts http://localhost:3301 47731 write
```

Godkänn då både AI-val och kartarbete. Kontrollera `ready` före kommandon.
Den sista parametern får bara vara `read` eller `write`; klienten
beviljar aldrig större åtkomst än Skyttels aktuella medgivande.

### Webbcookie utan assistentmedgivande, AI-01

Efter vanlig webbinloggning, före ett godkänt assistentmedgivande, kör
följande i konsolen på installationens egen sida. Inga token används.

```javascript
const svar = await fetch('/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    accept: 'application/json, text/event-stream',
  },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'read_map', arguments: {} },
  }),
});
console.log(svar.status, await svar.json());
```

Förvänta 401 och `unauthenticated`, utan kartinnehåll. Kontrollera också
att klientens eget ogodkända flöde inte ger kartdata. Ingen patch installeras
i webbläsaren; stäng konsolen efter kontrollen.

### Avgränsad läsning, AI-06

Skapa de fem objekten och fyra sambanden enligt AI-06 i webbläsaren och
spara hela utkastet. Ge Blå bilen beskrivningen **Bilens sparade uppgifter**,
Kim **Kims övriga detaljer**, Lo **Los övriga detaljer**, Cykeln två steg
bort **Cykelns uppgifter** och Samlingen **Orelaterat objekt**. Privat samling
har typbeskrivningen **Orelaterad typbeskrivning** och textfältet Anteckning
med beskrivningen **Hemligt fält**. Kör `map Blå bilen` och kopiera bara
bilens faktiska `id` ur svaret till `objectId` i följande läsningar:

```text
read-tool read_map {"objectId":"bilens faktiska id"}
read-tool read_map {"query":"BILEN"}
read-tool read_map {"objectId":"bilens faktiska id","query":"bilen"}
read-tool read_map {"query":"ingen träff"}
read-tool read_map {"objectId":"missing"}
read-tool read_map {"objectId":"bilens faktiska id","query":"Samlingen"}
read-tool read_map {}
```

Strängen `bilens faktiska id` ska ersättas med just det nyss lästa värdet,
inte användar-ID eller ett exempel-ID. `missing` är avsiktligt obefintligt.
Jämför hela svarens direkta samband, ändpunkter och typdefinitioner enligt
AI-06; ändra ingen data mellan dessa läsningar. Efter formulärrättelsen
kör du `read` för full jämförelse av sparat och privat innehåll.

## Typer och avtal

Skriv raderna direkt i klienten i terminal B, inte i ett shell eller en
modellkonversation. Varje `capture-tool` läser dagens versioner och behåller
en oskickad begäran. `send` skickar just den fångsten. Läs `read` efter
förslagen och före `capture-save`; skicka sparfångsten först efter din
fulla granskning. Ett domänfel är inte en lyckad ändring.

Kör `read-tool read_type_catalog {}` för förifyllda typer. När en rad
nedan anger ett katalog-ID, ersätt just det strängvärdet med `id` för
det angivna exakta typnamnet i svaret. Kopiera aldrig ett användar-ID,
en token eller en typ från en annan databas. Fasta ID:n som `solar` är
syntetiska innehållsreferenser i detta nya provhushåll. Klienten hämtar
versioner automatiskt; skriv inte in dem i JSON.

### Fångster för MCP-01

Vid steg 1–2, kör dessa rader. Fältens fyra värdeslag och de utelämnade
värdena är avsiktliga.

<!-- markdownlint-disable MD013 -->
```text
capture-tool solar-type propose_object_type {"id":"solar","baseRevision":null,"value":{"name":"Solcellsanläggning","description":"Hushållets elproduktion","fields":[{"id":"supplier","name":"Leverantör","description":"","kind":"text"},{"id":"power","name":"Effekt","description":"kW","kind":"number"},{"id":"installed","name":"Installationsdatum","description":"","kind":"date"},{"id":"battery","name":"Batteri","description":"","kind":"boolean"}]}}
send solar-type
capture-tool roof propose_object {"id":"roof","baseRevision":null,"value":{"typeId":"solar","name":"Paneler på taket","description":"","customValues":{"supplier":"Exempelsol","power":12.5,"installed":"2026-09-01"}}}
send roof
capture-tool garage propose_object {"id":"garage","baseRevision":null,"value":{"typeId":"solar","name":"Paneler på garaget","description":"","customValues":{"battery":false}}}
send garage
read
```
<!-- markdownlint-enable MD013 -->

Efter webbläsarens fulla läsning i steg 3: `capture-save solar-save` och
`send solar-save`. Kör `read-tool read_type_catalog {}` och kopiera
typens aktuella `revision` som `baseRevision` i nästa fångst.
Använd samma definition som ovan men byt bara fältet `power` till
`kind: "text"`. Skicka med en ny etikett: förvänta `field_kind_in_use`
och beskedet att ett nytt fält behövs. Vid nästa fångst behåller du
`power` som `number` och lägger sist till följande fält:

```json
{"id":"power-note","name":"Effektanteckning","description":"","kind":"text"}
```

I steg 5, slå upp Person och Fordon i samma katalog. Använd
`capture-tool` med `propose_object_type`, deras egna `id` och `revision`.
Persons nya `value` är följande; Fordons `value` är `null`.

```json
{"name":"Person i hushållet","description":"Personer ger ingen inloggning","fields":[]}
```

Skicka varje fångst, granska `read`, använd `capture-save catalog-save`
och `send catalog-save`. Starta om med samma databas inför steg 6.

### Fångster för MCP-02

Slå upp varje angiven förifylld objekttyp med `read_type_catalog`.
För varje rad i tabellen använder du `capture-tool` med
`propose_object`, nytt syntetiskt `id`, `baseRevision: null` och hela
`value` med angivet namn, typens aktuella `typeId`, tom `description`
och precis följande `financialFacts`. Andra ekonomiska fält utelämnas.

<!-- markdownlint-disable MD013 -->
| ID | Objekttyp | Namn | financialFacts |
| --- | --- | --- | --- |
| rent | Hyresavtal | Hyra för lägenheten | `{"price":{"knowledge":"known","value":"9 500"},"terms":{"knowledge":"unknown"}}` |
| garage-rent | Hyresavtal | Hyra för garaget | `{"price":{"knowledge":"uncertain","value":"650"}}` |
| loan | Låneavtal | Exempellån | `{"debt":{"knowledge":"uncertain","value":"125 000,50","reportedOn":"2026-09-01"}}` |
| credit | Kreditavtal | Exempelkredit | `{"creditLimit":{"knowledge":"known","value":"80 000","reportedOn":"2026-08-01"},"usedCredit":{"knowledge":"known","value":"12 500","reportedOn":"2026-09-02"},"terms":{"knowledge":"none"}}` |
| installment | Avbetalningsavtal | Bilens avbetalning | `{"debt":{"knowledge":"unknown","reportedOn":"2026-09-03"}}` |
<!-- markdownlint-enable MD013 -->

Skicka varje fångst. Föreslå på samma sätt `home`, **Lägenheten**, typ
Bostad, och `garage`, **Garaget**, typ Garage, utan ekonomiska fakta.
Föreslå `car`, **Familjens bil**, typ Fordon, med tom beskrivning och
`identity: "unspecified"`. Slå upp sambandstyperna Gäller och Finansierar.
Använd `propose_relationship`, nytt ID, `baseRevision: null` och hela
`value`: aktuellt sambandstyp-ID, `sourceId`, `targetId` och
`knowledge: "known"` för dessa tre samband:

- `home-rent-link`: rent → Gäller → home.
- `garage-rent-link`: garage-rent → Gäller → garage.
- `finance-car`: installment → Finansierar → car.

Efter full granskning i steg 2, använd `capture-save agreements-save`
och `send agreements-save`. I steg 3 läser du kreditobjektet med
`read-tool read_map {"objectId":"credit"}`. Föreslå samma hela värde
med aktuell revision som `baseRevision` och ändra endast
`usedCredit` till `{"knowledge":"known","value":"0","reportedOn":"2026-09-20"}`.
Granska och spara med en ny etikett. Välj detta kvitto genom
`read_history` med kvittots faktiska `operationId` och `userId` och jämför
hela tidigare beloppet **12 500** och datumet **2026-09-02**.

### Fångster för MCP-03

Skapa typerna `cycle` och `vehicle` med `propose_object_type`,
`baseRevision: null` och dessa fulla definitioner:

<!-- markdownlint-disable MD013 -->
```json
{"name":"Cykel","description":"","fields":[{"id":"serial","name":"Nummer","description":"","kind":"text"}]}
```

```json
{"name":"Motorfordon","description":"","fields":[{"id":"serial","name":"Nummer","description":"","kind":"number"}]}
```
<!-- markdownlint-enable MD013 -->

Föreslå `bike` med typ `cycle`, namn **Alex blå cykel**, tom beskrivning
och `customValues: {"serial":"SYNTH-42"}`. Föreslå `garage` med namnet
**Garaget**, tom beskrivning och en annan aktuell typ från katalogen.
Skapa sambandstypen `stored` med följande värde:

<!-- markdownlint-disable MD013 -->
```json
{"name":"Förvaring","description":"Sakens plats","forwardLabel":"förvaras i","reverseLabel":"innehåller"}
```
<!-- markdownlint-enable MD013 -->

Föreslå sambandet `parking` med typ `stored`, från `bike` till `garage`
och `knowledge: "known"`. Skicka samma fulla värde igen under det nya
ID:t `duplicate`. Det befintliga sambandet ska återanvändas. Föreslå
`second-kind` mellan samma objekt med en annan aktuell sambandstyp.
Spara hela utkastet efter granskning.

Läs och behåll cykelns och båda riktade sambandens identiteter före
typbytet. Läs cykelns aktuella revision och använd den vid typbytet i steg 3.
Behåll namn och tom beskrivning, välj `typeId: "vehicle"` och
`customValues: {"serial":42}`. Efter webbläsarens fulla före-/efterläsning
sparar du. Läs kartan igen och jämför samma objekt- och sambandsidentiteter.
Slå sedan upp den gamla typens aktuella revision, föreslå dess
borttagning med `value: null` och spara. Välj typbytets hela kvitto med
dess faktiska operation och historiska författare; kontrollera också
webbläsarens **Visa ändringarna**.

### Fångster för MCP-04

Skapa `ended-type`, **Upphörd typ**, `private-type`, **Privat använd typ**,
och `race-type`, **Samtidig typ**, med tom beskrivning och `fields: []`.
Skapa `ended`, **Upphört testobjekt**, typ `ended-type`, tom beskrivning
och `lifecycle: "ended"`. Granska och spara hela utkastet.

Slå upp aktuell typrevision inför varje borttagningsförslag. Föreslå
`propose_object_type` med typens ID, revision och `value: null`.
Upphörd typ ska direkt ge `definition_in_use`. Följ Robins fulla
objektsteg i MCP-04 innan Alex försöker Privat använd typ: avvisningen
får inte innehålla Robins namn, beskrivning eller objektidentitet.

Alex skickar borttagningsförslaget för Samtidig typ före Robins andra
objektförslag. Ladda om Robins sida före detta nya formulärförslag om
klienten ändrar Robins utkast mellan webbläsarstegen. Först därefter ger
Alex sparbeskedet. Det ska avvisas med
`definition_in_use`. Starta om med samma databas; inga privata förslag
får sparas eller försvinna.

## Familjeärendet, AI-08

Använd demoguidens server och nya databas, inte samtidigt den tomma
MCP-guidens server. Provhushållet är **TestHousehold**. Starta en
kontrollerad `write`-klient på samma adress, välj detta hushåll och ge
båda medgivandena. Återkalla även denna anslutning vid demoguidens städning.

I steg 3, kör `read`. Kopiera det fulla Lo-konfliktobjektet från
`conflicts` till `conflict` i en `capture-tool` för `resolve_conflict`;
ange också `choice: "proposed"`. Skicka fångsten, läs `read` och kontrollera
Lo Lind med **Spelar piano i musikföreningen.**. Hela övriga utkastet
ska finnas kvar. Läs sedan `map Familjens Molnmusik`.

Kopiera det aktuella Molnmusik-objektets `id` och `revision` till `id`
respektive `baseRevision` i `propose_object`. Kopiera hela objektvärdet
till `value`, utom dess `id`, `revision` och `householdId`. Ändra enbart
beskrivningen till **Familjeabonnemang, 189 kr per månad.** och ersätt
`financialFacts` med följande fulla värde. Behåll övriga egenskaper.

```json
{
  "price": {"knowledge":"known","value":"189"},
  "currency": {"knowledge":"known","value":"SEK"},
  "paymentInterval": {"knowledge":"known","value":"månad"}
}
```

Skicka rättelsen, kör `read` och granska de två objekten och adressambandet.
Kör `capture-save family` och ge sparbeskedet med `send family`.
Starta om med demoguidens samma databas. Kör `send family` igen utan
ny fångst; hela svarets kvitto ska vara samma. Fortsätt webbläsarläsningen
i AI-08. Den separata verkliga klientobservationen är AI-14.

## Historikläsning, MCP-06

Använd MCP-06:s två isolerade databaser och det faktiskt nedladdade
arkivet. Följ dess vanliga export- och importsteg; detta avsnitt ger
separata tekniska jämförelser för historikläsningen. Behåll kvittots JSON tills
jämförelsen är klar och städa det tillsammans med ZIP-filen efter fallet.
Gör ingen koppling av historisk författare till aktuell användare.

Före läsningen i steg 6 lägger du ett nytt objektförslag
**Oberoende utkast**, tom beskrivning ersatt av **Privat lampanteckning**,
med samma typ som lampan. Använd `propose_object`, ID `private-lamp`,
`baseRevision: null` och hela värdet. Ladda om kartan innan du läser
förslaget i webbläsaren. Kör `read` och behåll det fulla
svaret privat för teknisk jämförelse. Läs hela historiken också.

Välj den importerade skapelsen med `read_history` och dess exakta
`operationId` och `userId`. Jämför hela `receipt` med originalkvittot,
inklusive tidpunkt, författare, objekt, före-/eftervärden och definitioner.
Efter både klientens och webbläsarens historikläsning kör du `read` och
läser hela historiken igen. Båda fulla resultaten ska vara oförändrade;
det oberoende utkastet måste fortfarande vara icke-tomt.

Skicka nu `old-type` utan ny fångst: förvänta `content_conflict`. Kasta
bara `private-lamp` med `discard private-lamp` efter jämförelsen och
ladda om kartan igen. Fortsätt först därefter MCP-06:s formulärrättelse. Läs
förslaget i webbläsaren före den extra klientfångsten för samma rättelse.
Klientfångsten använder dagens versioner och lampans aktuella revision.

De avvecklade verktygen och gamla HTTP-rutterna kontrolleras dessutom
automatiskt i MCP-06. Listning, avvisade direkta anrop och 404-svar är
tekniska skydd; de ersätter inte den fulla historik- och utkastläsningen.
