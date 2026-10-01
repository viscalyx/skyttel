# Kan OpenAI:s Decisions API förenkla eller snabba upp Skyttels dialog?

Underlag för [ärende #186](https://github.com/viscalyx/skyttel/issues/186)
inom kartan [#166](https://github.com/viscalyx/skyttel/issues/166).

**Kontrolldatum:** 2026-10-01. Ledtråden var en tredjepartsartikel på
Hugging Face. Varje påstående har kontrollerats mot OpenAI:s egna källor:
dokumentationen på `developers.openai.com`, OpenAI:s sammanfattning av
DevDay 2026, inspelningen av huvudanförandet, SDK:t `openai` och API:et
självt. Kodhänvisningar gäller `main` vid commit `a6a4eca`. Inga betalda
anrop gjordes och nyckeln skrevs aldrig ut.

## Svar i korthet

1. **API:et finns, men bara som begränsad förhandsvisning utan
   dokumentation.** OpenAI presenterade Decisions API på DevDay
   2026-09-29. Det låter Luna välja bland fördefinierade svar på frågor som
   utvecklaren ställer. Det finns ingen guide, ingen API-referens, inget
   pris och inga angivna gränser.
2. **Nyckeln har inte tillgång.** `POST /v1/decisions` svarar 403 med
   `Decision API is not enabled for this user.`
3. **Inte relevant för nuvarande flöde, med ett smalt undantag.** De beslut
   som ärendet nämner fattas redan av talmodellen, av fasta serverregler
   eller kräver verktyg och fri text. Undantaget är turer där Terra bara
   väljer ett av några få fasta utfall.
4. **Vinsten går inte att beräkna.** Pris och svarstid är inte publicerade.
   För turer som ändrar kartan tillkommer ett anrop. Bara turer med ett
   enda fast utfall kan bli snabbare, med högst ett Terra-anrop per tur.
5. **Ett separat prov är inte motiverat nu.** Åtkomst, dokumentation och
   pris saknas, och nyttan är begränsad. Frågan kan tas upp igen när
   villkoren i avsnitt 5 är uppfyllda.

## Källor och hur de kontrollerades

- **OpenAI:s sammanfattning av DevDay:**
  [DevDay 2026 Recap](https://openai.com/index/devday-2026-recap/),
  publicerad 2026-09-29 enligt
  [OpenAI:s RSS-flöde](https://openai.com/news/rss.xml). Sidan svarade 403
  på automatiska hämtningar. Texten lästes därför i
  [Wayback Machines kopia från 2026-09-30](https://web.archive.org/web/20260930121352/https://openai.com/index/devday-2026-recap/).
- **Huvudanförandet:**
  [OpenAI DevDay 2026 Keynote](https://www.youtube.com/watch?v=Fls_onRviPM)
  på OpenAI:s kanal, publicerat 2026-09-29. Den engelska textningen lästes
  för avsnittet 22:13–22:56. Textningen är direkttextad och innehåller
  uppenbara fel.
- **Dokumentationen:** Markdown-versionerna av sidorna på
  `developers.openai.com`: [ändringsloggen](https://developers.openai.com/api/docs/changelog),
  [prissidan](https://developers.openai.com/api/docs/pricing),
  [modellkatalogen](https://developers.openai.com/api/docs/models),
  [avvecklingar](https://developers.openai.com/api/docs/deprecations),
  indexen `llms.txt` för guider och referens, den samlade exporten
  `api/llms-full.txt` och webbplatskartan `sitemap-0.xml` med 1 364 adresser.
- **SDK:** `openai` 7.25.0 för Node, publicerad 2026-09-29 och senaste
  version på npm.
- **API:et:** kostnadsfria anrop med projektets nyckel, se avsnitt 2.
- **Skyttels kod:** `src/server/assistant-instructions.ts`,
  `text-assistant.ts`, `text-assistant-model.ts`, `voice-work.ts` och
  `voice-assistant.ts`.

Ledtråden,
[What is OpenAI Decisions API? A practical guide](https://huggingface.co/blog/sora-2/what-is-openai-decisions-api-a-practical-guide),
är daterad 2026-09-30 och används inte som källa. Den länkar till
`decisionapi.net` som ”Decisions API Playground” och ”documentation”.
Webbplatsen beskriver sig som en oberoende tjänst med egna modeller och
säljer krediter. Den tillhör inte OpenAI och ska inte få Skyttels nyckel.

## 1. Finns API:et, och vad gäller för det?

### Det som OpenAI har sagt

OpenAI:s sammanfattning av DevDay innehåller hela den skriftliga
beskrivningen:

> Decisions API enables real-time decision-making by focusing Luna's
> intelligence on a specific set of user-defined questions with finite
> pre-defined answers. Developers supply context using text or images, and
> get back answers they can use to classify content, route requests, or
> choose an agent’s next action.
>
> Available in limited preview today with a broad release planned in the
> coming days.

Stycket saknar länk till dokumentation eller mer information, till skillnad
från de övriga API-nyheterna på sidan.

I huvudanförandet sägs enligt textningen att Decisions API låter modellen
svara ”in a fraction of a second” och att det fungerar genom att ge
Luna-modellen ”a pre-defined set of options”. Inget tal för svarstiden och
inget pris nämns i textningen.

API:et bekräftar att en väg finns: `POST /v1/decisions` ger ett eget
felsvar, medan en påhittad väg ger 404 utan innehåll (avsnitt 2).

### Det som inte är dokumenterat

Sökningarna efter ”Decisions” gav inga träffar på följande ställen
2026-10-01:

- Ändringsloggen. Senaste posten är från 2026-09-29 och gäller
  datoranvändning i Agents API, GPT-6.1 Sol och Ultrafast.
- Prissidan, modellkatalogen och sidan om avvecklingar.
- Indexen för guider och API-referens, den samlade exporten och
  webbplatskartan. Adresserna `api/docs/guides/decisions` och
  `api/reference/resources/decisions` ger 404.
- SDK:t `openai` 7.25.0. Klienten har ingen resurs för beslut, och
  ändringsloggen för SDK:t nämner inte API:et.
- Modellistan för projektets nyckel. Ingen av de 133 modellerna har ett id
  som innehåller `decision`.

Därför är följande okänt:

- **Modell:** OpenAI skriver ”Luna” utan version. Om det är `gpt-6-luna`,
  en särskild variant eller något annat anges inte.
- **Pris:** inget pris är publicerat, varken per beslut eller per token.
- **Gränser:** anropsgränser, största kontext, antal frågor och svar per
  anrop, bildformat, språkstöd för svenska, lagring (`store`) och
  dataresidens anges inte.
- **Kontrakt:** fält i anrop och svar, om svaret innehåller ett
  konfidensvärde och om ett särskilt HTTP-huvud krävs under
  förhandsvisningen.

### Artikelns påståenden

<!-- markdownlint-disable MD013 -->
| Påstående i artikeln | Bedömning mot OpenAI:s källor |
| --- | --- |
| Presenterades på DevDay 2026 | Bekräftat i sammanfattningen och huvudanförandet. |
| Begränsad förhandsvisning, bredare tillgång senare | Bekräftat: ”limited preview today”, bred lansering ”in the coming days”. Inget datum anges. |
| En specialiserad version av GPT-6 Luna | Delvis. ”Luna” är bekräftat. Version och specialisering är inte bekräftade. |
| Cirka 150 ms, ungefär tio gånger snabbare än vanliga anrop till Luna | Inte bekräftat. OpenAI:s text saknar tal. Textningen säger ”a fraction of a second”. Om en bild i anförandet visade ett tal har inte kontrollerats. |
| Kontext som text eller bild, ändligt antal svar, för klassning, dirigering och val av nästa steg | Bekräftat i sammanfattningen. |
| Fältet `confidence` och artikelns kodexempel | Inte bekräftat. Artikeln kallar själv koden illustrativ. |
| Priset är inte offentligt | Stämmer med att prissidan saknar uppgift. |
<!-- markdownlint-enable MD013 -->

### Närmaste dokumenterade funktion

Samma slags beslut går i dag att få med dokumenterade delar: ett anrop till
`gpt-6-luna` i Responses API med `reasoning.effort: "none"` och
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
där ett JSON-schema med `enum` begränsar svaret till fasta värden.
[Modellsidan](https://developers.openai.com/api/docs/models/gpt-6-luna)
anger stöd för `none` och `structured_outputs` samt priset 0,10 USD per
miljon tokens indata, 0,01 cachad indata, 0,125 cacheskrivning och
0,50 utdata. `gpt-6-luna` finns i modellistan för projektets nyckel.
För tal beskriver guiden om
[delegering i GPT-Live](https://developers.openai.com/api/docs/guides/live-delegation#react-to-transcript-fragments)
hur en lätt modell kan läsa transkriptfragment och förbereda arbete innan
delegeringen kommer. OpenAI anger ingen svarstid för något av detta.

## 2. Har nyckeln i `.env.local` tillgång?

**Nej.** Kontrollen gjordes 2026-10-01 med ett skript som laddade nyckeln
med `node --env-file=.env.local`. Skriptet skrev bara ut statuskod och
felsvar, med nyckelliknande text maskerad.

<!-- markdownlint-disable MD013 -->
| Anrop | Svar | Tolkning |
| --- | --- | --- |
| `GET /v1/models` | 200, 133 modeller | Inget id innehåller `decision`. `gpt-6-luna`, `gpt-5.6-luna`, `gpt-5.6-terra` och `gpt-live-1` finns. |
| `GET /v1/decisions` | 404 utan innehåll | Säger inget. Befintliga vägar som bara tar `POST` svarar olika på `GET`: 405 för `/v1/embeddings`, 404 för `/v1/moderations`. |
| `POST /v1/decisions` med `{}` | 403, `Decision API is not enabled for this user.` | Vägen finns. Nyckeln saknar förhandsvisningen. |
| `POST /v1/skyttel-nonexistent-control` med `{}` | 404 utan innehåll | Kontroll: så svarar en väg som inte finns. |
<!-- markdownlint-enable MD013 -->

Anropen med `{}` saknade modell, frågor och kontext. De avvisades innan
någon modell kunde köras och kan inte ha debiterats.

Vägen `/v1/decisions` är en gissning som API:et bekräftade genom felsvaret.
Den är inte dokumenterad av OpenAI och kan ändras. Hur åtkomst till
förhandsvisningen begärs är inte dokumenterat; inget formulär hittades på
OpenAI:s webbplatser.

## 3. Var i Skyttels flöde skulle det kunna användas?

Decisions API svarar med ett av några fördefinierade svar utifrån den
kontext som skickas med. Inget tyder på att det kan anropa verktyg eller
skriva fri text. Tabellen visar var besluten fattas i dag.

<!-- markdownlint-disable MD013 -->
| Beslut | Så görs det i dag | Kan Decisions API ta över? |
| --- | --- | --- |
| Tal: ska yttrandet delegeras? | `gpt-live-1` avgör det enligt `voiceAssistantInstructions`. Servern får `session.delegation.created` och bygger uppdraget av de användarfragment som slutat före händelsens tidpunkt (`voice-work.ts` rad 221–257). | Nej. Beslutet fattas i talmodellen. Servern kan inte ersätta det, bara läsa fragment i förväg. |
| Tal: mellanbesked medan servern arbetar | `gpt-live-1`, högst ett neutralt besked enligt instruktionerna. | Nej. |
| Tal: vad som sägs när uppdraget är klart | Fast text från servern i `completion()` (`voice-work.ts` rad 69–97). Modellens egen text märks som obekräftad. | Inget att vinna. Inget modellanrop görs. |
| Tal: slutföra ett väntande sparförsök | Exakt fras, prövad med reguljärt uttryck (`voice-work.ts` rad 122). | Inget att vinna. |
| Text: är yttrandet ett sparbesked? | Terra väljer `completion: "save"` eller `save_draft`. Servern kräver dessutom att `requestsSave()` godkänner texten (`text-assistant.ts` rad 208–269, kontroll på rad 562 och 714). | Delvis. Frågan har ett ja eller nej, men se nedan. |
| Text: vilka ändringar ska göras? | Terra läser kartan med MCP-verktyg och skickar operationer med fria argument, i upp till 48 steg (`text-assistant.ts` rad 411–523). | Nej. Kräver verktyg och fria argument. |
| Text: vilken riktad fråga behövs? | Terra skriver högst tre frågor i `questions` eller ett vanligt svar (`text-assistant.ts` rad 468, 590–596 och 793–794). | Nej. Frågan är fri text och bygger på kartans namn. |
| Text: räcker en kort bekräftelse? | Servern väljer fast text, till exempel ”Utkastet är uppdaterat.”, ”Ångrat i utkastet.” och ”Återställt i utkastet.”, eller ett sparbesked som börjar med ”Sparat.” (`text-assistant.ts` rad 308 och 779–787). `submit_changes` avslutar utan extra modellomgång (rad 791–797). | Inget att vinna. Inget modellanrop görs. |
| Text: detaljfråga om utkast, senaste sparande eller senaste fel | Terra anropar `report_result` med `source` satt till ett av fyra fasta värden. Servern skriver svaret (`text-assistant.ts` rad 501–517 och 602–651). | Ja, i princip. Terras enda bidrag är ett val mellan fasta värden. |
<!-- markdownlint-enable MD013 -->

### Sparbeskedet

Sparbeskedet ser ut som ett typiskt ja-eller-nej-beslut, men koden lägger
medvetet inte den auktoriteten hos en modell. Kommentaren vid
`requestsSave()` säger att kontrollen är avsiktligt snäv och att en
godkännandeflagga från modellen saknar auktoritet. Ett svar från Decisions
API är också en modells tolkning. Det kan därför användas på två sätt:

- **Som extra spärr** utöver `requestsSave()`. Det lägger till ett anrop
  och tar inte bort något.
- **I stället för `requestsSave()`**, så att fler formuleringar godtas. Det
  ändrar vem som får avgöra ett sparbesked. Det är ett beslut om korrekt
  beteende som hör hemma i scenariokatalogen, inte en optimering.

### Det smala undantaget: en förkontroll före Terra

Det enda stället där API:et passar är en förkontroll som läser yttrandet
innan Terra anropas och väljer bland fasta utfall:

- visa utkastets detaljer (`report_result` med `draft`),
- visa senaste sparandet (`latest_save`),
- visa senaste felet (`last_failure`),
- spara hela utkastet utan andra ändringar, eller
- allt annat, som går till Terra som i dag.

För de fyra första utfallen gör Terra i dag ett anrop vars enda resultat är
ett fast val. Servern skulle kunna utföra dem direkt. Ett rent sparbesked
måste fortfarande passera `requestsSave()` och serverns kontroller av
version och konflikter. I tal kommer yttrandet från transkriptfragment, och
instruktionerna säger att röstkontext aldrig är ett nytt sparbesked. En
förkontroll får alltså bara läsa det nya uppdraget, inte tidigare fragment.

Någon sådan förkontroll finns inte i koden i dag. Den går att bygga med den
dokumenterade lösningen i avsnitt 1 och är inte beroende av Decisions API.

## 4. Hur mycket effektivare kan det bli?

### Dokumenterade uppgifter

<!-- markdownlint-disable MD013 -->
| Del | Pris (USD) | Dokumenterad svarstid |
| --- | --- | --- |
| `gpt-5.6-terra`, nuvarande textassistent | 2,00 indata, 0,20 cachad indata, 2,50 cacheskrivning och 12,00 utdata per miljon tokens | Ingen uppgift |
| `gpt-6-luna` | 0,10 indata, 0,01 cachad indata, 0,125 cacheskrivning och 0,50 utdata per miljon tokens | Ingen uppgift |
| `gpt-live-1` | 0,05 per minut, alltså cirka 0,00083 per sekund, även medan servern arbetar | Ingen uppgift |
| Decisions API | Inte publicerat | ”a fraction of a second” enligt textningen av huvudanförandet. Inget tal. |
<!-- markdownlint-enable MD013 -->

Priserna kommer från [prissidan](https://developers.openai.com/api/docs/pricing)
och modellsidorna. OpenAI publicerar ingen svarstid för Terra eller Luna.
Guiden om
[svarstid](https://developers.openai.com/api/docs/guides/latency-optimization)
anger bara tumregler: mindre modeller är oftast snabbare, utdata tar mest
tid och färre anrop ger kortare väntan.

Ett Terra-steg kostar:

```text
(ocachad indata × 2,00 + cachad indata × 0,20
 + cacheskrivning × 2,50 + utdata × 12,00) / 1 000 000 USD
```

Indata i varje steg är MCP-instruktionerna, textassistentens instruktioner
(tillsammans drygt 6 400 tecken), alla verktygsscheman, utkastet och
samtalet hittills. Utdata är resonemang på nivån `low` och ett
verktygsanrop. Tokenantalen har inte mätts i den här undersökningen.

### Uppskattning per slags tur

- **Turer som ändrar kartan.** Terra behövs för läsningar och operationer.
  En förkontroll lägger till ett anrop. Körs den före Terra blir turen
  långsammare med förkontrollens svarstid. Körs den samtidigt blir turen
  inte långsammare, men den sparar då inget. Kostnaden ökar med
  förkontrollens okända pris.
- **Turer med ett enda fast utfall.** Detaljfrågor, frågor om senaste fel
  och ett rent sparbesked kostar i dag minst ett Terra-anrop. Med en
  förkontroll ersätts det av ett beslutsanrop. Vinsten är högst ett
  Terra-anrops tid och kostnad per tur, minus förkontrollens.
- **Tal.** Varje sekund kortare väntan sparar cirka 0,00083 USD i avgift
  för `gpt-live-1`. Besparingen i pengar är försumbar. Nyttan är upplevd
  svarstid.

Räkneexempel med antagna tokenantal, inte mätningar: ett Terra-steg med
8 000 cachade och 500 ocachade tokens indata och 150 tokens utdata kostar
0,0016 + 0,0010 + 0,0018 = 0,0044 USD. Ett beslut med 500 tokens indata
och 10 tokens utdata skulle kosta cirka 0,00006 USD om det prissattes som
`gpt-6-luna`. Även om hela Terra-steget sparas handlar det i exemplet om
mindre än en halv cent per tur.

### Osäkerhet

Osäkerheten är stor och går inte att minska med dokumenterade uppgifter:

- Pris och svarstid för Decisions API är inte publicerade. Talet 150 ms
  kommer från tredje part.
- OpenAI anger ingen svarstid för Terra. Hur lång tid ett Terra-steg tar i
  Skyttel har inte mätts här.
- Hur stor andel av turerna som har ett enda fast utfall är okänt. Den
  andelen avgör hela vinsten.
- Träffsäkerheten på svenska yttranden är okänd. Ett felaktigt val i
  förkontrollen ger fel svar eller ett extra Terra-anrop.

Skyttel registrerar redan start- och sluttid samt tokens för varje
Terra-anrop (`TextModelAttempt` i `text-assistant-model.ts`). Kartans
baslinjekörning kan därför visa svarstid och kostnad per steg utan ett
särskilt prov.

OpenAI sade också i huvudanförandet att tiden till första token i API:et
har minskat med 45 procent. Jämförelseperioden anges inte. En sådan
förbättring gäller i så fall även det nuvarande flödet.

## 5. Är ett separat prov motiverat?

**Nej, inte nu.**

- Nyckeln har inte tillgång, så ett prov går inte att köra.
- Dokumentation, kontrakt, pris och gränser saknas. OpenAI kallar API:et en
  begränsad förhandsvisning.
- Nyttan är begränsad till turer med ett enda fast utfall. De beslut som
  styr korrekthet, främst sparbeskedet, är avsiktligt fasta serverregler.
- Samma förkontroll går att pröva med dokumenterade delar om baslinjen visar
  att den behövs.

Kartans villkor för provet, att API:et finns, är tillgängligt och är
relevant, är därmed inte uppfyllt. Resultatet påverkar inte
specifikationen.

### När frågan kan tas upp igen

Alla tre villkoren ska vara uppfyllda:

1. OpenAI har publicerat guide, API-referens och pris för Decisions API.
2. `POST /v1/decisions` med `{}` svarar med ett valideringsfel (400) i
   stället för 403 för projektets nyckel.
3. Baslinjekörningen visar att turer med ett enda fast utfall står för en
   märkbar del av väntetiden.

### Vad ett prov i så fall ska mäta

Provet är skilt från modellutvärderingen och använder påhittade yttranden.

- **Rätt val.** Andel rätt utfall för svenska yttranden ur
  scenariokatalogen. Nekade, hypotetiska och citerade sparkommandon, till
  exempel ”spara inte” och ”vad händer om vi sparar?”, får aldrig ge
  utfallet spara.
- **Svarstid.** Tid från yttrande till resultat med och utan förkontroll, som
  median och 95:e percentil, för turer med fast utfall och för turer som
  ändrar kartan.
- **Tal.** Tid från `session.delegation.created` till
  `session.commentary.append`.
- **Kostnad.** Kostnad per tur från rapporterad användning, jämförd med
  motsvarande Terra-anrop.
- **Jämförelse.** Samma mätning med `gpt-6-luna` utan resonemang
  (`reasoning.effort: "none"`) och ett schema med `enum`, så att vinsten av
  just Decisions API syns.

Resultatet kan bara motivera en valfri optimering. Det definierar inte
korrekt beteende.

## Ej bekräftat

- Vilken Luna-modell Decisions API använder.
- Pris, anropsgränser, kontextstorlek, språkstöd, lagring och dataresidens.
- Fält i anrop och svar, och om svaret innehåller ett konfidensvärde.
- Att `/v1/decisions` är den väg OpenAI kommer att dokumentera, och om ett
  särskilt HTTP-huvud krävs under förhandsvisningen.
- Hur åtkomst till förhandsvisningen begärs, och när den breda lanseringen
  sker.
- Talen 150 ms och ”tio gånger snabbare”. Bildmaterialet i huvudanförandet
  har inte granskats; bara textningen.
- Den aktuella texten på `openai.com/index/devday-2026-recap`. Den lästes i
  en arkiverad kopia från 2026-09-30 och kan ha ändrats sedan dess.
- Svarstid och tokenantal för Skyttels Terra-steg, samt andelen turer med
  ett enda fast utfall.
