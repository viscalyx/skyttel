# Manuella testfall för medlemskap och inbjudningar

Testfallen omfattar inbjudningar, delad administration och återkallad
tillgång till hushållets karta. De kontrollerar även att en återkallelse
bevarar gemensamt innehåll och att en ny inbjudan krävs för att återfå
tillgång. Anteckna commit, webbläsare och godkänt eller underkänt resultat
vid körning.

## Konfigurerade användare

Använd en separat testinstallation med påhittat hushåll och kontrollerade
Google- eller Microsoft-identiteter enligt
[installationsguiden](../operations/installation.md).

- **Alex** är hushållets administratör och loggar in i webbläsarprofil A.
- **Robin** loggar in med en annan identitet i webbläsarprofil B. Robin
  saknar tillgång tills ett testfall anger något annat.

Namnen är roller i testfallen. Använd profilernas faktiska visningsnamn
och Skyttel-användar-ID när du granskar listorna. En person i kartan med
namnet Robin ger ingen inloggning eller tillgång.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Skapa testhushållet som Alex. Logga in som Robin och kopiera
   **Ditt Skyttel-användar-ID** från sidan **Du har inte tillgång till
   hushållet**. Behåll separata profiler under hela körningen.
2. Återställ en separat testinstallation mellan testfallen. Om ett fall
   kräver medlemskap, använd flödet i
   [inbjudan av en användare](../user-guide/access.md#bjud-in-en-skyttel-användare).
   Behåll koder endast för det aktuella testfallet och dela dem privat.
3. MEDLEM-05 kräver en förberedd inbjudan vars sjudagarsfrist har gått ut.
   Skapa den minst sju dagar före körningen, anteckna koden privat och
   kontrollera att dess **Gäller till** har passerat. Ersätt eller
   återkalla inte inbjudan under väntetiden. Logga in på nytt vid körning.
4. När ett fall ber dig skapa en inbjudan, öppna **Administrera tillgång**
   och välj **Jag har personens användar-ID** för att visa ID-fältet.
   Vid en ny inbjudan efter kopieringssteget väljer du först
   **Klar med inbjudan**. En omladdning börjar också från första steget.
5. Välj **Medlemmar** eller **Inbjudningar** för den lista som steget
   anger. Bara en lista visas åt gången. Byte av lista behåller den
   aktuella koden och avslutar inte kopieringssteget.

## Bjuda in och ansluta

### MEDLEM-01: Acceptera en inbjudan med tangentbordet

**Syfte:** Kontrollera att en inbjuden Skyttel-användare blir medlem och
att administratören ser resultatet.

**Användare:** Alex som administratör och Robin utan tillgång.

**Förutsättningar:** Robin visar sitt eget Skyttel-användar-ID i profil B.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-01: an administrator invites an authenticated user who
joins by keyboard on a phone”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-01"
  },
  "reference": "Mottagare 320 × 568; ID-bunden inbjudan och tangentbordsacceptans",
  "outcomes": [
    "Rätt mottagare ansluter med tangentbord; rollen Medlem visas"
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj **Administrera tillgång** och **Jag har personens användar-ID**
   som Alex. Ange Robins ID i
   **Skyttel-användar-ID att bjuda in** och välj **Skapa inbjudan**.
2. Kopiera **Inbjudningskod att dela**. Välj **Inbjudningar** och
   kontrollera **Väntar på svar**.
3. Fokusera **Inbjudningskod** som Robin och skriv koden. Tryck Tab och
   kontrollera att **Acceptera inbjudan** får fokus. Tryck Enter.
4. Kontrollera hushållets namn och rollen **Medlem** som Robin. Ladda om
   Alex sida och granska **Medlemmar** och **Inbjudningar**.

**Förväntat resultat:**

- Robin kan acceptera med tangentbordet och öppna hushållet som medlem.
  **Administrera tillgång** visas inte för Robin.
- Alex ser Robin bland medlemmarna och inbjudan som **Accepterad**.
- Koden visas inte på Alex sida efter omladdning.

### MEDLEM-02: Felaktigt ID kan rättas och återkallad kod nekas

**Syfte:** Kontrollera återhämtning från ett okänt Skyttel-användar-ID
och att en återkallad inbjudan inte ger tillgång.

**Användare:** Alex som administratör och Robin utan tillgång.

**Förutsättningar:** Robins faktiska Skyttel-användar-ID är tillgängligt.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-02: invitation errors are recoverable and a revoked
code cannot grant access”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-02"
  },
  "reference": "Chromium 1280 × 720; isolerade testdata och angivna roller",
  "outcomes": [
    "Okänt ID kan rättas; återkallad kod ger ingen tillgång"
  ]
}
```

**Steg:**

1. Öppna **Administrera tillgång** och **Jag har personens användar-ID**
   som Alex. Skriv `unknown-user` i
   **Skyttel-användar-ID att bjuda in** och välj **Skapa inbjudan**.
2. Kontrollera felmeddelandet och ersätt värdet med Robins faktiska ID.
   Välj **Skapa inbjudan** och kopiera koden.
3. Välj **Inbjudningar**, **Återkalla inbjudan** och
   **Bekräfta återkallelse**.
4. Ange den kopierade koden som Robin och välj **Acceptera inbjudan**.

**Förväntat resultat:**

- Det okända ID:t ger **Skyttel-användaren finns inte**. Det går att
  rätta ID:t och skapa inbjudan utan att lämna sidan.
- Efter bekräftelsen visar inbjudan **Återkallad** och fältet med koden
  försvinner.
- Robin får **Inbjudan kan inte användas** och saknar fortfarande tillgång.
  Den inmatade koden finns kvar så att den kan kontrolleras eller ersättas.

### MEDLEM-04: Ersätt en kod och avbryt återkallelse

**Syfte:** Kontrollera att endast den senaste väntande inbjudan fungerar
och att **Avbryt** lämnar den nya inbjudan användbar.

**Användare:** Alex som administratör och Robin utan tillgång.

**Förutsättningar:** Ingen inbjudan till Robin är accepterad.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-04: replacing an invitation invalidates the old code
and cancellation keeps the new code usable”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-04"
  },
  "reference": "Chromium 1280 × 720; isolerade testdata och angivna roller",
  "outcomes": [
    "Äldre kod nekas; avbruten återkallelse behåller den nya användbar"
  ]
}
```

