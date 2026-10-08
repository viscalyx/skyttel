# Manuella testfall för objekt och samband

Testfallen gäller att skapa, söka, rätta och ta bort objekt och samband,
att välja mellan objekt med lika namn och att bevara ofullständiga uppgifter.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Använd den administratör som anges av `SKYTTEL_FIRST_ADMIN_PROVIDER` och
`SKYTTEL_FIRST_ADMIN_SUBJECT`. Logga in genom den konfigurerade
identitetsleverantören. KARTA-06 använder samma inloggning i en andra
webbläsarprofil. Alla namn, adresser och beskrivningar nedan är påhittade.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

När ett befintligt objekt ska ändras, välj **Tabell** och
**Redigera [objektets namn]**. **Samband för [objektets namn]** öppnar dess
samband; välj ett sambands **Redigera samband** för att ändra det.
Objektets namn öppnar den utökade läsraden och startar ingen redigering.

1. Förbered en separat testinstallation med en ny, tom databas enligt
   [installationsguiden](../operations/installation.md). Använd inga verkliga
   hushållsuppgifter. Börja varje testfall med en ny testdatabas.
2. Starta applikationen, öppna dess adress och logga in som administratören.
   Skapa hushållet **Hushållet Linden**. Kontrollera att **Tabell** är tom
   och att **Skriv till Skyttel → Visa utkastet** visar **Utkastet är tomt**.
   Stäng textvyn innan du börjar formulärarbetet.
3. Skapa objekt genom **Nytt objekt**, fyll i **Namn** och
   **Objekttyp**, ange eventuell **Beskrivning** och välj
   **Lägg i utkastet och stäng**. Låt **Identitet** vara
   **Identifierat objekt** om testfallet inte anger något annat.
4. Öppna objektets **Samband för**, välj **Nytt samband** och **Från objekt**,
   **Sambandstyp** och **Till objekt** och välj
   **Lägg i utkastet**. Stäng med **Stäng samband** efter bekräftelsen.
   Låt **Uppgiftens säkerhet** vara
   **Känt** om testfallet inte anger något annat.
5. Behåll databasen vid omladdning och omstart inom ett testfall. Ett
   sparande görs via **Skriv till Skyttel → Visa utkastet → Spara hela
   utkastet**; invänta **Utkastet är sparat** och stäng sedan textvyn.

## Söka och stänga formulär

### KARTA-01: sök med svenska bokstäver och stäng text som inte skickas

**Syfte:** Kontrollera att sökning fungerar utan hänsyn till stora och små
bokstäver och att avbruten formulärtext inte ändrar kartan eller utkastet.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Skapa och spara tjänsten **Åsas tjänst** med beskrivningen
**Gemensam musik**, tjänstekontot **Övrigt konto** och personen **Kim**.

**Integrationstest:**
[map-workflows.spec.ts](../../tests/integration/map-workflows.spec.ts),
testfallet “KARTA-01: Swedish object search and closing unsent forms preserve
the saved map”.

**Steg:**

1. Öppna **Tabell**, skriv **åSAS** i **Sök objekt i tabellen** och
   kontrollera träffarna. Öppna utkastvyn, välj sedan tabellens
   **Redigera Åsas tjänst** och kontrollera tangentbordets fokus.
2. Ändra namnet till **Text som inte skickas** och beskrivningen till
   **Inte heller denna text skickas**. Kontrollera **Spara hela utkastet**.
3. Välj **Avbryt** och bekräfta **Kasta ändringarna och fortsätt**.
   Kontrollera fokus och öppna **Åsas tjänst** igen.
4. Stäng formuläret, sök efter **finns inte** och töm därefter sökfältet.
5. Välj **Nytt objekt**, skriv **Avbrutet objekt** och välj
   **Avbryt** följt av **Kasta ändringarna och fortsätt**. Ladda om sidan.

**Förväntat resultat:**

- Sökningen visar bara Åsas tjänst. När objektet öppnas får namnfältet
  fokus. Sparknappen är inaktiverad medan formuläret innehåller ändrad text.
- Bekräftad stängning flyttar fokus till **Redigera Åsas tjänst**. När objektet
  öppnas igen visas Åsas tjänst och Gemensam musik.
- En sökning utan träffar ger en tom objektlista. Ett tomt sökfält visar
  alla tre objekt igen.
- Efter omladdning finns bara de tre ursprungliga objekten. Namn och
  beskrivningar är oförändrade och utkastet innehåller inga förslag.

## Ofullständiga uppgifter

### KARTA-02: identifiera ett ospecificerat objekt utan att byta dess samband

