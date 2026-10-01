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

## Varianterna

Byt variant med pilarna i den streckade rutan överst eller med
piltangenterna. Adressen ändras, så en variant går att länka till.

| Variant | Adress | Textvyn | Röstrutan | **Avbryt** | Utkastlistan |
| --- | --- | --- | --- | --- | --- |
| A, Fritt fönster | `&variant=A` | Flyttbart fönster som kartans övriga verktyg. På mobil ett blad nedifrån. | Egen liten ruta nere till höger. | Talat uppdrag: sist i samtalstexten. Skrivet meddelande: **Skicka** blir **Avbryt**. | Fälls ut till höger om samtalstexten. Fönstret blir bredare. |
| C, Fast sidofält | `&variant=C` | Sidofält vid högerkanten som knuffar undan kartan. Det ligger under röstrutan. | Samma ruta på samma plats uppe till höger, oavsett om textvyn är öppen eller stängd. | Talat uppdrag: en stoppikon i röstrutan. Skrivet meddelande: **Skicka** blir **Avbryt**. | Fälls ut till vänster om samtalstexten. Sidofältet blir bredare. |

Raden **Utkast** ovanför samtalstexten fäller ut och fäller ihop
utkastlistan. På mobil finns ingen plats bredvid samtalstexten, så där
öppnas utkastlistan mellan raden **Utkast** och samtalstexten.

När textvyn är stängd visar båda varianterna röstrutan för sig, med
**Avbryt** medan Skyttel arbetar eller talar.

Variant B, en skrivrad vid kartans nederkant, utgick vid första
genomgången och är borttagen. Bokstäverna A och C är kvar så att tidigare
anteckningar stämmer.

## Det här går att prova

- **Första starten.** Välj **Skriv till Skyttel** eller **Prata med
  Skyttel**. Medgivanderutan visas, och knappen som valdes avgör om
  samtalet startar med text eller röst. Rutan öppnas intill den knapp som valdes.
  Kryssa i **Fråga inte igen för det här hushållet** för att spara
  medgivandet.
- **Skriva.** Skriv vad som helst och välj **Skicka** eller tryck Enter.
  Skyttel svarar med nästa replik i manuset och lägger ändringar i
  utkastet. Ändringarna syns i kartan med plus, penna och kryss. Skriv
  något med ordet "spara" för att spara utkastet.
- **Röst och text samtidigt.** Välj **Säg nästa replik** under
  **Prototyplägen**. Det sagda och Skyttels svar hamnar i samtalstexten,
  utan särskild märkning.
- **Avbryt.** När ett skrivet meddelande är skickat blir **Skicka** till
  **Avbryt** tills Skyttel är klar. Escape gör samma sak när fokus är i
  textvyn. Ett talat uppdrag avbryts i röstrutan. Ett dubbelklick på
  **Skicka** avbryter inte det nyss skickade meddelandet.
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
| Oklart sparande | Skyttels egen kontroll, eller knappen **Kontrollera om utkastet sparades** när den egna kontrollen misslyckas. |
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
  Prototypen använder de fem fastställda statusorden och **Rösten
  startar**.
- Verktygsradens övriga knappar. De gör ingenting här.
- Kartan är en enkel ritning, inte Skyttels riktiga karta.

## Skärmbilder

| Fil | Visar |
| --- | --- |
| `medgivande-vid-knappen.png` | Medgivanderutan intill verktygsradens knapp. |
| `A-mobil-medgivande.png`, `C-mobil-medgivande.png` | Medgivanderutan i mobilstorlek. |
| `A-dator-rost.png`, `C-dator-rost.png` | Bara röstrutan, med textvyn stängd. |
| `A-dator-skrivet-arbetar.png`, `C-dator-skrivet-arbetar.png` | Skyttel arbetar med ett skrivet meddelande. **Skicka** har blivit **Avbryt**. |
| `A-dator-samtal.png`, `C-dator-samtal.png` | Textvyn med samtalstext och utkastlistan hopfälld. |
| `A-dator-utkast-talat-arbetar.png`, `C-dator-utkast-talat-arbetar.png` | Utkastlistan utfälld medan Skyttel arbetar med ett talat uppdrag. |
| `A-dator-utkast.png`, `C-dator-utkast.png` | Utkastlistan utfälld medan Skyttel talar. |
| `C-dator-morkt-bruten-kontakt.png` | Variant C i mörkt tema med bruten kontakt. |
| `A-mobil.png`, `C-mobil.png` | Varianterna i mobilstorlek med mikrofonen på. |
| `A-mobil-utkast.png`, `C-mobil-utkast.png` | Mobilstorlek med utkastlistan utfälld. |

## Beslut

Beställarens första genomgång den 1 oktober 2026:

- Variant B utgår.
- Utkastlistan fälls ut bredvid samtalstexten: till höger i A och till
  vänster i C.
- **Skicka** ligger i höjd med meddelandefältets mitt.

Beställarens andra genomgång den 1 oktober 2026:

- Det lutar åt variant C. Röstrutan är samma ruta på samma plats hela
  tiden, och sidofältet med texten ligger under den.
- Ett talat uppdrag avbryts i röstrutan. För ett skrivet meddelande blir
  **Skicka** till **Avbryt**, och Escape avbryter.
- Utkastlistan är en tabell.
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

Tillägg från beställaren samma dag:

- **Avbryt** i röstrutan är bara en liten stoppikon, utan text. Röstrutan
  har samma höjd hela tiden och är bara så bred som innehållet kräver.
- Samtalstexten är tätare och har mindre text. Raderna har inga synliga
  namn. Användarens text står i en tonad ruta till höger, och Skyttels text
  står utan ruta. Skärmläsare får fortfarande veta vem som sa vad.

Ärendet är inte stängt ännu. Beslutet skrivs i ärendet.
