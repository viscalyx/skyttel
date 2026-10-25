# Nollreferenser och navigering inför implementation

Det här underlaget är för den som ska implementera eller granska
nollreferenserna och ändringarna i navigeringsfönstret. Det samlar beslutade
krav, den aktuella prototypens beteende och återstående frågor. Det ska gå
att förstå kraven utan att läsa en chatt eller följa en ärendediskussion.

**Status: besluten nedan gäller, men hela designen är inte slutgodkänd.**
Avsnittet om öppna frågor måste behandlas före den samlade designens avslut.
Prototypkod och skärmbilder är underlag, inte färdig produktionskod eller
bevis på fullständig tillgänglighet.

Läs tillsammans med:

- [Begreppen i Skyttel](../../GLOSSARY.md).
- [Prototyparkivet](../../prototypes/zero-reference-planes-live/ARCHIVE.md):
  fasta kodversioner, bilder, rapporter och varje experiments begränsningar.
- [Körning av planprototypen](../../prototypes/zero-reference-planes-live/README.md).
- [Körning av navigeringsprototypen](../../prototypes/zero-reference-planes-live/POSITION.md).

## Omfattning och betydelse

Nollreferensen beskriver den personliga vyn av hushållets karta. Den är
inte ett hushållsfaktum, ett verkligt mått, ett golv eller ett tak.
Nollpunkten ligger fast i kartans koordinater. Objekt kan finnas på båda
sidor om varje nollplan, även efter automatisk placering.

- X betyder sidled, Y höjd och Z djup i kartans fasta axlar.
- Planen är XZ vid Y = 0, YZ vid X = 0 och XY vid Z = 0.
- Kamerans rörelse ändrar inte nollpunktens eller axlarnas betydelse.
- Den lokala flytthjälpen utgår fortfarande från flyttens startposition.
  Dess hjälpplan ligger fyra vyenheter under starten. Shift-förhandsvisning
  och dragning måste använda samma lokala referens, inte gemensam nollpunkt.
- Navigeringens normalläge och miniläge finns kvar. De bestämmer inte hur
  plan eller axlar ska ritas. Detta arbete inför ingen allmän ombyggnad av
  navigeringsfönstret eller hushållets uppgifter.

## Beslutade visuella val

Alla kombinationer av fyra varianter och tre visuella styrkor ska finnas:

| Variant | Geometri vid fast storlek |
| --- | --- |
| Kvadrat | Tre vinkelräta plan; halva sidlängden är 27 i båda riktningarna. |
| Oval | Tre vinkelräta plan; halvaxlarna är 27 och 18,9. |
| Cirkel | Tre vinkelräta plan; radien är 27. |
| Linjer | X-, Y- och Z-axlar från −27 till +27, utan planytor eller rutnät. |

Styrkorna är **Diskret**, **Ursprunglig** och **Framträdande**, oberoende av
variant. **Cirkel + Diskret** är förval. Kvadratens sida ska motsvara
cirkelns diameter; ovalens proportioner ska behållas.

Förvalet betyder inte att referensen är synlig. De tre planvarianterna
behåller alla tre planen. Linjer är ett ytterligare val och ersätter dem
inte. En senare förenkling behöver beskriva vilket problem den löser, vad
som försvinner och få användarens godkännande.

## Reglage, förval och lagring

Inställningar → Bakgrund får en grupp **Nollreferens**. Den fungerar även
när den dekorativa bakgrunden är avstängd.

| Reglage | Förval och innebörd |
| --- | --- |
| Variant | Cirkel; alla fyra varianter är valbara. |
| Synlighet | Diskret; avser visuell styrka, inte av/på. |
| Alltid synlig | Av; visar hela den valda referensen när kartan är öppen. |
| Synlig vid dragning | Av; tillfällig visning enligt reglerna nedan. |
| Tonstyrka | 0 %, valbart från 0 till 85 %. |
| Storlek vid zoom | Av; slutlig benämning återstår. |

Navigeringsfönstret visar samma inställning som **Alltid synlig**, med
etiketten **Nollreferens**. Etiketten ska synas i både normal- och miniläge,
även på liten skärm. Att koordinatrubrikens infoikon döljs i miniläge
ändrar inte detta krav på Nollreferens-reglaget.

