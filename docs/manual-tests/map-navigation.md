# Manuella testfall för navigeringsfönstret

Fallen omfattar navigering, personlig objektflyttning, samtidiga detaljer
och nypzoom med styrplatta.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.
Fysiska enheter och skärmläsare provas och redovisas separat.

## Konfigurerade användare

Alex Exempel är inloggad medlem i ett separat provhushåll. Använd endast
påhittade uppgifter. Administratörsrollen behövs inte för kartarbetet.

## Allmän förberedelse

1. Starta en isolerad installation enligt
   [provförberedelsen](../development/devcontainer.md#disposable-local-database).
   Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor).
2. Skapa och spara objekten Lo Exempel och Kim Exempel. Börja varje fall
   med en omladdad karta och tomt urval.
3. Prova dator och telefon, även 390 och 320 pixlars bredd. Kontrollera
   också verklig webbläsarzoom, synligt fokus och minskad rörelse.

## Fönster och personlig vy

### NAVIGATION-01: Normal- och miniläge med oberoende fönsterflytt

**Syfte:** Navigeringsfönstret flyttas utan kamera- eller objektflytt.

**Användare:** Alex Exempel.

**Förutsättningar:** Kartan är synlig i en datorbred vy.

**Integrationstest:**
[map-navigation.spec.ts](../../tests/integration/map-navigation.spec.ts),
testfallet “NAVIGATION-01: normal and mini navigation move independently
with keyboard and cancelled dragging”.

**Steg:**

1. Markera Lo och välj **Navigera**. Kontrollera titelradens ordning:
   miniikonen, **Navigation**, stängikonen. Titelraden får fokus.
2. Välj **Visa mininavigering**. Kontrollera ikonernas verktygstips och
   tillgängliga namn. Kameraknappar och sex flyttriktningar finns kvar.
3. Fokusera titelraden. Använd piltangenter och Skift med piltangent.
4. Dra titelraden och tryck Escape innan du släpper pekaren.
5. Öppna **Fönstrets placering**. Flytta med knapparna och återställ
   fönstrets placering utan att dra.
6. Tryck Escape igen när ingen dragning pågår.

**Förväntat resultat:**

- Fönstret flyttas med tangentbord eller pekare. Kameran och objektens
  placeringar ändras inte. Avbruten dragning återger fönstrets placering.
- Normalläget visar knapptext; miniläget behåller begripliga namn.
- Escape utan dragning stänger navigationen och återför fokus till
  **Navigera** utan att ändra urval eller andra öppna paneler.

### NAVIGATION-02: Navigation och oskickade detaljer samtidigt

**Syfte:** Bevara navigation, läsbara uppgifter och oskickad formulärtext
med den gemensamma objektdialogens förlustskydd i båda öppningsordningarna.

**Användare:** Alex Exempel.

**Förutsättningar:** Upprepa på dator samt vid 390 och 320 pixlars bredd,
även i korta fönster på 844 × 390, 700 × 600, 640 × 500 och 320 × 250
CSS-pixlar. Prova verklig webbläsarzoom separat från ändrad fönsterstorlek.

**Integrationstest:**
[map-navigation.spec.ts](../../tests/integration/map-navigation.spec.ts),
testfallet “NAVIGATION-02: navigation and unsent details retain usable work
in both opening orders”.

**Steg:**

1. Markera Lo. Öppna **Navigera**, flytta titelraden med Skift+pil nedåt
   och öppna sedan **Visa detaljer**. Läs Lo i den fasta uppgiftsytan.
   Kontrollera att navigationens stängknapp är nåbar utan att täcka läsningen.
   Vid 844 × 390 och 320 × 250: använd en provinstallation utan samtalstjänst,
   aktivera **Prata med Skyttel** före öppningen och låt den verkliga
   otillgänglighetsnotisen vara öppen under samma steg.
   Läs uppgiftsytans sista värde och nå **Samband för Lo Exempel** med
   notisen kvar. Rulla tillbaka för att läsa rubriken.
