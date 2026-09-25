# Observationer från talprovet

Kontrolldatum: 2026-09-15. Underlag till
[Vilken talväg klarar det godkända samtalsflödet på svenska?](https://github.com/viscalyx/skyttel/issues/14).
Beställaren upplever Terra som mycket rappare och bedömer att flödet
fungerar. Talbeslutet avslutas med Terra låg, GPT-Live och MCP som
valt upplägg. Beställaren bedömer att det nödvändiga är prövat.
Ytterligare röstprov i Chrome på Windows, iPhone och iPad ingår inte
i denna kartläggning och blockerar inte teknikbeslutet. Målplattformarna
kvarstår, men deras talstöd är inte verifierat genom dessa prov.
Det slutliga produktstackbeslutet återstår.
Se [avslutets avgränsning](../../docs/prototypes/swedish-voice.md).

## Modellval i prototypen

Beställarens standardval är GPT-5.6 Terra med låg resonemangsnivå.
Provsidans **Experiment** erbjuder GPT-5 Mini, GPT-5.6 Luna, Terra,
Sol och GPT-6 Astra samt låg eller hög nivå. Bytet gäller nästa
kartuppdrag och är spärrat under samtal, kartarbete och okänt sparkvitto.
Den ordinarie serverstarten väljer Terra låg utan extra argument.

Sju backendkontroller verifierar standard, validering, spärrar,
oförändrad karta och budget samt alla tio modell/nivå-kombinationers
API-underlag och kostnadsreservation. Tio klientkontroller verifierar
val, fel och gamla svar; 37 befintliga klientkontroller passerar också.
Webbläsarprovet växlar genom alla fem modeller och båda nivåerna och
bekräftar Terra låg efter omladdning. Kontrollerna använder simulerade
modellsvar och gör inga betalda API-anrop. Den löpande kartan och
budgetboken är oförändrade enligt kontrollsummor.

## Utrustning och kandidat

- Mac, arm64, macOS 26.6.2, systemversion 25G83.
- Google Chrome 153.0.8010.37, faktisk webbläsare på datorn.
- `gpt-live-1`, rösten `marin`, WebRTC och client-delegering.
- `gpt-5.6-terra`, låg resonemangsnivå, Responses API och lokal MCP.
- Mini, Luna, Sol och Astra ingår också i modelljämförelserna.
- Python 3.14 och `websockets` 17.1. Lokal provserver på localhost.

## Tekniska utfall

### Talad markering behöver ett kvitto från kartvyn

Beställarens markeringsbegäran ger ett korrekt namn som backendfakta,
men ingen markering. Rösten tolkar ändå namnet som bevis på att posten
är markerad. Den befintliga manuella markeringen saknar en koppling
till delegeringsresultatet.

Rapporttypen `map_selection` kopplar nu en verifierad kartreferens till
kartvyn. Aktuella versioner och ritbar post kontrolleras innan valet.
Posten markeras, centreras och visas i inspektören. Först klientens
lyckade tillämpning ger ”Markerad.”; ett vanligt faktasvar ger ingen
markering. Saknade poster, gamla versioner och sena svar från tidigare
röstsessioner får inget lyckat markeringsbesked.

Tre backendprov, sju klientprov och åtta kartvyprov passerar med
genererade data. Ett separat webbläsarprov genom samtalsklientens
textkontroll visar faktisk markering, centrering och inspektör utan
ändrat utkast. Modellsvaret är simulerat i det provet; faktisk
röstföljsamhet behöver bedömas i nästa mänskliga samtal.

### Ångring når underlagsgränsen efter kort samtal

Beställarens prov med ändring, sparande, detaljfråga och ångring visar
att ett kort samtal kan nå gränsen 60 000 byte. Händelseloggen visar
`read_history`, sedan `undo_as_draft`, följt av `context_limit` före
resultatrapporten. Ångringen finns redan som ett korrekt osparat utkast,
utan konflikt eller hinder. Den sparade kartan är oförändrad av ångringen.

Historikläsningen innehåller samtliga 14 sparade grupper, cirka 12 KB,
medan den senaste gruppen upptar cirka 0,6 KB. Tillsammans med aktuell
karta, instruktioner, verktyg och växande verktygssvar passerar nästa
modellomgång gränsen. Problemet ligger därför inte enbart i samtalets
längd och försvinner inte generellt genom omladdning.

Taladaptern visar nu historiken i sidor. Senaste sparandet hämtas med
`limit=1`; äldre grupper är åtkomliga via en versionsbaserad sidgräns.
Inga kartuppgifter, historikgrupper eller samtalsrader tas bort.
Feltexten skiljer också mellan oförändrat utkast och ett utkast som
hinner ändras innan nästa steg blir för stort. Faktisk följsamhet i
tal behöver fortsatt bedömas i användarens samtal.

En lokal regression med 14 genererade sparanden och simulerade
modellsvar reproducerar felet vid 60 183 byte, efter att ångringen
redan ändrar utkastet. Med `limit=1` blir samma rapportunderlag
41 263 byte och flödet avslutas med ”Ångrat i utkastet.” i både MCP
och direktläge. Fem sidindelningskontroller passerar, inklusive ny
sparning mellan sidor, tom historik och ogiltiga argument. Sparad karta
och övrig historik bevaras. Inga debiterade modellanrop ingår i kontrollerna.

### Korta besked och detaljer på fråga

Beställaren upplever uppläsning av återställningar och kartändringar som
onödig när resultatet redan syns i kartan. Prototypen ger därför korta
verifierade besked för alla vanliga ändringar, ångringar och sparanden.
Fulla ändringslistor läses bara upp på fråga. Nödvändiga följdfrågor,
sakfrågor och konkreta felbesked behåller sitt innehåll. Rösten erbjuder
inte en ny uppläsning efter varje steg.

Ett uppdrag utan ny ändring får ”Inget ändrat.”, skilt från en begärd
sammanställning. Ett delvis genomfört uppdrag får ett kort utkastbesked
och de frågor som återstår. Kartkontrollerna, sparreglerna och modellerna
är desamma. Följsamheten i faktiskt tal behöver bedömas i nästa samtal.

### Pauser och färre modellomgångar

Beställaren uppger att avmarkerad MCP inte ger någon upplevd skillnad.
Det senaste avslutade backendjobbet tar 5,485 sekunder, varav 5,442
sekunder i två modellanrop, 34 ms i kartverktyg och 0 ms i kö. Dessa tider
gäller backendjobbet, inte hela pausen i talet.

Den [parade jämförelsen av avslutsflöden](../../docs/prototypes/swedish-voice-completion-comparison.md)
ger sju kompletta par med korrekt karta och rapport i båda flödena.
Medianen är 9,315 sekunder med separata modellomgångar och 4,696 sekunder
med ett samlat ändringsuppdrag. MCP är avstängt i båda fallen; detta är
en jämförelse av modellomgångar inom direktläget. Alla åtta kombinerade
steg passerar;
sju standardsteg passerar och det sista avbryts av försöksbudgeten.
Det avbrutna steget ingår inte i tidsjämförelsen. Försöket kostar
1,104144 USD inom befintlig budget och använder enbart genererade data.

Provservern använder nu kombinerat avslut med samma Sol och `low` inför
nästa mänskliga talprov. Det är ännu ingen mänskligt bekräftad förbättring
av hörbara pauser. Det tidigare standardflödet finns som CLI-val.

Ett separat klientprov reproducerar att en ny textrevision kan skickas
till agenten innan servern kvitterar den. Klienten inväntar nu en stabil
indatakedja och ett giltigt revisionsbesked. Samlingspausen 550 ms och
omtagsregeln 600 ms är desamma. Tidsdiagnostiken visar mottagna text- och
nätverkshändelser; den spelar inte in ljud och mäter inga hörbara pauser.

### Sol och valbar karttransport

Beställaren väljer Sol efter modelljämförelsen. `gpt-5.6-sol` med `low`
är därför provserverns standardmodell; Mini finns kvar som ett uttryckligt
CLI-val. Talmodellen är fortfarande `gpt-live-1`.

Beställaren vill också jämföra MCP med direkt kartåtkomst. Kryssrutan
**Använd MCP** växlar mellan lokal MCP och samma kartfunktioner direkt,
mellan samtalen. Separata tidsrader visar senaste kartuppdraget per läge.
Lägesbytet bevarar karta, utkast, historik, sparkvitton och redan förbrukade
sparbesked.

Det [isolerade transportprovet](../../docs/prototypes/swedish-voice-transport-comparison.md)
ger 3,30 ms med MCP och 2,48 ms direkt för samma sju kartanrop i median,
med 20 uppvärmda körningar per läge. Skillnaden är cirka 0,82 ms på denna
dator och lilla genererade karta. Det är inte ett modell- eller röstprov
och använder ingen API-budget. Resultatet stöder ingen märkbar förbättring
av samtalets pauser från enbart borttagen lokal MCP-transport.

### Lokal MCP

En direkt kontroll använder faktisk MCP-initiering, verktygslista och
stdio-anrop till den tidigare prototypservern. Den läser kartan, föreslår
ett kortbyte, sparar hela utkastet, hämtar kvittot och föreslår ångring.
Kontrollen bevarar utkast och kvitto över omstart. Detta är en teknisk
kontroll med syntetiska data, inte beställarens samtal eller godkännande.

### Faktisk textmodell och karta

En begäran om pris 189 kronor och Kim som betalare når Responses API och
MCP. Efter ett förtydligande av assistentinstruktionen visas båda
utkaständringarna i kartan och ändringslistan utan sparande. Den observerade
tiden till färdig backendtext är cirka 11 sekunder i denna omgång.
Det mäter inte tid från mänskligt tal till första synliga förslag.

Den första omgången ger en extra fråga i stället för det beställda
förslaget. Instruktionen förtydligar därför att ett uttryckligt önskemål
om utkaständring ska genomföras även när användaren säger att inget ska
sparas. Textmodellen visar också ibland tekniska fältnamn i svarstexten.
Talassistentens återgivning av backendresultatet behöver bedömas i provet.

Ett efterföljande sparprov visar att modellens återanvända begärande-ID
leder till MCP-avvisning. Adaptern tilldelar därför varje muterande
verktygsanrop ett eget deterministiskt ID. Samma anrop behåller sitt ID
vid återförsök; modellerna ansvarar inte för att uppfinna unika ID:n.

Kontrollen efter ID-rättningen använder beskedet att ändra priset till
199 kronor och spara hela utkastet, inklusive Kim som betalare. Modellen
anropar `propose_changes` och därefter `save_draft`. Ett faktiskt kvitto
omfattar pris 149 till 199 och betalare Alex till Kim i samma ändringsgrupp.
Utkastet är tomt, kartversionen är 2 och kvittot visas i gränssnittet.
Backendtexten bekräftar båda ändringarna. Tiden till färdigt svar är
cirka 11,4 sekunder. Detta är ett agentdrivet tekniskt textprov.

### WebRTC utan mikrofon

En faktisk talsession använder en tyst syntetisk ljudkälla i Chrome.
Ingen mikrofon öppnas. GPT-Live ger en svensk hälsning om Tonrum och
output-transkript syns i sidan. Efter cirka tio sekunder avslutas
sessionen. Den separata serveranslutningen får `session.closed` och
slutlig användning. Beräknad röstkostnad är 0,0125 USD, motsvarande
initialiseringens minsta 15 sekunder. Reservationen frigörs mot detta
slutbesked.

Detta belägger modellåtkomst, genererat utgående tal, WebRTC-datahändelser,
serveranslutning och avslut på den aktuella datorn. Det belägger inte
svensk taligenkänning, mikrofonåtkomst, användarupplevd röstkvalitet,
delegering från mänskligt tal eller avbrott under ett riktigt samtal.

## Återkoppling: naturligt sparbesked

Beställaren uppger att ”Gör som du sa, och sen vill jag att du sparar det
direkt” endast ger tillbaka förslaget. Den lokala loggen visar att modellen
anropar sparverktyget men att adaptern avvisar anropet eftersom dess
ordkontroll endast accepterar exakt ”spara”.

Kontrollen accepterar nu både ”spara” och ”sparar”, och stoppar bland annat
”jag vill inte att du sparar”, ”spara inte” och ”spara ingenting”.
Modellen måste fortfarande bedöma avsikt, referenser och hypotetiska
formuleringar. Ordmatchningen är ingen fullständig tolkning av svenska.
Versions- och kvittokontroller samt begränsningen till aktuellt besked
gäller fortfarande.

Ett separat syntetiskt kontrollprov använder faktisk Responses-modell och
MCP, med samma budgetbok men en annan kartfil än beställarens pågående
prov. Den citerade formuleringen genomför det föregående tydliga förslaget
om pris och betalare, sparar båda i en grupp och returnerar sparkvitto.
En begäran om nytt pris tillsammans med ”jag vill inte att du sparar det
direkt” ändrar endast utkastet. Ett senare besked utan sparbegäran sparar
inte heller, men modellen ställer då en onödig fråga i stället för att
genomföra den beställda rättelsen. Detta dialogbeteende kvarstår att bedöma.

Denna första ordkontrollrättning ändrar inte hur talfragmenten samlas.
Nästa återkoppling visar ett separat fel i den delen av klienten.

## Återkoppling: uppdelat sparbesked och motstridiga svar

Beställaren visar en dialog där talassistenten säger att den sparar,
backend begär nytt godkännande och talassistenten upprepar frågan.
Samtalsvyn visar också att ”Kan du spara” delas i ”Kan du s” och ”para”
när assistenten svarar däremellan. Klienten avslutar användarens post
vid assistenttal och delegering. Backend kan därför få bara det sista
fragmentet som aktuellt besked. Hela historiken skickas dessutom som
ett enda JSON-meddelande med användarroll, inklusive assistentens egna
bekräftelsefrågor.

Rättningen samlar användarfragment oberoende av assistenttal och behåller
posten medan backend arbetar. Ett eget ID och aktuell revision skiljer
människans uppdrag från Live-delegeringarnas leverans-ID:n. Backend får
rollerna separat och människans aktuella uppdrag sist. Ett kvitterat
sparbesked får inte användas igen för senare fragment eller rättelser.
Röstinstruktionen kräver neutrala mellanbesked tills ett resultat finns.

Ett offlineprov av klientens JavaScript verifierar följande:

- ”Kan du s”, assistentens ”Ja?” och ”para” blir ”Kan du spara”.
- En fortsättning under backendarbete behåller postens ID och höjer
  revisionen; en rättelse efter slutfört arbete får ett nytt ID.
- Två Live-delegeringar för samma besked använder samma jobb men får
  svar med respektive ursprungligt delegerings-ID.

Ett isolerat prov med verklig Responses-modell och MCP sparar det
befintliga syntetiska utkastet efter ”Kan du spara”, trots ett efterföljande
assistentlöfte i historiken. Dubblerad delegering använder samma kvitto,
utför inget ytterligare sparande och kostar inget extra modellanrop.

Första kontrollen av en sen rättelse ger fortfarande ett felaktigt löfte
om sparande och utebliven utkaständring. Efter att den förbrukade
sparbegäran skilts från fortsättningen och sparverktyget utelämnats vid
besked utan sparuttryck, genomförs rättelsen endast i utkastet. Även en
senare fristående rättelse, en nekad sparbegäran och en hypotetisk fråga
lämnar kartans sparade version oförändrad. Modellen nämner interna
verktygsbegränsningar och ställer onödiga följdfrågor i flera svar;
resultatinstruktionen förtydligas därför ytterligare.

En slutkontroll använder åter den ursprungliga formuleringen ”Gör som du
sa, och sen vill jag att du sparar det direkt”. Pris och betalare sparas
i samma ändringsgrupp. Därefter genomförs både en rättelse med nekad
sparbegäran och en fristående rättelse direkt i utkastet, utan ytterligare
sparande eller bekräftelsefrågor. Svaren beskriver det osparade resultatet
utan interna verktygsbegränsningar i denna kontroll.

Detta verifierar klientlogik och textmodellens kartoperationer med
syntetiska data. Fortsatt prov med beställarens röst behövs för att
bedöma talfragment, avbrott, mellanbesked och faktisk samtalskvalitet.

## Återkoppling: ångring och svenska relationsord

Beställaren visar en motsägelse mellan muntlig bekräftelse på ångring och
kvarvarande borttagningsförslag i kartan. Verktygsloggen visar ett avvisat
återställningsanrop med `unknown_id`, följt av kartläsningar utan lyckad
ändring. Backend påstår ändå att borttagningarna är ångrade.

MCP-verktyget `undo_as_draft` avser en sparad historikgrupp. Det kan inte
ångra ett osparat borttagningsförslag. En sådan återställning kräver en
batch som återskapar de saknade posterna i utkastet med deras ursprungliga
ID:n och fält. Adaptern har därför ett avgränsat verktyg,
`restore_draft_deletions`, som hämtar originaldata och verifierar resultatet.
Se [beteendekontraktet](../../docs/prototypes/swedish-voice.md).

Isolerade MCP-kontroller återställer en person och sex samband, medan
andra pris- och relationsförslag finns kvar. Gammal utkastversion, felaktiga
ID:n och återförsök efter en senare borttagning avvisas. Identiska anrop,
omstart och tappat svar ger ingen dubbel ändring. Kartans sparade version
förblir oförändrad vid återställningen.

Resultatkontrollen avvisar både felaktig lista över kvarvarande
borttagningar och återställningsbesked utan verifierad återställning.
Rapporten saknar fria påståendetexter, så faktasvar och följdfrågor kan
inte kringgå kontrollen med en annan resultattyp. Svaren byggs från
kartposter, operationer och sparkvitton. Ett nytt osparat förslag efter
ett sparande måste också synas i svaret.

Beställaren uppger också att rösten använder engelska relationsnycklar
som `pays`. En gemensam ordlista tillför svenska relationsfraser till
kartan, resultattexterna och båda modellernas instruktioner. De lokala
kontrollerna täcker ”betalar”, ”använder”, ”äger”, adressroller och en
svensk standardfras för okända relationsnycklar.

Ett separat gränssnittsprov visar att kartans borttagningsmarkeringar
försvinner när återställda data kommer. Äldre svar kan däremot återinföra
markeringar utan en versionsvakt. Gränssnittet avvisar därför svar där
kart- eller utkastversionen backar. Ett tidigare sparkvitto ger inte längre
aktuell sparstatus efter en återställning utan sparande.

Ett deterministiskt samtidighetsprov ändrar prisförslaget via en annan
MCP-klient mellan läsning och sparförsök. Versionsavslag spärrar därefter
ytterligare mutationer i samma uppdrag; den konkurrerande ändringen
sparas inte automatiskt.

Verkliga modellkontroller använder syntetiska uppgifter och separat karta.
Återställningen återger personen och relationerna, behåller ett annat
prisförslag osparat och svarar med svenska relationsord. Kontrollerna med
resonemangsnivån `minimal` ger även en ofullständig resultatrapport efter
ett faktiskt sparande. Ett annat kontrollsteg avbryts på ett oväntat
relations-ID; det fastställer inte om det semantiska sambandet är fel.
Den slutliga inställningen använder `low`. Sparprovet med ursprunglig
formulering kontrollerar både de faktiska verktygsanropen och kvittot:
priset och betalaren sparas tillsammans; senare rättelser förblir osparade.

## Återkoppling: osynligt bakgrundsarbete

Beställaren uppger att väntan efter Live-röstens mellanbesked är svår att
förstå under längre dialoger. Den senaste svarstid som visas i detta
mänskliga prov är 15,7 sekunder för hela backendjobbet. Loggen visar även
avvisade resultatrapporter som kräver ytterligare modellsteg. Det finns
ingen uppdelad tidsmätning för just det jobbet, så det går inte att avgöra
hur stor del som är modellberäkning, nätverk, verktyg eller kontroll.

En arbetsindikator finns nu både vid samtalet och fast i skärmens
nederkant. Den visar mottagning, väntan, modellarbete, kartkontroll och
resultatkontroll tillsammans med förfluten tid. Servern mäter varje steg
och antalet modellanrop. Mikrofonavslut döljer inte ett pågående kartjobb.

Isolerade kontroller använder riktig lokal MCP och simulerade modellsvar.
De täcker köade revisioner, dubbla delegeringar, gamla svar, fel och
återförsök. Ett gammalt avslut släcker inte nyare arbete och cachade svar
startar inte en ny indikator. Nätfel visas som osäker kontakt.

En separat webbläsarkontroll i Chrome använder syntetisk karta och
20 sekunders simulerad modellväntan. Indikatorn visas omedelbart, övergår
till ”Skyttel arbetar”, räknar förfluten tid och syns kvar när sidan
scrollas till nederkanten. Den simulerade tiden är ingen mätning av
OpenAI-modellens prestanda och kontrollen kostar inga API-anrop.

## Återkoppling: flera önskemål blir en enda valfråga

Beställaren beskriver flera ändringar i ett sammanhängande besked:
borttagning av en person, tillägg av en annan person med ett
användarsamband, borttagning av ett företag med dess samband samt ändring
av ett kort. Svaret frågar vilken av samtliga berörda poster som avses,
som om de vore alternativa tolkningar av samma önskemål.

Resultatformatet har en enda resultattyp och en gemensam referenslista.
Vid identitetsfrågor sammanfogar `describe_clarification` alla referenser
med ”eller”, utan koppling till ett visst önskemål eller en viss oklarhet.
`checked_report` avvisar dessutom följdfrågor efter en lyckad mutation.
Formatet kan därför inte uttrycka både genomförda tydliga ändringar och
en riktad fråga om den återstående delen. Detta är en begränsning i
prototypens resultatkontroll, som ska hindra obekräftade ändringsbesked.

En lokal kontroll med syntetiska poster reproducerar samma slags
valfråga för personer, företag, tjänst och kort. Samma rapport avvisas när
uppdraget innehåller en lyckad mutation. Kontrollen använder varken
beställarens karta eller externa modellanrop.

Det citerade beskedet innehåller samtidigt möjliga oklarheter om ett
tjänstenamn och om kortets namn eller sista fyra siffror ska ändras.
Transkriptet räcker inte för att avgöra om tjänstenamnet är en felhörning.
De oklarheterna motiverar avgränsade frågor, inte ett gemensamt val mellan
alla poster. Talassistentens många mellanbesked behöver också bedömas;
utan den ursprungliga verktygsspårningen fastställs ingen särskild
ordnings- eller fragmenteringsorsak för just detta samtal.

Resultatformatet skiljer nu verifierade resultat från frågor knutna till
enskilda önskemål. En fråga har en åtgärd, relevanta poster eller fält och
ett ordagrant utdrag ur människans besked. Kandidater till ett samband
kan avse antingen personen eller den andra ändpunkten. En neutral
identitetsfråga fungerar också vid enbart läsning av kartan.

De 22 lokala kontrollfallen täcker kombinerade ändringar och följdfrågor,
två möjliga personer, kortfält, felaktiga referenser, kvarvarande
borttagningar och avvisade obekräftade spar- och återställningsbesked.
Kontrollerna gör inga externa anrop.

Ett separat modellprov använder helt nyskapade syntetiska namn, en annan
karta och genererade besked. Varken beställarens karta eller repliker
skickas i kontrollen. Modellen föreslår de tydliga ändringarna och ställer
en avgränsad fråga om ett liknande tjänstenamn. Den första omgången tar
27,9 sekunder till färdigt svar, varav 14,2 sekunder till första synliga
ändring för servern. Ett missat relations-ID i modellens kopia av
borttagningslistan orsakar en extra modellomgång.

Modellen behöver därför inte längre kopiera borttagningslistan till
`report_result`. Servern bygger beskedet från hela faktiska `full_diff` och
kontrollerar återställning mot kvarvarande borttagningar som tidigare.
En efterföljande körning behöver två modellomgångar, tar 19,7 sekunder
till färdigt svar och 16,8 sekunder till första ändring. I den körningen
tolkar modellen det närliggande tjänstenamnet och båda kortfälten direkt.
Det är enskilda kontroller med olika modellutfall, ingen säkerställd
förbättring av tiden till korrekt kartändring.

Ett efterföljande besked som redan motsvarar utkastet ger fortfarande
onödiga rapportförsök i den kontrollen. Instruktionen skiljer därför
tydligare mellan en ny ändring och återgivning av ett redan befintligt
utkast. Fortsatt mänskligt prov behövs för faktisk dialog och svarstid.

Slutkontrollen anger uttrycklig osäkerhet om både tjänstens namn och
kortets fält. De tydliga delarna föreslås och två separata frågor visas.
Människans nästa besked preciserar tjänsten och båda kortfälten; modellen
slutför dessa delar utan sparande och bevarar ett annat prisförslag.
Det första svaret tar 20,5 sekunder i två modellomgångar. Fortsättningen
tar 31,5 sekunder i fyra omgångar eftersom modellen först försöker ta bort
redan borttagna poster igen. Verktyget avvisar dessa anrop. Slutresultatet
är korrekt, men återförsöken visar ett kvarstående problem med svarstid.

Budgetkontrollen lämnar 0,50 USD till backend när en röstsession startar.
Backend får nu använda detta utrymme; samma marginal dras inte av igen
vid varje bakgrundsanrop. En lokal kontroll verifierar att det absoluta
taket på 10 USD, hela röstreservationen och osäker slutkostnad behålls.

## Återkoppling: kortändringen låter oförändrad

En syntetisk ändring av kortets sista fyra siffror från 1111 till 2222 och
motsvarande byte av kortnamn ger rätt innehåll i kartan. Om resultattexten
använder det nya namnet och bara målvärdet kan ändringen ändå låta som
”2222 till 2222”.

Resultattexten hämtar nu både tidigare och nya fältvärden ur ändringslistan
och identifierar kortet med namnet före ändringen. Utkastets `full_diff`
de tidigare värdena, även när den sparade kartan redan har det nya namnet.
Namnändringen beskriver separat tidigare och nytt namn.

Alla 17 riktade kontroller och 22 tidigare rapportkontroller passerar i
lokala tillfälliga tester med syntetiska data. De riktade kontrollerna
täcker kortfält, namn, pris, saknade värden, oförändrade poster och besked
efter sparande. Kontrollerna använder inga externa modellanrop och ändrar
inte beställarens karta.

## Återkoppling: kortändringen låter oförändrad

En syntetisk ändring av kortets sista fyra siffror från 1111 till 2222 och
motsvarande byte av kortnamn ger rätt innehåll i kartan. Om resultattexten
använder det nya namnet och bara målvärdet kan ändringen ändå låta som
”2222 till 2222”.

Resultattexten hämtar nu både tidigare och nya fältvärden ur ändringslistan
och identifierar kortet med namnet före ändringen. Utkastets `full_diff`
utgår från den sparade kartan. Efter sparande ger sparkvittots `saved_diff`
de tidigare värdena, även när den sparade kartan redan har det nya namnet.
Namnändringen beskriver separat tidigare och nytt namn.

Alla 17 riktade kontroller och 22 tidigare rapportkontroller passerar i
lokala tillfälliga tester med syntetiska data. De riktade kontrollerna
täcker kortfält, namn, pris, saknade värden, oförändrade poster och besked
efter sparande. Kontrollerna använder inga externa modellanrop och ändrar
inte beställarens karta.

## Konversationsrader och synlig arbetsstatus

Beställaren vill kunna läsa samtalet i ordning. En kort paus ska fortsätta
samma användarrad. Efter en längre paus där Skyttel pratar emellan ska
nästa tal börja på en ny rad. Arbetsindikeringen ska finnas längst ned
så att väntan på kartarbetet syns även i långa dialoger.

Gränsen i prototypen är två sekunder tillsammans med mellanliggande
assistenttal. Lång paus utan assistenttal fortsätter samma rad.
Radindelningen är skild från backendens samlade uppdrag. Stabila visuella
ID:n gör att korta fortsättningar kan uppdatera sin tidigare rad utan
att flytta den. Avslut och felsvar skriver inte ut hela det samlade
uppdraget en gång till.

Arbetsraden ligger under transkriptets scrollområde. Den visar fas och
förfluten tid under arbete, osäker kontakt vid kontaktproblem och ett
lugnt färdigläge när arbetet är slut. Lokala kontroller använder
genererade fragment och den verkliga radrenderingen, inklusive gränsen
1999/2000/2001 millisekunder, ljudtider och reservmätning, korta
mellanbesked, färdiga och misslyckade uppdrag samt återanslutning.
Backendens beskeds-ID, samlade text och revision bevaras genom visuella
radbyten. Det mänskliga talprovet får avgöra om två sekunder känns rätt.

## Återstående användarprov

### Beställarens bedömning efter det korta provet

Beställaren uppger att det korta provet känns bra i övrigt och väljer
en kortare sparbekräftelse: **”Sparat.”** Vad som faktiskt sparas ska
läsas upp först om människan frågar efter det i ett nytt besked.
Detta är positiv återkoppling på det korta datorprovet, inte belägg
för de återstående målplattformarna eller längre samtal.

Prototypens vanliga kvitterade sparande ger nu bara den korta bekräftelsen.
Frågan om vad som sparas använder senaste beständiga historikgrupp och
skiljer den från nya osparade förslag. Kvitto- och versionskontrollerna
gäller fortfarande; uppläsningen genomför inget nytt sparande.

### Sparande följt av missvisande kontrollfel

Ett mänskligt talprov ger ett lyckat lokalt sparkvitto och tomt utkast,
men rösten säger att kartkontrollen misslyckas. Den konkreta serverorsaken
är att underlaget inför nästa modellanrop överskrider 60 000 byte.
Det anropet gäller rapportering efter sparandet. Klienten ersätter
dessutom orsaken med ett generellt fel, så rösten kan inte förklara den.

Sparbeskedet byggs nu direkt från kvittot efter kontroll mot hela det
granskade utkastet och dess versioner. Elva lokala regressionstester
använder verklig isolerad MCP, genererade kartor och simulerade modellsvar.
De verifierar stora kvitton, för stort underlag för en fortsättning,
borttagna poster, kvittobindning, versionsbyte under sparande och
dubblerad leverans. En efterföljande rättelse förblir osparad.
Samtliga passerar utan nya betalda API-anrop.

Åtta lokala JavaScript-kontroller verifierar konkret feltext till både
Live och Händelse, okänt utfall vid nätfel, följdfrågor, dubblerade och
sena felsvar. Ett äldre kvitto bevisar inte ett nytt sparande. De tidigare
17 kontrollerna av ändringsbesked och 22 kontrollerna av avgränsade frågor
passerar också. Själva talåtergivningen kräver ett nytt mänskligt prov.

Sju ytterligare lokala kontroller verifierar storleksgränsen både före
första anropet och efter ett genomfört utkastförslag. Inga ytterligare
modellanrop eller sparanden får ske efter avvisningen. Historiska
felbesked återges från serverns lagrade orsak; påhittad fri feltext och
sammanblandning med nya ändringar avvisas.

### Fortsatt talprov

Beställaren behöver prova med sin röst och beskriva vad som fungerar och
vad som blir fel:

1. Ange pris och skilda roller, och precisera vilken Lo som avses.
2. Rätta priset, välj mellan kort 0000 och 1111 och säg en e-postadress.
3. Bevara osäkerheten om Lo Berg och återanvänd det befintliga tjänstekontot.
4. Be om hela ändringslistan och spara genom ett uttryckligt talbesked.
5. Jämför talbesked, synligt utkast och faktiskt lokalt sparkvitto.
6. Avbryt ett svar, rätta uppgiften och kontrollera att ett äldre
   sparbesked inte gäller en senare ändring.
7. Avsluta och återanslut. Kontrollera kartan före upprepade sparförsök.

Skilj felhörning, feltolkning och fel i gränssnittets återkoppling.
De färdiga textkontrollernas latens är ingen bedömning av samtalsflytet.
Windows, iPhone och iPad samt mikrofon-/ljudenhetsbyte är inte verifierade.
Beställaren avgränsar bort ytterligare röstprov på dessa målplattformar
från kartläggningen. Mobil skärmstorlek på datorn räknas inte som ett
prov på dessa enheter.

## Kostnad och data

### Startspärr trots återstående provbudget

Vid kontrollen är förbrukningen 1,667966 USD och inga reservationer
utestående. Startspärren beror på att varje samtal kräver en reservation
på 8 USD plus 0,50 USD till backend. Därmed räcker inte återstående
8,332034 USD, trots att provet ska avslutas efter fem minuter.

Reservationen är nu 0,30 USD: fem minuters tal plus en minuts
avslutsmarginal. Den totala provramen är fortfarande 10 USD, och starten
behöver dessutom 0,50 USD till backend. Visningen skiljer beräknad kostnad,
reserverat belopp och återstående utrymme. Modellnamnen visas på provsidan.

Åtta lokala kontroller av kostnadsberäkningen och elva lokala
integrationskontroller passerar med tillfällig kostnadsbok, isolerad MCP
och simulerade API-svar. De omfattar start vid samma förbrukning,
kumulativ delmätning, femminutersstopp, osäker start, bevakningsfel,
ogiltig eller minskande slutanvändning samt kostnad över reservationen.
Spärrar för osäker röstkostnad och överskridande består över omstart.
Kontrollerna startar inget verkligt talsamtal. Den lokala tidsgränsen
är ingen garanterad gräns hos leverantören.

### Löpande kostnadsbok

Den parade jämförelsen mellan Mini och Sol omfattar tolv dialogsteg
med nygenererade kartor. Sol klarar 6 av 6 och Mini 3 av 6. Det tydliga
uppdragets median till färdigt svar är 12,7 respektive 19,7 sekunder.
Alla försök, fel och kostnader finns i
[modelljämförelsen](../../docs/prototypes/swedish-voice-model-comparison.md).
Körningen kostar konservativt 0,684161 USD och kostnadsboken visar
2,352127 USD, utan utestående reservationer. Prototypen kör Sol för
nästa mänskliga talprov; rösten använder fortfarande `gpt-live-1`.

Alla debiterade kontroller räknas mot den gemensamma ramen på 10 USD.
Den lokala budgetboken innehåller förbrukning och osäkra reservationer.
Efter de första tekniska kontrollerna är den beräknade förbrukningen
0,03625225 USD; inga reservationer är då utestående. Beräkningen
använder mottagen API-användning och publicerade priser, utan
rabatt för cachade indatatokens. Den är inte ett fakturaunderlag.
Den följer med mellan serverstarter och får inte nollställas för en ny
provomgång. Se [körning och budgetvakt](README.md).

Efter återkopplingens spar- och fragmentkontroller visar den gemensamma
budgetboken 0,522369 USD inklusive tidigare talprov, utan utestående
reservationer. Fortsatta mänskliga prov ändrar detta belopp.

Efter ångra- och språkkontrollerna med den slutliga modellinställningen
visar budgetboken 1,032651 USD, utan utestående reservationer. Den slutliga
kontrollen av återställning, svenska sakfrågesvar och efterföljande sparande
ger kontrollerade resultat i samtliga tre steg.

Efter kontrollerna av flera önskemål visar budgetboken 1,445885 USD utan
utestående reservationer. Fortsatta mänskliga prov ändrar beloppet.

Kontrollprovens och det publicerbara underlagets hushållsuppgifter är
påhittade. Beställarens löpande samtal och kartdata ingår inte i
källfilerna. Inga talinspelningar ingår i underlaget. API-nyckeln är
tillgänglig enbart i serverns arbetsmiljö.
Kontroll av prototypens källfiler visar att nyckelvärdet saknas där.
Filer för kördata, transkript och kostnader publiceras inte som källkod.