När Alltid synlig är på är Synlig vid dragning inaktiv och nedtonad, men
behåller sitt sparade värde. Förklaringen ska gå att läsa. Avstängning av
Alltid synlig aktiverar det bevarade värdet igen, även under pågående drag.
Reglagen representerar inställningar och byter inte betydelse under en gest.
Ingen kontroll ska betyda tillfällig faktisk synlighet.

Spara de sex valen per Skyttel-användare och hushåll, över stängning av
kartan, webbläsarsessioner och enheter. Andra användare och hushåll har egna
val. Spara inte tillfällig synlighet, pågående gester, tidsgränser eller den
föränderliga planstorleken under ett besök.

Det finns inget nytt återställningsreglage för nollreferenser. Befintlig
återställning av kamera eller bakgrundsrörelse ska inte återställa dessa
val. Separata reglage för enskilda plan eller axlar ingår inte.

## Tillfällig synlighet

Följande gäller när Alltid synlig är av och Synlig vid dragning är på:

- Visa referensen när ett objekt faktiskt börjar dras med mus, penna eller
  pekskärm. Vanligt klick, markering och kamerarörelse utlöser inte visning.
- Behåll visningen under dragning och dölj en sekund efter avslut.
  Ett nytt drag under denna sekund fortsätter visningen och startar en ny
  fördröjning vid nästa avslut.
- Navigeringens objektflyttknappar, även aktivering med tangentbord, visar
  referensen. Dölj en sekund efter senaste flyttåtgärden.
- Ett stilla tryck med primär musknapp över ett objekt visar referensen
  efter 1,5 sekunder. Behåll den till släpp och dölj en sekund senare.
  Övergång till dragning fortsätter enligt dragreglerna.
- Stillastående tryck på tom karta ingår inte. Pekskärmens befintliga
  hållgest för objektåtgärder är separat och ska behållas.
- Avbruten dragning eller lämnad karta tar bort tillfällig visning direkt.
  En fördröjd händelse från en avbruten gest får inte visa referensen igen.

Släpp och avbrott ändrar inte Alltid synlig. Om den stängs av under ett
drag styr det bevarade dragvalet om referensen fortsätter att synas.
Vid återbesök börjar enbart automatisk visning dold; en gammal gest återupptas
inte. Alltid synlig visar däremot referensen när kartan öppnas.

Automatisk visning och döljning ska inte flytta tangentbordsfokus eller
annonseras av skärmläsare. Den korta döljfördröjningen får inte ta bort
reglage eller åtkomst till positionsinformation. Reglagens markerade och
inaktiva tillstånd ska fortfarande förmedlas.

Direkt koordinatinmatning är ett nytt sätt att flytta objekt. Dess exakta
koppling till automatisk referensvisning är en öppen fråga, inte en
underförstådd utvidgning av reglerna för flyttknapparna.

## Storlek, kamera och etiketter

Fast storlek är grundläget. Fler objekt, avlägsna objekt och rörelse ska
inte ändra referensens storlek. Ett objekt kan ligga utanför en planbit
eller en axels ändpunkt.

Det valfria zoomläget ska ge ungefär samma storlek på skärmen:

- Vid öppning av kartan eller aktivering av valet används måtten ovan.
- Utzoomning förstorar referensen i kartkoordinater; inzoomning minskar den.
- Fokus och kameraåterställning använder samma zoomrespons. De ändrar inte
  det sparade valet. Panorering och rotation ändrar inte utbredningen.
- Plan, rutnät, kanter och skärningsaxlar skalas tillsammans. Proportioner
  och jämförelsen mellan kvadrat och cirkel bevaras.
- Nollpunkten flyttas inte. Avstängt zoomläge ger fast storlek igen.
- Valet är skilt från bakgrundens zoomstyrka och styrs inte av kartans
  tillväxt eller ett enskilt objekts position.

Använd vanlig perspektivprojektion och kameraklippning. Kantställda plan
får bli linjer; en axel riktad mot kameran får bli en punkt. Vrid inte
geometrin mot betraktaren och inför inte en minsta synlig bredd.
Geometri bakom kameran kan försvinna. Den ska inte bli ett skärmlager.

Nollpunkt, plan och axlar får lämna bildytan helt. Inga kantpilar eller
automatisk omcentrering ska tillkomma. Fokus och återställning ramar fortsatt
in objekten; de lovar inte att nollpunkten syns. Automatisk referensvisning
ska inte flytta kameran eller nollpunkten.

