# Manuella testfall för personliga placeringar

Testfallen omfattar egna placeringar och visningsval. Anteckna commit,
webbläsare, enhet, fysisk eller emulerad inmatning och godkänt eller
underkänt resultat. Programstyrda Chromium-prov ersätter inte fysiska
Chrome-prov på iPhone eller iPad eller fullständiga hjälpmedelsprov.

## Konfigurerade användare

Alex Exempel är administratör i provhushållet Linden. Robin Exempel är
medlem och har en separat webbläsarprofil. Använd bara påhittade uppgifter.
En tredje profil är utloggad. Använd två klienter med Alex inloggning för
att prova samtidighet.

## Allmän förberedelse

PLACERING-11/12 följer
[faktisk HTTPS-ingång och egna provdata](workspace-preparation.md#fysiska-enheter-och-egen-provdata)
för telefon och surfplatta; syntetisk loopback ersätter inte enhetens ingång.

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Starta en isolerad installation enligt
[provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Använd ett nytt hushåll
   mellan fallen.
2. Skapa Lampan och Cykeln och spara hela utkastet. Bjud in Robin till
   hushållet när fallet anger det.
3. Öppna rymdkartan. Alla flyttar och val gäller bara den inloggade
   Skyttel-användarens presentation.

## Flyttning och beständighet

### PLACERING-01: mus, höjdled, tangentbord och återläsning

**Syfte:** Kontrollera tre dimensioner och beständig personlig lagring.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Lampan och Cykeln är sparade.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-01.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-01"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Dra Lampan åt sidan och nedåt. Håll Shift och dra uppåt. Kontrollera
   höjdhjälpens start och riktning under draget.
2. Välj namnet Lampan i **Tabell** och öppna **Karta**. Öppna Navigera, fokusera
   Flytta [objektets namn]: nedåt och håll Shift utan att dra. Släpp Shift och
   välj Visa höjdhjälp i Navigera för att granska flyttningens start.
   Tryck Enter på Flytta [objektets namn]: nedåt och kontrollera ett steg
   nedåt från den nya starten. Slå av höjdhjälpen och flytta nedåt igen.
   Valet ska förbli av. Slå på det och kontrollera två steg från samma start.
   Öppna Inställningar → Rymdkartan och aktivera Visa
   stjärnhimmel.
   Återgå med Tillbaka till kartan.
3. Ladda om, starta om servern och öppna samma hushåll i en annan klient
   med Alex inloggning.
4. Läs det sparade stjärnvalet i den andra klientens inställningar och
   återgå till kartan. Markera Lampan, öppna **Navigera** och flytta uppåt
   med Enter. Kontrollera att flytten fortsätter från sparad placering
   och att den aktiva flyttknappen behåller fokus.

**Förväntat resultat:**

- Vanligt drag flyttar i bildplanet. Shift-drag ändrar bara rummets höjd.
  Shift visar höjdhjälp före drag. Senaste start och höjdskillnad går att
  granska efteråt. Höjdknapparna följer höjdhjälpsvalet.
- Knappar fungerar med tangentbord. Flyttar och stjärnval återkommer
  efter omstart och i den andra klienten.
- Hushållets sparade uppgifter och utkast ändras inte av flyttningen.
- Höjdhjälpsvalet är av efter omladdning.

### PLACERING-08: stabil höjdhjälp och bevarat val i navigeringen

**Syfte:** Kontrollera förhandsvisning, dragets start och höjdhjälpsvalet.

**Användare:** Alex Exempel med mus och tangentbord.

**Förutsättningar:** Lampan och Cykeln är sparade.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-08.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-08"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Lampan. Öppna Navigera och nå Visa höjdhjälp med tangentbordet.
   Tryck mellanslag för att aktivera valet. Byt till mininavigering och
   kontrollera att hela etiketten syns under flyttknapparna.
2. Stäng navigeringen. Håll Shift och kontrollera Startläge. Dra Lampan
   uppåt och kontrollera att hjälpplanet ligger kvar där förhandsvisningen
   visar det. Släpp musknappen utan att släppa Shift. Kontrollera Startläge
   vid den nya placeringen. Dra uppåt igen och kontrollera samma beteende.
3. Släpp Shift. Granska den senaste flyttningens höjdskillnad. Öppna
   navigeringen och kontrollera att Visa höjdhjälp fortfarande är på.
4. Välj namnet Cykeln i **Tabell** och återgå till **Karta**. Kontrollera att
valet består. Markera även Lampan
   genom Control-klick i kartan, öppna Navigera igen och kontrollera
   att reglaget blir inaktivt med texten
   Välj ett objekt för att visa höjdhjälp.

**Förväntat resultat:**

- Förhandsvisning och drag använder samma start; hjälpplanet hoppar inte
  när dragningen börjar. Nästa drag får en ny start vid aktuell placering.
- Shift visar nästa förhandsvisning mellan drag. När Shift släpps visas
  senaste dragets resultat eftersom valet är på.
- Reglaget och hela etiketten syns i båda navigeringsstorlekarna. Valet
  består när fönstret stängs och urvalet ändras.
- Flera markerade objekt gör reglaget inaktivt utan att ändra dess värde.

### PLACERING-02: samtidiga flyttar och visningsval

**Syfte:** Kontrollera att äldre klienter inte skriver över nyare val.

**Användare:** Alex Exempel i två klienter.

**Förutsättningar:** Båda klienterna visar samma ursprungliga vy.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-02.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-02"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj Lampan i båda klienterna. Flytta den uppåt i den första och
   nedåt i den andra.
2. Läs konfliktbeskedet i den andra klienten och flytta nedåt igen.
3. Flytta Cykeln från den första klienten utan att läsa om Lampan.
4. Aktivera Visa axlar hela tiden i den första klienten. Försök aktivera
   Visa stjärnhimmel från den andra klientens äldre inställningar under
   Inställningar → Rymdkartan. Återgå till kartan för att kontrollera axlarna.

**Förväntat resultat:**

- Den äldre flytten av Lampan avvisas synligt och aktuell placering visas.
  En ny flytt efter granskning fungerar.
- Cykelns oberoende flytt och Lampans senaste placering finns båda kvar.
- Äldre visningsval avvisas med besked. Den andra klienten visar de
  aktuella inställningarna. Inget nytt kartutkast skapas.

### PLACERING-03: pekgester, avbrott och fingerbyten

**Syfte:** Kontrollera avgränsningen mellan objektflytt och kamerarörelse.

**Användare:** Alex Exempel på pekskärm.

**Förutsättningar:** Öppen rymdkarta med de sparade objekten.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-03.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-03"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Dra Lampan med ett finger. Lägg ett andra finger stilla på kartan och
   dra det första uppåt. Lägg till ett tredje finger. Släpp det andra
   först, rör det första igen och lyft sedan alla fingrar.
2. Börja ett nytt drag och avbryt pekgesten, exempelvis genom att lämna
   webbläsaren. Återgå och kontrollera placeringen.
3. Börja höjdflyttning men släpp det första fingret före det andra.
   Fortsätt röra det kvarvarande fingret och släpp det.
4. Börja höjdflyttning igen och flytta även ankarfingret. Kontrollera
   återgången till ursprungsplaceringen. Fortsätt med båda fingrarna
   för panorering och nypzoom. Lyft alla fingrar.
5. Dra i tom rymd med ett finger. Panorera sedan med två fingrar: flytta
   båda lika långt åt samma håll utan att ändra avståndet mellan dem.
   Släpp båda. Börja en ny tvåfingergest och dra isär fingrarna lika långt
   åt varsitt håll för att zooma in.

**Förväntat resultat:**

- Bildplansdrag och höjdled fungerar. Höjdhjälpen syns under höjdgesten.
- Höjdflytten sparas oavsett vilket av parets fingrar som lyfts först.
  Återstående fingrar flyttar ingenting innan alla har lyfts. Ett tredje
  finger påverkar inte det aktiva paret.
- Flyttat ankare återställer objektet och övergår utan hopp till kameran.
  Avbruten objektgest återställer utan sparad flytt.
- Tom rymd styr kameran utan att ändra objektens placeringar.
  Panorering förskjuter utsnittet utan att märkbart ändra skalan.
  När fingrarna dras isär ökar objektens avstånd på skärmen.
  Axelvisaren syns under rörelse och försvinner en kort stund efteråt.

## Visningsval och åtkomst

### PLACERING-04: visningsval, nya förslag och bevarad text

**Syfte:** Kontrollera personliga val och fortsatt arbete vid vyändringar.

**Användare:** Alex Exempel.

**Förutsättningar:** Systemets minskade rörelse är aktiverad.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-04.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-04"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Flytta Lampan. Öppna Ordna min vy i Navigera. Aktivera Visa axlar hela
   tiden och välj hörnet uppe
   till vänster. Vänd panorering separat i sidled och höjdled.
2. Öppna Inställningar → Rymdkartan. Kontrollera att stjärnhimlen är
   avstängd och reglaget inaktivt. Stäng
   av systemets minskade rörelse och aktivera stjärnhimlen. Slå på
   minskad rörelse igen utan omladdning och granska samma reglage och
   bakgrund genom att växla mellan inställningarna och kartan. Stäng av
   minskad rörelse igen och välj Tillbaka till kartan.
3. Välj **Nytt objekt** i verktygen, ange Ny sak och välj
   **Lägg i utkastet och stäng**. Öppna **Karta** igen.
4. Välj **Tabell** och **Redigera Lampan**. Skriv Oskickad text som nytt namn.
   Växla mellan stående 390 × 844 och liggande 844 × 390 CSS-pixlar medan
   formuläret är öppet. Kontrollera det oskickade namnet i båda vyerna.
5. Välj **Stäng objektdialogen**, kontrollera fokus på **Fortsätt redigera**
   och tryck Escape. Namnet finns kvar. Stäng igen och välj uttryckligen
   **Kasta ändringarna och fortsätt**. Välj **Karta** och kontrollera
   axelvisarens placering utan att ändra egna flyttar eller Ny sak-förslaget.
6. Öppna **Tabell** och läs **Ny sak**: namn, typen Person och den tomma
   beskrivningen. Fäll ihop raden och återgå till **Karta**.

**Förväntat resultat:**

- Visningsval sparas personligt. Minskad rörelse stänger av stjärnorna
  och inaktiverar reglaget, även när det personliga valet är på. När
  minskad rörelse stängs av återkommer det personliga valet. Axelvisaren
  stannar inom kartans synliga yta. Ingen automatisk animation krävs.
- Nya förslag flyttar inte befintliga placeringar eller kameran.
- Lampans oskickade namn består genom storleksbyten och avbruten förlust.
  Efter uttryckligt kastande finns sparade namn, personliga val och hela
  tidigare Ny sak-förslaget kvar.

### PLACERING-05: personlig avskildhet och återkallad tillgång

**Syfte:** Kontrollera att personliga vyer kräver aktuell hushållstillgång.

**Användare:** Alex, Robin och den utloggade profilen.

**Förutsättningar:** Följ
[förberedelsen för två provhushåll](../development/testing.md#a-second-household-on-the-same-installation).
Alex har Linden och Robin har först bara Eken på **samma installation**.
Skapa och flytta Lampan som Alex. Behåll Lindens adress och hushålls-ID
från Alex profil. Använd en tredje, utloggad profil för åtkomstprovet.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-05.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-05"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Försök öppna Lindens adress utloggad och med Robins andra hushållstillgång.
   Kontrollera att ingen av profilerna får se Lindens karta.
2. Bjud in Robin till Linden och acceptera inbjudan som Robin. Öppna
   Lindens adress uttryckligen även om startsidan visar Eken. Flytta Lampan
   och ändra stjärnvalet som Robin. För stjärnvalet, öppna Lindens
   adress följd av `/settings/map` i adressfältet; den vanliga
   inställningsöversikten kan utgå från Eken som först valt hushåll.
   Öppna uttryckligen Lindens kartadress igen efter inställningsprovet.
3. Kontrollera Alex vy. Låt Robin behålla kartan öppen medan Alex
   återkallar Robins tillgång.
4. Välj Läs in min aktuella vy som Robin och försök fortsätta arbeta.
   Kontrollera att Lindens karta stängs och inloggningsnavigationen kan nås.

**Ytterligare tekniskt underlag:**
[Separat åtkomstprov](workspace-preparation.md#separat-åtkomstprov) kontrollerar
alla tre HTTP-gränserna; dessa svarskoder ingår inte i UI-stegen.

**Förväntat resultat:**

- Utloggad och fel hushållstillgång ger inte tillgång till Lindens vyer.
- Robin ser egna val och ändrar inte Alex placeringar eller inställningar.
- Återkallad tillgång hindrar fortsatt läsning och båda slags sparanden.
  Inloggningsnavigationen är tillgänglig när helskärmskartan stängs.

## Inläsning och kamera

### PLACERING-06: sen första inläsning och bevarad kamera vid uppdatering

**Syfte:** Kontrollera att sparade placeringar syns vid kartans start och
att senare inläsningar och visningsval bevarar användarens kameravy.

**Användare:** Alex Exempel på dator med mus.

**Förutsättningar:** Lampan och Cykeln är sparade. Använd 1440 × 1000
CSS-pixlar och den separata styrda transporten. Första personliga svaret
hålls efter genomförd läsning, medan rymdkartan visas; vanlig långsam
anslutning ersätter inte denna bestämda ordning.

**Separat förberedelse:** Följ
[sen första personlig inläsning](workspace-preparation.md#sen-första-personlig-inläsning).

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-06.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-06"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Välj namnet Lampan via **Tabell** och återgå med **Karta**.
   Öppna **Navigera**. Använd
   Flytta [objektets namn]: höger upprepade gånger tills Lampan ligger helt
   utanför den ursprungliga vyn. Vänta på beskedet att din personliga vy är
   sparad. Gör samma sak med Cykeln, utan att ändra kameran.
2. Arma den separata personliga läsningen och ladda om sidan. Kontrollera att
   **Tabell** och **Karta** kan öppnas.
Kontrollera
   Visa stjärnhimmel under Inställningar → Rymdkartan medan valet är
   inaktivt i väntan på de personliga placeringarna. Använd inte Återställ vy
   eller kameraknapparna.
3. Släpp samma personliga svar i förberedelseterminalen.
   Vänta tills Visa stjärnhimmel går att använda. Välj Tillbaka till kartan
   och kontrollera att båda objekten syns. Låt senare läsningar passera normalt.
4. Öppna Navigera och använd Panorera höger så att objekten hamnar
   tydligt vid sidan av sina första lägen på skärmen. Behåll dem synliga
   och lägg märke till utsnittet.
5. Välj Läs in min aktuella vy under Ordna min vy. Vänta tills läsningen
   är klar och jämför utsnittet med det du valde i föregående steg.
6. Öppna Inställningar → Rymdkartan och aktivera Visa stjärnhimmel.
   Återgå med Tillbaka till kartan. Vänta på beskedet att vyn är sparad och
   jämför utsnittet igen.

**Förväntat resultat:**

- När de första personliga placeringarna är klara ramas de båda flyttade
  objekten in automatiskt. De syns utan att användaren återställer vyn,
  även när rymdkartan visas före den personliga inläsningen.
- Efter den första inramningen kan användaren välja ett eget utsnitt.
  Läs in min aktuella vy bevarar det utsnittet utan att kameran hoppar
  tillbaka eller zoomar om.
- Stjärnhimlen visas. Även efter att valet sparas ligger objekten kvar
  på samma ställen i utsnittet och kameran bevaras.

### PLACERING-07: stjärnval i Rymdkartans inställningar

**Syfte:** Anpassa bakgrunden utan att förlora urval eller personlig vy.

**Användare:** Alex Exempel.

**Förutsättningar:** Lampan och Cykeln är sparade enligt förberedelsen.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-07.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-07"
  },
  "reference": "Chromium, sparade Lampan och Cykeln; angivna klienter och medieinställningar.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Markera Lampan. Öppna Navigera och flytta den uppåt. Stäng navigeringen
   och lägg märke till urval och utsnitt.
2. Öppna Inställningar → Rymdkartan. Aktivera Visa stjärnhimmel och vänta
   på beskedet att din personliga vy är sparad.
3. Slå på systemets minskade rörelse. Kontrollera att reglaget är avstängt
   och inaktivt. Stäng av minskad rörelse och kontrollera att valet återkommer.
4. Välj Tillbaka till kartan. Kontrollera samma urval och utsnitt.
5. Starta om testinstallationen och ladda om sidan. Öppna Rymdkartans
   inställningar och kontrollera att stjärnvalet består.

**Förväntat resultat:**

- Valet sparas personligt och återkommer efter omstart.
- Minskad rörelse stänger av stjärnorna utan att radera det sparade valet.
- Kartans urval, kamera och tidigare placeringar består genom vybytet.
- Reglaget finns i inställningarna och går att nå med tangentbord.

### PLACERING-09: Sparbekräftelse som toast med bevarat fokus

**Syfte:** Visa en kort bekräftelse efter sparning utan att störa arbetet.

**Användare:** Alex Exempel.

**Förutsättningar:** Lampan och Cykeln är sparade enligt förberedelsen.
Prova vid 1440 CSS-pixlars bredd. PLACERING-10 provar 390 pixlar;
PLACERING-11 gäller faktisk uppläsning.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts),
PLACERING-09.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-09"
  },
  "reference": "1440 CSS-pixlars bredd: återkoppling, fokus, utgången toast och återläsning efter serveromstart.",
  "outcomes": [
    "Personliga placeringar och val bevaras utan oavsiktliga hushållsändringar."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Markera Lampan och öppna **Navigera**. Fokusera **Flytta Lampan: uppåt**
   och tryck Enter. Läs **Din personliga vy är sparad.** i toasten.
2. Vänta tre sekunder utan att flytta fokus. Kontrollera att toasten
   försvinner och att Lampan behåller den nya placeringen.
3. Aktivera **Alla etiketter** med tangentbordet. Läs samma sparbekräftelse
   och vänta tills toasten försvinner. Kontrollera knappens fokus och påläge.
4. Öppna **Tabell** och återgå till **Karta**. Kontrollera placeringen,
   etikettvalet och att en gammal sparbekräftelse inte visas igen.
5. Starta om provservern med samma databas och ladda om. Kontrollera
   Lampan och det sparade etikettvalet; utkast och hushållsuppgifter är
   oförändrade.
6. Markera Lampan, öppna **Navigera** och välj **Flytta Lampan: uppåt**.
   Lampan fortsätter från den sparade placeringen och flyttknappen behåller
   fokus. Övriga objekt kan få nya automatiska placeringar vid omladdningen.

**Förväntat resultat:**

- Bekräftad sparning av både placering och visningsval visar toasten i
  tre sekunder. En ny bekräftad sparning startar om tiden.
- Toasten ryms på skärmen och tar inte tangentbordsfokus. Fokus ligger kvar
  på den använda knappen även när toasten försvinner.
- Den artiga statusregionen finns i automatiskt underlag. Faktisk
  uppläsning en gång per sparning provas i PLACERING-11.
- Placering och etikettval består. Hushållets sparade uppgifter och utkast
  ändras inte. En redan avslutad toast återkommer inte vid vybyte.

### PLACERING-10: sparbesked i smal vy

**Syfte:** Toasten ryms, försvinner och lämnar fokus på den använda kontrollen.

**Användare:** Alex enligt grundfallet.

**Förutsättningar:** Samma provdata och återställning som PLACERING-09.

**Integrationstest:**
[personal-view.spec.ts](../../tests/integration/personal-view.spec.ts), PLACERING-10.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "counterpart": {
    "spec": "tests/integration/personal-view.spec.ts",
    "caseId": "PLACERING-10"
  },
  "reference": "390 CSS-pixlars bredd: toastens geometri, utgång och fokus, med bevarade personliga val.",
  "outcomes": [
    "Toasten ryms, försvinner och lämnar fokus på den använda kontrollen.",
    "Placering och etikettval består genom vybyte utan ändrat hushållsarbete."
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Följ PLACERING-09 steg 1–4 en gång vid 390 CSS-pixlars bredd.
2. Stanna före steg 5; omstartens samlade referens är PLACERING-09.

**Förväntat resultat:**

- Toasten ryms, försvinner och lämnar fokus på den använda kontrollen.
- Placering och etikettval består genom vybyte utan ändrat hushållsarbete.

### PLACERING-11: faktiskt uppläst sparbesked

**Syfte:** NVDA eller VoiceOver läser bekräftelsen en gång per personlig
sparning utan att avbryta pågående läsning.

**Användare:** Alex enligt områdets förberedelse.

**Förutsättningar:** Sparade Lampan och Cykeln; faktisk skärmläsare vid 1440 och
390 pixlar.

**Kräver mänsklig observation:** NVDA eller VoiceOver läser bekräftelsen en gång
per personlig sparning utan att avbryta pågående läsning.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "screen-reader",
    "observation": "NVDA eller VoiceOver läser bekräftelsen en gång per personlig sparning utan att avbryta pågående läsning."
  },
  "reference": "Sparade Lampan och Cykeln; faktisk skärmläsare vid 1440 och 390 pixlar.",
  "outcomes": [
    "NVDA eller VoiceOver läser bekräftelsen en gång per personlig sparning utan att avbryta pågående läsning."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/personal-view.spec.ts",
      "caseId": "PLACERING-09",
      "purpose": "Kontrollerat webbläsarunderlag för vanliga kontroller; utför inte den faktiska mänskliga observationen."
    },
    {
      "kind": "overlap",
      "spec": "tests/integration/personal-view.spec.ts",
      "caseId": "PLACERING-10",
      "purpose": "Kontrollerat webbläsarunderlag för vanliga kontroller; utför inte den faktiska mänskliga observationen."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Starta skärmläsaren och följ PLACERING-09 steg 1–3 en gång.
2. Lyssna på båda bekräftelserna. Kontrollera att knapparnas fokus stannar
   kvar när toasten försvinner. Anteckna hjälpmedel, version och resultat.

**Förväntat resultat:**

- NVDA eller VoiceOver läser bekräftelsen en gång per personlig sparning utan
  att avbryta pågående läsning.

### PLACERING-12: fysiska fingerbyten och avbruten pekgest

**Syfte:** Fysiska fingrar på iPhone eller iPad flyttar i bildplan och höjd,
medan avbrutna gester och flyttat ankare återställer utan oavsiktlig
objektflytt.

**Användare:** Alex enligt områdets förberedelse.

**Förutsättningar:** Chrome på faktisk iPhone eller iPad med sparade Lampan och
Cykeln.

**Kräver mänsklig observation:** Fysiska fingrar på iPhone eller iPad flyttar i
bildplan och höjd, medan avbrutna gester och flyttat ankare återställer utan
oavsiktlig objektflytt.

<!-- markdownlint-disable MD013 -->
```manual-mapping
{
  "humanObservation": {
    "kind": "physical-input",
    "observation": "Fysiska fingrar på iPhone eller iPad flyttar i bildplan och höjd, medan avbrutna gester och flyttat ankare återställer utan oavsiktlig objektflytt."
  },
  "reference": "Chrome på faktisk iPhone eller iPad med sparade Lampan och Cykeln.",
  "outcomes": [
    "Fysiska fingrar på iPhone eller iPad flyttar i bildplan och höjd, medan avbrutna gester och flyttat ankare återställer utan oavsiktlig objektflytt."
  ],
  "evidence": [
    {
      "kind": "overlap",
      "spec": "tests/integration/personal-view.spec.ts",
      "caseId": "PLACERING-03",
      "purpose": "Kontrollerat webbläsarunderlag för vanliga kontroller; utför inte den faktiska mänskliga observationen."
    }
  ]
}
```
<!-- markdownlint-enable MD013 -->

**Steg:**

1. Följ PLACERING-03 steg 1–5 en gång på den faktiska pekskärmen.
2. Anteckna fingerordningen, avbrottet när webbläsaren lämnas och faktisk
   återgång. Jämför observerad höjdhjälp och kamerarörelse.

**Förväntat resultat:**

- Fysiska fingrar på iPhone eller iPad flyttar i bildplan och höjd, medan
  avbrutna gester och flyttat ankare återställer utan oavsiktlig objektflytt.