**Syfte:** Kontrollera skillnaden mellan en obesvarad identitetsfråga och
ett ospecificerat objekt som senare kan identifieras.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tom karta och tomt utkast.

**Integrationstest:**
[map-workflows.spec.ts](../../tests/integration/map-workflows.spec.ts),
testfallet “KARTA-02: an unresolved object can become unspecified and later
identified without changing its links”.

**Steg:**

1. Lägg bankkontot **Betalkonto** i utkastet med **Identitet**
   satt till **Obesvarad identitetsfråga**. Ladda om sidan och granska
   utkastet och **Spara hela utkastet**.
2. Stäng textvyn, välj **Redigera Betalkonto** och kontrollera identiteten.
   Ändra den till
   **Ospecificerat objekt** och lägg ändringen i utkastet.
3. Lägg till abonnemanget **Familjemusik** och sambandet
   **Familjemusik → Betalas med → Betalkonto**. Spara hela utkastet.
4. Ladda om sidan och välj **Redigera Betalkonto**. Kontrollera att det fortfarande
   är ospecificerat. Välj **Identifierat objekt**, ändra namnet till
   **Hushållskontot** och beskrivningen till **Gemensamt bankkonto**.
   Lägg ändringen i utkastet och spara.
5. Ladda om sidan, läs **Samband för Familjemusik**, stäng samband och
   välj **Redigera Hushållskontot**.

**Förväntat resultat:**

- Den obesvarade frågan finns kvar efter omladdning och blockerar sparandet.
- Det uttryckligen ospecificerade bankkontot kan sparas tillsammans med
  abonnemanget och sambandet.
- Efter identifieringen finns fortfarande två objekt och ett samband:
  Familjemusik → Betalas med → Hushållskontot. Bankkontot visar
  Identifierat objekt och Gemensamt bankkonto. Ingen dubblett skapas.

### KARTA-08: kasta oskickad text och rätta en obesvarad identitet

**Syfte:** Kasta enbart oskickat formulärarbete innan ett tidigare
objektförslag rättas, utan att ändra dess samband eller andra förslag.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Spara Familjemusik med beskrivningen Sparad beskrivning.
Behåll databasen vid omstart.

**Integrationstest:**
[map-workflows.spec.ts](../../tests/integration/map-workflows.spec.ts).
Följande testfall:

- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 1280px in light”.
- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 1280px in dark”.
- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 390px in light”.
- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 390px in dark”.
- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 320px in light”.
- “KARTA-08: discarding unsent object text preserves proposals before correcting
  an unresolved identity at 320px in dark”.

**Steg:**

1. Lägg bankkontot Betalkonto med Obesvarad identitetsfråga i utkastet.
   Lägg även Familjemusik → Betalas med → Betalkonto i utkastet.
2. Välj Tabell och Redigera Familjemusik och skriv Oskickat om
   Familjemusik som beskrivning.
   Välj Avbryt och Kasta ändringarna och fortsätt. Granska samma utkast.
3. Öppna Betalkontos redigering. Kontrollera synligt fokus på Namn och
   identiteten. Välj Ospecificerat objekt och skriv Rättad beskrivning.
   Välj Lägg i utkastet och stäng.
4. Öppna Visa utkastet och spara hela utkastet uttryckligen. Starta om och ladda
   om sidan.
   Läs båda objekten och sambandet.

**Förväntat resultat:**

- Endast Familjemusiks oskickade beskrivning kastas. Bankkontot och
  sambandsförslaget finns kvar. Familjemusiks sparade beskrivning bevaras.
- Rättelsen ändrar samma bankkonto och bevarar sambandsförslaget.
  Kartan ändras först efter det separata, uttryckliga sparandet.
- Efter omstart är Betalkonto ospecificerat med Rättad beskrivning.
  Familjemusik behåller Sparad beskrivning och sambandet pekar på samma konto.

### KARTA-05: skilj på obesvarat, osäkert, okänt och uttryckligen inget

**Syfte:** Kontrollera att sambandsuppgifter bevarar sin betydelse och att
en obesvarad fråga blockerar sparande av hela utkastet.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Lägg abonnemanget **Familjemusik** och bankkontot
**Betalkonto** i utkastet. Sätt bankkontots identitet till
**Ospecificerat objekt**.

**Integrationstest:** [family.spec.ts](../../tests/integration/family.spec.ts),
testfallet “KARTA-05: manual forms preserve incomplete meanings and block an
unanswered identity question”.

**Steg:**

1. Välj **Tabell**, **Samband för Familjemusik** och **Nytt samband**.
   Välj typen **Betalas med** och **Obesvarad identitetsfråga** under
   **Uppgiftens säkerhet**. Välj **Lägg i utkastet** och **Stäng samband**.
   Ladda om sidan.
