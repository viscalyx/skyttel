# Manuella testfall för ändringshistorik

Fallen omfattar Rapporter, fullständiga historiska uppgifter, direktlänkar
och återgång till pågående arbete. Anteckna commit, webbläsare och godkänt
eller underkänt resultat. Historiken erbjuder läsning av genomförda sparanden.

## Konfigurerade användare

Alex Exempel har tillgång till ett separat provhushåll. Logga in med den
syntetiska inloggningen enligt [utvecklingsguiden](../development/devcontainer.md).
Använd inga verkliga personuppgifter.

## Allmän förberedelse

1. Starta den isolerade provinstallationen enligt utvecklingsguiden.
2. Skapa personen **Lo Exempel**, lägg förslaget i utkastet och spara.
   Byt därefter namnet till **Lo Lind** och spara separat.
3. Återställ provhushållet mellan fallen. Behåll databasen när ett steg
   uttryckligen kräver omladdning eller omstart.

## Historik och bevarat arbete

### HISTORIK-01: läs sparanden senaste först och återgå till tabellens arbete

**Syfte:** Läsa gemensamma sparanden utan att ändra det egna utkastet,
tabellens sökning eller fokus.

**Användare:** Alex Exempel.

**Förutsättningar:** Två sparanden enligt förberedelsen. Lägg dessutom
**Privat person** i utkastet utan att spara.

**Integrationstest:**
[history.spec.ts](../../tests/integration/history.spec.ts), testfallet
“HISTORIK-01: Reports preserves table work and lists only completed saves latest
first”.

**Steg:**

1. Välj **Tabell**, skriv **Lo Lind** i **Sök objekt i tabellen**.
2. Välj **Rapporter**. Läs den första fliken **Ändringshistorik**.
3. Kontrollera kortens ordning, person, tidpunkt och sammanfattning.
   Öppna **Visa ändringarna** på namnbytets kort och läs före och efter.
4. Välj **Tillbaka till arbetet**. Kontrollera sökning, fokus och utkast.

**Förväntat resultat:**

- Namnbytet kommer före tillägget. Kortet visar Alex, tidpunkt,
  sammanfattning samt Lo Exempel före och Lo Lind efter.
- Privat person förekommer inte i gemensam historik.
- Sökningen och utkastet är oförändrade. Fokus återgår till tabellens
  sökfält. Ingen åtgärd startar ett samtal eller begär medgivande.

### HISTORIK-06: läs fullständiga historiska värden med tangentbord

**Syfte:** Läsa sparandets fullständiga värden på dator och telefon.

**Användare:** Alex Exempel.

**Förutsättningar:** Skapa och spara **Familjeabonnemang** med beskrivningen
**Hushållets musik** och osäkert uppgiven skuld **1 200 SEK**, daterad
**2026-06-01**. Byt namnet till **Musik för familjen** och spara separat.
Prova vid 1280, 390 och 320 pixlars bredd samt verklig zoom på 200 och
400 procent. Registrera manuella zoomresultat separat.

**Integrationstest:**
[history.spec.ts](../../tests/integration/history.spec.ts), testfallen
“HISTORIK-06: Reports exposes complete historical values with keyboard at
1280px”,
“HISTORIK-06: Reports exposes complete historical values with keyboard at 390px”
och “HISTORIK-06: Reports exposes complete historical values with keyboard at
320px”.

**Steg:**

1. Välj **Rapporter**. Hitta namnbytets kort först.
2. Fokusera **Visa ändringarna** och tryck Enter.
3. Läs båda namnen, beskrivningen, skulden, dess osäkerhet och datum.
4. Kontrollera tangentbordsåtkomst, synligt fokus och textens omflöde.

**Förväntat resultat:**

- Fullständiga värden går att läsa utan kartgrafik, ljud eller samtal.
- Uppgifterna skiljer belopp, osäkerhet och datum åt. Texten är läsbar
  vid smal bredd utan vågrät rullning av hela sidan.
