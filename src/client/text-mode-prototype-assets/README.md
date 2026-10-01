# Prototyp: textläget

Kastbar prototyp för ärendet
[Hur ser textläget ut när man väljer textknappen?](https://github.com/viscalyx/skyttel/issues/180)
i kartan
[Skyttel – väg till ett enkelt och intuitivt samtalsgränssnitt](https://github.com/viscalyx/skyttel/issues/177).

Koden är inte produktionskod. Den har inga tester, ingen server och sparar
ingenting. Hushållet Familjen Berg och alla uppgifter är påhittade, och
Skyttels svar följer ett kort manus.

## Frågan

Hur ser textläget ut när användaren väljer textknappen i verktygsraden och
skriver till Skyttel? Var skriver användaren, var visas Skyttels svar och
samtalets tidigare rader, hur växlar röst och text inom samma samtal, och
hur ser första starten med samtalsmedgivandet ut?

Prototypen följer det fastställda kontrollbeslutet i
[Vilka samtalskontroller och texter ska finnas kvar, ändras eller tas bort?](https://github.com/viscalyx/skyttel/issues/178#issuecomment-5928049123).

## Starta

```sh
npm install
npm run prototype:textlage
```

Öppna sedan <http://localhost:4177/?prototype=textlage>. Prototypen laddas
bara i utvecklingsservern, aldrig i ett bygge.

På grenen `prototype/skyttel-rostlage` öppnar adressen röstlägets
prototyp, som har samma textvy och bygger vidare på röstrutan. Se
[röstlägets README](../voice-mode-prototype-assets/README.md). Textlägets
prototyp som den såg ut vid beslutet finns på grenen
`prototype/skyttel-textlage`.

## Det prototypen visar

Prototypen visar den valda utformningen, som under arbetet hette variant
C. Varianterna A (ett flyttbart fönster) och B (en skrivrad vid kartans
nederkant) utgick och finns kvar i grenens tidigare incheckningar.

| Del | Utformning |
| --- | --- |
| Textvyn | Ett sidofält vid högerkanten som knuffar undan kartan. Det ligger under röstrutan. På mobil fyller det skärmen under röstrutan. |
| Bredd | Ett handtag på samtalstextens vänsterkant ändrar samtalstextens bredd. Ett handtag på utkastlistans vänsterkant ändrar utkastlistans bredd. Handtagen går att dra och att flytta med vänster- och högerpil. |
| Röstrutan | Visas bara när röstläget är startat. Samma ruta på samma plats uppe till höger, oavsett om textvyn är öppen eller stängd. Höjden är alltid densamma, och bredden följer innehållet. |
| Avbryt med röst | En liten stoppikon i röstrutan medan Skyttel arbetar eller talar. |
| Avbryt med text | Escape, när fokus är i textvyn och Skyttel arbetar. Annars gör Escape ingenting. Meddelandefältet behåller fokus efter **Skicka**. |
| Avbryt på pekskärm | Där finns ingen Escape. **Skicka** blir en stoppikon medan Skyttel arbetar, och det går att skicka ett meddelande åt gången. |
| Samtalstexten | Liten text utan synliga namn. Användarens text står i en tonad ruta till höger, och Skyttels text står utan ruta. Medan Skyttel arbetar står raden "Skyttel arbetar… Tryck på Escape för att avbryta." sist, både för talade och skrivna uppdrag. |
| Flera meddelanden | På dator kan ett nytt meddelande skickas medan Skyttel arbetar. Det ställs i kö och avbryter inte det pågående arbetet. Raden "Skyttel arbetar…" visar hur många meddelanden som väntar. |
| Stängd textvy | Om textvyn stängs medan Skyttel arbetar med ett skrivet meddelande får knappen **Skriv till Skyttel** en liten arbetsmarkering. Markeringen ligger ovanpå knappen och ändrar inte verktygsradens plats eller bredd. |
| Utkastlistan | En tabell som fälls ut till vänster om samtalstexten från knappen **Visa utkastet**, som har en pil åt det håll utkastet öppnas och visar antalet osparade ändringar. Knappen heter **Dölj utkastet** när utkastet är utfällt. På mobil öppnas utkastet mellan knappen och samtalstexten. |
| Medgivanderutan | Öppnas intill den knapp i verktygsraden som valdes. |
| Kontext | En mätare under textvyns rubrik, **Kontext**, visar hur många procent av samtalets kontext som är fylld. Från 85 procent visar även röstrutan en symbol med procenttalet, och rutan blir då bredare. Värdena i prototypen är påhittade. |
| Full kontext | Skyttel sammanfattar samtalet automatiskt, skriver en rad om det i samtalstexten, och mätaren går ner. Om sammanfattningen inte går att göra stängs **Skicka** av och ett meddelande pekar på **Nytt samtal**. Sammanfattningen är simulerad. |

## Det här går att prova

- **Första starten.** Välj **Skriv till Skyttel** eller **Prata med
  Skyttel**. Medgivanderutan visas, och knappen som valdes avgör om
  samtalet startar med text eller röst. Kryssa i **Fråga inte igen för det
  här hushållet** för att spara medgivandet.
- **Skriva.** Skriv vad som helst och välj **Skicka** eller tryck Enter.
  Skyttel svarar med nästa replik i manuset och lägger ändringar i
  utkastet. Ändringarna syns i kartan med plus, penna och kryss. Skriv
  något med ordet "spara" för att spara utkastet.
- **Avbryta.** Tryck Escape medan Skyttel arbetar. I mobilstorlek och med
  reglaget **Pekskärm utan Escape** blir **Skicka** en stoppikon i stället.
- **Kö.** Skicka flera meddelanden direkt efter varandra. Skyttel svarar
  på dem i tur och ordning.
- **Röst och text samtidigt.** Välj **Säg nästa replik** under
  **Prototyplägen**. Det sagda och Skyttels svar hamnar i samtalstexten.
- **Ändra bredd.** Dra i handtagen till vänster om samtalstexten och
  utkastlistan.
- **Nytt samtal.** Tömmer samtalstexten. Skyttel säger hur många osparade
  ändringar som ligger kvar i utkastet.
- **Stänga textvyn.** Samtalet fortsätter, mikrofonen är kvar i sitt läge
  och oskickad text finns kvar när textvyn öppnas igen.

## Prototyplägen

Den streckade rutan hör inte till utformningen. Under **Prototyplägen**
finns det aktuella läget och reglage som sätter prototypen i lägen som
annars är svåra att nå.

| Reglage | Visar |
| --- | --- |
| Säg nästa replik | En talad replik. Reglaget slår på mikrofonen om den är av, utan medgivanderuta. |
| Fyll i nästa replik som text | Manusets nästa replik i meddelandefältet. |
| Glöm medgivandet | Första starten igen. |
| Börja om | Prototypens utgångsläge. Manuset börjar om från första repliken. |
| Bruten kontakt | Meddelandet med symbol och text. Mikrofonen stängs av och **Skicka** är avstängd. |
| Sammanfatta automatiskt vid full kontext | Påslaget: Skyttel sammanfattar samtalet vid 100 procent. Avslaget: läget där sammanfattningen inte går att göra, så att **Skicka** stängs av och ett meddelande pekar på **Nytt samtal**. |
| Kontext | Mätaren vid 70, 90 eller 100 procent. Annars följer den samtalet. |
| Oklart sparande | Skyttels egen kontroll, eller knappen **Kontrollera om utkastet sparades** när den egna kontrollen misslyckas. |
| Pekskärm utan Escape (som iPad) | Pekskärmens beteende på en bred skärm: **Skicka** blir en stoppikon medan Skyttel arbetar, och ett meddelande åt gången. |
| Utkastlistan som lista | Utkastlistan som lista i stället för tabell. |
| Inställning: utkastlistan utfälld vid nytt samtal | Inställningen som ska finnas i Inställningar. |
| Medgivanderutan mitt på skärmen | Medgivanderutan mitt på skärmen i stället för intill verktygsradens knapp. |
| Mörkt tema | Mörkt tema. |
| Visa som mobil | Prototypen i en ram som är 390 × 780 bildpunkter. |

## Ingår inte

- Långt tryck och tangentkombinationen för röstknappen. De hör till
  [Hur ser röstläget ut med en liten vågform?](https://github.com/viscalyx/skyttel/issues/179).
- Röstrutans texter och utseende i varje läge. De hör till
  [Vad visar röstrutan i varje läge?](https://github.com/viscalyx/skyttel/issues/182).
  Prototypen använder de fastställda statusorden och **Rösten startar**.
- Verktygsradens övriga knappar. De gör ingenting här.
- Kartan är en enkel ritning, inte Skyttels riktiga karta.

## Skärmbilder

| Fil | Visar |
| --- | --- |
| `medgivande-vid-knappen.png` | Medgivanderutan intill verktygsradens knapp. |
| `mobil-medgivande.png` | Medgivanderutan i mobilstorlek. |
| `dator-ko.png` | Tre skrivna meddelanden i rad. Två väntar i kö och ingen röstruta visas. |
| `dator-stangd-textvy-arbetar.png` | Textvyn stängd medan Skyttel arbetar med ett skrivet meddelande. Knappen i verktygsraden har en arbetsmarkering. |
| `dator-samtal.png` | Textvyn med samtalstext och knappen **Visa utkastet**. |
| `dator-utkast-talat-arbetar.png` | Utkastlistan utfälld medan Skyttel arbetar med ett talat uppdrag. |
| `dator-utkast.png` | Utkastlistan utfälld medan Skyttel talar. |
| `dator-bredare.png` | Samtalstexten och utkastlistan gjorda bredare. |
| `dator-kontext-90.png` | Mätaren vid 90 procent, med symbolen i röstrutan. |
| `dator-kontext-sammanfattad.png` | Efter en automatisk sammanfattning vid full kontext. |
| `dator-morkt-bruten-kontakt.png` | Mörkt tema med bruten kontakt. |
| `mobil-arbetar.png` | Mobilstorlek medan Skyttel arbetar. **Skicka** är en stoppikon. |
| `mobil-rost-utkast.png` | Mobilstorlek med mikrofonen på och utkastlistan utfälld. |

## Beslut

Ärendet är löst. Det fastställda beslutet står i
[ärendets beslutskommentar](https://github.com/viscalyx/skyttel/issues/180#issuecomment-5930465393),
och den gäller framför listan här. Beställarens genomgångar den
1 oktober 2026 gav följande.

- Variant C är vald. A och B utgår.
- Röstrutan är samma ruta på samma plats hela tiden, och sidofältet med
  texten ligger under den. Röstrutan visas bara när röstläget är startat.
- **Avbryt** i röstrutan är en liten stoppikon utan text. Röstrutan har
  samma höjd hela tiden och är bara så bred som innehållet kräver.
- På dator kan flera meddelanden skickas efter varandra. De köas och
  avbryter inte det pågående arbetet. Escape avbryter när fokus är i
  textvyn och Skyttel arbetar, och gör annars ingenting. Meddelandefältet
  behåller fokus efter att ett meddelande har skickats.
- På mobil enhet skickas ett meddelande åt gången, och **Skicka** blir en
  stoppikon medan Skyttel arbetar. Mobil enhet betyder pekskärm, så en
  iPad räknas dit.
- Ett avbrott stoppar både det pågående arbetet och allt som väntar i kön.
- Skyttel minns hela samtalet tills användaren väljer **Nytt samtal**.
- En mätare, **Kontext**, visar hur många procent av samtalets kontext
  som är fylld. När användaren pratar visar röstrutan en symbol när
  kontexten börjar bli full, från 85 procent.
- Vid full kontext sammanfattar Skyttel samtalet automatiskt. Om det inte
  går stängs **Skicka** av och Skyttel pekar på **Nytt samtal**.
- Om textvyn är stängd medan Skyttel arbetar med ett skrivet meddelande
  visar knappen **Skriv till Skyttel** en arbetsmarkering som inte ändrar
  verktygsradens plats eller bredd.
- Det ska synas tydligt att utkastet går att fälla ut och åt vilket håll.
- Raden "Skyttel arbetar…" står i samtalstexten även för talade uppdrag.
- Samtalstexten är tät, har liten text och inga synliga namn.
- Samtalstextens och utkastlistans bredd går att ändra. Bredderna sparas
  per användare. Prototypen sparar dem inte.
- Utkastlistan är en tabell som fälls ut till vänster om samtalstexten.
- Medgivanderutan öppnas intill verktygsradens knapp.
- När mikrofonen är på och användaren skriver svarar Skyttel även med
  röst. Svaret står alltid i samtalstexten.
- Talade rader märks inte i samtalstexten.
- Förbehållet om att samtalstexten kan innehålla fel flyttar till
  medgivandetexten och **Information och hjälp**.
- **Nytt samtal** frågar inte om medgivande igen. Ett osparat medgivande
  gäller tills användaren lämnar hushållets karta eller laddar om sidan.
- Vid bruten kontakt går meddelandefältet att skriva i. Bara **Skicka** är
  avstängd.

Kommande prototyper i kartan utgår från den här grenen.
