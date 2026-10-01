# Prototyp: röstläget

Kastbar prototyp för ärendet
[Hur ser röstläget ut med en liten vågform?](https://github.com/viscalyx/skyttel/issues/179)
i kartan
[Skyttel – väg till ett enkelt och intuitivt samtalsgränssnitt](https://github.com/viscalyx/skyttel/issues/177).

Koden är inte produktionskod. Den har inga tester, ingen server och sparar
ingenting. Hushållet Familjen Berg och alla uppgifter är påhittade, och
Skyttels svar följer ett kort manus.

## Frågan

Hur ser röstläget ut när användaren startar samtalet med röstknappen i
verktygsraden och bara en liten vågform visar att talet hörs?

Prototypen följer tre fastställda beslut:

- [Vilka samtalskontroller och texter ska finnas kvar, ändras eller tas bort?](https://github.com/viscalyx/skyttel/issues/178#issuecomment-5928049123)
- [Hur ser textläget ut när man väljer textknappen?](https://github.com/viscalyx/skyttel/issues/180#issuecomment-5930465393)
- [Vad visar röstrutan i varje läge?](https://github.com/viscalyx/skyttel/issues/182#issuecomment-5935519637)

De besluten avgör redan röstrutans plats och innehåll, de sju statusorden
och deras ordning, när stoppikonen syns, samtalsnotisernas texter och hur
textvyn ser ut. Prototypen prövar det som återstår:

- vågformens utseende i varje statusord
- samtalsnotisens plats, symboler och utseende
- markeringen på **Skriv till Skyttel**
- långt tryck och tangentkombinationen
- hur en samtalsnotis stängs när den visades efter ett tryck utan
  pågående samtal
- röstknappens symbol när mikrofonen är på och av.

## Starta

```sh
npm install
npm run prototype:rostlage
```

Öppna sedan <http://localhost:4178/?prototype=rostlage>. Prototypen laddas
bara i utvecklingsservern, aldrig i ett bygge.

## Varianterna

Sidan öppnas med den valda utformningen, variant V. Den står under
[Beslut](#beslut). Varianterna A, B och C är de som beställaren valde
mellan, och de finns kvar för jämförelse.

Raden längst ner på sidan byter variant. Vänsterpil och högerpil gör
samma sak. Adressen får `variant=V`, `variant=A`, `variant=B` eller
`variant=C`, så att en variant går att länka till.

| Del | A: Staplar och kort | B: Linje och hopsatt notis | C: Puls och rad |
| --- | --- | --- | --- |
| Vågform | Sju staplar. Stilla är de sju punkter. | En linje. Stilla är den rak, nedtonad är den streckad. | En punkt med en ring som växer med ljudet. Nedtonad är punkten ihålig. |
| Samtalsnotisens plats | Ett eget kort under röstrutan. | Sitter ihop med röstrutan, som står på notisen som en flik. | En rad i höjd med röstrutan, till vänster om den. |
| Samtalsnotisens symbol | En symbol per situation: mikrofon, högtalare, kontakt, frågetecken, mätare, varning. | En symbol per slag: en för hinder och en för händelse. Hindret har röd kant, händelsen gul. | En symbol per situation. |
| Markering på **Skriv till Skyttel** | En prick uppe till höger på knappen. | Ett tecken i en liten bricka: tre punkter när Skyttel har svarat, frågetecken när Skyttel väntar på svar. | En ram runt hela knappen. |
| Notis efter tryck utan samtal stängs | Med en stängknapp. | Med ett tryck utanför notisen eller med Escape. | Av sig själv efter 6 sekunder. |
| Röstknappens symbol | Mikrofon när den är av, stoppsymbol när den är på. Knappen har alltid accentfärg. | Mikrofon i båda lägena. Av är en vanlig knapp, på har accentfärg. | Som B. |

Vågformens färg säger vem som hörs i alla tre varianterna: accentfärg när
användaren talar, textfärg när Skyttel talar och grå när rösten inte är
redo. När användaren talar följer vågformen ljudnivån. När Skyttel talar
rör den sig jämnt.

### Blanda delar

Under **Blanda delar från varianterna** går varje del att välja för sig,
till exempel vågformen från A med notisen från C. Valet hamnar i adressen:

| Parameter | Värden |
| --- | --- |
| `vag` | `staplar`, `linje`, `puls` |
| `notis` | `kort`, `fast`, `rad` |
| `symbol` | `situation`, `slag` |
| `markering` | `prick`, `tecken`, `ram` |
| `stang` | `knapp`, `utanfor`, `tid` |
| `knapp` | `stopp`, `mikrofon` |

Ett byte av variant nollställer de egna valen.

## Det här går att prova

- **Första starten.** Välj **Prata med Skyttel**. Medgivanderutan visas
  intill knappen, och rösten startar efter **Godkänn och starta**.
- **De sju statusorden.** Välj **Säg nästa replik** under
  **Prototyplägen**. Röstrutan går igenom **Du talar**, **Skyttel
  arbetar** och **Skyttel talar** och tillbaka till **Lyssnar**. Den
  fjärde repliken får Skyttel att fråga, och rutan visar **Väntar på ditt
  svar**. Den sjätte repliken sparar utkastet, och rutan visar **Sparat**.
- **Kort tryck.** Ett tryck på röstknappen slår på mikrofonen, och nästa
  tryck slår av den. Ett tryck medan rösten startar avbryter starten.
- **Långt tryck.** Håll in röstknappen när mikrofonen är av. Skyttel
  lyssnar tills knappen släpps och arbetar sedan med det som sades.
  Mikrofonen är av efteråt.
- **Tangentkombinationen.** Ctrl+Mellanslag på Windows och Linux,
  Ctrl+Skift+Mellanslag på macOS. Ett kort tryck gör samma sak som ett
  kort tryck på knappen, och ett långt gör samma sak som ett långt. Raden
  **Tangenter** under **Prototyplägen** visar vad prototypen uppfattade.
- **Stoppikonen.** Syns medan Skyttel arbetar eller talar och avbryter.
- **Frågan står kvar.** Slå av mikrofonen medan **Väntar på ditt svar**
  visas. Rutan står kvar med nedtonad vågform.
- **Samtalsnotiser.** Reglagen under **Prototyplägen** sätter upp varje
  situation. En händelse har en stängknapp och försvinner vid nästa
  försök. Ett hinder står kvar tills hindret är borta.
- **Utan pågående samtal.** Välj **Börja om** och sedan **Bruten
  kontakt**. Samtalsknapparna ser avstängda ut. Ett tryck på en av dem
  visar samtalsnotisen.
- **Textvyn öppen.** Samtalsnotisen står då i textvyn och inte vid
  röstrutan.
- **Markeringen på Skriv till Skyttel.** Skriv ett meddelande och stäng
  textvyn innan Skyttel har svarat. Knappen visar först arbetsmarkeringen
  och sedan markeringen för att Skyttel har svarat.

## Prototyplägen

De streckade rutorna hör inte till utformningen. Rutan nere till vänster
visar det aktuella läget och har reglage som sätter prototypen i lägen
som annars är svåra att nå.

| Reglage | Visar |
| --- | --- |
| Säg nästa replik | En talad replik. Reglaget slår på mikrofonen om den är av, utan medgivanderuta. |
| Fyll i nästa replik som text | Manusets nästa replik i meddelandefältet. |
| Rösten bryts | Mikrofonen stängs av och samtalsnotisen om avbruten röst visas. |
| Glöm medgivandet | Första starten igen. |
| Börja om | Prototypens utgångsläge. Manuset börjar om från första repliken. |
| Riktig mikrofon styr vågformen | Webbläsaren frågar om mikrofonen. Vågformen följer den riktiga ljudnivån, och en paus efter tal skickar manusets nästa replik. Inget ljud lämnar webbläsaren. |
| Läs upp Skyttels svar med webbläsarens röst | **Skyttel talar** varar då så länge uppläsningen varar, och stoppikonen tystar den. |
| Nästa start av rösten | Någon av de sex händelser som kan stoppa starten, till exempel att webbläsaren nekar mikrofonen. Valet gäller en start. |
| Webbläsaren stoppar ljudet vid nästa start | Samtalsnotisen med **Starta ljudet**. Rutan visar **Rösten startar** tills ljudet är startat. |
| Nästa uppdrag misslyckas | Samtalsnotisen om att Skyttel inte kunde slutföra uppdraget. |
| Bruten kontakt | Mikrofonen stängs av och samtalsnotisen visas. |
| Samtalet är inte tillgängligt | Som bruten kontakt, med notisen om att samtal inte är tillgängligt. |
| Oklart sparande | Skyttels egen kontroll, eller knappen **Kontrollera om utkastet sparades** när den egna kontrollen misslyckas. |
| Sammanfatta automatiskt vid full kontext | Avslaget: notisen om full kontext med **Nytt samtal**, när kontexten är 100 procent. |
| Kontext | Kontexten vid 70, 90 eller 100 procent. Från 85 procent visar röstrutan symbolen. |
| Gräns för långt tryck | Hur länge knappen ska hållas inne innan trycket räknas som långt: 0,3, 0,45 eller 0,6 sekunder. |
| Tangentkombination | Ctrl+Mellanslag eller Ctrl+Skift+Mellanslag, oavsett plattform. |
| Minskad rörelse | Vågformen visar en fast form i stället för rörelse. Inställningen i operativsystemet gör samma sak. |
| Mörkt tema, Visa som mobil och övriga | Som i textlägets prototyp. |

### Riktig mikrofon och andra enheter

Webbläsaren ger bara ut mikrofonen på en säker adress. Reglaget **Riktig
mikrofon styr vågformen** fungerar därför på `localhost` men inte när
prototypen öppnas från en annan enhet med datorns adress i nätverket. Där
visas samtalsnotisen om att webbläsaren saknar stöd för röst. Långt tryck,
tangentkombinationen och allt annat går att prova på andra enheter utan
reglaget.

## Ingår inte

- Riktig taligenkänning och Skyttels riktiga röst. Det användaren säger
  blir alltid manusets nästa replik.
- Mobilens särskilda utformning. I mobilstorlek är varje samtalsnotis ett
  kort under röstrutan, oavsett variant. Hur notiserna, röstrutan och
  textvyn samspelar med skärmtangentbordet är inte avgjort i kartan.
- Hur statusorden och samtalsnotiserna förmedlas till hjälpmedel, och hur
  vågformen ska visas vid minskad rörelse. Det avgörs i
  [Hur förmedlas röstrutans statusord och samtalsnotiser till hjälpmedel?](https://github.com/viscalyx/skyttel/issues/188).
  Prototypen har en enkel fast form som utgångspunkt.
- Verktygsradens övriga knappar. De gör ingenting här.
- Kartan är en enkel ritning, inte Skyttels riktiga karta.

## Skärmbilder

Filer som börjar med `a-`, `b-` och `c-` finns för varje variant. De togs
före beslutet. Filer som börjar med `vald-` visar den valda utformningen.

| Fil | Visar |
| --- | --- |
| `vald-statusord.png` | Den valda röstrutan i varje statusord. |
| `vald-notis-hinder-med-knapp.png`, `vald-notis-handelse.png` | De valda samtalsnotiserna: ett hinder med knapp och en händelse med stängknapp. |
| `vald-utan-samtal-avstangda-knappar.png`, `vald-utan-samtal-notis-efter-tryck.png` | Bruten kontakt utan pågående samtal, före och efter ett tryck, med den kortare texten. |
| `vald-textknapp-har-svarat.png` | Den valda markeringen när Skyttel har svarat. |
| `a-statusord.png`, `b-statusord.png`, `c-statusord.png` | Röstrutan i varje statusord, uppifrån: **Rösten startar**, **Lyssnar**, **Du talar**, **Skyttel arbetar**, **Skyttel talar**, **Väntar på ditt svar** med mikrofonen på och av, **Sparat**. |
| `*-notis-hinder-med-knapp.png` | Ett hinder med knapp: oklart sparande där den egna kontrollen misslyckades. |
| `*-notis-handelse.png` | En händelse med stängknapp: webbläsaren nekar mikrofonen. Röstrutan syns inte. |
| `*-notis-stoppat-ljud.png` | Stoppat ljud med **Starta ljudet**, medan rutan visar **Rösten startar**. |
| `*-utan-samtal-avstangda-knappar.png` | Bruten kontakt utan pågående samtal. Samtalsknapparna ser avstängda ut. |
| `*-utan-samtal-notis-efter-tryck.png` | Samtalsnotisen efter ett tryck på en av de avstängda knapparna. |
| `*-textknapp-arbetar.png` | Arbetsmarkeringen på **Skriv till Skyttel**. |
| `*-textknapp-har-svarat.png` | Markeringen när Skyttel har svarat. |
| `b-textknapp-vantar-pa-svar.png` | Markeringen i variant B när Skyttel väntar på svar. |
| `medgivande-vid-rostknappen.png` | Medgivanderutan vid första starten med röstknappen. |
| `notis-i-textvyn.png` | En samtalsnotis i den öppna textvyn. |
| `langt-tryck-du-talar.png` | Röstknappen hålls inne. |
| `morkt-minskad-rorelse.png` | Variant B i mörkt tema med minskad rörelse. |
| `mobil-notis.png` | En samtalsnotis i mobilstorlek. |

## Iakttagelser från bygget

Det här syntes när prototypen byggdes och provades. De två iakttagelser
som ledde till ändringar står under [Beslut](#beslut).

- **Lyssnar**, **Skyttel arbetar** och **Väntar på ditt svar** har samma
  stilla vågform, enligt beslutet om röstrutan. Bara statusordet och
  stoppikonen skiljer dem åt.
- I variant C blir notisen två rader hög när texten är lång.
- En knapp som ser avstängd ut men går att trycka på är märkt som
  avstängd för hjälpmedel. Hur den ska beskrivas hör till ärendet om
  hjälpmedel.
- Efter ett avbrott med stoppikonen visar röstläget ingenting utöver att
  statusordet byts. Texten "Avbrutet. Utkastet är oförändrat." står bara i
  textvyn.
- Tangentkombinationerna är provade i Chrome på Linux utan skärm. De är
  inte provade på Windows, macOS, iPhone eller iPad.

## Beslut

Ärendet är löst. Det fastställda beslutet står i
[ärendets beslutskommentar](https://github.com/viscalyx/skyttel/issues/179#issuecomment-5936567127),
och den gäller framför listan här. Beställaren valde
den 1 oktober 2026 delar från variant A och B.

| Del | Val |
| --- | --- |
| Vågform | Staplar, från A. |
| Samtalsnotisens plats | Ett eget kort under röstrutan, från A. |
| Samtalsnotisens symbol | En symbol per situation, från A. |
| Markering på **Skriv till Skyttel** | Tecken i en bricka, från B: tre punkter när Skyttel har svarat och frågetecken när Skyttel väntar på svar. |
| Notis efter tryck utan pågående samtal | Stängs med en stängknapp, från A. Den försvinner också när hindret är borta. |
| Röstknappens symbol | Mikrofon i båda lägena, från B. Av är en vanlig knapp, och på har accentfärg. |
| Långt tryck | Gränsen är 0,45 sekunder. Knappens beskrivning säger "Håll in för att tala tills du släpper." |
| Tangentkombination | Utgångsvärdena behålls: Ctrl+Mellanslag på Windows och Linux, Ctrl+Skift+Mellanslag på macOS. En krock på en riktig enhet blir ett eget ärende. |
| **Sparat** | De 4 sekunderna räknas från att Skyttel har talat klart. Före beslutet räknades de från sparandet, och då syntes ordet bara drygt en sekund. |
| Notisens text utan pågående samtal | "Ingen kontakt med Skyttel. Försök igen när kontakten är tillbaka." Texten om mikrofonen gäller bara när ett samtal pågår. |

Kommande prototyper i kartan utgår från den här grenen.
