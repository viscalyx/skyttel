# Manuella testfall för borttagning av typer och fält

Prova granskad katalogborttagning, användningsspärrar utan privat
informationsläckage och återställning av innehåll med saknade definitioner.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex Exempel är administratör i provhushållet Linden.
- Robin Exempel är vanlig medlem i samma hushåll och använder en separat
  webbläsarprofil. Båda loggar in med provmiljöns konfigurerade inloggning.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Använd en isolerad provinstallation med påhittade uppgifter. Skapa
   hushållet som Alex och bjud in Robin.
2. Börja varje fall med ett tomt hushåll och utan privata utkast.
   Återställ endast provmiljön mellan fallen. Bevara databasen vid omstart
   inom ett fall.

## Borttagning och återställning

### KATALOG-01: granska, kasta och spara oanvända definitioner

**Syfte:** Egna och förifyllda definitioner kan tas bort uttryckligen;
oanvända definitioner städas inte bort automatiskt.

**Användare:** Alex.

**Förutsättningar:** Lägg till textfältet Serienummer på Person. Skapa
objekttypen Solcellsanläggning utan fält. Spara definitionerna utan objekt.
Behåll den förifyllda sambandstypen Använder oanvänd.

**Integrationstest:**
[definition-removal.spec.ts](../../tests/integration/definition-removal.spec.ts),
testfallet “KATALOG-01: unused fields and custom and prefilled types are
reviewed, discarded or saved without automatic cleanup”.

**Steg:**

1. Öppna **Objekttyper och egna fält**, ändra Person och välj **Ta bort
   fält: Serienummer**. Lägg typförslaget i utkastet.
2. Ändra Solcellsanläggning och välj **Ta bort objekttypen**.
3. Öppna **Sambandstyper och riktning**, ändra Använder och välj **Ta bort
   sambandstypen**. Granska alla tidigare definitioner och förslag.
4. Välj **Kasta hela utkastet**. Kontrollera att definitionerna finns kvar.
5. Upprepa borttagningarna och välj **Spara hela utkastet**. Starta om
   appservern med samma databas, ladda om och läs katalogerna och historiken.
   Välj **Visa ändringarna** vid borttagningen för att läsa definitionerna.

**Förväntat resultat:**

- Granskningen visar fältets tidigare betydelse och båda typborttagningarna.
  Inget ändras gemensamt innan sparandet. Kastning behåller definitionerna.
- Sparandet tar bort just det valda fältet och de två valda typerna.
  Andra oanvända typer finns kvar och historiken visar borttagningarna.
- Resultatet finns kvar efter omstart.

### KATALOG-02: hindra borttagning vid privat och upphörd användning

**Syfte:** Användning spärrar borttagning utan att andras privata uppgifter
avslöjas eller något användande innehåll tas bort automatiskt.

**Användare:** Alex och Robin.

**Förutsättningar:** Alex lägger textfältet Serienummer på Person och sparar
objektet Garaget med en annan typ. Robin lägger personen Privat provnamn,
med Serienummer PRIVAT-PROVVÄRDE, i sitt privata utkast. Robin föreslår
också sambandet Använder från personen till garaget. Båda är Upphört.

**Integrationstest:**
[definition-removal.spec.ts](../../tests/integration/definition-removal.spec.ts),
testfallet “KATALOG-02: private drafts and ended content block removal
with a useful explanation and no private disclosure”.

**Steg:**

1. Starta om appservern med samma databas. Som Alex, försök ta bort Person.
   Läs felbeskedet.
2. Försök ta bort fältet Serienummer och lägga typförslaget i utkastet.
   Läs felbeskedet och stäng formuläret utan att skicka.
3. Försök ta bort sambandstypen Använder. Kontrollera beskedet om samband
   och deras ändpunkter. Kontrollera att Robins privata uppgifter saknas
   i Alex karta och i felbeskeden.
4. Som Robin, spara hela utkastet. Som Alex, ladda om och upprepa alla
   tre borttagningsförsöken för det nu sparade upphörda innehållet.

**Förväntat resultat:**

- Borttagningarna stoppas både före och efter Robins sparande.
- Beskeden anger att objekt eller samband behöver tas bort eller byta typ,
  att ändpunkterna kan finnas kvar och att fältvärden behöver hanteras.
- Felbeskeden avslöjar varken Privat provnamn eller PRIVAT-PROVVÄRDE.
  Kartan och bådas utkast förblir oförändrade av de nekade försöken.

### KATALOG-03: läs borttagna definitioner utan att ändra eget arbete

**Syfte:** Läsa historiska definitioner när de saknas i dagens katalog.

**Användare:** Alex.

**Förutsättningar:** Spara Lo Exempel som Person, Garaget som en annan typ
och sambandet Lo Exempel Använder Garaget. Ta bort Lo och sambandet och
spara. Ta sedan bort de oanvända typerna Person och Använder och spara.
Lägg ett oberoende objekt med en annan typ i utkastet utan att spara.

**Integrationstest:**
[definition-removal.spec.ts](../../tests/integration/definition-removal.spec.ts),
testfallet “KATALOG-03: history reads removed definitions and content without
changing independent work”.

**Steg:**

1. Välj **Rapporter** och hitta borttagningen av Lo och sambandet.
2. Välj **Visa ändringarna** och läs tidigare namn och typbetydelser.
3. Kontrollera att aktuell karta, katalog och eget utkast är oförändrade.
4. Starta om med samma databas och kontrollera samma värden och historik.

**Förväntat resultat:**

- Historiken beskriver tidigare innehåll även när typerna saknas i katalogen.
- Karta och katalog saknar fortfarande det borttagna innehållet. Garaget
  är oförändrat och det oberoende förslaget finns kvar i utkastet.
- Omstart bevarar dessa värden och den ursprungliga historikgruppen.
  Historikläsningen skapar inga återställningsförslag.