2. Välj **Skriv till Skyttel** och **Visa utkastet**. Läs **Olöst identitet**
   och **Målet är oklart**. Kontrollera att **Spara hela utkastet** är inaktivt.
   Stäng textvyn och öppna samma samband från tabellen. Välj **Redigera samband**,
   **Osäkert uppgivet** och Betalkonto som **Till objekt**. Lägg hela sambandet
   i utkastet och stäng samband. Öppna utkastvyn igen och spara uttryckligen.
   Invänta **Utkastet är sparat**, stäng textvyn och ladda om sidan.
3. Läs sambandet från **Samband för Familjemusik** och kontrollera säkerheten.
   Stäng samband. Välj **Redigera Betalkonto**, kontrollera **Identitet** och
   stäng det oförändrade formuläret med **Stäng objektdialogen**.
4. Redigera samma samband från Familjemusik och välj **Okänt**. Lägg i utkastet,
   stäng samband och spara separat via utkastvyn. Ladda om och läs betydelsen.
5. Upprepa föregående steg med **Uttryckligen inget**.

**Förväntat resultat:**

- Den obesvarade frågan återkommer efter omladdning. Sparknappen är
  inaktiverad tills frågan löses.
- Det sparade sambandet visar Betalkonto och Osäkert uppgivet.
  Bankkontot behåller identiteten Ospecificerat objekt.
- Efter respektive ändring visar sambandet Okänt och sedan Uttryckligen
  inget i stället för ett målobjekt. Betydelserna blandas inte ihop.

## Välja och ta bort samband

### KARTA-03: välj mellan lika namn och rätta ett enskilt samband

**Syfte:** Kontrollera att lika namn inte slår samman objekt och att ett
sambands mål kan ändras och sambandet tas bort utan att påverka andra data.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tom karta och tomt utkast.

**Integrationstest:**
[map-workflows.spec.ts](../../tests/integration/map-workflows.spec.ts),
testfallet “KARTA-03: equal object names stay distinct when correcting and
deleting a relationship”.

**Steg:**

1. Lägg till tjänstekontot **Musikkonto** och två separata objekt av typen
   **E-postadress**, båda med namnet `familj@example.test`. Ge dem
   beskrivningarna **Första adressobjektet** och **Andra adressobjektet**.
2. Skapa **Musikkonto → Inloggningsadress** med det första adressobjektet
   som mål. Använd beskrivningen och identiteten i väljaren för att skilja
   adresserna åt. Skapa **Musikkonto → Kontaktadress** till det andra
   adressobjektet. Spara hela utkastet.
3. Öppna **Samband för Musikkonto → Nytt samband** och försök lägga samma
   inloggningssamband till det första adressobjektet i utkastet igen.
   Kontrollera statusen och antalet samband. Välj **Avbryt redigeringen**,
   bekräfta **Kasta ändringarna och fortsätt** och stäng samband.
4. Öppna inloggningssambandet och kontrollera dess mål. Byt till det
   andra adressobjektet och välj **Avbryt redigeringen** följt av
   **Kasta ändringarna och fortsätt**. Stäng samband, öppna samma
   redigering igen och kontrollera målet.
5. Byt åter till det andra adressobjektet, lägg sambandet i utkastet,
   spara och ladda om sidan. Öppna sambandet och kontrollera målet.
6. Välj **Föreslå borttagning**, stäng samband och granska borttagningen,
   spara och ladda om sidan.

**Förväntat resultat:**

- Väljarna skiljer adresserna åt med beskrivning och identitet. Båda
  adressobjekten finns kvar som separata objekt.
- Dubblettförsöket visar **Sambandet finns redan**. Det finns fortfarande
  två samband och inget nytt sambandsförslag i utkastet.
- Stängning utan att skicka behåller första adressobjektet som mål.
  Efter uttryckligt sparande är målet det andra adressobjektet.
- Borttagningen gäller endast inloggningssambandet. Kontaktadressens
  samband och alla tre objekt finns kvar efter omladdning.

### KARTA-04: granska och kasta borttagning av ett objekt med flera samband

**Syfte:** Kontrollera att objektborttagning omfattar inkommande och
utgående samband och lämnar oberoende information oförändrad.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Skapa och spara personen **Kim**, tjänsten
**Molnmusik**, tjänstekontot **Musikkonto** och abonnemanget
**Familjemusik**. Spara även följande samband:

- Kim → Använder → Molnmusik.
- Musikkonto → Tillhör tjänsten → Molnmusik.
- Familjemusik → Gäller tjänstekontot → Musikkonto.