2. På dator: flytta navigationen åt vänster med Skift+pil. Ändra fönstrets
   bredd lite och återställ den. Navigationens möjliga placering och
   uppgiftsytans placering ska bestå. Flytta åt vänster igen.
3. Välj **Redigera Lo Exempel** och skriv en ny beskrivning. Försök stänga
   med krysset. Kontrollera att **Fortsätt redigera** får fokus och tryck
   Escape. Beskrivningen ska finnas kvar. Navigationen i bakgrunden är
   inaktiv medan den fullständiga objektdialogen skyddar formuläret.
4. Välj **Lägg i utkastet och stäng** med tangentbordet. Läs den föreslagna
   beskrivningen i uppgiftsytan. Rulla navigationens innehåll vid behov
   och välj **Flytta Lo Exempel: bakåt**. Vänta på bekräftad personlig vy.
5. Panorera, byt till mininavigering och zooma med knapparna medan
   otillgänglighetsnotisen fortfarande är öppen. Rulla hela navigationen
   vid behov i det kortaste fönstret. Läs den oförändrade föreslagna
   beskrivningen och uppgiftsytans sista värde. Fokusera först därefter
   notisens **Stäng notisen** och aktivera den utan att ändra utkastet.
   Hushållets sparade uppgifter
   ska fortfarande vara oförändrade.
6. Ladda om och upprepa med detaljer först och navigation sedan, på
   samtliga angivna skärmstorlekar.

**Förväntat resultat:**

- Navigation och fasta uppgifter täcker inte varandra. Innehållet går
  att rulla när utrymmet är litet, med nåbara kontroller och synligt fokus.
- Den öppna samtalsnotisen har en egen plats. Den täcker varken
  navigationens kontroller eller uppgiftsytans läsbara innehåll. Zoom,
  panorering, sista värdet och uppgiftsytans åtgärder går att nå utan
  att först stänga notisen.
- Navigation kan flyttas med tangentbord och pekare inom användbart
  utrymme, utan att täcka den fasta läsytan. Ingen ny flyttbar
  redigeringspanel eller återupptagningsingång införs.
- Byte till mininavigering bevarar uppgiftsytans placering och lämnar
  de läsbara uppgifterna åtkomliga. Längre uppgifter kan kräva rullning.
- Avbruten formulärförlust behåller alla oskickade värden. Ingen personlig
  flyttning sker genom den inaktiva bakgrunden. Efter uttrycklig komplett
  tilläggning behålls förslaget under navigering och personlig objektflytt.
- Personlig flyttning ändrar bara den personliga vyn. Den sparade
  hushållskartan och dess samband ändras inte.
- Uppgiftsytan visar ingen separat undertitel **Flytta** eller upprepad
  lista över direkta samband. **Samband för Lo Exempel** öppnar den
  ordinarie sambandsdialogen.

### NAVIGATION-03: Sex personliga riktningar och beständig placering

**Syfte:** Bara ett namngivet objekt flyttas utan ändrade hushållsuppgifter.

**Användare:** Alex Exempel.

**Förutsättningar:** Spara hushållets uppgifter före provet. En ansvarig
för provinstallationen kan starta om dess server med samma databas.

**Integrationstest:**
[map-navigation.spec.ts](../../tests/integration/map-navigation.spec.ts),
testfallet “NAVIGATION-03: six personal directions persist after restart
while empty and multiple selections retain camera controls”.

**Steg:**

1. Markera bara Lo och öppna **Navigera**. Kontrollera **Flytta Lo Exempel**.
2. Använd vänster, höger, uppåt, nedåt, framåt och bakåt. Vänta på sparad
   personlig vy efter varje rörelse.
3. Markera även Kim med Ctrl/Cmd. Öppna navigationen igen.
4. Avmarkera båda med Ctrl/Cmd i kartan och kontrollera navigationen.
5. Starta om servern, ladda om sidan och kontrollera placeringarna samt
   hushållets sparade uppgifter och utkast.