- Historiken erbjuder ingen knapp för att ångra sparandet.

### HISTORIK-07: återförsök bevarar ett senare fokusval

**Syfte:** Återhämta en misslyckad historikhämtning utan påhittade resultat
eller flytt av användarens senare fokusval.

**Användare:** Alex Exempel.

**Förutsättningar:** Ett genomfört sparande. En testproxy kan avbryta
nästa historikhämtning och fördröja nästa svar.

**Integrationstest:**
[history.spec.ts](../../tests/integration/history.spec.ts), testfallet
“HISTORIK-07: failed and delayed Reports reads preserve newer focus and retry
real saves”.

**Steg:**

1. Avbryt nästa historikhämtning och välj **Rapporter**. Läs felet.
2. Fördröj nästa svar och välj **Hämta historik igen**.
3. Kontrollera fokus på historikens rubrik. Fokusera därefter
   **Tillbaka till arbetet** utan att aktivera knappen.
4. Släpp fram svaret. Läs det verkliga sparandets kort och kontrollera fokus.

**Förväntat resultat:**

- Felet erbjuder återförsök. Det lyckade svaret ersätter felet med
  ett verkligt sparande.
- Fokus stannar på det senare valda reglaget när svaret kommer.

## Direkt åtkomst och historiska typer

### HISTORIK-10: öppna ett utpekat sparande efter ändrad typdefinition

**Syfte:** Läsa rätt historisk benämning genom en direktlänk.

**Användare:** Alex Exempel.

**Förutsättningar:** Lo Exempel är sparat. Ändra personens typbenämning
till **Dagens personbenämning** och spara definitionen separat.

**Integrationstest:**
[history.spec.ts](../../tests/integration/history.spec.ts), testfallet
“HISTORIK-10: a direct save link reads historical types after their definitions
change”.

**Steg:**

1. Öppna **Rapporter**. Kopiera **Länk till sparandet** på kortet som
   lägger till Lo Exempel.
2. Öppna länken i en ny flik med samma inloggning och utan aktivt samtal.
3. Kontrollera fokus och öppnade före/efter-detaljer.
4. Läs objektets typbenämning och jämför den med dagens definition.

**Förväntat resultat:**

- Länken öppnar rätt sparande med detaljer och fokus på kortets rubrik.
- Kortet använder typdefinitionen från sparandet, även om dagens
  benämning är ändrad. Ingen AI eller medgivanderuta krävs.

### HISTORIK-11: privata väntande och avvisade sparförsök saknas i historiken

**Syfte:** Skilja privata sparförsök från genomförda gemensamma sparanden.

**Användare:** Alex Exempel i två webbläsarprofiler med samma inloggning.

**Förutsättningar:** Ett genomfört sparande och ett osparat objektförslag.
En testproxy kan hålla nästa sparbegäran innan den når servern.

**Integrationstest:**
[history.spec.ts](../../tests/integration/history.spec.ts), testfallet
“HISTORIK-11: private rejected and pending save attempts never enter shared
Reports”.

**Steg:**

1. Öppna samma utkast i båda profilerna. Ändra förslaget i den andra
   profilen. Försök spara första profilens äldre underlag och läs avslaget.
2. Hämta aktuellt underlag. Håll nästa sparbegäran med testproxyn och
   påbörja sparandet, så att det väntande försöket finns kvar.
3. Välj **Rapporter** och läs gemensam historik. Kontrollera det verkliga
   sparandet, det osparade förslaget och de båda privata försöken.
4. Avsluta provinstallationen; använd en ny isolerad databas för nästa fall.

**Förväntat resultat:**

- Historiken visar bara det genomförda sparandet. Väntande och avvisade
  försök samt det osparade objektet är inte historikposter.
- Historikläsningen ändrar varken karta, utkast eller sparförsök.

## Avvecklade fall

HISTORIK-02–05 och HISTORIK-08–09 är avvecklade med historisk ångring.
Deras identiteter återanvänds inte.