**Integrationstest:**
[map-workflows.spec.ts](../../tests/integration/map-workflows.spec.ts),
testfallet “KARTA-04: object deletion reviews incoming and outgoing links
and can be discarded”.

**Steg:**

1. Välj radens röda papperskorg **Ta bort Musikkonto** i tabellen.
   Öppna utkastvyn och läs hela objektförslaget
   samt båda sambandsförslagen. Stäng läsdialogerna med Escape.
2. Stäng textvyn, öppna **Samband för Kim → Nytt samband** och kontrollera
   alternativen i **Från objekt** och **Till objekt**. Välj
   **Avbryt redigeringen** och **Stäng samband** utan att ändra något.
3. Öppna utkastvyn, välj **Kasta hela utkastet** och bekräfta
   **Ta bort hela utkastet**. Kontrollera objekt och samband från tabellen.
4. Föreslå åter borttagning av Musikkonto. Spara hela utkastet och
   ladda om sidan.

**Förväntat resultat:**

- Utkastet visar borttagning av Musikkonto och båda sambanden till eller
  från tjänstekontot, med deras namn och riktningar.
- Musikkonto kan inte väljas som källa eller mål för ett nytt samband
  medan borttagningen ligger i utkastet.
- När utkastet kastas finns alla fyra objekt och alla tre samband kvar.
- Efter sparad borttagning finns Kim, Molnmusik och Familjemusik kvar.
  Det enda kvarvarande sambandet är Kim → Använder → Molnmusik.

## Skapa och spara kartans innehåll

### KARTA-09: skapa typer, kompletta objekt och samband i samma utkast

**Syfte:** Använd nya typer i kompletta objektformulär och spara
definitioner, objekt och samband tillsammans.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tom karta och tomt utkast. Behåll databasen vid omstart.

**Integrationstest:**
[draft-creation.spec.ts](../../tests/integration/draft-creation.spec.ts).
Följande testfall:

- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 1280px in light”.
- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 1280px in dark”.
- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 390px in light”.
- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 390px in dark”.
- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 320px in light”.
- “KARTA-09: complete forms use new draft types and objects in one durable
  relationship save at 320px in dark”.

**Steg:**

1. Öppna **Inställningar → Typer och egna fält**. Skapa Solutrustning med
   beskrivningen Hushållets elproduktion och avsnittet Uppgifter. Lägg till
   Placering som text och Reserv som ja/nej. Lägg typförslaget i utkastet.
2. Välj **Tillbaka till kartan** och verktygens **Nytt objekt**. Försök lägga
   det i utkastet utan namn. Kontrollera felsammanfattningens fokus och välj
   fellänken Namn.
3. Ange Paneler på taket och Beskrivning till den nya typen. Välj Solutrustning,
   öppna Uppgifter och ange Placering Södertak och Reserv Nej. Behåll Identifierat
   objekt och välj **Lägg i utkastet och stäng**.
4. Skapa **Batteriet** av samma nya typ. Välj **Ospecificerat objekt**, lämna
   de egna fälten obesvarade och välj **Lägg i utkastet och stäng**.
5. Öppna **Inställningar → Typer och egna fält** igen. Skapa sambandstypen
   **Komplettering**, beskrivningen **Delar som används ihop**, benämningen
   **kompletteras av** från startobjektet och **kompletterar** från målobjektet.
   Lägg definitionen i utkastet och välj **Tillbaka till kartan**.
6. Välj **Tabell**, **Samband för Paneler på taket** och **Nytt samband**.
   Välj Komplettering, Batteriet i målvalet med namn, typ och beskrivning samt
   **Osäkert uppgivet**. Lägg i utkastet och stäng samband.
7. Välj **Skriv till Skyttel** och **Visa utkastet**. Öppna båda objektförslagen
   med **Visa förslaget** och läs fullständiga uppgifter. Skilj Reserv **Nej**
   från **Ej uppgivet** och stäng varje läsdialog med krysset. Granska alla fem
   förslag utan att spara.
8. Starta om installationen och ladda om. Öppna och granska samma utkast.
   Välj **Spara hela utkastet** och invänta **Utkastet är sparat**.
   Stäng textvyn. Starta om och ladda om igen. Läs båda objektens fullständiga
   uppgifter via tabellen och sambandet från **Samband för Paneler på taket**.

**Förväntat resultat:**

- Ett tomt namn stoppar hela förslaget. Sammanfattningen får fokus och
  fellänken öppnar Grunduppgifter med fokus på Namn. Typförslaget bevaras.
- Typens valfria fält visas i Uppgifter. **Nej** på panelerna är skilt
  från Batteriets obesvarade Reserv. Identifierat och ospecificerat består.