**Förväntat resultat:**

- De sex riktningarna ändrar bara det namngivna objektets personliga
  placering. Hushållets uppgifter och utkast är oförändrade.
- Vid tomt urval eller flerval döljs objektflyttningen. Kameraknapparna
  finns kvar och fungerar.
- Den personliga placeringen återläses efter omstart.

### NAVIGATION-04: Samband nås och redigeras från listan

**Syfte:** Detaljernas textalternativ behåller riktning och redigering.

**Användare:** Alex Exempel.

**Förutsättningar:** Lo Exempel använder Kim Exempel genom ett samband
av typen Använder. Sambandet kan vara sparat eller ligga i utkastet.

**Integrationstest:**
[map-navigation.spec.ts](../../tests/integration/map-navigation.spec.ts),
testfallet “NAVIGATION-04: object details retain directed relationship
access and editing through the list”.

**Steg:**

1. Markera Lo och välj **Visa detaljer**.
2. Välj **Samband för Lo Exempel** i den fasta uppgiftsytan.
3. Läs **Lo Exempel → Använder → Kim Exempel**, båda ändpunkterna och
   riktningen. Välj **Kim Exempel**, läs dess fullständiga uppgifter och
   kontrollera fokus på rubriken **Uppgifter för Kim Exempel**.
4. Välj **Tillbaka**. Välj **Redigera samband** vid samma samband och
   kontrollera Lo som **Från objekt** och Kim som **Till objekt**.
5. Välj **Osäkert uppgivet** som uppgiftens säkerhet. Läs meningen
   **Lo Exempel använder Kim Exempel (Osäkert uppgivet)** och välj
   **Lägg i utkastet**. Sambandsdialogen ska finnas kvar i läsläge.

**Förväntat resultat:**

- Båda ändpunkterna och riktningen anges i text. Det andra objektets
  namn öppnar dess verkliga fullständiga uppgifter och Tillbaka återgår.
- Det vanliga formuläret behåller Lo och Kim i rätt riktning. Det färdiga
  förslaget ersätter bara samma samband i utkastet; inget extra samband
  skapas och hushållets sparade objekt och samband ändras inte.
- Uppgiftsytan innehåller ingen upprepad lista över direkta samband.

## Zoom med styrplatta

### NAVIGATION-05: Nypzoom följer fingrarnas hastighet

**Syfte:** Nypzoom med styrplatta är snabb nog och följer fingrarnas
hastighet. Ett hack med Ctrl och mushjul zoomar begränsat.

**Användare:** Alex Exempel.

**Förutsättningar:** En Mac med styrplatta och en mus med hjul. Prova
fallet i Chrome och i Safari. Lo och Kim syns i kartan.

**Integrationstest:**
[map-navigation.spec.ts](../../tests/integration/map-navigation.spec.ts),
testfallet “NAVIGATION-05: trackpad pinch zoom follows pinch speed while a
Ctrl mouse-wheel notch stays limited”.

**Steg:**

1. Välj **Återställ vy**. Håll pekaren över tom rymd.
2. Nyp långsamt isär med två fingrar på styrplattan. Nyp sedan långsamt
   ihop.
3. Välj **Återställ vy**. Nyp snabbt isär med samma fingeravstånd som i
   steg 2. Nyp sedan snabbt ihop.
4. Välj **Återställ vy**. Håll Ctrl och rulla mushjulet ett hack.

**Förväntat resultat:**

- Ett långsamt nyp zoomar lugnt och går att styra noga.
- Ett snabbt nyp zoomar tydligt mer än ett långsamt nyp.
- Ett nyp isär zoomar in och ett nyp ihop zoomar ut.
- Ett hack med Ctrl och mushjul zoomar ett begränsat steg utan hopp.
- Webbläsaren förstorar inte hela sidan. Objektens placeringar ändras inte.
