# Manuella testfall för månadskostnad

Fallen provar installationens kostnadsöversikt, mätningarnas osäkerhet,
månadens antaganden och åtkomst. Anteckna commit, webbläsare och godkänt
eller underkänt resultat. De länkade integrationstesterna verifierar fallen;
manuell körning är stöd för felsökning och krävs inte i #97.

## Konfigurerade användare

- Alex Exempel är installationens konfigurerade driftansvarige och använder
  kontrollerad Google-inloggning.
- Robin Exempel använder kontrollerad Microsoft-inloggning i en separat
  webbläsarprofil. Alex ger Robin hushållets administratörsroll i KOST-03.
- Hushållets administratörsroll ger inte tillgång till kostnadsöversikten.

## Allmän förberedelse

1. Starta den [kontrollerade installationen](../development/manual-costs.md).
   Följ portkopplingen och använd exakt den utskrivna adressen. Inga verkliga
   leverantörskonton, modellnycklar eller mikrofoner behövs.
2. Starta en ny installation för varje fall. Behåll samma databas och
   webbläsarfönster inom ett falls omstartsprov.
3. KOST-01 och KOST-02 börjar med Google-inloggning som Alex. Skapa
   **Kostnadsprov**, godkänn textassistentens båda val och välj
   **Starta textassistenten**. KOST-03 börjar utan hushåll.
4. Terminalkommandon nedan skrivs i startguidens terminal. Avsluta varje
   fall med `quit` och kontrollera borttagen tillfällig katalog enligt guiden.

## Underlag och beständighet

### KOST-01: separata kostnader och månadens antaganden återläses efter omstart

**Syfte:** Förstå uppdelning, totalsumma, prisunderlag och sparade
månadsantaganden utan att förväxla uppskattning med faktura.

**Användare:** Alex.

**Förutsättningar:** Ny installation med standardläget `text known`.

**Integrationstest:**
[costs.spec.ts](../../tests/integration/costs.spec.ts),
“KOST-01: separata kostnader och månadens antaganden återläses efter omstart”.

**Steg:**

1. Välj **Starta röst**, vänta på **Lyssnar** och kör `delegate` i
   terminalen. Uppdraget går genom röstens verkliga Terra-arbete. Vänta på
   **Det kontrollerade kostnadsprovet är klart.**
2. Kör `usage 90` och välj
   **Stäng av rösten**. Vänta på avstängd röst.
3. Öppna **Månadskostnad**. Kontrollera aktuell månad i UTC, Render
   **72,50 SEK (7,25 USD)**, Live **0,75 SEK (0,075 USD)** och Terra
   **2,29 SEK (0,229 USD)**. Live visar 90 rapporterade sekunder.
   Terra visar 100 000 indatatoken med cache och resonemang separat.
4. Kräv delsumman **75,54 SEK (7,554 USD)**. Läs att Render avser hel
   månad, tidigare förbrukning är okänd och cirka 200 kronor är ett
   riktmärke utan automatisk spärr.
5. Öppna modellpriserna under **Prisunderlag**. Kontrollera datum,
   enheter, tabell, källor och uttryckligt antagande om 10 SEK per USD.
   Startkrediten för Live ska inte läggas på en gång till.
6. Öppna **Ändra månadens antaganden**, ändra **SEK per USD** till 11
   och välj **Spara månadens antaganden**. Kräv **83,09 SEK (7,554 USD)**.
7. Välj föregående månad. Dess förval är fortfarande 10 SEK per USD och
   tidigare förbrukning är okänd. Återgå till aktuell månad; den har 11.
8. Kör `restart`, ladda om webbläsaren och kontrollera samma uppdelning,
   ändrade valutantagande och delsumman **83,09 SEK (7,554 USD)**.

**Förväntat resultat:**

- Render, Live och Terra hålls isär. Cache ersätter motsvarande vanlig
  indata och resonemang läggs inte till utdata igen.
- Månadsantagandet och mätningarna består efter omstart. En ändring av
  aktuell månad ändrar inte föregående månads antagande.
- Ofullständig täckning framgår även när alla registrerade försök har
  slutvärden. Uppskattningen är ingen slutlig leverantörsfaktura.

