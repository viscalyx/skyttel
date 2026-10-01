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
| Avbryt med text | Escape, när fokus är i textvyn. Meddelandefältet behåller fokus efter **Skicka**. |
| Samtalstexten | Liten text utan synliga namn. Användarens text står i en tonad ruta till höger, och Skyttels text står utan ruta. Medan Skyttel arbetar står raden "Skyttel arbetar… Tryck på Escape för att avbryta." sist, både för talade och skrivna uppdrag. |
| Flera meddelanden | **Skicka** är alltid **Skicka**. Ett nytt meddelande kan skickas medan Skyttel arbetar. Det ersätter då det pågående arbetet, som i dagens Skyttel. |
| Utkastlistan | En tabell som fälls ut till vänster om samtalstexten från raden **Utkast**. På mobil öppnas den mellan raden **Utkast** och samtalstexten. |
| Medgivanderutan | Öppnas intill den knapp i verktygsraden som valdes. |

## Det här går att prova

- **Första starten.** Välj **Skriv till Skyttel** eller **Prata med
  Skyttel**. Medgivanderutan visas, och knappen som valdes avgör om
  samtalet startar med text eller röst. Kryssa i **Fråga inte igen för det
  här hushållet** för att spara medgivandet.
- **Skriva.** Skriv vad som helst och välj **Skicka** eller tryck Enter.
  Skyttel svarar med nästa replik i manuset och lägger ändringar i
  utkastet. Ändringarna syns i kartan med plus, penna och kryss. Skriv
  något med ordet "spara" för att spara utkastet.
- **Avbryta.** Tryck Escape medan Skyttel arbetar.
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
| Oklart sparande | Skyttels egen kontroll, eller knappen **Kontrollera om utkastet sparades** när den egna kontrollen misslyckas. |
| Stoppikon på raden Skyttel arbetar | En stoppikon i samtalstexten, som ett sätt att avbryta utan tangentbord. Den är avslagen från början och är inte beslutad. |
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
| `dator-skrivet-arbetar.png` | Skyttel arbetar med ett skrivet meddelande. Ingen röstruta visas. |
| `dator-rost.png` | Bara röstrutan, med textvyn stängd. |
| `dator-utkast-talat-arbetar.png` | Utkastlistan utfälld medan Skyttel arbetar med ett talat uppdrag. |
| `dator-utkast.png` | Utkastlistan utfälld medan Skyttel talar. |
| `dator-bredare.png` | Samtalstexten och utkastlistan gjorda bredare. |
| `dator-morkt-bruten-kontakt.png` | Mörkt tema med bruten kontakt. |
| `mobil-text.png` | Mobilstorlek med bara text. |
| `mobil-rost-utkast.png` | Mobilstorlek med mikrofonen på och utkastlistan utfälld. |

## Beslut

Beställarens genomgångar den 1 oktober 2026 gav följande.

- Variant C är vald. A och B utgår.
- Röstrutan är samma ruta på samma plats hela tiden, och sidofältet med
  texten ligger under den. Röstrutan visas bara när röstläget är startat.
- **Avbryt** i röstrutan är en liten stoppikon utan text. Röstrutan har
  samma höjd hela tiden och är bara så bred som innehållet kräver.
- **Skicka** är alltid **Skicka**, och flera meddelanden kan skickas efter
  varandra. Escape avbryter när fokus är i textvyn, och meddelandefältet
  behåller fokus efter att ett meddelande har skickats.
- Raden "Skyttel arbetar…" står i samtalstexten även för talade uppdrag.
- Samtalstexten är tät, har liten text och inga synliga namn.
- Samtalstextens och utkastlistans bredd går att ändra.
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

Ärendet är inte stängt ännu. Beslutet skrivs i ärendet.
