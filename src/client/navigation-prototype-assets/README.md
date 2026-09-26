# Fria paneler på Skyttels arbetsyta

Godkänt, kastbart designunderlag för
[Hur organiseras hela Skyttel med rymdkartan som huvudsaklig arbetsyta?](https://github.com/viscalyx/skyttel/issues/104).
B med flera fristående, flyttbara paneler är godkänd. Panelbyten behåller
mikrofonens tillstånd. Arbetspaneler behöver inte återställas efter
omladdning eller nästa besök. Navigationsfrågorna är avgjorda; detaljer
för kartan, redigering och administration har egna beslutsärenden.

Bekräftade beslut och beställarens preciseringar finns i ärendet:

- [Ramar för prototypen och bevarande av arbete](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845195246).
- [Informationsikonens innehåll](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845197848).
- [B med fria paneler och temaval i verktygslådan](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845398082).
- [Slutliga beslut och godkänt underlag i navigationsärendet](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845569635).

## Grund för nästa prototyp

Nästa prototyp ska grenas från den godkända grenen
[`prototype/skyttel-navigation` i upstream](https://github.com/viscalyx/skyttel/tree/prototype/skyttel-navigation).
Behåll D:s gemensamma skal, B:s fria paneler, de separata ikonerna för
Inställningar, Information och Aktuell status samt temavalet Ljust,
Mörkt och System direkt i verktygslådan. Utveckla nästa beslutsfråga på
denna grund.

## Samma grund som D · Fri rymd

Navigationsprovet utgår från
[ursprungliga D i upstream](https://github.com/viscalyx/skyttel/tree/f3f60ac).
Originalet och navigationsprovet delar nu skalet
[VisualPrototypeDFrame](../VisualPrototypeDFrame.tsx): verktygslåda,
hushållsrubrik, kartbakgrund och det lilla statuskortet. D:s stilmall
återanvänds oförändrad. Navigationspanelerna och provverktygen läggs till
ovanpå den grunden.

**Öppna ursprungliga D** i provpanelen visar D separat för jämförelse.
Logotyperna finns kvar. Navigationsprovet har också ett temaval direkt i
verktygslådan.

## Öppna prototypen

På grenen `prototype/skyttel-navigation`, med projektets beroenden
tillgängliga, kör:

```sh
npm run prototype:navigation
```

- [B · Fria paneler](http://localhost:4174/?prototype=navigation&variant=B)
- [A · Byt panel, tidigare jämförelse](http://localhost:4174/?prototype=navigation&variant=A)
- [C · Flikar i panelen, tidigare jämförelse](http://localhost:4174/?prototype=navigation&variant=C)

B öppnas även när adressen saknar alternativ. Välj A, B eller C i
provpanelen längst ned. Alternativet finns i adressen.

## Pröva två objekt och samtalet

Välj **Öppna två objekt och samtalet** i provpanelen. Det öppnar tre
fristående paneler: redigering av Familjeabonnemang, redigering av
Musikgläntan och Samtal.

1. Skriv olika namn i de två redigeringarna och en oskickad mening i
   samtalet. Varje objekt behåller sin egen redigering.
2. Flytta panelerna var för sig och pröva vilka delar av kartan som ska
   vara synliga. **Ordna paneler** återställer placeringen inom arbetsytan.
3. Öppna ett annat objekt via kartan eller listan. Objektet får en egen
   panel. Ett objekt som redan är öppet återkommer i sin befintliga panel.
4. Stäng en panel och öppna den igen. Den oskickade texten finns kvar.
5. Byt till mobilstorlek. **Öppna paneler** visar antalet paneler och en
   väljare med alla deras titlar. En panel visas åt gången. Återgå till
   datorstorlek för att se panelernas placering igen.

På dator kan du dra panelens rubrik för att flytta den. När rubrikens
**Flytta** har fokus fungerar piltangenterna; Skift och piltangent tar ett
större steg. Klicka på rubriken för knapparna **Vänster**, **Uppåt**,
**Nedåt**, **Höger** och **Återställ position**. På mobil väljer du panel
i stället för att placera flera paneler bredvid varandra.

## Välj tema i verktygslådan

Öppna **Tema** direkt i verktygslådan och välj **Ljust**, **Mörkt** eller
**System**. System följer enhetens inställning, även om den ändras medan
prototypen är öppen. Temavalet gäller hela arbetsytan och stänger inga
arbetspaneler. Utan temaval i adressen använder prototypen System.

### Skärmbilder

- [D:s gemensamma grund](D-grund.png).
- Fria paneler: [dator](B-fria-paneler-dator.png),
  [mobil](B-fria-paneler-mobil.png).
- [Temaval direkt i verktygslådan](Tema-toolbar.png).
- [Inställningar på dator](Installningar-dator.png).
- [Information på dator](Information-dator.png).
- [Aktuell status på mobil](Status-mobil.png).

## Tre olika ikoner i verktygslådan

**Inställningar** öppnar en tillfällig panel med personliga val,
inloggningssätt och assistenter. Där finns också tydliga grupper för
hushållets administration och driftens kostnader. **Tillbaka till
arbetet** återvisar de öppna arbetspanelerna, med innehållet kvar.

**Information** öppnar hjälp och information om Skyttel. Den förklarar
kartan och listan, tal och text, det privata utkastet samt hur man
fortsätter arbetet efter ett besök i inställningarna. Även denna panel
har **Tillbaka till arbetet**.

**Aktuell status** öppnar en separat panel för pågående tal, oskickat
arbete, privat utkast, sparande och resultat. Där kan du fortsätta skriva
eller redigera och öppna sparförsök och kvitton. D:s lilla statuskort är
kvar på kartan som kort återkoppling.

Tal, samtal/text och objekt/samband har egna ingångar i verktygslådan.
**Visa verktygsnamn** visar ikonernas namn. Objekt- och sambandstyper samt
ändringshistorik nås direkt från listan.

## Visa administration och kostnader

Välj **Visa administration och kostnader** i provpanelen. Det förbereder
en namnändring och öppnar inställningarna. Därifrån kan du pröva två
tydligt skilda områden:

- **Hushållets administration:** vilka Skyttel-användare som har tillgång
  till hushållet, inbjudningar, export, återimport och permanent radering
  av hushållets information.
- **Driftens kostnader:** vad det kostar att köra Skyttel, till exempel
  användningen av assistenten. Hushållets egna abonnemang och avtal finns
  i kartan och listan.

Den påhittade provpersonen har från början både administratörens och den
driftansvarigas behörigheter så att båda områdena går att se. Roller och
åtkomstkontroller är fortfarande separata. **Provlägen och tillstånd**
låter dig pröva medlem, administratör och driftansvarig var för sig.

Panelbyten behåller mikrofonens tillstånd, även i inställningar,
administration och kostnader: aktivt lyssnande fortsätter och en pausad
mikrofon förblir pausad. Användaren styr mikrofonen i verktygslådan.
Exemplet visar aktivt tal; ingen verklig mikrofon används. **Stoppa tal**
finns i verktygslådan och i panelen Aktuell status.

## Pröva eget arbete och olika tillstånd

1. Öppna **Objekt och samband**, sök efter familjeabonnemanget och välj
   **Ändra uppgifter**. Skriv ett annat namn utan att lägga det i utkastet.
2. Öppna **Samtal och text** och skriv en mening utan att skicka den.
   Öppna inställningarna och välj **Tillbaka till arbetet**. Kontrollera
   att innehållet finns kvar. Gör samma prov med Information.
3. Öppna **Aktuell status** och använd **Fortsätt redigera** eller
   **Fortsätt skriva**. Byt mellan mobilstorlek och datorstorlek.
4. Lägg namnändringen i utkastet och välj **Spara hela utkastet**. Välj
   **Simulera sparfel** eller **Simulera kvitto** i provpanelen och granska
   återkopplingen i statuskortet och panelen Aktuell status.
5. Prova **Tom karta**, **Grafik saknas** och **Tal saknas** under
   **Provlägen och tillstånd**. Listan erbjuder en väg till objekt,
   samband och redigering även utan kartklick och tal.
6. Prova rollerna och **Förlorad åtkomst**. Personliga inloggningssätt och
   inbjudan finns kvar som ingångar. En driftansvarig kan öppna driftens
   kostnader utan att hushållskartan blir synlig.

I B öppnas kartobjekt i egna paneler. **Ändra uppgifter** fortsätter i
objektets panel. Att öppna ett verktyg flyttar inte automatiskt kartans
kamera.

## A och C som jämförelse

A och C finns kvar som tidigare jämförelsealternativ. **Jämför samma
arbetsflöde** visar tre steg: redigera ett namn, öppna samtalet och återgå
till redigeringen. Byt alternativ på samma steg för att se skillnaden.

<!-- markdownlint-disable MD013 -->
| Alternativ | När samtalet öppnas | Tillbaka till redigeringen |
| --- | --- | --- |
| A · Byt panel | Samtalet ersätter redigeringen i samma panel. | Byt tillbaka till redigeringsverktyget. |
| B · Fria paneler | Samtalet öppnas i en egen flyttbar panel. Flera objekt kan vara öppna samtidigt. | Välj objektets panel; på mobil används panelväljaren. |
| C · Flikar i panelen | Samtal och redigering får varsin flik i samma panel. | Välj fliken Ändra uppgifter. |
<!-- markdownlint-enable MD013 -->

Äldre skärmbilder av jämförelsen finns för
[A på dator](A-dator.png), [A på mobil](A-mobil.png),
[C på dator](C-dator.png) och [C på mobil](C-mobil.png).

## Bevarande av arbete och paneler

B:s layout och panelmodell är godkända: flera objekt och samtalet kan
vara öppna samtidigt, panelerna kan flyttas och stängas var för sig,
och mobilvyn låter användaren välja bland öppna paneler.

Prototypen bevarar urval, sökning, oskickad redigering, oskickad
samtalstext och privat utkast mellan verktygsbyten och skärmstorlekar.
Inställningar och information öppnas tillfälligt över det pågående
arbetet. Stängning av ett verktyg kastar inte dess oskickade innehåll.

B:s öppna paneler och deras positioner finns bara i prototypens minne.
Att öppna eller stänga en arbetspanel ger ingen historik för panelerna i
webbläsaren. Tillfälliga inställnings- och informationspaneler använder
adressen och kan följas med webbläsarens tillbaka och framåt.

Variant och tema kan delas i en länk. En direktadress till en vy kan
öppna en arbetspanel vid start. Arbetspaneler kan annars vara stängda
efter omladdning eller nästa besök; deras öppna läge och placering
behöver inte återställas. Beslutet gäller arbetspanelerna. Det innebär
inte att privata utkast ska raderas eller att objektens personliga
placeringar i kartan ska återställas. Prototypens påhittade innehåll
finns enbart i minnet och är ingen modell för beständig lagring.

## Kontroller och avgränsningar

TypeScript, Biome och dokumentkontroller passerar. Lokala Chromium-prov
verifierar två oberoende redigeringar och samtal, individuellt stängda
och återöppnade paneler, fler än tre öppna paneler samt separata
objektvärden i utkastet. Innehåll och placering bevaras vid tillfälliga
vyer. Dragning, tangentbordspilar, flyttknappar, återställd placering och
mobilens panelväljare fungerar. Panelerna hålls inom arbetsytan när
fönstret blir mindre.

Temaval, fokusåtergång och System-temats reaktion på en ändrad
enhetsinställning verifieras i webbläsaren. Popupen ryms vid 390 × 844,
320 × 568 och 320 × 400 pixlar. Redigering, utkast och samtal går att
använda även vid 320 × 400 med intern rullning och sidrullning.
De nya skärmbilderna visar 1440 × 1000 och 390 × 844 pixlar.

Originalvyn D efter extraktionen av det gemensamma skalet jämförs med
upstream-versionen vid 1440 × 1000 och 390 × 844 pixlar i båda teman.
Alla fyra bildjämförelser ger noll avvikande bildpunkter i grundläget.
Detta gäller originalvyn; navigationsprovet lägger till de nya ikonerna,
panelerna och provguiden. Ett bygge med `NODE_ENV=production` inkluderar
inte prototypens ingång eller resurser.

Prototypen ligger enbart på sin kastbara gren. Det är en designbedömning;
fullständig tillgänglighetsverifiering återstår, inklusive skärmläsare,
verklig webbläsarzoom och fysiska enheter. Kartans etiketter vid
textförstoring samt detaljer för kartan och stora listor behöver
fortsatt prövning.

Alla uppgifter är påhittade och finns bara i minnet. Omladdning,
utloggning och provet för förlorad åtkomst tömmer skissens tillfälliga
session. Simulerat sparande kontaktar ingen server. Kamera och samband
är schematiska. Nya objekt, nya samband och administrativa åtgärder visar
ingångar och beskrivningar utan att utföra verkliga ändringar.