**Steg:**

1. Skapa en inbjudan till Robin som Alex och kopiera den första koden.
   Ladda om sidan. Kontrollera att koden försvinner men att inbjudan
   fortfarande visar **Väntar på svar**.
2. Skapa en ny inbjudan till samma ID och kopiera den nya koden. Granska
   båda raderna under **Inbjudningar**.
3. Välj **Återkalla inbjudan** för den väntande inbjudan. Kontrollera
   förklaringen att koden slutar fungera och välj **Avbryt**.
4. Försök acceptera den första koden som Robin. Kontrollera felet och
   att tillgång fortfarande saknas. Ersätt koden med den nya och acceptera.
5. Ladda om Alex sida och granska medlemmarna och inbjudningarna.

**Förväntat resultat:**

- Den nya koden skiljer sig från den första. Den första inbjudan visar
  **Återkallad**, den nya **Väntar på svar**.
- **Avbryt** stänger bekräftelsen. Den nya koden är fortfarande synlig
  och användbar.
- Den första koden nekas. Den nya öppnar hushållet och felmeddelandet
  försvinner.
- Alex ser Robin som medlem och den nya inbjudan som **Accepterad**.

### MEDLEM-05: Utgången inbjudan kräver en ny kod

**Syfte:** Kontrollera att en passerad giltighetstid visas och hindrar
anslutning, samt att en ny inbjudan kan användas.

**Användare:** Alex som administratör och Robin utan tillgång.