- Nya objekt- och sambandstyper samt båda objekten kan användas i sambandet
  innan något sparas gemensamt. De fem förslagen finns kvar efter omstart.
- Ett uttryckligt sparande omfattar båda definitionerna, de två objekten
  och deras riktade, osäkra samband. Efter nästa omstart finns samma
  identiteter, uppgifter och samband; utkastet är tomt. Integrationstestet
  kontrollerar dessutom att allt ingår i ett enda verkligt kvitto.

### KARTA-06: återuppta, rätta och kasta ett beständigt objektförslag

**Syfte:** Kontrollera att ett objektförslag bevaras före sparandet och
kan återupptas i en annan klient med samma inloggning.

**Användare:** Den konfigurerade administratören i två webbläsarprofiler.

**Förutsättningar:** Tom karta och tomt utkast. Tillgång till att starta om
testinstallationen med samma databas.

**Integrationstest:** [map.spec.ts](../../tests/integration/map.spec.ts),
testfallet “KARTA-06: objects move from a persistent private proposal to the
shared map after review”.

**Steg:**

1. Välj **Nytt objekt**, skriv **Lo Exempel**, välj typen **Person** och
   skriv beskrivningen **En påhittad person**. Flytta fokus till
   **Lägg i utkastet och stäng** och tryck Retur.
2. Öppna utkastvyn, granska förslaget, ladda om sidan och välj förslagets
   rad för att kontrollera hela namnet och beskrivningen. Stäng med Escape.
3. Starta om applikationen med samma databas. Logga in som samma användare
   i den andra webbläsarprofilen och kontrollera utkastet.
4. Spara hela utkastet och kontrollera kvittot. Sök efter **Lo**,
   välj **Redigera Lo Exempel**, ändra namnet till **Lo Lind** och lägg i
   utkastet. Öppna utkastvyn och läs hela sparade underlaget och förslaget.
5. Stäng läsdialogen, välj **Kasta hela utkastet** och bekräfta
   **Ta bort hela utkastet**. Stäng textvyn och öppna Lo Exempels formulär
   utan ändring. Välj **Avbryt** och sedan den röda papperskorgen
   **Ta bort Lo Exempel** på tabellraden. Granska utkastet och spara det.

**Förväntat resultat:**

- Förslaget bevarar namn och beskrivning efter omladdning och omstart.
  Samma användare kan fortsätta i den andra webbläsarprofilen.
- Sparandet ger ett lyckat kvitto och tömmer utkastet. Det sparade
  objektet hittas genom sökning.
- Namnändringen visar Lo Exempel som underlag och Lo Lind som förslag.
  Kastande behåller det sparade namnet Lo Exempel.
- Borttagningen framgår av utkastet. Efter sparandet finns Lo Exempel
  inte längre i objektlistan.

### KARTA-07: spara separata familjeobjekt och ett riktat samband tillsammans

**Syfte:** Kontrollera att tjänst, konto, abonnemang och övriga objekt
behåller separata identiteter när hela utkastet sparas.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tom karta och tomt utkast. Tillgång till att starta om
testinstallationen med samma databas.

**Integrationstest:** [family.spec.ts](../../tests/integration/family.spec.ts),
följande testfall:

- “KARTA-07: family objects and directed relationships save together and
  keep their identities”.
- “KARTA-07: a concurrent duplicate refreshes the saved relationship and
  allows explicit editing”.

**Steg:**

1. Lägg följande åtta separata objekt i utkastet: tjänsten **Molnmusik**,
   tjänstekontot **Familjens konto**, abonnemanget **Familjemusik**,
   personen **Lo**, e-postadressen `familj@example.test`, kortet
   **Familjekort**, bankkontot **Hushållskonto** och företaget **Moln AB**.
2. Skapa sambandet
   **Familjemusik → Gäller tjänstekontot → Familjens konto**.
3. Försök lägga till exakt samma samband igen. Granska hela utkastet och
   kontrollera att det fortfarande bara innehåller ett samband.
4. Spara hela utkastet. Starta om applikationen med samma databas,
   öppna kartan och granska objekten och sambandet.

**Förväntat resultat:**

- Utkastet innehåller åtta separata objekt och ett samband. Det upprepade
  tillägget skapar ingen dubblett.
- Efter sparande och omstart finns samma åtta objekt och ett samband.
  Sambandet går från abonnemanget till tjänstekontot och behåller sin typ.
- Integrationstestet kontrollerar dessutom att sparandet och historiken
  bevarar samma ändringsgrupp och objektens identiteter.

