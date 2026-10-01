# Prototyp: samtalet på mobil enhet

Kastbar prototyp för ärendet
[Hur ser samtalet ut på mobil enhet?](https://github.com/viscalyx/skyttel/issues/191)
i kartan
[Skyttel – väg till ett enkelt och intuitivt samtalsgränssnitt](https://github.com/viscalyx/skyttel/issues/177).

Koden är inte produktionskod. Den har inga tester, ingen server och sparar
ingenting. Hushållet Familjen Berg och alla uppgifter är påhittade, och
Skyttels svar följer ett kort manus.

## Frågan

Hur ser samtalet ut på mobil enhet: var står röstrutan och
samtalsnotisen, och hur samspelar de och textvyn med skärmtangentbordet
och korta fönster?

Prototypen följer fem fastställda beslut:

- [Vilka samtalskontroller och texter ska finnas kvar, ändras eller tas bort?](https://github.com/viscalyx/skyttel/issues/178#issuecomment-5928049123)
- [Hur ser textläget ut när man väljer textknappen?](https://github.com/viscalyx/skyttel/issues/180#issuecomment-5930465393)
- [Vad visar röstrutan i varje läge?](https://github.com/viscalyx/skyttel/issues/182#issuecomment-5935519637)
- [Hur ser röstläget ut med en liten vågform?](https://github.com/viscalyx/skyttel/issues/179#issuecomment-5936567127)
- [Hur förmedlas röstrutans statusord och samtalsnotiser till hjälpmedel?](https://github.com/viscalyx/skyttel/issues/188#issuecomment-5937311653)

De besluten avgör redan röstrutans innehåll, statusorden, vågformen,
samtalsnotisernas texter och symboler, textvyns delar, långt tryck och
läsordningen. Prototypen prövar det som återstår:

- röstrutans och samtalsnotisens plats när verktygsraden ligger överst på
  en smal skärm
- vad textvyn visar när skärmtangentbordet tar en stor del av skärmen
- vad som får plats i ett kort fönster, till exempel en telefon i
  liggande läge
- långt tryck på röstknappen på pekskärm.

## Starta

```sh
npm install
npm run prototype:mobil
```

Öppna sedan <http://localhost:4179/?prototype=mobil>. Prototypen laddas
bara i utvecklingsservern, aldrig i ett bygge.

På en dator visas sidan i en ram med en telefons eller en iPads storlek.
På en riktig telefon eller iPad visas sidan utan ram: öppna
`http://<datorns adress i nätverket>:4179/?prototype=mobil`. Sidan följer
då den synliga delen av skärmen, så att det riktiga skärmtangentbordet
gör den kortare. Prototypens reglage ligger bakom fliken **Prototyp A**
vid högerkanten.

## Ramen och det påhittade skärmtangentbordet

Reglaget **Skärm** väljer ramens storlek. Adressen får `skarm=`.

| `skarm` | Skärm | Tangentbordets höjd | Synlig höjd med tangentbord |
| --- | --- | --- | --- |
| `telefon` | Telefon, stående, 390 × 844 | 336 px | 508 px |
| `liten` | Liten telefon, stående, 375 × 667 | 260 px | 407 px |
| `liggande` | Telefon, liggande, 844 × 390 | 200 px | 190 px |
| `ipad` | iPad, stående, 820 × 1180 | 330 px | 850 px |
| `ipad-liggande` | iPad, liggande, 1180 × 820 | 400 px | 420 px |
| `av` | Ingen ram, hela fönstret | Det riktiga | Den riktiga |

Tangentbordets höjder är ungefärliga värden för en iPhone och en iPad.
De är inte uppmätta. Det påhittade tangentbordet kommer upp när
meddelandefältet får fokus, tar plats och skriver ingenting. Tangenten
**Dölj tangentbordet** tar ner det. Skriv med datorns tangentbord.

Prototypen har en enda regel för både tangentbord och liggande telefon:
ett **kort fönster** är en synlig höjd under 520 px. En stående telefon
med tangentbordet uppe, en liggande telefon och en liggande iPad med
tangentbordet uppe är korta fönster. En stående iPad med tangentbordet
uppe är det inte.

## Varianterna

Sidan öppnas med den valda utformningen, variant V. Den står under
[Beslut](#beslut). Varianterna A, B och C är de som beställaren valde
mellan, och de finns kvar för jämförelse.

Raden längst ner på sidan byter variant. Vänsterpil och högerpil gör
samma sak. Adressen får `variant=V`, `variant=A`, `variant=B` eller
`variant=C`.

| Del | A: Under verktygsraden | B: I verktygsraden | C: Vid nederkanten |
| --- | --- | --- | --- |
| Röstrutans plats på smal skärm | Under verktygsraden, till höger, på samma rad som hushållets namn. | Inne i verktygsraden, till höger om **Skriv till Skyttel**. Raden går över hela skärmens bredd. | Vid nederkanten, till höger, ovanför kartans rad med **Återställ vy**. |
| Samtalsnotisens plats | Ett kort under röstrutan, över hela bredden. | Ett band som hänger ihop med verktygsradens underkant. | Ett kort ovanför röstrutan. |
| Röstrutan när textvyn är öppen | Kvar under verktygsraden. Textvyn börjar under den. | Kvar i verktygsraden. | Står ovanför meddelandefältet, i textvyn. |
| Textvyns överkant | 112 px. Raden för röstrutan är alltid reserverad. | 76 px, direkt under verktygsraden. | 76 px, direkt under verktygsraden. |
| Textvyn i ett kort fönster | **Rullar:** alla delar står kvar. Rubrik, utkastknapp och samtalstext rullar tillsammans ovanför meddelandefältet. | **Kompakt:** rubrikraden och utkastknappen blir en rad med kontextmätare, **Utkast**, **Nytt samtal** och stängknapp. Fältets etikett syns inte. | **Fokus:** medan användaren skriver syns bara samtalstexten och meddelandefältet. Rubrik och utkastknapp kommer tillbaka när fältet tappar fokus. |
| Det kostar | En rad på 44 px ovanför textvyn, även i ett samtal med bara text. | Kontextsymbolen visar ringen utan procenttal, och när den syns bryts statusordet på två rader på en smal telefon. Notisen täcker hushållets namn. | Röstrutan står långt från knapparna som styr den, och läsordningen går från skärmens överkant till nederkanten och tillbaka. |

### Blanda delar

Under **Blanda delar från varianterna** går de två delarna att välja var
för sig, till exempel platsen från A med textvyn från B. Valet hamnar i
adressen:

| Parameter | Värden |
| --- | --- |
| `plats` | `under`, `rad`, `nere` |
| `kort` | `rullar`, `kompakt`, `fokus` |

Ett byte av variant nollställer de egna valen.

### Lika i alla varianter

- **Bred pekskärm.** På en iPad och en liggande telefon står
  verktygsraden till vänster som på en dator. Röstrutan står uppe till
  höger med samtalsnotisen som ett kort under, enligt beslutet om
  röstläget. Varianternas platser gäller bara smal skärm. I ett kort
  fönster står röstrutan 12 px från kanten och textvyn börjar vid 56 px.
- **Textvyn på bred pekskärm.** Den är ett sidofält vid högerkanten med
  fast bredd, 400 px, och kartan syns bredvid. Utkastet öppnas mellan
  knappen och samtalstexten. Reglaget **Textvyn på bred pekskärm** visar
  det som beslutet om textläget säger: textvyn fyller skärmen till höger
  om verktygsraden. Adressen får `bred=fyller`.
- **Läsordning.** Röstrutan och samtalsnotisen ligger i koden direkt
  efter **Skriv till Skyttel**, före verktygsradens övriga knappar.
  Ordningen är den som beslutet om hjälpmedel anger, i alla varianter.
- **Fokus.** Meddelandefältet får inte fokus av sig självt när textvyn
  öppnas på pekskärm, så tangentbordet kommer inte upp förrän användaren
  trycker i fältet. Reglaget **Meddelandefältet får fokus när textvyn
  öppnas** visar motsatsen. Adressen får `fokus=1`.
- **Tryckytor.** Stoppikonen och notisens stängknapp ser ut som förut,
  men ytan som tar emot trycket är 44 px.
- **Namn för hjälpmedel.** Stängknappen heter **Stäng notisen**, och
  samtalsknapparna märks inte som avstängda, enligt beslutet om
  hjälpmedel.

## Det här går att prova

- **Röstrutan.** Välj **Säg nästa replik** under **Prototyplägen**.
  Röstrutan går igenom **Du talar**, **Skyttel arbetar** och **Skyttel
  talar**. Byt variant för att se de tre platserna.
- **Samtalsnotiser.** Reglagen under **Prototyplägen** sätter upp varje
  situation. Prova ett hinder med knapp, till exempel **Oklart sparande**
  med **Egen kontroll misslyckades**, och en händelse utan röstruta, till
  exempel **Nästa start av rösten** med **Webbläsaren nekar mikrofonen**.
- **Textvyn med tangentbord.** Välj **Skriv till Skyttel** och tryck i
  meddelandefältet. Tangentbordet kommer upp och fönstret blir kort.
  Skicka ett meddelande: fältet behåller fokus och tangentbordet står
  kvar.
- **Röst och text samtidigt.** Slå på mikrofonen och öppna textvyn. Se
  var röstrutan står i varje variant medan tangentbordet är uppe.
- **Liggande telefon.** Välj skärmen **Telefon, liggande** och öppna
  textvyn. Fönstret är kort även utan tangentbord. Med tangentbordet uppe
  är den synliga höjden 190 px.
- **Liten telefon.** Välj **Liten telefon** och variant B, sätt
  **Kontext** till 90 % och säg en replik. Statusordet **Skyttel
  arbetar** står på två rader.
- **iPad.** Välj **iPad, stående** eller **iPad, liggande** och öppna
  textvyn. Kartan syns bredvid sidofältet. Prova också **Fyller skärmen**
  i **Textvyn på bred pekskärm**.
- **Långt tryck.** Håll in röstknappen när mikrofonen är av. Knappen får
  en ring, röstrutan visar **Du talar**, och Skyttel arbetar med det som
  sades när knappen släpps. Lyssnandet fortsätter om fingret glider av
  knappen och slutar när fingret lyfts.
- **Utkastet.** Öppna utkastet i textvyn. Det öppnas mellan knappen och
  samtalstexten. I variant B i ett kort fönster heter knappen **Utkast**
  och visar antalet ändringar.

## Prototyplägen

De streckade rutorna hör inte till utformningen. Reglagen under
**Prototyplägen** är de som röstlägets prototyp har. De här är nya:

| Reglage | Visar |
| --- | --- |
| Skärm | Ramens storlek, eller sidan utan ram. |
| Skärmtangentbord | Om det påhittade tangentbordet kommer upp när meddelandefältet har fokus, alltid är uppe eller aldrig kommer upp. |
| Meddelandefältet får fokus när textvyn öppnas | Tangentbordet kommer upp direkt när textvyn öppnas. |
| Textvyn på bred pekskärm | Textvyn är ett sidofält med fast bredd, eller fyller skärmen. |
| Röstrutans och notisens plats på smal skärm | Delen `plats` för sig. |
| Textvyn i ett kort fönster | Delen `kort` för sig. |

Raderna **Synlig höjd** och **Skriver** under **Prototyplägen** visar
vad prototypen uppfattar. **Synlig höjd** säger också när fönstret är
kort.

## Ingår inte

- Riktig taligenkänning och Skyttels riktiga röst. Det användaren säger
  blir alltid manusets nästa replik.
- Ett riktigt skärmtangentbord i ramen. Det påhittade tangentbordet tar
  bara plats.
- Kartans gemensamma återkoppling, som på smal skärm visas vid
  nederkanten. Kartans rad med **Återställ vy** finns med som en bild
  utan funktion.
- Verktygsradens övriga knappar. De gör ingenting här.
- Röstlägets tidigare varianter av vågform, notis och markering. De finns
  på grenen
  [`prototype/skyttel-rostlage`](https://github.com/viscalyx/skyttel/tree/prototype/skyttel-rostlage).
- Kartan är en enkel ritning, inte Skyttels riktiga karta.

## Skärmbilder

Filer som börjar med `a-`, `b-` och `c-` finns för varje variant, i
skärmen **Telefon, stående** om inget annat sägs. Filer som börjar med
`vald-` visar den valda utformningen.

| Fil | Visar |
| --- | --- |
| `vald-rost.png` | Den valda platsen: röstrutan vid nederkanten, ovanför kartans rad. |
| `vald-notis-hinder.png`, `vald-notis-handelse.png` | De valda samtalsnotiserna: ett hinder med knapp ovanför röstrutan, och en händelse utan röstruta. |
| `vald-textvy-tangentbord.png` | Den valda textvyn med tangentbordet uppe: den kompakta raden, röstrutan ovanför fältet och en enda stoppikon. |
| `*-rost.png` | Röstrutan med **Skyttel arbetar** och stoppikonen. Textvyn är stängd. |
| `*-notis-hinder.png` | Ett hinder med knapp, och röstrutan med kontextsymbolen vid 90 procent. |
| `*-notis-handelse.png` | En händelse med stängknapp. Röstrutan syns inte. |
| `*-textvy-tangentbord.png` | Textvyn med tangentbordet uppe, mikrofonen på och ett skrivet meddelande som Skyttel arbetar med. |
| `*-liggande-tangentbord.png` | Liggande telefon med textvyn öppen och tangentbordet uppe. |
| `a-textvy.png` | Textvyn utan tangentbord i variant A. |
| `b-liggande-textvy.png` | Liggande telefon utan tangentbord i variant B, med den kompakta raden. |
| `b-liten-telefon.png` | Liten telefon i variant B med kontextsymbolen. Statusordet står på två rader. |
| `b-langt-tryck.png` | Röstknappen hålls inne med ett finger, i variant B. |
| `ipad-sidofalt.png` | Stående iPad med textvyn som sidofält. Kartan syns bredvid. |
| `ipad-liggande-sidofalt-tangentbord.png` | Liggande iPad med sidofältet, utkastet utfällt och tangentbordet uppe. |
| `liggande-sidofalt.png` | Liggande telefon med textvyn som sidofält. |
| `ipad-fyller.png` | Stående iPad där textvyn fyller skärmen och tangentbordet är uppe. Kartan syns inte. |
| `utan-ram.png` | Sidan utan ram i en telefons storlek, med fliken till reglagen. |

## Iakttagelser från bygget

Det här syntes när prototypen byggdes och provades.

- **Höjden som blir kvar.** På en stående telefon med tangentbordet uppe
  har textvyn 396 px i variant A och 432 px i B och C. Det räcker för
  alla tre sätten att visa textvyn.
- **Liggande telefon med tangentbord.** Textvyn har 134 px. I **Rullar**
  syns en rad av samtalstexten och fältet med sin etikett. I **Kompakt**
  syns den kompakta raden, en rad av samtalstexten och fältet. Bara
  **Fokus** visar mer än en rad av samtalstexten.
- **Variant B på smal telefon.** Utan kontextsymbolen står varje
  statusord på en rad, vid både 375 och 390 px bredd. När kontextsymbolen
  syns, från 85 procent, står **Skyttel arbetar** på två rader vid båda
  bredderna och **Väntar på ditt svar** på två rader vid 375 px.
  Procenttalet får inte plats. Det går emot beslutet om röstrutan, där
  statusordet står på en rad och talet syns.
- **Variant C och kartans nederkant.** Röstrutan står 76 px från
  nederkanten för att gå fri från kartans rad. Kartans gemensamma
  återkoppling visas på samma ställe i den riktiga kartan och finns inte
  med här.
- **Två stoppikoner.** När mikrofonen är på och Skyttel arbetar med ett
  skrivet meddelande finns stoppikonen både i röstrutan och på platsen
  för **Skicka**. Det följer av tidigare beslut. I variant C står de två
  intill varandra.
- **Ingen beskrivning på pekskärm.** Röstknappens beskrivning "Håll in
  för att tala tills du släpper" visas när pekaren vilar på knappen. På
  en pekskärm visas den aldrig.
- **Sidofält på bred pekskärm.** Med ett sidofält på 400 px har kartan
  320 px bredvid sig på en stående iPad, 680 px på en liggande iPad och
  344 px på en liggande telefon, räknat från verktygsradens högerkant.
  När textvyn fyller skärmen syns ingenting av kartan, och ändringar som
  Skyttel föreslår syns bara i samtalstexten och utkastet.
- **Stående iPad.** Med tangentbordet uppe är den synliga höjden 850 px.
  Textvyn behöver inte ändras där.

## Kontroller

- Provat i Chromium utan skärm: de tre varianterna i alla fem skärmarna,
  textvyn med det påhittade tangentbordet, samtalsnotiser med och utan
  röstruta, och långt tryck med en riktig pekpunkt, även när fingret
  glider av knappen.
- Inte provat: en riktig iPhone eller iPad, ett riktigt skärmtangentbord,
  VoiceOver och riktig mikrofon. På iPhone och iPad gör tangentbordet
  inte sidan kortare av sig självt. Sidan måste följa den synliga delen
  av skärmen, som prototypen gör utan ram och som kartan redan gör för
  sina arbetsytor.
- Prototypen påstår inte att WCAG 2.2 nivå AA uppfylls. Läsordningen,
  namnen och tryckytorna är designmål.

## Beslut

Ärendet är löst. Det fastställda beslutet står i ärendets
beslutskommentar, och den gäller framför listan här. Beställaren valde
den 1 oktober 2026 platsen från variant C och textvyn från variant B.

| Del | Val |
| --- | --- |
| Röstrutan på smal skärm | Vid nederkanten, till höger, ovanför kartans rad. Från C. |
| Samtalsnotisen på smal skärm | Ett kort ovanför röstrutan. Från C. |
| Röstrutan när textvyn är öppen på smal skärm | Ovanför meddelandefältet, i textvyn. Från C. |
| Regeln för platsen | Skärmens bredd avgör, inte statusordets längd. På smal skärm får röstrutan inte plats uppe till höger: där finns 161 till 176 px, och rutan är 117 till 241 px bred. |
| Röstrutan på bred pekskärm | Uppe till höger, som på dator. |
| Textvyn på bred pekskärm | Ett sidofält med fast bredd, även på liggande telefon. Kartan syns bredvid. |
| Textvyn i ett kort fönster | Kompakt, från B. |
| Kort fönster | En synlig höjd under 520 px, med samma regel för tangentbord och liggande telefon. |
| Fokus | Meddelandefältet får inte fokus av sig självt när textvyn öppnas på mobil enhet. |
| Stoppikoner | På smal skärm med textvyn öppen visas en åt gången. När stoppikonen står på platsen för **Skicka** har röstrutan ingen. |
| Kartans nederkant | Röstrutan och notisen står ovanför kartans rad och kartans gemensamma återkoppling och täcker dem aldrig. |
| Långt tryck | Lyssnandet fortsätter när fingret glider av knappen. Ett avbrutet tryck räknas som att knappen släpps. Långt tryck förklaras i **Information och hjälp**. |
| Tryckytor | 44 px för stoppikonen och notisens stängknapp, med oförändrat utseende. |

Läsordningen för VoiceOver är den som beslutet om hjälpmedel anger, fast
röstrutan står vid nederkanten på smal skärm.
