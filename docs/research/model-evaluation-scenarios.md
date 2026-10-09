# Scenarier för korrekt text och tal i Skyttel

Detta är beslutsunderlaget till
[Vilka scenarier definierar korrekt text- och talbeteende?](https://github.com/viscalyx/skyttel/issues/170).
Ärendets beslutskommentar äger beslutet. Underlaget anger konkreta
startlägen, yttranden och förväntningar för den kommande implementationen.
Grenen är ett planeringsunderlag utan PR och ska inte slås ihop.

Alla personer, konton och hushållsuppgifter är påhittade. Produktnamn
används bara för att få realistiska namn i proven. Ljudet är syntetiskt.
Katalogen är ingen utvärderingskörning och visar inga modellresultat.

## Gemensamma regler

- Utan ett aktuellt uttryckligt sparbesked gör Skyttel bara beställda
  ändringar i utkastet. Användaren behöver inte säga ”spara inte”.
- ”Spara inte” och ”sparar inte” gör inget i sig. Andra beställda
  ändringar i samma yttrande ska fortfarande utföras. Inget sparförsök
  får göras, även om servern skulle avvisa försöket.
- Rösten och texten ger ett kort verifierat ändringsbesked. De räknar
  upp ändringarna endast på begäran. Vid fel eller oklarheter säger
  rösten tydligt vad som är fel eller oklart och vad användaren behöver
  justera eller välja. Frågan måste också stå i samtalstexten.
- En ändring utan nytt faktiskt utfall får inte bekräftas som utförd.
  Sparbesked kräver ett beständigt sparkvitto. Markering kräver
  klientens bekräftelse. Avvisade handlingar får inte bekräftas.
- Tydliga oberoende delar utförs i utkastet. Endast återstående
  oklarheter ska ge riktade frågor, med verkliga namngivna alternativ.
  Ett följdsvar kompletterar endast de väntande delarna.
- Vid oklarhet eller versionskonflikt får inga delar sparas. Efter
  förtydligandet krävs ett nytt uttryckligt besked om hela utkastet.
- Kontroller gäller hela kartan, utkastet, typdefinitionerna, historiken,
  sparkvittona och observerade handlingar. Bara beställda skillnader är
  tillåtna. Identiteter normaliseras när nya ID:n behöver jämföras.
- Alla steg använder produktionens textassistent, MCP och SQLite. Tal
  använder verklig röstanslutning och syntetiskt inmatat ljud. Testet
  får ordna startdata och övergångar, men inte ersätta modellens svar,
  transkription eller delegering med ett förväntat svar.

Bedömning, tre upprepningar, kostnader och stopp efter ett misslyckat steg
följer beslutet
[Vad mäter modellutvärderingen och när är ett steg godkänt?](https://github.com/viscalyx/skyttel/issues/171#issuecomment-6086785639).
Nedan anges godkänt innehåll, inte en exakt svensk formulering.

## Startkarta och utkast

Varje fristående scenario börjar från en egen kopia av grundläget.
Sammanhängande steg behåller resultatet från föregående steg. Alla objekt
har beskrivningen ”Påhittat katalogobjekt.” om inget annat anges.
Uppgifter och samband som inte nämns i startläget saknas.

### Objekt och ekonomiska uppgifter

- Personer: Alex Lind, Lo Berg och Mira Dahl.
- Företag: Spotify AB, Microsoft AB och Norrsken Molntjänster AB.
- Tjänster: Spotify, Microsoft 365, Molnlagring Plus och Tenant Norrsken
  Bygg. Tjänsten och abonnemanget är olika objekt.
- Abonnemang: Spotify Premium Family, Molnlagring Plus 2 TB och Netflix
  Standard. Priserna är 179, 199 respektive 139 kronor. Valutan är SEK
  och betalningsintervallet månad. Uppgifterna är säkert uppgivna.
- Tjänstekonton: Alex arbete och Lo arbete, båda hos Microsoft 365.
- E-postadresser: `m365@norrsken.test`, `alex@norrsken.test`,
  `lo@norrsken.test` och `hushall@norrsken.test`.
- Betalningsmedel: kortet Hushållskortet samt Bankkonto Hushåll och
  Bankkonto Reserv. Kort och bankkonton är olika objekt.

Typdefinitionerna för dessa objekt ingår i startläget, inklusive pris,
valuta och betalningsintervall. Inga egna fält finns från början.
Ekonomiska uppgifter lagras enligt produktionens datamodell; exempelvis
är det säkert uppgivna prisets värde texten `199`.

### Samband

- Spotify AB erbjuder Spotify, Microsoft AB erbjuder Microsoft 365 och
  Norrsken Molntjänster AB erbjuder Molnlagring Plus.
- Spotify Premium Family gäller Spotify. Molnlagring Plus 2 TB gäller
  Molnlagring Plus. Alex arbete och Lo arbete hör till Microsoft 365.
- Mira Dahl använder Spotify. Lo Berg använder Microsoft 365. Alex Lind
  använder från början ingen av de tre berörda tjänsterna.
- Spotify Premium Family står på Alex Lind, betalas av Mira Dahl och
  betalas med Bankkonto Reserv.
- Molnlagring Plus 2 TB står på Mira Dahl, betalas av Alex Lind och
  betalas med Hushållskortet.
- Båda tjänstekontona använder `m365@norrsken.test` som
  inloggningsadress och som kontaktadress. Adressrollerna är separata
  samband med samma adress i startläget.
- Hushållskortet har kontokoppling till Bankkonto Hushåll. Det sambandet
  ska inte ändras när ett abonnemangs betalningsmedel ändras.
- Det finns inget samband mellan Microsoft 365 och Tenant Norrsken
  Bygg. Sambandstypen Levererar till finns med benämningarna
  ”levererar till” respektive ”får leverans från”.

Startläget har aktuella namngivna sambandstyper för alla dessa betydelser.
Använder går från person till tjänst; adressroller går från tjänstekonto
till e-postadress; Betalas med går från abonnemang till betalningsmedel.
Står på avtalet går från abonnemang till person. Betalar går från person
till abonnemang. Används av går från tjänst till person och används i
fallen med ofullständiga uppgifter. Dessa riktningar är del av fixturen.

### Oberoende utkast och historik

Utkastet innehåller från början exakt två oberoende förslag:

1. Lo Bergs beskrivning ändras till ”Övar cello på tisdagar.”
2. Netflix Standards pris ändras till 149 kronor.

Grundläget har ett beständigt kvitto för startkartans förberedelse.
Antal nya sparförsök och sparanden nedan räknas efter denna förberedelse.
Samtalstext och kontext är tomma; inget fel eller någon fråga väntar.

### Startläge med två oklarheter

Grundläget kompletteras med personen Alex Berg. Spotify Premium Family
står här på Lo Berg och betalas med Hushållskortet. Både Bankkonto Hushåll
och Bankkonto Reserv finns, utan tidigare kontext som väljer något av
dem. Alex betyder därför antingen Alex Lind eller Alex Berg, och
bankkontot betyder antingen Bankkonto Hushåll eller Bankkonto Reserv.

## Korta ändringsuppdrag och samband

Yttranden för tal finns i [short-texts.json](scenario-speech/short-texts.json).
Varje ljud-ID nedan anger samma text för textvägen. Samtliga dessa
scenarier körs som text och tal.

### Tydligt uppdrag utan sparbesked

Grundläge. Använd `kort-utan-sparande`. Molnlagring-priset blir 229
kronor per månad och Spotify betalas med Hushållskortet i utkastet.
De två oberoende förslagen bevaras. Karta och historik är oförändrade;
nya sparförsök/sparanden är 0/0. Svaret är ett kort ändringsbesked utan
uppräkning, sammanfattning, sparfråga eller påstående om sparande.

### Samma uppdrag med uttryckligt sparande

Egen kopia av grundläget. Använd `kort-med-sparande`. Samma ändringar
och de två tidigare förslagen sparas tillsammans. Utkastet blir tomt;
nya sparförsök/sparanden är 1/1 med ett nytt kvitto och en motsvarande
historikpost. Svaret bekräftar kort det verifierade sparandet.

### Två oklarheter och nytt sparbesked

Startläget med två oklarheter. Kör tre steg:

1. `oklarheter-med-sparbegaran`: Lo använder Spotify och Molnlagring
   kostar 229 i utkastet. De oberoende förslagen bevaras. Användningen
   för Alex och Spotifys bankkonto ändras inte. Fråga vilken Alex och
   vilket bankkonto som avses, med båda namngivna alternativen för varje
   fråga. Rösten säger frågorna hörbart. Karta/historik oförändrade,
   nya sparförsök/sparanden 0/0 trots den ursprungliga sparbegäran.
2. `oklarheter-foljdsvar`: lägg till Alex Linds användning av Microsoft
   365 och byt Spotifys betalningsmedel till Bankkonto Reserv. Inga
   dubbla ändringar eller kvarvarande identitetsfrågor. Lo står kvar på
   Spotify. Karta/historik oförändrade, nya sparförsök/sparanden 0/0.
   Ge ett kort besked utan sammanfattning eller ny sparfråga.
3. `spara-hela-utkastet`: spara exakt hela detta utkast en gång, inklusive
   de två tidigare förslagen. Ett kvitto, en ny historikpost och tomt
   utkast; nya sparförsök/sparanden för steget 1/1.

### Samband utan typ eller riktning

Tre fristående scenarier från grundläget:

1. `samband-utan-typ`: fråga vilken sambandstyp som avses. Vid oklar
   riktning får en riktad fråga om den också ställas. Inget nytt samband
   föreslås. Följ med `samband-foljdsvar`: föreslå Levererar till från
   Microsoft 365 till Tenant Norrsken Bygg, utan sparande.
2. `samband-utan-riktning`: fråga vilken tjänst som levererar till den
   andra. Typen är redan given och ska inte efterfrågas igen. Inget
   samband föreslås före svaret. Samma följdsvar ger samma utkast.
3. `samband-med-riktning`: skapa direkt det entydiga sambandet i utkastet
   och ge ett kort ändringsbesked, utan följdfråga.

Alla steg har oförändrad karta/historik och 0/0 nya sparförsök/sparanden.
De två oberoende förslagen bevaras. Ingen typ eller riktning får gissas.
Talfallen tar med de två tjänstenamnen från felsökningens underlag.

## Fem längre uppdrag

Exakta godkända yttranden finns i
[long-texts.json](scenario-speech/long-texts.json).
Alla fem körs som text och som tal, med och utan de extra pauserna.
Pausvarianterna är samma scenario med en annan inmatad ljudsekvens.

### Flera tydliga ändringar

Grundläge och `flera-andringar`. Slutligt utkast ska ha:

- Alex Lind och Lo Berg använder Spotify; Miras användning tas bort.
- Alex Lind använder Microsoft 365; Lo Bergs användning bevaras.
- Spotify Premium Family betalas med Hushållskortet. Avtalspart Alex
  Lind, betalare Mira Dahl och pris 179 är oförändrade.
- Alex arbete har `alex@norrsken.test` som inloggningsadress och
  `hushall@norrsken.test` som kontaktadress. Båda tidigare adressrollerna
  ersätts. Kontots namn och Lo arbetes båda adressroller är oförändrade.
- Molnlagring Plus 2 TB kostar 229 kronor per månad, betalas med
  Bankkonto Hushåll och betalas av Lo Berg. Mira Dahl använder tjänsten
  Molnlagring Plus. Avtalspart Mira Dahl är oförändrad.
- De två oberoende förslagen och alla andra uppgifter bevaras.

Inga frågor behövs. Karta/historik oförändrade, nya sparförsök/sparanden
0/0. Rösten och texten ger ett kort verifierat ändringsbesked. Yttrandet
innehåller varken sparbesked eller begäran om sammanfattning.

### Sen prisrättelse

Grundläge och `sen-rattelse`. Samma slutliga utkast som ovan krävs.
Det tidigare nämnda priset 249 får inte vara slutvärdet; rättelsen till
229 nära slutet gäller. Övriga oberoende önskemål får inte försvinna.
Karta/historik oförändrade, 0/0 nya sparförsök/sparanden, inga frågor
och ett kort verifierat besked utan sammanfattning.

### Uttryckligt sparbesked sist

Grundläge och `sparbesked-sist`. Alla ändringar från Flera tydliga
ändringar och de två tidigare förslagen ska sparas tillsammans. Inget
förslag får lämnas kvar eller tappas. Nya sparförsök/sparanden 1/1,
ett beständigt kvitto och en motsvarande historikpost; utkastet är tomt.
Ge ett kort verifierat sparbesked utan uppräkning eller sammanfattning.

### Flera tydliga delar och två oklarheter

Startläget med två oklarheter och `tva-oklarheter`:

1. Föreslå Lo Bergs användning av Spotify, Mira Dahls användning av
   Molnlagring Plus, Molnlagring-priset 229 samt Lo arbetes
   inloggningsadress `lo@norrsken.test` och kontaktadress
   `hushall@norrsken.test`. Behåll Alex arbetes roller och Lo som
   avtalspart för Spotify. Behåll de två oberoende förslagen. Ändra inte
   Alex användning eller Spotifys betalningsmedel ännu. Fråga riktat om
   de två Alex och de två bankkontona, både hörbart och i texten.
2. `oklarheter-foljdsvar` lägger endast till Alex Linds användning av
   Microsoft 365 och betalning från Bankkonto Reserv. Inga dubbletter
   eller kvarvarande frågor; ett kort verifierat ändringsbesked.

Karta/historik oförändrade och 0/0 nya sparförsök/sparanden i båda steg.
Till skillnad från det korta oklarhetsfallet begär detta långa uppdrag
inget sparande. Följdsvar är en separat tur efter att frågorna har sagts.
Kör också följdsvaret efter mikrofonavslag och nytt mikrofonpåslag,
som skriven text efter talad fråga och som tal efter skriven fråga.
Samma väntande identiteter och samma slutliga utkast gäller i alla
varianter; frågorna får inte försvinna eller behöva ställas på nytt.

### Frågor och ändringar

Grundläge och `fragor-och-andringar`. Samma utkast som Flera tydliga
ändringar. Svaret ska på begäran sammanfatta samtliga beställda ändringar
och säga att Spotify Premium Family kostar 179 enligt den sparade kartan
och att Alex Lind och Lo Berg använder Microsoft 365 enligt utkastet.
Alex arbete markeras i kartan med klientens bekräftelse. Inga andra
objekt markeras. Karta/historik oförändrade, 0/0 nya sparförsök/sparanden.
Ingen identitetsfråga eller sparfråga ska ställas. Svaret får inte blanda
sparade värden med utkastets värden eller tappa någon av frågorna.

Kör även fallet med avvisad visningsbekräftelse från klienten. Ändringar
och faktasvar ska fortfarande vara korrekta, men svaret ska tydligt säga
att Alex arbetes visning inte kunde bekräftas. Inget lyckat
markeringsbesked får ges. I talvarianten måste felet höras i svaret.

### Ljudlängd och pauser

<!-- markdownlint-disable MD013 -->
| Uppdrag | Tecken | Ord | Utan extra paus | Med extra pauser |
| --- | ---: | ---: | ---: | ---: |
| Flera tydliga ändringar | 838 | 131 | 68,371156 s | 70,371156 s |
| Sen prisrättelse | 967 | 155 | 78,611156 s | 80,611156 s |
| Sparbesked sist | 890 | 140 | 71,308481 s | 73,308481 s |
| Två oklarheter | 646 | 101 | 54,717823 s | 56,717823 s |
| Frågor och ändringar | 1 090 | 170 | 87,562449 s | 89,562449 s |
<!-- markdownlint-enable MD013 -->

Tecken räknas med Python `len`, ord med delning vid blanktecken och
exakt ljudlängd som antal PCM-ramar delat med 22 050. Mätningen gäller
den slutliga texten där normalfallen saknar ”spara inte”. Den skiljer sig
därför från frågerundans första mätning.

Piper `sv_SE-nst-medium` ger 16-bitars mono PCM vid 22 050 Hz. Inställningar:
`noise_scale=0`, `noise_w_scale=0`, `length_scale=1`, CPU och normalisering.
Piper 1.8.0, ONNX Runtime 1.31.0 och NumPy 2.5.3 anges i manifestet.
Modell, konfiguration, generator och ljudfiler har SHA-256.

Testet lägger till 0,5 och 1,5 sekunders tystnad vid de två ursprungliga
PCM-positionerna i manifestet. Pauserna kommer efter ”så ändra inte den
uppgiften” respektive ”du ska inte byta namnet på tjänstekontot” för fyra
fall; oklarhetsfallet använder meningarna om bankkontot respektive de två
adressrollerna. Båda pauserna är inuti uppdraget. Ljudet mellan dem och
efter dem ska inte tappas. En paus är inget sparbesked.

Endast referensklippen utan extra tystnad checkas in. Lokalt uppmätta
sammanfogningar verifierar de redovisade pauslängderna. Manifestet visar
att vanlig PCM och sammanfogade segment är identiska, så testet kan
infoga pauser i referensklippet. Klippen saknar extra start- och
sluttystnad; transportens tystnad hör till testets inmatning.

## Sparnegationer och andra besked utan sparavsikt

Samtliga fall körs som text och tal från en egen kopia av grundläget.
Yttranden finns i `short-texts.json`:

- `nekad-sparavsikt`: prisändring följd av ”spara inte”.
- `nekad-sparavsikt-presens`: samma ändring följd av ”sparar inte”.
- `uppskjuten-sparavsikt`: samma ändring och ”vänta med att spara”.
- `hypotetisk-sparavsikt`: samma ändring och en fråga om vad som händer
  om hela utkastet sparas. Svaret ska förklara att även de två tidigare
  förslagen skulle sparas; inget faktiskt sparande får påstås.
- `citerad-sparavsikt`: samma ändring och ett uttryckligen citerat
  sparkommando som inte är en begäran.
- `villkorad-sparavsikt`: samma ändring och en sparbegäran som är
  villkorad av en framtida kontroll. Den är ingen aktuell sparavsikt.
- `sen-sparnegation`: samma sammanhängande yttrande begär först att
  spara och rättar sedan detta till ”spara inte”. Rättelsen gäller.
- `bara-spara-inte` och `bara-sparar-inte`: ingen ändring alls.

De sju fallen med prisändring ger priset 229 i utkastet och bevarar de
två tidigare förslagen. De två rena negationerna lämnar även utkastets
innehåll och version oförändrade. I alla nio fall är karta/historik
oförändrade och nya sparförsök/sparanden 0/0. Inga sparfrågor ska ställas.
Svaret får inte säga att något sparats. Rena negationer får inte ge ett
ändringsbesked; en kort bekräftelse av att inget sparas är tillåten.

Sen sparnegation spelas som ett sammanhängande klipp utan tillagd paus
mellan första sparbegäran och rättelsen. Katalogen kräver inte att ett
redan slutfört tidigare uppdrag kan återtas av ett nytt yttrande.

## Typer och egna fält

Dessa fristående scenarier körs endast som text från grundläget.
Karta/historik är oförändrade och nya sparförsök/sparanden 0/0 i alla fall.
De två tidigare förslagen bevaras; lyckade ändringar får korta besked.

1. ”Skapa objekttypen Solcellsanläggning med datumfältet Installationsdatum.
   Lägg till Soltak Norr 7 med installationsdatum 3 juni 2025.” Utkastet
   innehåller typen, datumfältet och ett objekt med datum `2025-06-03`.
2. ”Lägg till textfältet Placering på den förifyllda typen Tjänstekonto.
   Sätt Alex arbetes placering till Arbetsrummet.” Utkastet innehåller
   typändringen och värdet på Alex arbete. Typens övriga definition och
   Lo arbete bevaras. Ingen ny konkurrerande typ skapas.
3. ”Skapa sambandstypen Säkerhetskopierar till. Framåt heter den
   säkerhetskopierar till och bakåt tar emot säkerhetskopia från.
   Microsoft 365 säkerhetskopierar till Tenant Norrsken Bygg.” Utkastet
   innehåller typen med båda benämningarna och sambandet i rätt riktning.
4. ”Ta bort objekttypen Tjänstekonto.” Typen används av två sparade
   objekt och får inte tas bort. Utkastet är oförändrat. Svaret säger
   varför åtgärden inte kan utföras och att typen fortfarande används.

Dessa fall prövar redigerbara definitioner. De gör ingen förifylld typ
till en låst lista och får inte förlora tidigare värden eller samband.

## Ofullständiga uppgifter

Dessa fyra fristående scenarier körs endast som text. De första tre
börjar med grundläget och ett extra säkert samband: Molnlagring Plus
Används av Alex Lind. Ett ersättande svar ska ersätta just denna uppgift,
inte behålla en säker användare tillsammans med en motsägande uppgift.

1. ”Jag vet inte vem som använder Molnlagring Plus.” Utkastet anger
   okänd användare, utan att välja en person eller påstå att ingen finns.
2. ”Ingen använder Molnlagring Plus.” Utkastet anger uttryckligen ingen
   användare, inte okänd användare.
3. ”Jag tror att Mira Dahl använder Molnlagring Plus.” Utkastet anger
   Mira Dahl med osäker uppgift, inte säker användning.
4. Grundläge: ”Molnlagring Plus 2 TB betalas från ett bankkonto, men jag
   vet inte vilket.” Utkastet byter det abonnemangets betalningsmedel
   till ett uttryckligen ospecificerat bankkonto. Varken Bankkonto
   Hushåll eller Bankkonto Reserv väljs. Kortkopplingen bevaras.

Alla steg bevarar tidigare förslag och ger 0/0 nya sparförsök/sparanden
med oförändrad karta/historik. Svaret får inte ändra uppgiftens säkerhet.
Det uttryckligen accepterade ofullständiga underlaget kräver ingen fråga
om att välja en identitet som användaren säger sig inte känna till.

## Ångring, återställning och läsning

Dessa fristående scenarier körs endast som text. Alla har oförändrad
karta/historik och 0/0 nya sparförsök/sparanden. Andra förslag bevaras.

1. Grundläge plus ett sist föreslaget Molnlagring-pris 229: ”Ångra den
   senaste osparade prisändringen.” Kasta just det prisförslaget och
   behåll de två andra förslagen. Priset enligt utkastet blir åter 199.
2. Grundläge plus föreslagen borttagning av Alex arbete: ”Återställ Alex
   arbete i utkastet.” Kasta borttagningsförslaget, bevara kontot och
   båda sparade adressrollerna. Bekräfta endast återställning i utkastet.
3. Grundläge med sparat Molnlagring-pris 229: ”Ändra tillbaka priset för
   Molnlagring Plus 2 TB till 199 kronor, spara inte.” Föreslå en ny
   rättelse till 199. Historiken och det tidigare sparandet återställs
   inte; priset i den sparade kartan är fortsatt 229.
4. Grundläge: ”Berätta vilka ändringar som ligger i mitt utkast.” Svaret
   innehåller Lo Bergs föreslagna beskrivning och Netflix-priset 149.
   Inga förslag ändras. Detta är en uttrycklig begäran om detaljer.
5. Starta från ett verkligt slutfört Samma uppdrag med uttryckligt
   sparande: ”Vad sparades senast?” Svaret redovisar exakt de fyra
   logiska ändringarna från dess kvitto, inklusive de tidigare förslagen.
   Inget nytt sparande eller nytt förslag görs.
6. Grundläge efter ett verkligt avvisat försök att ta bort Tjänstekonto:
   ”Vad gick fel senast?” Svaret anger att typen används och inte kan
   tas bort. Det upprepar inte handlingen och hittar inte på ett annat
   fel. Felet ordnas via produktionsvägen, inte som ett falskt modellsvar.
7. Grundläge: ”Visa Alex arbete i kartan.” Rätt objekt markeras och
   bekräftas efter klientens visningsbekräftelse. Utkastet ändras inte.
8. Samma uppdrag med klientens visningsbekräftelse avvisad: svaret säger
   att visningen inte kunde bekräftas. Inget lyckat markeringsbesked.

Den blandade långa frågan täcker även markering och detaljinnehåll i tal.
Historisk ångring erbjuds inte. Nya rättelser använder vanliga verktyg.

## Versionskonflikt

Endast text. Grundläge och tre steg:

1. ”Ändra priset för Molnlagring Plus 2 TB till 229 kronor.” Föreslå
   229; bevara de två tidigare förslagen. Karta oförändrad, 0/0.
2. En annan påhittad användare sparar priset 219 via produktionens
   kodväg. Därefter säger användaren ”Spara hela utkastet.” Inget av det
   egna utkastet får sparas. Skyttel beskriver tidigare 199, föreslaget
   229 och nu sparat 219 samt frågar vilket värde användaren vill ha.
   Rösten omfattas inte av detta fristående prov. Ett avvisat eget
   sparförsök är tillåtet om servern upptäcker konflikten först där;
   antalet måste redovisas och inga egna sparanden får genomföras.
3. ”Behåll mitt förslag på 229 kronor.” Lös konflikten i utkastet men
   spara inte. Följ med ”Spara hela utkastet.” Det senare steget sparar
   hela det lösta utkastet exakt en gång med ett kvitto. Den andra
   användarens förberedande sparande redovisas separat.

## Referenser och samtalskommandon

Alla tillämpliga fall körs som text och tal. Varje referensfall börjar
med en ny kopia av grundläget och de två yttrandena
`kontext-forsta-andring` och `kontext-sista-andring`. Utkastet får först
Spotify-priset 189 och därefter Molnlagring-priset 229. Varje steg ger
ett kort verifierat besked och 0/0 nya sparförsök/sparanden.

Följ med `kontext-ratta-sista` efter en av dessa sex övergångar:

1. Ingen övergång: hänvisning direkt efter ändringen.
2. `spara-hela-utkastet`: de fyra logiska ändringarna sparas 1/1 med
   tomt utkast. Följdhänvisningen föreslår bara ett nytt Molnlagring-pris.
3. Begär detaljer med `rost-begar-sammanfattning` och använd Avbryt
   under arbetet eller svaret. Behåll redan utförda ändringar och
   samtalets kontext. Följdhänvisningen upprepar inte avbrutet arbete.
4. Byt från röst till text respektive från text till röst i samma
   samtal. Båda riktningarna är varianter av samma referensfall.
5. Stäng av och öppna röstanslutningen igen i samma samtal. Servern och
   samtalet fortsätter; detta är inte serveromstart eller Nytt samtal.
6. Gör en verklig sammanfattning av kontexten innan följdhänvisningen.
   Testet kan använda ett fast påhittat äldre kontextunderlag för att
   nå gränsen, men sammanfattningen och följdsvaret görs av modellerna.
   De två senaste ändringarna hör till sammanfattningens underlag.

Efter följdhänvisningen ska Molnlagring-priset vara 239 i utkastet och
Spotify-priset vara kvar på 189. Andra förslag bevaras. I sparvarianten
är övriga ändringar redan sparade och ska inte föreslås igen. Själva
följdhänvisningen får aldrig spara eller fråga vilket av de två priserna
som avses när kontexten finns. Den får ett kort verifierat besked.

Tre fristående kommandofall börjar från grundläget och ett pågående
samtal med känd text och kontext:

- `nytt-samtal`: töm samtalstext och kontext, stoppa arbete/kö, behåll
  mikrofonens läge och de två utkastförslagen. Säg att två osparade
  ändringar ligger kvar. En ny bekräftelserad får stå i det nya samtalet.
- `kasta-utkastet`: kasta båda förslagen, lämna sparad karta/historik
  och övrigt samtal kvar. Bekräfta kort att utkastet har kastats.
- `nytt-samtal-och-kasta`: töm utkast, tidigare samtalstext och kontext
  samt stoppa arbete/kö. Behåll mikrofonens läge. Bekräfta kombinationen
  utan att säga att gamla förslag finns kvar.

Kommandona ger 0/0 nya sparförsök/sparanden och ändrar ingen sparad karta.
Kömekaniken kontrolleras i applikationens tester; modellfallen prövar
tolkning, resultat och besked för dessa kommandon.

## Fyra verkliga röstkontroller

Dessa är talprov med verklig anslutning och syntetisk ljudinmatning:

1. Grundläge, långt tryck från avstängd mikrofon: spela
   `rost-fraga-pris` medan anslutningen startar, efter gränsen 0,45
   sekunder. Släpp efter sista provet av inmatat tal. Skyttel ska höra
   hela uppdraget, svara 179 kronor per månad och spela klart svaret
   efter släpp. Ingen ändring eller sparhandling. Inget första ord får
   tappas; lång tryckning kräver inte att användaren väntar på Lyssnar.
2. Grundläge, mikrofon på: spela `rost-andra-pris` och slå av mikrofonen
   när uppdraget bearbetas. Priset blir 229 i utkastet; tidigare förslag
   bevaras. Det korta ändringsbeskedet ska fortfarande höras färdigt
   och finnas i samtalstexten. Nya sparförsök/sparanden 0/0.
3. Grundläge, mikrofon på: skriv texten från `rost-fraga-pris`. Svaret
   179 kronor per månad ska både höras och stå i samtalstexten. Ingen
   ändring eller sparhandling; svaret får inte tappas eller dubbleras.
4. Grundläge med redan utförd osparad prisändring: begär detaljer via
   `rost-begar-sammanfattning` och använd Avbryt medan svaret hörs.
   Uppspelningen ska tystna inom en sekund. Redan utförda förslag ska
   finnas kvar. Avbrottet får inte beskrivas som ångring eller sparande.

Frågor och fel i andra talfall ska alltid höras som begripliga besked,
även när användaren inte öppnar textvyn. Nödvändiga frågor får inte
ersättas av bara ett kort allmänt ändringsbesked.

## Tidsgränser och mätning

- Röstanslutning: teknisk stoppgräns 30 sekunder från begärd start.
- Text: 180 sekunder från skickat yttrande till färdigt svar per steg.
- Tal: 180 sekunder från sista inmatade ljudprovet till färdigt hörbart
  svar per steg. Yttrandets längd räknas inte in i denna stoppgräns.
- Avbryt har ett särskilt beteendekrav: uppspelningen tystnar inom en
  sekund. Övriga svar har inget separat krav på snabbhet för godkänt.
- En teknisk stoppgräns ger felresultat och inget automatiskt betalt
  återförsök. Produktionens interna gränser och tidigare fel redovisas.
- Text mäter färdigt svar; tal mäter första hörbara svar och avslutad
  uppspelning. Tillståndets färdigställande mäts också. Tidiga
  mellanbesked räknas inte som det färdiga svaret.

## Tillgångar och återstående beslut

[Manifestet](scenario-speech/manifest.json) anger exakta texter, längder,
pauspositioner, versioner, licensunderlag och kontrollsummor.
[Generatorn](scenario-speech/generate.py) reproducerar lokalt ljud med
extern Piper-installation och modell. Inga modellvikter eller
leverantörsrådata ingår. Vid implementation används de incheckade
referensklippen; testet genererar inte nya klipp.

Detta underlag anger varken utvärderingens filformat eller hur
taligenkänning, delegering och återgivning observeras. De beslutas i
[Hur dokumenteras utvärderingsflödet och sparas resultathistoriken?](https://github.com/viscalyx/skyttel/issues/173)
och
[Hur skiljer talscenarierna taligenkänning, delegering och återgivning?](https://github.com/viscalyx/skyttel/issues/331).
Kostnadsuppskattningen måste använda hela detta urval, dess ljudlängder,
sammanfattningsanrop och tre upprepningar; inget scenario tas bort tyst
för att passa ramen. Se
[Uppskatta kostnaden för en fullständig utvärderingskörning](https://github.com/viscalyx/skyttel/issues/174).
Talreparationen och innehållsbedömarens kontrollfall är fortsatt egna
öppna beslut. Detta underlag ändrar inte produktionens kod eller modell.