**Förutsättningar:** En oanvänd inbjudan till Robin har passerat
**Gäller till**, enligt den allmänna förberedelsen. Koden finns sparad.
Integrationstestet ordnar motsvarande datum i en separat testdatabas.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-05: an expired invitation is visibly unusable and a
fresh invitation restores the join flow”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-05"
  },
  "reference": "Chromium 1280 × 720; isolerade testdata och angivna roller",
  "outcomes": [
    "Utgången kod nekas; ny inbjudan öppnar samma hushåll"
  ]
}
```

**Steg:**

1. Öppna **Administrera tillgång** och välj **Inbjudningar** som Alex.
   Granska den gamla inbjudan.
2. Ange den gamla koden som Robin och välj **Acceptera inbjudan**.
3. Skapa en ny inbjudan till Robins ID som Alex. Kopiera den nya koden.
4. Ersätt den gamla koden som Robin med den nya och acceptera.
5. Ladda om Alex sida och kontrollera medlemmarna och inbjudningarna.

**Förväntat resultat:**

- Den gamla inbjudan visar **Utgången** utan knapp för återkallelse.
- Den gamla koden ger **Inbjudan kan inte användas**. Koden finns kvar i
  inmatningen och Robin saknar tillgång till hushållet.
- Den nya koden öppnar hushållet med rollen **Medlem**.
- Alex ser Robin bland medlemmarna och en **Accepterad** inbjudan.

### MEDLEM-07: Kontrollera tillgång före och efter förlorad acceptans

**Syfte:** Skilja en begäran som inte når servern från en accepterad
inbjudan vars svar förloras. Båda ska erbjuda kontroll av aktuell tillgång.

**Användare:** Alex som administratör och Robin utan tillgång.

**Förutsättningar:** Alex skapar en inbjudan till Robin och delar koden.
Använd Chromium eller Chrome med utvecklarverktyg i Robins profil.

**Separat förberedelse:**

1. Blockera `*/api/invitations/accept` i utvecklarverktygens panel
   **Network request blocking** före steg 1. Ta bort blockeringen i steg 3.
2. I steg 3 kör du följande i Robins konsol. Nästa riktiga acceptans
   når servern; hela svaret tas emot innan bara gränssnittets svar döljs.
   Skriptet återställer `fetch` efter den acceptansen. Använd bara en
   isolerad installation med påhittade uppgifter.

   ```javascript
   window.membershipOriginalFetch = window.fetch.bind(window);
   window.fetch = async (...args) => {
     const input = args[0];
     const url = new URL(input instanceof Request ? input.url : input,
       window.location.href);
     const method = args[1]?.method ??
       (input instanceof Request ? input.method : 'GET');
     const response = await window.membershipOriginalFetch(...args);
     if (url.pathname === '/api/invitations/accept' && method === 'POST') {
       await response.clone().arrayBuffer();
       window.fetch = window.membershipOriginalFetch;
       throw new TypeError('Synthetic acceptance response interrupted');
     }
     return response;
   };
   ```

3. Vid avbruten körning återställer du med
   `window.fetch = window.membershipOriginalFetch` eller laddar om sidan.
   Ta bort all nätverksblockering. Återställ testdatabasen inför nästa fall;
   en accepterad inbjudan är förbrukad.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
MEDLEM-07, båda leveransgränserna i samma återhämtningsflöde.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-07"
  },
  "reference": "Förlorad begäran följd av accepterad inbjudan med förlorat svar",
  "outcomes": [
    "Ej levererad acceptans ger ingen tillgång",
    "Kontroll återfinner serverns acceptans efter förlorat lyckat svar"
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Ange koden i **Inbjudningskod** och välj **Acceptera inbjudan** medan
   begäran är blockerad. Läs felet och kontrollera att koden finns kvar.
2. Välj **Kontrollera tillgång**. Kontrollera att sidan fortfarande visar
   **Du har inte tillgång till hushållet**.
3. Ta bort blockeringen och kör konsolskriptet enligt förberedelsen.
   Ange samma kod igen och välj **Acceptera inbjudan**.
4. Läs **Inbjudan kunde inte bekräftas** och välj **Kontrollera tillgång**
   innan den automatiska uppdateringen öppnar hushållet.

**Förväntat resultat:**

- Båda avbrotten ger **Inbjudan kunde inte bekräftas** och knappen
  **Kontrollera tillgång**. Koden bevaras före kontrollen.
- Kontrollen ger ingen tillgång när acceptansen inte når servern.
- När servern accepterar men svaret förloras öppnar kontrollen
  **Hushållet Linden** utan ny inbjudan eller upprepad acceptans.
  Vanligt offlineläge etablerar inte detta andra utfall.

## Roller och återkallad tillgång

### MEDLEM-03: Dela administration och återkalla tillgång

**Syfte:** Kontrollera att rolländringar och återkallelse gäller öppna
sidor och att användaren inte kan ändra sin egen roll genom gränssnittet.

**Användare:** Alex som administratör och Robin som medlem.

**Förutsättningar:** Robin är medlem genom en accepterad inbjudan.
Alex håller sidan **Administrera tillgång** öppen.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-03: administrators share responsibility and open clients
lose revoked access without disrupting input”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-03"
  },
  "reference": "Chromium 1280 × 720; isolerade testdata och angivna roller",
  "outcomes": [
    "Rolländring och återkallelse gäller öppna sidor utan förlorad inmatning"
  ]
}
```