### KOST-02: saknade slutvärden och hämtningsfel bevarar känt underlag utan dubbelräkning

**Syfte:** Visa okänd förbrukning och bevara tidigare kända värden vid fel.

**Användare:** Alex.

**Förutsättningar:** Ny installation. Kör `text missing` före meddelandet.

**Integrationstest:**
[costs.spec.ts](../../tests/integration/costs.spec.ts),
“KOST-02: saknade slutvärden och hämtningsfel bevarar känt underlag utan dubbelräkning”.

**Steg:**

1. Skicka **Prova kostnadsunderlaget.** och vänta på det kontrollerade svaret.
2. Starta rösten och vänta på **Lyssnar**. Kör `usage 12`, `usage 15`,
   `usage 15` och `finalize off`, en rad i taget. Stäng rösten och vänta
   på avstängd status.
3. Öppna **Månadskostnad**. Live ska visa ett försök, 15 rapporterade
   sekunder, osäkert slutunderlag och **0,13 SEK (0,0125 USD)**.
   Terra ska visa **Belopp saknas** och saknade mätvärden.
4. Läs texten om ofullständig delsumma. Anteckna delsumman. Kör
   `restart` och ladda om; kräv samma kända underlag och osäkerhet.
5. Följ guidens [kontrollerade hämtningsfel](../development/manual-costs.md#a-failed-refresh-without-losing-the-last-values).
   Välj **Uppdatera underlaget**. Kräv synligt fel och inaktuella tidigare
   värden med samma delsumma. Ta bort blockeringen och uppdatera igen.

**Förväntat resultat:**

- Kumulativa 12, 15 och 15 sekunder är 15, inte 42 eller tre försök.
- Saknad slutmätning och helt saknade värden förblir osäkra efter omstart.
  Okänt belopp presenteras inte som säker nollkostnad.
- Ett hämtningsfel bevarar kända värden med synlig felstatus. Återhämtning
  tar bort felstatus utan extra registrerad förbrukning.

## Åtkomst

### KOST-03: endast driftansvarig har åtkomst oberoende av hushållets roller

**Syfte:** Skilja installationens kostnadsbehörighet från hushållstillgång.

**Användare:** Alex och Robin i skilda webbläsarprofiler.

**Förutsättningar:** Ny installation utan hushåll. Följ guidens
[två identiteter](../development/manual-costs.md#two-identities).

**Integrationstest:**
[costs.spec.ts](../../tests/integration/costs.spec.ts),
“KOST-03: endast driftansvarig har åtkomst oberoende av hushållets roller”.

**Steg:**

1. Logga in som Alex. Öppna **Månadskostnad** redan före hushållets start.
   Kontrollera att Render-underlaget visas.
2. Återgå och skapa Kostnadsprov. Kör `identity robin`. Logga in som
   Robin med Microsoft i den andra profilen. Kopiera Robins användar-ID.
3. Bjud in Robin från Alex medlemskapssida. Acceptera som Robin och ge
   sedan Robin administratörsrollen som Alex.
4. Robin ska sakna länken **Månadskostnad**. Skriv `/costs` efter
   installationens adress i Robins profil; inga kostnadsuppgifter visas.
5. Öppna kostnadsöversikten som Alex. Återkalla Alex hushållstillgång
   som Robin på medlemskapssidan. Ladda om Alex kostnadssida;
   kostnadsunderlaget är fortfarande åtkomligt.
6. Öppna en extra flik i Alex profil och logga ut där. Återgå till
   kostnadsfliken och välj **Uppdatera underlaget**, om den fortfarande
   visas. Skyddade belopp och kostnadslänken ska försvinna.

**Förväntat resultat:**

- Driftansvarig når kostnader utan hushåll, även efter återkallat medlemskap.
- Hushållets administratör får inte läsa eller ändra installationens
  kostnader. Automationen provar även nekade direkta HTTP-begäranden.
- Utloggning tömmer skyddat underlag; inaktuella belopp behålls bara vid
  vanliga anslutningsfel, aldrig efter förlorad åtkomst.
