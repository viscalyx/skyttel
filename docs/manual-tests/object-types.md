# Manuella testfall för objekttyper och egna fält

Testfallen hjälper den som provar Skyttel att kontrollera gemensamma
definitioner, privata förslag, frivilliga fält och samtidiga ändringar.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex är administratör i testhushållet och loggar in med Google.
- Lo är vanlig medlem i samma hushåll och använder en annan webbläsarprofil.
  Alex bjuder in Lo enligt [tillgångsguiden](../users/access.md).
- Använd endast påhittade uppgifter. Alla prov gäller en separat
  testinstallation med riktig SQLite, aldrig ett verkligt hushåll.

## Allmän förberedelse

1. Starta appen enligt [testguiden](../development/testing.md).
   Börja varje fall i ett nytt testhushåll utan privata förslag.
2. Ha båda profilerna öppna när fallet använder två medlemmar. Använd
   [typguiden](../users/object-types.md) för att hitta formulären.
3. Vid kontroll av publika HTTP-svar, använd webbläsarens nätverkspanel
   för den egna inloggade profilen. Kartan läses på
   `/api/households/<hushållets id>/map`, historiken på samma adress med
   `/history`. Hushållets ID finns i kartans vanliga nätverksbegäran.
   Skriv inte inloggningsuppgifter eller testinnehåll i offentliga rapporter.

## Definitioner och fält

### TYP-01: Definition och objekt sparas tillsammans med beständigt kvitto

**Syfte:** Kontrollera samma utkast, sparande och historik för typ och objekt.

**Användare:** Alex.

**Förutsättningar:** Typen Solcellsanläggning saknas.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts),
testfallet “TYP-01: custom definitions and four optional fields share one
durable save and history”.

**Steg:**

1. Skapa Solcellsanläggning med beskrivningen Hushållets elproduktion.
   Lägg till Leverantör som text, Effekt som tal, Installationsdatum som
   datum och Batteri som ja/nej. Lägg definitionen i utkastet.
2. Skapa Paneler på taket av den nya typen. Ange Exempelsol, `12.5` och
   `2026-09-01`. Lämna Batteri obesvarat. Lägg objektet i utkastet.
3. Starta om testinstallationen och ladda om sidan. Kontrollera förslagen.
   Läs kartans HTTP-svar: typen och objektet finns bara i det egna utkastet.
4. Spara hela utkastet och läs kvittot från sparbegärans svar. Kontrollera
   definition, fält, objekt, sparande användare och tidpunkt.
5. Starta om igen och läs kartan samt historiken genom publika HTTP-anrop.
   Återförsök samma sparbegäran med samma operations-ID och utkastversion.

**Förväntat resultat:**

- Definitionen och objektet återkommer i utkastet efter omstart och blir
  gemensamma först vid samma sparande.
- Batteri är obesvarat även i den sparade kartan. Historiken innehåller
  samma kvitto och definition som sparandet. Återförsöket ger samma kvitto.

### TYP-02: Fyra frivilliga fält kan lämnas öppna, fyllas i och rättas

**Syfte:** Skilja obesvarat från nej genom formulär, utkast och omladdning.

**Användare:** Alex.

**Förutsättningar:** Solcellsanläggning och Paneler på taket saknas.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts),
testfallet “TYP-02: forms create, review and correct optional custom fields
without confusing unanswered and no”.

**Steg:**

1. Skapa samma typ och fyra fält som i TYP-01. Skapa Paneler på taket men
   lämna alla fälten obesvarade. Lägg båda förslagen i utkastet.
2. Ladda om och öppna objektet. Kontrollera tomma text-, tal- och datumfält
   samt **Obesvarat** för Batteri. Stäng formuläret och spara hela utkastet.
3. Ladda om. Ange Exempelsol, `12.5`, `2026-09-01` och **Nej**.
   Lägg i utkastet och kontrollera **Batteri: Nej**. Spara och ladda om.
4. Rätta till Ny leverantör, `-14.25`, `2026-09-02` och **Ja**. Granska, spara
   och ladda om igen. Öppna objektets detaljer.

**Förväntat resultat:**

- Alla fält kan sparas obesvarade. Obesvarat är skilt från nej.
- Värden och rättelser finns kvar genom sparande och omladdning.
- Definition och objekt granskas tillsammans före första sparandet.

### TYP-03: Medlemmar delar typer och kan rätta använda definitioner

**Syfte:** Kontrollera delning, privata förslag och redigerbara förifyllda typer.

**Användare:** Alex och Lo.

**Förutsättningar:** Lo är vanlig medlem. Inga privata förslag finns.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts),
testfallet “TYP-03: members share editable definitions while private proposals
and used field kinds stay protected”.