**Steg:**

1. Välj **Gör till administratör** på Robins rad som Alex.
2. Välj **Jag har personens användar-ID**. Skriv `påbörjat-id` i
   **Skyttel-användar-ID att bjuda in** och behåll
   fokus där under nästa automatiska uppdatering av listorna.
3. Öppna **Administrera tillgång** som Robin. Kontrollera knapparna
   **Gör till medlem** och **Återkalla tillgång** på raden märkt **(du)**.
4. Välj **Gör till medlem** för Alex som Robin. Kontrollera Alex öppna
   sida och välj **Till startsidan** där.
5. Välj **Återkalla tillgång** för Alex som Robin. Läs bekräftelsen och
   välj **Avbryt**. Öppna bekräftelsen igen och välj
   **Bekräfta återkallelse**.
6. Kontrollera Alex öppna sida och Robins medlemslista.

**Förväntat resultat:**

- Robin blir administratör. Alex påbörjade text och fokus finns kvar
  vid automatisk uppdatering.
- Robins egna roll- och åtkomstknappar är synliga men inaktiva, både
  före och efter att Alex blir medlem.
- Alex ser **Du kan inte administrera hushållet** och ingen medlemslista
  efter rolländringen. Startsidan ger fortfarande tillgång till hushållet
  utan länken **Administrera tillgång**.
- Återkallelsen kräver bekräftelse och förklarar att personer och innehåll
  i kartan finns kvar. **Avbryt** stänger bekräftelsen.
- Efter bekräftad återkallelse ser Alex **Du har inte tillgång till
  hushållet**, och Alex försvinner från Robins medlemslista.

### MEDLEM-06: Bevara kartan vid återkallelse och bjud in på nytt

**Syfte:** Kontrollera att medlemskap och kartans innehåll är skilda och
att en accepterad kod inte kan återställa återkallad tillgång.

**Användare:** Alex som administratör och Robin som medlem.

**Förutsättningar:** Robin är medlem genom en accepterad inbjudan.
Behåll den accepterade koden för steg 4. Kartan saknar **Robin i kartan**.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-06: revocation preserves shared objects and only a
new invitation restores membership”.

```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-06"
  },
  "reference": "Chromium 1280 × 720; isolerade testdata och angivna roller",
  "outcomes": [
    "Gammal accepterad kod återställer inte åtkomst; ny kod bevarar kartan"
  ]
}
```

**Steg:**

1. Välj **Nytt objekt** som Robin. Ange **Robin i kartan** som
   **Namn**, välj **Lägg i utkastet och stäng** och öppna **Visa utkastet**.
   Välj **Spara hela utkastet**. Kontrollera **Utkastet är sparat**.
2. Öppna **Administrera tillgång** som Alex och försök skapa en inbjudan
   till Robins befintliga ID. Kontrollera felmeddelandet.
3. Välj **Återkalla tillgång** på Robins rad. Läs bekräftelsen och välj
   **Bekräfta återkallelse**. Kontrollera att Robin försvinner från listan.
4. Ladda om Robins sida och försök acceptera den tidigare accepterade
   koden. Kontrollera felet och att tillgång saknas.
5. Välj **Till hushållet** som Alex och sök efter **Robin i kartan**.
   Kontrollera att objektet finns kvar.
6. Skapa en ny inbjudan till Robins ID som Alex. Acceptera den nya koden
   som Robin och sök efter **Robin i kartan** igen.

**Förväntat resultat:**

- En befintlig medlem kan inte bjudas in igen. Alex ser **har redan
  tillgång till hushållet** och ingen ny kod.
- Återkallelsen tar bort medlemskapet. Den gamla koden nekas och kan
  inte återställa tillgången.
- Objektet som Robin sparar finns kvar och kan hittas av Alex efter
  återkallelsen.
- En ny kod ger Robin rollen **Medlem** igen, med tillgång till samma
  sparade objekt.

## Stegvis inbjudan och öppna arbetsytor

### MEDLEM-08: Kopiera en engångskod och återkalla en öppen arbetsyta

**Syfte:** Följ en stegvis inbjudan till faktisk acceptans och kontrollera
att återkallad tillgång stoppar mottagarens redan öppna, oskickade arbete.

**Användare:** Alex som administratör i profil A och Robin utan tillgång
i profil B. Använd bara påhittade uppgifter och en separat provinstallation.

