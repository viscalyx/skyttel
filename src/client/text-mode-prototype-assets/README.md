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
| A, Fritt fönster | `&variant=A` | Flyttbart fönster som kartans övriga verktyg. På mobil ett blad nedifrån. | Egen liten ruta vid kartans nederkant. | Sist i samtalstexten, på raden **Skyttel arbetar…**. | Överst i fönstret. |
| B, Skrivrad vid kartan | `&variant=B` | En enda rad vid kartans nederkant. Bara Skyttels senaste svar visas tills användaren väljer **Visa samtalstexten**. | Till vänster i skrivraden. | I skrivraden bredvid **Skicka**. | Öppnas från knappen **Utkast** ovanför raden. |
| C, Fast sidofält | `&variant=C` | Kolumn vid högerkanten som knuffar undan kartan. På mobil hela skärmen under verktygsraden. | En rad under kolumnens rubrik. | Bredvid röstrutan under rubriken. | Underst i kolumnen. |

När textvyn är stängd visar alla varianter röstrutan för sig, med
**Avbryt** medan Skyttel arbetar eller talar.

## Det här går att prova

- **Första starten.** Välj **Skriv till Skyttel** eller **Prata med
  Skyttel**. Medgivanderutan visas, och knappen som valdes avgör om
  samtalet startar med text eller röst. Kryssa i **Fråga inte igen för det
  här hushållet** för att spara medgivandet.
- **Skriva.** Skriv vad som helst och välj **Skicka** eller tryck Enter.
  Skyttel svarar med nästa replik i manuset och lägger ändringar i
  utkastet. Ändringarna syns i kartan med plus, penna och kryss. Skriv
  något med ordet "spara" för att spara utkastet.
- **Röst och text samtidigt.** Slå på mikrofonen med **Prata med Skyttel**
  och välj **Säg nästa replik** under **Prototyplägen**. Det sagda och
  Skyttels svar hamnar i samtalstexten med en mikrofonsymbol.
- **Avbryt.** Välj **Avbryt** medan Skyttel arbetar eller talar.
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
| Säg nästa replik | En talad replik när mikrofonen är på. |
| Fyll i nästa replik som text | Manusets nästa replik i meddelandefältet. |
| Glöm medgivandet | Första starten igen. |
| Börja om | Prototypens utgångsläge. |
| Bruten kontakt | Meddelandet med symbol och text. Mikrofonen stängs av och **Skicka** är avstängd. |
| Oklart sparande | Skyttels egen kontroll, eller knappen **Kontrollera om utkastet sparades** när den egna kontrollen misslyckas. |
| Utkastlistan som tabell | Utkastlistan som tabell i stället för lista. |
| Inställning: utkastlistan utfälld vid nytt samtal | Inställningen som ska finnas i Inställningar. |
| Medgivanderutan vid knappen | Medgivanderutan intill verktygsraden i stället för mitt på skärmen. |
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
| `medgivande-dator.png` | Medgivanderutan mitt på skärmen. |
| `medgivande-vid-knappen.png` | Medgivanderutan intill verktygsraden. |
| `A-dator-arbetar.png`, `B-dator-arbetar.png`, `C-dator-arbetar.png` | Skyttel arbetar med ett talat uppdrag medan textvyn är öppen. |
| `A-dator-utkast.png`, `B-dator-utkast.png`, `C-dator-utkast.png` | Utkastlistan utfälld medan Skyttel talar. |
| `B-dator-samtalstext.png` | Variant B med hela samtalstexten utfälld. |
| `A-dator-stangd-textvy.png`, `B-dator-stangd-textvy.png`, `C-dator-stangd-textvy.png` | Textvyn stängd medan mikrofonen är på. |
| `A-mobil.png`, `B-mobil.png`, `C-mobil.png` | Varianterna i mobilstorlek. |
| `C-dator-tabell-morkt-bruten-kontakt.png` | Utkastlistan som tabell, mörkt tema och bruten kontakt. |

## Beslut

Inget beslut är fattat ännu. Beställaren väljer variant i ärendet.