Referenstext behåller läsbar storlek på skärmen vid zoom. Etiketter sitter
vid sina projicerade fästpunkter och döljs när fästpunkten lämnar vyn eller
texten kolliderar med annan text. Objektetiketter har företräde. Flytta inte
referenstext till skärmkanter. En dold etikett döljer inte geometrin.

## Tonstyrka och läsbarhet

Tonstyrka är oberoende av referensens visuella styrka. Vid 0 % tillförs
ingen ton på objekt eller samband, även om referensgeometrin syns.

Över 0 % ska de delar av objektsymboler samt sambandslinjer och pilspetsar
som ligger bakom en begränsad planyta i den aktuella vyn få planens ton.
Delar framför planet eller utanför planbiten ska inte få dess ton.
Överlappande toner kombineras. Textetiketter står utanför toningen.
Fokus, markering och symbolernas användbarhet måste bevaras.

Linjer har inga planytor. Tonstyrka ska då vara inaktiv med en läsbar
förklaring, men värdet ska behållas och få effekt när ett planval återkommer.
Tonstyrka får inte krävas för att förstå eller ändra position.

De fasta tonlägena A/B/C och deras provvärden är jämförelseverktyg, inte
tre produktlägen. Prototypens starka förval på 60 % är inte produktens 0 %.
Färg och överlappning visar inte ensamma säkert vilken sida om varje
nollplan ett objekt ligger på.

## Navigeringsfönstret och koordinatinmatning

### Beslutat gränssnitt

- Lägg tre fält, **X**, **Y** och **Z**, i en rad ovanför knapparna som
  flyttar det markerade objektet. Behåll de befintliga flyttknapparna.
- Lägg inte positionsdelen i objektets egenskaper, detaljfönster eller
  expanderade tabellrad. Den lösningen är uttryckligen bortvald.
- Varje giltig ändring ska flytta objektet direkt på den ändrade axeln.
  Ingen knapp **Flytta till position**, Enter eller fokusförlust krävs.
- Visa positionerna med två decimaler och avrunda nya värden till två
  decimaler. Ett inmatat avrundat värde ska också vara värdet som används
  vid flytten, inte bara en avrundad presentation av ett annat nytt värde.
- I normalläget finns **Ange position** med en liten infoikon direkt till
  höger. Ikonen öppnar koordinatförklaringen.
- I miniläget döljs rubriken och infoikonen. Koordinatfälten och de
  befintliga flyttknapparna finns kvar på sina platser.
- Ta bort den dubbla texten **Aktuell position**. Ha inte meningen
  ”Nollpunkten ligger kvar när du roterar vyn.” i koordinatförklaringen.

Förklaringen i den aktuella prototypen lyder:

> X är sidled, Y är höjd och Z är djup i kartans fasta axlar. Värdena är
> inte verkliga mått.
>
> Värden mellan −10 000 och +10 000. Nya värden avrundas till två decimaler.

### Konkret prototypbeteende att bevara som granskningsunderlag

Följande är genomförda detaljer i experimentet, inte ytterligare beslut
som ska antas godkända bara för att de finns i kod:

- Varje axel valideras för sig. Tomt fält, ensamt minus, ofullständigt tal,
  icke ändligt tal eller ett värde utanför befintliga gränser lämnar axeln
  vid senaste giltiga position. Ett ogiltigt X blockerar inte giltigt Y/Z.
- Fältet behåller fokus under flytt. Delvis skriven text som `2.` får
  finnas under redigering. Extra decimaler avrundas direkt. När fokus
  lämnar fältet fylls två decimaler ut; ofullständig inmatning återgår till
  senaste giltiga värdet.
- Halva hundradelar avrundas från noll: `1.005` blir `1.01`, `-1.005`
  blir `-1.01`. `-0.001` blir `0.00`. Skrivning av `2.345` ger `2.35`.
  Webbläsaren kan använda sitt lokala decimaltecken i sifferfältet.
- Att visa en redan lagrad position med två decimaler skriver inte om den.
  Flyttknappar, dragning och fält delar position; knappflytt uppdaterar
  fältet så att gammal redigering inte döljer den nya positionen.
- Byte av markerat objekt kastar ofullständig inmatning för förra objektet.
  Byte mellan normal- och miniläge bevarar koordinaterna.