**Förutsättningar:** Följ allmän förberedelse. Alex skapar **Bevarad cykel**
och sparar hela utkastet. Redigera sedan cykeln, skriv **Alex privata förslag**
i beskrivningen och lägg i utkastet utan att spara. Robin loggar in och
kopierar sitt faktiska **Ditt Skyttel-användar-ID** från sidan utan tillgång.
Tillåt webbläsarens urklipp vid kopieringen; ett nekat urklipp provas separat.

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-08: staged invitation copies its one-time code and
revocation retires an open recipient workspace”.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-08"
  },
  "reference": "Två klienter; stegvis kopiering och öppen återkallad redigering",
  "outcomes": [
    "Stegvis engångskod accepteras och rensas vid avslut",
    "Återkallelse avvecklar öppen redigering men bevarar eget utkast"
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Alex öppnar **Nytt objekt** och skriver **Alex oskickade arbete** utan
   att lägga texten i utkastet. Tryck Escape och välj **Fortsätt redigera**.
   Kontrollera texten och fokus i **Namn**. Tryck Escape igen och välj
   **Kasta ändringarna och fortsätt**. Öppna sedan
   **Inställningar → Administrera tillgång**. Huvudrubriken får fokus;
   det stängda formuläret finns inte kvar. Cykeln och utkastet är oförändrade.
2. Läs **Be om användar-ID** och förklaringen om att namn eller e-postadress
   inte säkert identifierar rätt Skyttel-användare. Fältet för mottagarens ID
   visas först när Alex väljer **Jag har personens användar-ID**.
3. Fyll i Robins faktiska ID, kontrollera det tillsammans och välj
   **Skapa inbjudan**. Läs mottagarens ID och uppgifterna om sju dagar,
   engångsanvändning och att koden bara visas nu.
4. Välj **Kopiera koden** och invänta **Koden är kopierad**. Kontrollera
   kopian genom att klistra in den i Robins **Inbjudningskod** utan att
   acceptera ännu. Dela inte provkoden i skärmbilder eller supportärenden.
5. Alex väljer vyn **Inbjudningar**. Kontrollera **Väntar på svar** och
   att medlemslistan är dold. Den aktuella koden finns fortfarande kvar;
   byte mellan listvyer avslutar inte inbjudans sista steg.
6. Välj **Klar med inbjudan**. Koden försvinner och det första steget visas
   igen. Det sparade objektet och Alex privata förslag är oförändrade.
7. Robin väljer **Acceptera inbjudan** med den kopierade koden och får
   hushållet med rollen **Medlem**. Öppna **Nytt objekt** och skriv
   **Robins oskickade arbete** utan att lägga det i utkastet. Behåll sidan öppen.
8. Alex inväntar **Accepterad**, väljer **Medlemmar** och kontrollerar att
   inbjudningslistan är dold. Kontrollera Robins namn och fullständiga ID.
   Välj **Återkalla tillgång**, läs att befintliga sessioner förlorar tillgång
   medan personer och kartinnehåll finns kvar. Kontrollera att hela varningstexten
   är läsbar i både ljust och mörkt systemtema. Återställ
   det tidigare temat och bekräfta återkallelsen.
9. Utan omladdning ska Robins sida inom tio sekunder visa
   **Du har inte tillgång till hushållet**. Det oskickade formuläret ska
   vara borta och Robin ska försvinna från Alex medlemslista.
10. Alex väljer **Tillbaka till kartan** och öppnar **Nytt objekt**.
    Namnfältet är tomt: den uttryckligen kastade texten återkommer inte.
    Stäng det oförändrade formuläret. Cykeln och dess privata förslag finns kvar.
11. Öppna **Administrera tillgång** igen och ladda om sidan. Den tidigare
    koden ska inte kunna hämtas; den stegvisa inbjudan börjar från första steget.

**Förväntat resultat:**

- En inbjudan följer rätt användar-ID genom förberedelse, skapande och
  uttrycklig kopiering. Skyttel skickar inget meddelande automatiskt.
- Medlemmar och inbjudningar visas separat. Den aktuella engångskoden
  bevaras vid listbyte men rensas när inbjudan avslutas eller sidan lämnas.
- En verklig andra klient accepterar koden. Återkallelse gäller även den
  redan öppna arbetsytan och avvecklar skyddat oskickat arbete före omladdning.
- Alex behåller sparad information och eget privat förslag. Formulärtext
  finns kvar vid **Fortsätt redigera** och försvinner bara efter uttryckligt val.
  Automationen jämför hela kartsvaret och verifierar nekad HTTP-åtkomst för Robin.

### MEDLEM-09: Kopiera koden manuellt när urklippsknappen misslyckas

**Syfte:** Kontrollera att ett misslyckat kopieringsförsök behåller rätt
engångskod och ger en användbar väg till faktisk acceptans.

**Användare:** Alex som administratör i profil A och Robin utan tillgång
i profil B.

**Förutsättningar:** Lägg **Privat under kopiering** med beskrivningen
**Alex behåller sitt eget förslag** i Alex utkast utan att spara.
Robin visar sitt faktiska Skyttel-användar-ID. Manuell markering och
tangentbordets kopiering ska vara tillåtna.

**Separat förberedelse:** Kör följande i Alex webbläsarkonsol före steg 1.
Det orsakar samma kontrollerade skrivfel som integrationstestet utan att
ändra operativsystemets behörigheter. Ladda om sidan efter fallet för att
återställa den vanliga urklippsknappen.

```javascript
Object.defineProperty(navigator.clipboard, 'writeText', {
  configurable: true,
  value: async () => {
    throw new DOMException('Synthetic clipboard denial', 'NotAllowedError');
  },
});
```

**Integrationstest:**
[membership-ui.spec.ts](../../tests/integration/membership-ui.spec.ts),
testfallet “MEDLEM-09: failed clipboard writing keeps the real code usable
by manual copy and acceptance”. Automationen ersätter endast webbläsarens
skrivning till urklipp med ett kontrollerat fel. Den verifierar felvägen,
inte webbläsarens verkliga behörighetsbeslut. Tangentbordets kopiering,
inklistringen och inbjudningstjänsten används på riktigt.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/membership-ui.spec.ts",
    "caseId": "MEDLEM-09"
  },
  "reference": "Kontrollerat urklippsfel; riktig tangentbordskopiering och acceptans",
  "outcomes": [
    "Urklippsfelet behåller rätt kod som kan kopieras manuellt och accepteras"
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Öppna **Administrera tillgång**, välj **Jag har personens användar-ID**,
   ange Robins faktiska ID och välj **Skapa inbjudan**.
2. Välj **Kopiera koden**. Kontrollera beskedet om att koden inte kunde
   kopieras och uppmaningen att markera och kopiera fältets text själv.
3. Kontrollera att **Inbjudningskod att dela** och mottagarens fullständiga
   ID finns kvar. Markera hela koden och tryck Ctrl+C, eller Cmd+C på Mac.
4. Fokusera Robins **Inbjudningskod** i den andra profilen. Klistra in med
   Ctrl+V eller Cmd+V och kontrollera att hela koden stämmer. Välj
   **Acceptera inbjudan**.
5. Kontrollera Robins hushåll och roll. Återgå till Alex sida och kontrollera
   att den accepterade koden försvinner. Välj **Klar med inbjudan**.

**Förväntat resultat:**

- Felet lämnar exakt samma kod och avsedda mottagare tillgängliga för
  manuell kopiering. Ingen extra inbjudan skapas av kopieringsförsöket.
- Den manuellt kopierade koden öppnar hushållet som **Medlem** för Robin.
  Samma inbjudan går från väntande till accepterad, och koden döljs för Alex.
- Alex privata förslag och den gemensamma kartan är oförändrade. Robin får
  ett eget tomt utkast och ser inte Alex privata förslag. Automationen
  jämför hela Alex kartunderlag före och efter flödet.

## Separat tekniskt inbjudningsunderlag

[invitations.spec.ts](../../tests/integration/invitations.spec.ts) behåller
sex requestdrivna kontroller märkta `@technical`: uppgradering med befintlig
medlemsidentitet och användbar länkning, bunden mottagare och förbrukad kod
efter omstart, hushållsgränser och medlemskap i annat hushåll, ersättning
och återkallelse av gamla koder, samtidiga sista-administratörsändringar
samt medlemsrollen och återkallelse mot gamla sessioner.
De är separat auktoritetsunderlag, inte manuella formulärmotsvarigheter.

MEDLEM-01 och MEDLEM-08 provar vanliga webbläsarflöden. MEDLEM-09 provar
kontrollerat urklippsfel och tangentbordets kopiering. Det etablerar inte
verkligt beslut i operativsystemets eller webbläsarens behörighetsdialog.