**Samtidig dubblett:** Förbered ett separat provhushåll med demodata enligt
[DEMO-01](operations.md). Alex är administratör och Robin medlem i en
separat profil. Kasta Alex tidigare privata utkast genom **Visa utkastet →
Kasta hela utkastet** och den uttryckliga bekräftelsen. Bevara sparade fakta.

1. Som Alex, öppna **Tabell → Samband för Kim Exempel → Nytt samband**.
   Välj **Från objekt: Kim Exempel**, typen **Använder** och
   **Till objekt: Molnmusik**. Behåll formuläret öppet utan att skicka.
2. Som Robin, öppna samma vanliga sambandsformulär och lägg det identiska
   kända sambandet i Robins utkast. Spara uttryckligen genom **Visa
   utkastet → Spara hela utkastet** och invänta bekräftat sparande.
3. Som Alex, välj **Lägg i utkastet**. Läs **Sambandet finns redan**,
   meningen **Kim Exempel använder Molnmusik** och det befintliga
   sambandet **Kim Exempel → Använder → Molnmusik**. Ingen dubblett ska
   ligga i Alex utkast och kartan ska innehålla exakt ett sådant samband.
4. Välj **Redigera befintligt samband**. Bekräfta den verkliga förlusten
   av det oskickade tillägget med **Kasta ändringarna och fortsätt**.
   Formuläret visar **Redigera samband** för det befintliga sambandet.
   Att öppna redigeringen ska inte ändra det sparade sambandet eller
   skapa något privat förslag. Automationen kontrollerar samma faktiska
   sambands-ID och hela oförändrade publika kartsvaret.

## Gemensamt objektformulär

För KARTA-10–20 används samma administratör och en separat installation.
Öppna formuläret från **Nytt objekt** eller tabellens **Redigera**.
Ingen AI-leverantör eller samtalsmedgivande behövs. För egna fält skapar
du typen genom **Inställningar → Typer och egna fält** före objektet.
Använd enbart påhittade värden och syntetiska bilder. Återställ utkastet
mellan fallen. KARTA-17–18 använder styrda nätfel; integrationstesterna
förbereder dessa i en isolerad installation med riktig SQLite.
Manuell kontroll av skärmläsare och verkligt skärmtangentbord redovisas
separat från automatiska fönster- och fokusprov.

### KARTA-10: skapa från tabellen och återgå till öppningsknappen

**Syfte:** Kontrollera skapa från tabellen och återgå till öppningsknappen.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tom karta och tomt utkast.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-10: create a complete object in the shared dialog and return
without saving”.

**Steg:**

1. Öppna Tabell och välj Nytt objekt. Kontrollera fokus på Namn och
   Grunduppgifter öppet.
2. Ange Alex blå cykel och Hela cykelns beskrivning. Välj Lägg i utkastet och
   stäng.

**Förväntat resultat:**

- Dialogen stängs och fokus återgår till Nytt objekt i tabellen. Ett komplett
  förslag finns i utkastet; den gemensamma kartan är fortfarande tom.

### KARTA-11: rätta fel i ett stängt avsnitt

**Syfte:** Kontrollera rätta fel i ett stängt avsnitt.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tomt utkast.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-11: closed-section errors preserve all fields and focus the
linked correction”.

**Steg:**

1. Ange namnet Cykeln. Öppna Ekonomiska uppgifter, välj Känt för Pris och lämna
   beloppet tomt.
2. Öppna Grunduppgifter och skicka. Följ länken till Pris i felsammanfattningen,
   fyll i 399 och skicka igen.

**Förväntat resultat:**

- Fokus går först till felsammanfattningen. Fellänken öppnar ekonomi och
  fokuserar Pris. Namnet finns kvar och ingen del läggs i utkastet före
  rättelsen.

### KARTA-12: behåll alla uppgifter i skapa och redigera

**Syfte:** Kontrollera behåll alla uppgifter i skapa och redigera.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Skapa typen Cykel med textfält, talfält, datumfält och
ja/nej-fält.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-12: identity, custom fields, lifecycle and icon stay together
when staging and editing”.

**Steg:**

1. Skapa Alex cykel med Ospecificerat objekt, beskrivning och värden i alla fyra
   egna fält.
2. Öppna Livscykel och utseende, välj Upphört och ikonen Cykel. Öppna
   Ekonomiska uppgifter, välj Känt för Slutdatum och ange datumet. Lägg hela
   formuläret i utkastet.
3. Öppna Tabell → Filter, välj Ta med upphörda och stäng filtret
   med Escape. Välj objektets Redigera och kontrollera uppgifterna igen.

**Förväntat resultat:**

- Identitet, beskrivning, samtliga egna värden, livscykel och ikon finns kvar.
  Grunduppgifter är öppet vid återöppning; kartan ändras först vid gemensamt
  sparande.

