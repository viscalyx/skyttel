# Tre sätt att organisera Skyttels arbetsyta

Kastbart underlag för beställarens prövning av
[Hur organiseras hela Skyttel med rymdkartan som huvudsaklig arbetsyta?](https://github.com/viscalyx/skyttel/issues/104).
Inget navigationsalternativ är godkänt ännu. Den visuella grunden är
godkända D · Fri rymd, med oförändrade logotyper och ljust och mörkt tema.

## Öppna prototypen

På grenen `prototype/skyttel-navigation`, med projektets beroenden
tillgängliga, kör:

```sh
npm run prototype:navigation
```

- [A · Ett verktyg i taget](http://localhost:4174/?prototype=navigation&variant=A)
- [B · Samtal bredvid](http://localhost:4174/?prototype=navigation&variant=B)
- [C · Arbetsflikar](http://localhost:4174/?prototype=navigation&variant=C)

Pilarna i provpanelen växlar alternativ. Höger- och vänsterpil fungerar
också, utom i textfält och andra inmatningskontroller. Alternativet finns
i adressen. **Provlägen och tillstånd** visar det aktuella arbetet och
låter dig prova tom karta, bortfallen grafik eller tal, nätfel, laddning,
saknad sida, inloggning, första användning och förlorad åtkomst.

Samma panel låter dig ändra tema och behörighet. Driftansvarig är en
separat behörighet. Välj **Förlorad åtkomst** tillsammans med
**Driftansvarig och medlem** för att pröva kostnader utan hushållstillgång.

## Vad alternativen prövar

| Alternativ | Struktur | Avvägning |
| --- | --- | --- |
| A · Ett verktyg i taget | En flytande panel växlar innehåll. Tillbaka följer arbetet. | Få samtidiga ytor, men fler byten mellan samtal och uppgifter. |
| B · Samtal bredvid | Arbetsverktyg till vänster och samtal till höger på dator. Mobil visar en av dem åt gången. | Samtalet kan läsas under arbetet, men mer av kartan täcks. |
| C · Arbetsflikar | En större flytande arbetsyta samlar öppna verktyg i flikar. Flikarna finns kvar när kartan visas. | Lätt att återvända mellan uppgifter, men fler öppna verktyg att hålla reda på. |

Detaljer som öppnas direkt från ett kartobjekt ligger nära objektet,
med placeringen begränsad till arbetsytan. **Ändra uppgifter** öppnar
alternativets större verktygsyta. Klick utanför eller Escape stänger den
lilla detaljrutan. Öppna verktyg flyttar inte automatiskt kartans kamera.

### Jämför skärmbilder

- A: [dator](A-dator.png), [mobil](A-mobil.png).
- B: [dator](B-dator.png), [mobil](B-mobil.png).
- C: [dator](C-dator.png), [mobil](C-mobil.png).
- [Kartan vid start](A-karta.png).
- [Tom karta](A-tom-karta.png).
- [Ljust tema med samtal och detaljruta från kartan](B-ljust-kartdetaljer.png).

## Pröva sammanhängande arbete

1. Öppna **Objekt och samband**, sök efter familjeabonnemanget och öppna
   **Ändra uppgifter**. Skriv ett annat namn utan att lägga det i utkastet.
2. Öppna **Samtal och text** och skriv en mening utan att skicka den.
   Öppna **Fler verktyg**, sedan **Inställningar** eller **Administration**.
3. Använd **Fortsätt redigera** och **Fortsätt skriva** i statusytan.
   Kontrollera att båda texterna finns kvar. Byt till mobilstorlek.
4. Lägg namnändringen i utkastet och välj **Spara hela utkastet**.
   Välj sedan **Simulera sparfel** eller **Simulera kvitto** i provpanelen.
   Kontrollera status även efter att verktyget stängs.
5. I B: låt samtalet vara öppet och välj ett synligt objekt i kartan.
   På mobil växlar **Visa samtalet** och **Visa arbetsverktyget** mellan
   de två ytorna. I C: välj **Karta**, återöppna redigeringsfliken och
   kontrollera innehållet.
6. Prova **Tom karta** och **Lägg till manuellt**, samt **Grafik saknas**
   och **Öppna objekt och samband**. Tal och kartklick behövs inte för
   att nå listan, uppgifterna eller redigeringen.
7. Prova medlem, administratör och driftansvarig. Vid förlorad åtkomst
   finns personliga inloggningssätt och inbjudan kvar som ingångar.
   Driftansvarig kan öppna kostnader utan att hushållskartan blir synlig.

## Föreslagen ordning för ingångarna

Den kompakta verktygslådan ger direkt tillgång till tal, samtal/text,
objekt/samband och fler verktyg. Den kan visa verktygens namn. En tom
karta visar dessutom både tal och manuell inmatning som startvägar.

**Fler verktyg** samlar inställningar, objekt- och sambandstyper,
ändringshistorik, assistenter, sparförsök och en orienterande hjälpyta.
Inställningar leder till tema, inloggningssätt, inbjudan/användar-ID och
utloggning. Assistenter leder till anslutningar och medgivande.

Administratören når medlemmar/inbjudningar, historiska innehållskopplingar,
export, återimport och permanent radering. Driftansvarig når den separata
kostnadsöversikten. Medlem och administratör har samma ingångar till
hushållets vanliga kartarbete. Administrationsbladen prövar placering
och orientering; deras fullständiga flöden ingår i ett senare beslut.

## Bevarande och frågor att avgöra

Prototypen bevarar urval, söktext, schematisk kamera, oskickad
formulärtext, oskickat meddelande, samtal och privat utkast mellan
verktygsbyten och skärmstorlekar. Den prövar också bevarande när
inställningar, administration och kostnader öppnas.

Tal fortsätter i denna skiss vid vanliga verktygsbyten, även till
administration. **Det är ett prövningsalternativ**, inte ett beslut om
var mikrofonen ska fortsätta lyssna. Stoppa tal är synligt i både
verktygslådan och statusytan. Nätfel, saknad sida, laddning och förlorad
åtkomst stoppar provets talmarkering.

Stängning av ett verktyg kastar inte dess oskickade innehåll. I C skiljs
stängning av en flik från att visa kartan med flikarna kvar. Samma
sidbyten kan följas med webbläsarens tillbaka och framåt. B:s separata
samtalspanel har en egen öppna/stäng-kontroll och är inte ett historiksteg.

En permanent statusyta samlar tal, oskickat arbete, utkast, sparande och
fel. Hela utkastet sparas på uttryckligt besked, utan ett extra
granskningssteg. Provet väntar på ett manuellt valt simulerat utfall.
Detta prövar placeringen av återkopplingen; det verifierar inte sparande.

Återkopplingen behöver avgöra panelmodell, vilka verktyg som ska kunna
vara öppna samtidigt, gränsen för fortsatt tal och vilka delar av
bevarandet som ska gälla över hela appen. Statusytans storlek och
verktygens upptäckbarhet behöver bedömas i samma genomgång.

## Läsordning och fokus

- Hopplänkar leder till verktygen och arbetsytan. Verktyg och status
  kommer före kartobjekt och arbetsytans paneler i läsordningen.
- Ett öppnat verktyg fokuserar sin rubrik. Panelens tillbaka- och
  stängknappar följs av innehållet. B har arbetsverktyget före samtalet.
- Mobilväxling i B fokuserar rubriken i den synliga panelen. Den andra
  panelen döljs också för tangentbord och hjälpmedel.
- Escape stänger aktivt verktyg eller detaljruta. Fokus återgår till
  öppningskontrollen om den finns synlig, annars till listverktyget.
- Kartobjekt som täcks av en flytande yta undantas från interaktion.
  Synliga objekt kan öppnas även när samtalet ligger bredvid.
- Panelinnehåll rullar under en fast rubrikrad. Verktygen har minst
  44 pixlars pekmål. Status använder text och ikon tillsammans med färg.
- Talmarkeringen är stilla; inget ljud eller verklig mikrofon används.

## Kontroller och avgränsningar

TypeScript och Biome passerar. Ett bygge med `NODE_ENV=production`
innehåller inte prototypens ingång eller resurser. Prototypen ligger
enbart på sin kastbara gren.

Lokala Chromium-kontroller omfattar alla tre alternativ, bevarande av
redigering/samtal/sökning, simulerat sparfel och kvitto, byte mellan
mobil och dator, borttagen hushållsåtkomst, kostnader utan hushåll,
webbläsarens tillbaka och fokus efter Escape. Riktade prov kontrollerar
mobilens fokusväxling, C:s bevarade flikar, kartval bredvid samtalet och
detaljrutans placering. CSS-proven omfattar bredderna 320, 390, 768,
1001 och 1280 pixlar utan horisontell sidrullning. Skärmbilderna använder
1440 × 1000 och 390 × 844 pixlar.

Det är en designbedömning, inte verifierad WCAG-överensstämmelse.
Verklig webbläsarzoom, skärmläsare, fysiska enheter, alla kombinationer av
tillstånd och hela produktflöden återstår. Den återanvända kartskissen
har fortfarande kända begränsningar i etiketter vid textförstoring;
kartans och stora listors detaljer prövas i separata beslutsärenden.

Alla data är påhittade och finns bara i minnet. Omladdning, utloggning
och provet för förlorad åtkomst tömmer skissens tillfälliga session.
Detta ändrar inte produktreglerna om beständiga privata utkast och
personliga vyer. Simulerade kvitton ändrar namn i provets vyer men
kontaktar ingen server. Kamera och samband är schematiska. Nya objekt,
nya samband och administrativa åtgärder visar ingångar och blad, utan
att utföra verkliga ändringar.
