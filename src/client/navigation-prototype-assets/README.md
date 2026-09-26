# Tre sätt att organisera Skyttels arbetsyta

Kastbart underlag för beställarens prövning av
[Hur organiseras hela Skyttel med rymdkartan som huvudsaklig arbetsyta?](https://github.com/viscalyx/skyttel/issues/104).
Panelmodellen och gränsen för fortsatt tal är öppna frågor.

Bekräftade beslut och beställarens preciseringar finns i ärendet:

- [Ramar för prototypen och bevarande av arbete](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845195246).
- [Informationsikonens innehåll](https://github.com/viscalyx/skyttel/issues/104#issuecomment-5845197848).

## Samma grund som D · Fri rymd

Navigationsprovet utgår från
[ursprungliga D i upstream](https://github.com/viscalyx/skyttel/tree/f3f60ac).
Originalet och navigationsprovet delar nu skalet
[VisualPrototypeDFrame](../VisualPrototypeDFrame.tsx): verktygslåda,
hushållsrubrik, kartbakgrund och det lilla statuskortet. D:s stilmall
återanvänds oförändrad. Navigationspanelerna och provverktygen läggs till
ovanpå den grunden.

**Öppna ursprungliga D** i provpanelen visar D separat för jämförelse.
Logotyperna samt ljust och mörkt tema finns kvar.

## Öppna prototypen

På grenen `prototype/skyttel-navigation`, med projektets beroenden
tillgängliga, kör:

```sh
npm run prototype:navigation
```

- [A · Byt panel](http://localhost:4174/?prototype=navigation&variant=A)
- [B · Två paneler](http://localhost:4174/?prototype=navigation&variant=B)
- [C · Flikar i panelen](http://localhost:4174/?prototype=navigation&variant=C)

Välj A, B eller C i provpanelen längst ned. Höger- och vänsterpil fungerar
också utanför inmatningskontroller. Alternativet finns i adressen.

## Jämför samma arbetsflöde

Välj **Jämför samma arbetsflöde**. Guiden förbereder samma namnändring och
oskickade samtalstext i alla tre alternativ:

1. **Redigera:** exemplet föreslår namnet Familjens musik om du inte redan
   har skrivit något. Redigera namnet och behåll texten medan du jämför.
2. **Öppna samtalet:** se vad som händer med redigeringen när samtalet
   öppnas.
3. **Återgå till redigeringen:** fortsätt med texten som finns kvar.

Byt A/B/C på samma steg för att jämföra panelmodellerna. Skillnaden blir
tydligast i steg 2:

<!-- markdownlint-disable MD013 -->
| Alternativ | När samtalet öppnas | Tillbaka till redigeringen |
| --- | --- | --- |
| A · Byt panel | Samtalet ersätter redigeringen i samma panel. | Byt tillbaka till redigeringsverktyget. |
| B · Två paneler | Samtalet öppnas bredvid redigeringen på dator. På mobil visas en panel åt gången. | Redigeringen ligger kvar; på mobil väljer du Arbete. |
| C · Flikar i panelen | Samtal och redigering får varsin flik i samma panel. | Välj fliken Ändra uppgifter. |
<!-- markdownlint-enable MD013 -->

Guiden visar ett förberett exempel. Stäng jämförelsen för att utforska
verktygen fritt. Ingen panelmodell är godkänd genom denna skiss.

### Jämför skärmbilder

- [D:s gemensamma grund](D-grund.png).
- A, steg 2: [dator](A-dator.png), [mobil](A-mobil.png).
- B, steg 2: [dator](B-dator.png), [mobil](B-mobil.png).
- C, steg 2: [dator](C-dator.png), [mobil](C-mobil.png).
- [Inställningar på dator](Installningar-dator.png).
- [Information på dator](Information-dator.png).
- [Aktuell status på mobil](Status-mobil.png).

## Tre olika ikoner i verktygslådan

**Inställningar** öppnar en tillfällig panel med personliga val,
inloggningssätt och assistenter. Där finns också tydliga grupper för
hushållets administration och driftens kostnader. **Tillbaka till
arbetet** återvisar verktyget som var öppet, med innehållet kvar.

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

Exemplet markerar att talet fortsätter medan de här områdena öppnas.
Det är ett synligt prövningsalternativ för den öppna talfrågan. Ingen
verklig mikrofon används. **Stoppa tal** finns i verktygslådan och i
panelen Aktuell status.

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

Detaljer från kartobjekt öppnas nära objektet. **Ändra uppgifter** öppnar
en större panel. Klick utanför eller Escape stänger detaljrutan. Att
öppna ett verktyg flyttar inte automatiskt kartans kamera.

## Återkoppling som återstår

Prövningen behöver avgöra vilken panelmodell som passar arbetet och var
talet ska fortsätta lyssna. Använd steg 2 i jämförelsen för panelvalet och
det särskilda administrationsexemplet för talfrågan. Beslut och nya
preciseringar dokumenteras i ärendet.

Prototypen bevarar urval, sökning, oskickad redigering, oskickad
samtalstext och privat utkast mellan verktygsbyten och skärmstorlekar.
Inställningar och information öppnas tillfälligt över det pågående
arbetet. Stängning av ett verktyg kastar inte dess oskickade innehåll.

I C är stängning av en flik skilt från att visa kartan med flikarna kvar.
B:s separata samtalspanel kan öppnas och stängas självständigt. Vanliga
sidbyten och tillfälliga paneler kan följas med webbläsarens tillbaka och
framåt.

## Kontroller och avgränsningar

TypeScript, Biome och dokumentkontroller passerar. Lokala Chromium-prov
kontrollerar jämförelsestegen i A/B/C, tillfälliga paneler, bevarad
redigering och samtalstext samt ingångarna till administration och
driftkostnader. Samtal, Information och återgång går att använda vid
390 × 844, 320 × 568 och 320 × 400 pixlar med intern rullning eller
sidrullning när det behövs. Skärmbilderna visar 1440 × 1000 och
390 × 844 pixlar.

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