**Steg:**

1. Lo skapar Solcellsanläggning med textfältet Anteckning och lägger typen
   i sitt utkast. Alex laddar om och kontrollerar att typen inte visas.
   Lo sparar definitionen. Alex laddar om och väljer typen för Paneler.
2. Alex anger Privat värde i Anteckning och lägger objektet i utkastet.
   Lo försöker ändra Anteckning till tal och lägger typförslaget i utkastet.
3. Kontrollera det begripliga felet. Lo behåller text som värdeslag,
   ändrar typens namn till Solkraft, fältnamnet till Kommentar och båda
   beskrivningarna. Lo lägger också till ett nytt talfält som heter
   Anteckning och sparar definitionen.
4. Alex försöker spara sitt äldre utkast. Hämta aktuellt underlag och
   välj **Behåll mitt förslag** för objektet. Granska Kommentar och
   Privat värde innan ett nytt sparande.
5. Lo skapar Medlemmens paneler av typen Solkraft och fyller i Kommentar.
   Spara objektet. Skapa dessutom Lo av typen Person och spara.
6. Lo ändrar namn och beskrivning på den använda typen Person till
   Människa och En person i kartan. Spara, ladda om och öppna Nytt objekt.

**Förväntat resultat:**

- En privat typ avslöjas inte eller används av en annan medlem.
- En använd fälttyp ändras inte. Ett nytt fält med liknande namn får eget
  värde; Kommentar behåller Privat värde utan automatisk koppling.
- Vanliga medlemmar kan använda gemensamma fält och rätta förifyllda typer.
  Formulären visar de aktuella namnen efter sparande och omladdning.

### TYP-04: Samtidiga definitionsändringar kräver ett nytt konfliktval

**Syfte:** Stoppa hela utkastet och bevara tidigare definition i historiken.

**Användare:** Alex och Lo.

**Förutsättningar:** Båda ser den förifyllda typen Person.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts),
testfallet “TYP-04: concurrent definition changes reject the whole draft
until an explicit current choice”.

**Steg:**

1. Alex ändrar Person till Människor med beskrivningen Mitt förslag och
   lägger definitionen i utkastet. Skapa Alex av typen Människor i samma utkast.
2. Lo ändrar Person till Personer med beskrivningen Annans rättelse och
   sparar hela sitt utkast.
3. Alex försöker spara, hämtar aktuellt underlag och granskar konflikten.
   Kontrollera att inga objekt sparas och att det egna utkastet finns kvar.
4. Välj **Behåll min typdefinition**. Kontrollera att inget sparas förrän
   Alex uttryckligen väljer **Spara hela utkastet** igen.
5. Starta om och läs historiken via den publika HTTP-adressen.

**Förväntat resultat:**

- Den aktuella definitionen och förslaget visas tillsammans vid konflikten.
- Senaste sparandet omfattar definitionen Människor och objektet Alex.
  Historiken bevarar Personer med Annans rättelse som tidigare definition.

### TYP-05: Felaktiga värden och ny användning stoppar hela sparandet

**Syfte:** Kontrollera värdevalidering och ny användning mellan förslag och spara.

**Användare:** Alex och Lo.

**Förutsättningar:** Solkraft är sparad med Effekt som tal och Datum som
datum. Inga objekt använder fälten.

**Integrationstest:**
[object-types.spec.ts](../../tests/integration/object-types.spec.ts),
testfallet “TYP-05: invalid values and newly used field kinds preserve the
entire draft and map”.

**Steg:**

1. Alex föreslår att det oanvända Effekt blir text. Lägg också ett
   oberoende nytt Person-objekt i samma utkast.
2. Skapa ett förslag av typen Solkraft. Prova ett ogiltigt datum.
   För kontroll av serversidan: kopiera objektets vanliga förslagsbegäran
   från nätverkspanelen, ändra Datum till `2026-02-30` och skicka igen.
   Kontrollera HTTP 400 och att tidigare utkast är oförändrat.
3. Lo lägger ett nytt objekt med Effekt `12` i sitt privata utkast utan
   att spara. Alex försöker nu spara hela sitt utkast.
4. Kontrollera felet, kartan, det egna utkastet och historikens HTTP-svar.

**Förväntat resultat:**

- Felaktigt datum ändrar inget i kartan eller utkastet.
- Ny privat användning hindrar byte av värdeslag även vid sparandet.
  Felet säger att ett nytt fält behövs utan att avslöja Los privata innehåll.
- Ingen del sparas, inte heller Person-objektet. Tidigare fältdefinition,
  hela utkastet och historiken är oförändrade.