### KARTA-13: bekräfta egna fält som försvinner vid typbyte

**Syfte:** Kontrollera bekräfta egna fält som försvinner vid typbyte.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Ett objekt med typen Cykel, Ramnummer CYKEL-42 och en annan
valbar typ utan det fältet.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-13: changing type requires explicit confirmation before custom
values are lost”.

**Steg:**

1. Öppna objektets redigering och välj den andra typen. Kontrollera berörda
   fältnamn och värden samt fokus på Fortsätt redigera.
2. Tryck Escape och kontrollera typ och värden. Välj typen igen och Ta bort
   fältvärdena och byt typ.

**Förväntat resultat:**

- Escape behåller nuvarande typ och Ramnummer. Bekräftelsen tar bort egna värden
  endast ur formuläret; beskrivning och ekonomi behålls och utkastet ändras
  först efter hela tillägget.

### KARTA-14: lägg bild och uppgifter i utkastet tillsammans

**Syfte:** Kontrollera lägg bild och uppgifter i utkastet tillsammans.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** En syntetisk PNG-bild och en textfil med ändelsen .png.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-14: image and full form stage atomically and invalid image
preserves the unsent form”.

**Steg:**

1. Skapa ett objekt med namn och beskrivning. Välj den felaktiga bilden under
   Livscykel och utseende och skicka.
2. Kontrollera felet och värdena. Välj den giltiga bilden och skicka hela
   formuläret.

**Förväntat resultat:**

- Avvisningen lägger inga delar i utkastet. Den giltiga bilden, namnet och
  beskrivningen läggs där tillsammans; profilbilden kan läsas av den egna
  användaren utan gemensamt sparande.

### KARTA-15: skydda enbart oskickade formulärändringar

**Syfte:** Kontrollera skydda enbart oskickade formulärändringar.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Ett redan lagt förslag och ett nytt öppet objektformulär.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-15: close and Escape protect only unsent form changes and
restore the editing focus”.

**Steg:**

1. Skriv Oskickad cykel. Prova krysset, Avbryt och Escape; välj Fortsätt
   redigera eller Escape i varje förlustvarning.
2. Kontrollera tidigare fokus och text. Välj därefter Kasta ändringarna och
   fortsätt. Öppna Nytt objekt igen.

**Förväntat resultat:**

- Varje varning börjar på Fortsätt redigera. Avbruten förlust behåller text och
  fokus. Kastandet tar bara oskickad text; det lagda förslaget finns kvar och
  nästa nya formulär är tomt utan återupptagningsingång.

### KARTA-16: skydda oskickat arbete vid bakåtnavigation

**Syfte:** Kontrollera skydda oskickat arbete vid bakåtnavigation.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Besök hushållets Inställningar och återgå till kartan så
att webbläsarens Tillbaka leder till Inställningar.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-16: browser back protects unsent work and confirms
navigation”.

**Steg:**

1. Öppna Nytt objekt, skriv ett namn och använd webbläsarens Tillbaka.
2. Välj Fortsätt redigera. Prova Tillbaka igen och välj Kasta ändringarna och
   fortsätt.

**Förväntat resultat:**

- Första försöket behåller formulär och adress. Bekräftat kastande tillåter
  navigationen till Inställningar utan att skapa ett förslag. Dokumentnavigation
  och omladdning använder webbläsarens varning där den kan visas.

### KARTA-17: spärra väntande tillägg och behåll ett avvisat formulär

**Syfte:** Kontrollera spärra väntande tillägg och behåll ett avvisat formulär.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tomt utkast i en separat provinstallation. Kör följande
kod i webbläsarens konsol innan steg 1. Den fördröjer och avvisar endast nästa
tillägg utan att nå servern. Kör `window.releaseObjectStage()` i steg 2.
Ladda om efter fallet om du avbryter innan begäran har släppts fram.

```javascript
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const target = args[0] instanceof Request ? args[0].url : args[0];
    const method = args[1]?.method ?? args[0]?.method ?? 'GET';
    if (new URL(target, location.href).pathname.endsWith('/map/object-form')
        && method === 'POST') {
      window.fetch = originalFetch;
      await new Promise(resolve => { window.releaseObjectStage = resolve; });
      return new Response(JSON.stringify({ error: 'invalid_name' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    return originalFetch(...args);
  };
})();
```

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-17: pending staging blocks duplicate sends and known rejection
keeps all values”.

**Steg:**

1. Ange Väntande cykel och Bevarad beskrivning. Dubbelaktivera Lägg i utkastet
   och stäng. Prova Escape medan svaret väntar.