- Hjälpen har en namngiven knapp och exponerat öppet/stängt tillstånd.
  Escape på infoikonen stänger hjälpen utan att stänga navigeringen.
  Miniläget döljer även öppen hjälp; normalläget återger dess öppna tillstånd.
- Fältens tillgängliga namn är Sidled (X), Höjd (Y) och Djup (Z).
  Gruppen är knuten till det markerade objektets namn även i miniläget.

### Befintlig navigering och produktionsanslutning

Behåll kameraknapparna, normal/miniväxlingen, stängning och möjligheten
att flytta navigeringsfönstret med titelraden eller tangentbordet.
Ett objektval flyttar inte kameran. Objektets X/Y/Z-flytt följer fasta
kartaxlar även när kameran roteras. Prototypen ändrar inte dessa samband.

I experimentet är positionerna endast i minnet och återställs vid omladdning.
Det är en avgränsning för granskning, inte ett beslut att produktens
personliga positioner ska sluta sparas. Produktionsarbetet måste ansluta
direktinmatningen till hanteringen av personlig vy, åtkomst och sparresultat.
Snabba giltiga inmatningar får inte tappas för att ett tidigare nätanrop
pågår. Strategi för ordning, fel och samtidiga ändringar behöver preciseras.

## Tillgänglighet och kvarstående frågor

Utgå från projektets krav på WCAG 2.2 AA, tangentbord, pekskärm, skärmläsare,
synligt fokus, kontrast i båda teman, förstoring och tillgängliga alternativ
till dragning. Kontrollera även objekt och samband när referensen eller
toningen är på. Prototypbilder och automatiserade kontroller bevisar inte
överensstämmelse för hela flödet.

Följande är öppet och får inte fyllas i med prototypens tillfälliga val:

1. Slutligt namn och hjälptext för zoomstorlek. Förslaget
   **Behåll storlek vid zoom** är ännu inte beslutat.
2. Om Tonstyrka ska ha ett separat sifferfält och steg om en procentenhet.
   Intervallet 0–85 %, förvalet 0 % och bevarat inaktivt värde är beslutade.
3. Slutlig annonsering av flyttresultat, inklusive snabb inmatning.
   Prototypens artiga statusmeddelande är ett provbeteende. Automatisk
   referensvisning ska däremot vara tyst enligt beslutet ovan.
4. Referensens automatiska visning vid direkt koordinatinmatning.
5. Åtkomst till koordinater från automatisk placering, inte enbart de
   sparade positioner som experimentets nio provobjekt har.
6. Sammanhängande åtkomst utan visuell kartnavigering efter att positionsdelen
   i egenskaperna väljs bort. Vägen Tabell → objektval → Karta → Navigera
   finns i experimentet, men hela upplevelsen behöver fortsatt granskning.
7. Positionsinformation för samband och användning när nollpunkt, plan eller
   axlar är utanför vyn, kantställda eller saknar tonade ytor.
8. Slutliga visuella och icke färgbaserade signaler, kontrast, fokus,
   omflöde och små skärmar i båda navigeringslägena.
9. Granskning av prototypens inmatningsdetaljer och anslutningen till sparande,
   inklusive fel, tillgänglig återkoppling och samtidiga förändringar.
10. Samlad kontroll och användarens godkännande av den färdiga designen.

## Skillnader mellan experiment och leverans

Den körbara prototypen innehåller inte hela kravbilden. Den öppnar referensen
direkt, har jämförelsepaneler och bevarar provvärden som inte är förval för
produkten. Slutliga inställningar, lagring av referensval, automatisk
synlighet, zoomstorlek och etikettkollisioner är inte fullständigt byggda.

Kurvade samband, pilspetsar, klippning och överlappande toning behöver
produktionsgranskning. Ett byte från bildfilter till vektorbaserad toning
minskar den uppmätta merkostnaden i ett litet huvudlöst exempel; det bevisar
inte jämn kamerarörelse på användarens enhet eller i en stor karta.

Implementera mot besluten ovan, jämför med de namngivna prototypversionerna
och behandla öppna frågor uttryckligen. Kopiera inte prototypgrenen som om
den vore en leveransklar implementation. Bevara arkivets äldre steg så att
ett bortvalt alternativ eller ett gammalt förval inte återkommer av misstag.