2. Släpp fram avvisningen. Kontrollera värdena och rätta orsaken före nytt
   försök.

**Förväntat resultat:**

- Bara en begäran skickas. Fält och vanlig stängning är spärrade medan den
  väntar. Avvisningen behåller samtliga värden och skapar inget förslag; efter
  rättelse kan exakt ett fullständigt förslag läggas i utkastet.

### KARTA-18: kontrollera tappat svar före övergång eller nytt försök

**Syfte:** Kontrollera kontrollera tappat svar före övergång eller nytt försök.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Tomt utkast i en separat provinstallation. Kör koden
nedan i konsolen före steg 1. Den första körningen använder
`const applied = true`: servern lägger till ändringen innan svaret tappas.
Ladda om och börja med nytt tomt utkast för andra körningen, och ändra till
`const applied = false`: begäran når då inte servern. Koden återställer
`fetch` efter avbrottet. Ladda om om du avbryter tidigare. Vanligt offlineläge
bevisar inte att servern redan har lagt ändringen i utkastet.

```javascript
(() => {
  const applied = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const target = args[0] instanceof Request ? args[0].url : args[0];
    const method = args[1]?.method ?? args[0]?.method ?? 'GET';
    if (new URL(target, location.href).pathname.endsWith('/map/object-form')
        && method === 'POST') {
      window.fetch = originalFetch;
      if (applied) await originalFetch(...args);
      throw new TypeError('Synthetic connection interrupted');
    }
    return originalFetch(...args);
  };
})();
```

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts).
Följande testfall:

- “KARTA-18: lost staging response is checked before confirmed relationship
  transition”.
- “KARTA-18: lost staging response is checked before safe retry”.

**Steg:**

1. Ange Cykeln efter tappat svar och välj Lägg i utkastet och öppna samband.
   Kontrollera spärrad redigering och stängning.
2. Välj Kontrollera om ändringen lades i utkastet. I körningen utan tillägg,
   invänta uttrycklig bekräftelse och försök därefter igen.

**Förväntat resultat:**

- Ingen dubblett skickas vid oklart utfall. Ett bekräftat tillägg öppnar
  sambandsdialogens rubrik; en bekräftad utebliven ändring tillåter nytt försök
  med värdena kvar. Stängning av samband återgår till ursprungsplatsen. Kartan
  är inte gemensamt sparad.

### KARTA-19: öppna samband utan ett onödigt förslag

**Syfte:** Kontrollera öppna samband utan ett onödigt förslag.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Spara Sparad cykel med Hela beskrivningen, Pris 249
och Valuta SEK (båda Känt).

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts),
testfallet “KARTA-19: unchanged edits open relationships without staging and
every reading entry uses the same object dialog”.

**Steg:**

1. Välj tabellens Redigera Sparad cykel. Ändra namnet och ändra tillbaka.
   Rensa och återställ ett redan uppgivet Pris i Ekonomiska uppgifter. Välj Lägg
   i utkastet och öppna samband.
2. Stäng samband. Expandera tabellraden och välj pennikonen
   Redigera Sparad cykel bland radens åtgärder. Avbryt utan ändring.

**Förväntat resultat:**

- Oförändrade uppgifter skapar inget förslag eller versionsbyte.
  Sambandsrubriken får fokus och stängning återför det till den ursprungliga
  redigeringsknappen. Pennikonen öppnar samma objektformulär och får
  tillbaka fokus när det stängs utan ändring.

### KARTA-20: bevara typens ordning och dolda värden

**Syfte:** Kontrollera bevara typens ordning och dolda värden.

**Användare:** Den konfigurerade administratören.

**Förutsättningar:** Skapa typen Avtal med avsnittet Avtalets uppgifter. Placera
Anteckning, Månadsbelopp och Avtalstext i den ordningen och dölj ett textfält
med ett befintligt värde.

**Integrationstest:**
[object-dialog.spec.ts](../../tests/integration/object-dialog.spec.ts).
Följande testfall:

- “KARTA-20: configured properties keep their order and hidden values in the
  single-section dialog at 1440px”.
- “KARTA-20: configured properties keep their order and hidden values in the
  single-section dialog at 320px”.

**Steg:**

1. Öppna ett sparat objekt av typen. Öppna Avtalets uppgifter och kontrollera
   fältnamn, ordning och värden.
2. Ändra Anteckning och lägg hela formuläret i utkastet. Upprepa på en smal
   skärm.

**Förväntat resultat:**

- Endast ett avsnitt är öppet. Typens benämningar och ordning används; det dolda
  värdet behålls oförändrat. Formulär och knappar ryms på smal skärm. Den
  gemensamma kartan behåller tidigare värden.
