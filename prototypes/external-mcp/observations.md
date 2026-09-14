# Observationer från det externa MCP-provet

Provdatum: 2026-09-14. Ärendet är öppet. Detta underlag är inte en
resolution eller ett godkännande av det fullständiga arbetsflödet.

## Faktisk extern assistent

- Klient: Codex CLI 0.153.0, separat process via `client.py`.
- Enhet: Mac med macOS 26.6.2, arm64.
- Anslutning: lokal stdio, faktisk MCP-initiering och verktygsanrop.
- Inmatning: text. Den förberedda provsituationen finns i
  [scenario-start.txt](scenario-start.txt).
- Simulering: ett påhittat hushåll, användaridentitet från startkommandot
  och gemensam lagring i en lokal scratchfil.
- Klientens befintliga konto används. Ingen separat API-nyckel,
  beständig MCP-konfiguration eller inköpt tjänst behövs för detta prov.

Vid första anslutningen anropar assistenten `read_map`, `search_map` för
Tonrum och `search_map` för Lo. Den hittar två personer och frågar vilken
som avses. Den återger också det befintliga utkastets prisändring från
149 till 179 kr per månad och säger att inget är sparat.

Sparad kartversion och egen utkastversion är båda 1 efter denna omgång.
Historiken har inga spargrupper. Varken förslags- eller sparverktyget
anropas. Kims privata anteckning finns inte i något av de tre
verktygssvaren till Alex.

Beställaren väljer att föra provdialogen genom det pågående samtalet och
anger att båda personerna ska läggas till. Startaren förmedlar detta svar
till samma externa klientsamtal genom `exec resume`.

Klienten anropar `propose_changes` och föreslår två separata samband:
Lo Lind använder Tonrum och Lo Berg använder Tonrum. Den återger därefter
hela utkastet: båda sambanden och den befintliga prisändringen 149 till
179 kr per månad. Den säger att ändringarna ännu inte är sparade och
inväntar ett uttryckligt sparbesked eller en rättelse.

Efter tillägget är kartversionen fortsatt 1, utkastversionen 2 och
historiken saknar spargrupper.

Beställaren rättar priset till 189 kronor per månad och säger i det
förmedlade textmeddelandet att ”Loberg använder inte”. Klienten tolkar
det som Lo Berg, tar bort det föreslagna användningssambandet och låter
Lo Lind vara kvar. Personen Lo Berg finns kvar i kartan.

Ett nytt `propose_changes` ändrar prisförslaget och tar bort just det
föreslagna sambandet. Klientens sammanställning visar 149 till 189 kr
per månad, att Lo Lind läggs till och att Lo Berg inte läggs till.
Den säger åter att inget är sparat och inväntar ett nytt besked.

Efter rättelsen är kartversionen fortsatt 1, utkastversionen 3 och
historiken saknar spargrupper. Namntolkningen prövas med text, inte med
egen ljudbehandling.

Beställaren svarar ”Jag kan spara det.” efter sammanställningen.
Klienten anropar då `save_draft` separat med utkastversion 3 och granskad
kartversion 1. Den bekräftar sparandet efter serverns kvitto för
`change-0001`: priset är 189 kr per månad och Lo Lind använder Tonrum.
Lo Berg läggs inte till. Kartversionen är 2, utkastversionen 4 och
utkastet är tomt. Historiken har exakt en spargrupp med båda ändringarna.

Det vanliga flödet har därmed ett faktiskt mänskligt sparbesked och ett
verifierat separat sparanrop. Beställarens samlade omdöme och de
följande prövningarna hålls isär; felsituationerna redovisas nedan.

Beställaren ber därefter att ta bort den senaste ändringen. Klienten
läser aktuell karta med `read_map` och anropar `undo_as_draft` för den
nyss kvitterade gruppen `change-0001`. Den använder grupp-ID från
samtalet; denna omgång prövar inte att hitta en äldre grupp genom
historikverktyget.

Ångraförslaget ändrar priset från 189 till 149 kr per månad och tar bort
Lo Linds användningssamband. Personen Lo Lind finns kvar. Klienten
återger båda ändringarna och inväntar ett separat besked om att spara
ångringen. Sparad karta och historik är oförändrade, med kartversion 2
och en spargrupp. Det nya utkastet har version 5.

Beställaren ger sparbeskedet ”Jasparar det.”. Provledaren meddelar att
kvittobortfall ska simuleras och aktiverar `lose-next-receipt` utanför
MCP. Klienten tolkar texten som ”Ja, spara det” och anropar `save_draft`
för utkastversion 5 och granskad kartversion 2.

Servern genomför sparandet och stänger stdio utan svar. Klienten säger
att utfallet är okänt och anropar `get_save_receipt` med det ursprungliga
spar-ID:t. Även det anropet misslyckas eftersom transporten är stängd.
Klienten gör inget nytt sparförsök och påstår inte att ångringen är
sparad.

Provledaren återstartar anslutningen genom en ny körning av `exec resume`
och ber klienten slutföra kvittokontrollen för det redan godkända
sparandet. Klienten anropar enbart `get_save_receipt` med samma spar-ID
och bekräftar därefter återställningen till 149 kr per månad och
borttagningen av Lo Linds användningssamband.

Kvittot gäller `change-0002`. Kartversionen är 3, utkastversionen 6 och
utkastet tomt. Historiken innehåller exakt två grupper: ursprungligt
sparande och ångring. Ingen dubblerad sparning sker. Provet verifierar
återhämtning med provledarens återanslutning, inte automatisk
återanslutning i Codex CLI eller ett fjärranslutet produktionssystem.

Inför samtidighetsprovet ber beställaren om priset ”tvåhundratjugonio
kronor”. Klienten läser kartan och föreslår 229 kr per månad genom
`propose_changes`. Den återger hela utkastet, 149 till 229 kr per månad,
och inväntar ett sparbesked. Kartversionen är fortsatt 3,
utkastversionen är 7 och historiken har fortsatt två spargrupper.
Tolkningen av beloppet prövas från textmeddelandet, inte från ljud.

Beställaren godkänner att spara prisförslaget 229 kr. Provledaren
annonserar en ändring från ett annat fönster och aktiverar
`draft-price-edit`: samma användares utkast ändras till 239 kr och
utkastversionen blir 8. Den sparade kartan ändras inte.

Klienten anropar `save_draft` med den faktiskt granskade utkastversionen
7 och kartversion 3. Servern avvisar anropet. Klienten säger att inget
sparas eftersom utkastet ändras efter granskningen, återger hela det
aktuella förslaget 149 till 239 kr per månad och frågar om beställaren
vill spara 239 kr eller ändra tillbaka till 229 kr. Den gör inget nytt
sparanrop och använder inte det tidigare godkännandet för version 8.

Kartversionen är fortsatt 3 och historiken har två spargrupper. Det
faktiska klientsamtalet verifierar därmed ett avvisat sparanrop för en
inaktuell utkastversion och krav på förnyat beslut efter ny sammanställning.

Beställaren säger att förslaget ska ändras tillbaka till 229 kronor och
sparas. Klienten anropar endast `propose_changes`, återställer priset
till 229 kr och ger utkastversion 9. Den återger förslaget men kräver
ytterligare bekräftelse eftersom rättelsen ger en ny version, trots
beställarens uttryckliga kombinerade rättelse och sparbegäran.

Inget sparas i denna omgång: kartversionen är 3, sparat pris 149 kr och
historiken har fortsatt två grupper. Provet visar att det ovillkorliga
kravet på ännu ett ja efter en uttrycklig rättelse och sparbegäran blir
en extra dialogomgång.

Beställaren beslutar att en entydig rättelse och ”spara” i samma besked
ska räcka. Beställaren preciserar att detta även gäller när andra
ändringar pågår: ”spara” omfattar alla hittills gjorda ändringar i det
egna utkastet. Begränsningen till ett ensamt förslag gäller alltså inte.

Beställaren föreslår också en intern kontroll av att ändringarna
motsvarar begäran samt en bekräftelse av vad som faktiskt sparas.
Prototypens klientinstruktioner och verktygstexter använder därför en
intern kontroll av hela förslaget före sparandet och en kontroll av
kvittots faktiska ändringar efteråt. Aktuella instruktioner skickas även
när klientsamtalet återupptas, så den tidigare regeln inte lever kvar.
Serverns versions- och konfliktkontroller ändras inte.

Provledaren förmedlar beställarens fastställda regel och det tidigare
uttryckliga beskedet att återställa prisförslaget till 229 kr och spara.
Klienten använder det redan returnerade fullständiga utkastet med
version 9 och anropar `save_draft` mot kartversion 3. Kvittot visar
`change-0003`, pris 149 till 229 kr per månad. Klienten bekräftar detta
utfall utan att kräva ännu ett ja. Kartversionen är 4, utkastversionen
10 och utkastet är tomt. Historiken innehåller tre grupper.

Denna omgång verifierar slutförandet med den nya regeln. Själva rättelsen
finns redan i utkastet från föregående omgång. Den särskilda prövningen
av ett kombinerat rättelse- och sparbesked med ett ytterligare oberoende
förslag följer i konfliktfallet nedan.

Beställaren ber om priset 79 kronor och att ”Lolin” ska läggas till som
användare. Klienten läser kartan och söker efter namnet. Den säger att
”Lolin” inte finns och ber om förtydligande mellan Lo Lind och Lo Berg.
Den väntar med både prisförslaget och sambandet tills personen är
identifierad. Inga ändrings- eller sparverktyg anropas; kartversion 4,
utkastversion 10 och tre historikgrupper består.

Beställaren förtydligar att personen är Lo Lind. Klienten föreslår då
båda ändringarna i ett `propose_changes`: pris 229 till 79 kr per månad
och Lo Lind som användare av Tonrum. Den återger hela det osparade
utkastet och inväntar sparbesked. Utkastversionen är 11, medan
kartversion 4 och tre historikgrupper består.

Beställaren svarar ja till att spara hela utkastet. Provledaren
annonserar konfliktprovet och låter den simulerade andra användaren Kim
spara priset 199 kr genom `conflicting-save`. Kartversionen blir 5 och
historikgruppen `change-0004` hör till Kim. Alex utkastversion är
fortsatt 11 med förslagen 79 kr och Lo Lind som användare.

Klienten anropar `save_draft` med den granskade utkastversionen 11 och
kartversion 4. Servern avvisar anropet med
`stale_reviewed_map_version`. Klienten säger att inget av utkastet
sparas, återger båda väntande ändringarna och förklarar konflikten
mellan sparade 199 kr och utkastets 79 kr. Den ber beställaren välja
pris och förklarar att valet kan kombineras med ”spara” för hela
utkastet. Den väljer inget pris själv och sparar inte Lo Lind separat.

Efter denna omgång är priset i kartan 199 kr och Lo Lind ännu inte
tillagd som användare. De båda förslagen finns kvar i Alex utkast.

Beställaren svarar ”Hundranittionio. Spara.”. Klienten anropar
`resolve_conflicts` med valet att behålla kartans sparade värde 199 kr.
Det ger utkastversion 12. Prisförslaget försvinner, medan det oberoende
förslaget att lägga till Lo Lind finns kvar.

I samma samtalsomgång återger klienten hela återstående utkastet och
anropar `save_draft` med utkastversion 12 och kartversion 5, utan att
kräva ytterligare ja. Kvittot för `change-0005` innehåller endast
tillägget av Lo Linds användningssamband. Klienten säger uttryckligen
att priset 199 kr redan är sparat och inte ändras av detta sparande.
Kartversionen är 6, utkastversionen 13 och utkastet är tomt.

Detta prövar ett kombinerat konfliktval och sparande av hela återstående
utkastet i samma samtalsomgång. Den senast nämnda prisuppgiften ger
ingen ny sparad ändring, men det tidigare oberoende förslaget sparas.
Provet visar inte varje möjlig variant av kombinerade tillägg och
rättelser eller två nya ändringar i denna spargrupp.

Provledaren ställer därefter en läsande kontrollfråga om fullständig
hushållsexport. Klienten säger att den saknar ett sådant verktyg och
hänvisar till Skyttels eget administrativa gränssnitt. Den säger också
att gränssnittet inte finns i provet och ger ingen påhittad URL.
Inget MCP-anrop, ingen export och ingen ändring sker i denna omgång.

## Separata tekniska kontroller

Kontrollerna använder en egen syntetisk scratchfil och direkta MCP-anrop.
De påverkar inte beställarens pågående prov. De visar prototypserverns
beteende; de visar inte hur en extern assistent förklarar varje situation.

Följande kontroller ger förväntat resultat:

- MCP-initiering över stdio och en verktygslista med åtta verktyg.
  Export, återimport, permanent radering och åtkomsthantering saknas.
- Alex och Kim får sina respektive privata utkast.
- Ett upprepat ändringsanrop med samma begärande-ID och argument ger
  samma svar och utkastversion. Återanvänt ID med andra argument avvisas.
- Sparande av en gammal utkastversion avvisas.
- Ett upprepat sparanrop ger samma kvitto och bara en historikgrupp.
- En ändring av samma användares utkast genom en annan klient gör den
  tidigare granskade utkastversionen inaktuell.
- Ett annat sparat pris ger konflikt, gör förslaget ej klart för
  sparande och hindrar att värdet skrivs över.
- En inaktuell kartversion avvisas även när utkastversionen stämmer.
- Ett uttryckligt konfliktval bevarar ett oberoende osparat förslag.
- Vid simulerat förlorat kvitto avslutas stdio-processen efter att
  sparandet är genomfört. En ny process hämtar rätt kvitto. Ett
  identiskt återförsök skapar ingen ytterligare historikgrupp.

Kontroller för ångring beskrivs i [server-notes.md](server-notes.md).
Kodgranskningen identifierar även behovet att stoppa ångring när den
skulle ersätta ett överlappande osparat förslag. Prototypen avvisar det
fallet och bevarar utkastet. Det är ett förslag till begränsning i
provet, inte ett beslutat produktbeteende.

## Kvar i användarprovet

De konkreta provfallen är genomförda. Beställarens samlade bedömning och
fastställandet av rekommendationen till teknikvalet återstår.

## Tolkning och begränsningar

Provet stödjer att det gemensamma MCP-flödet är genomförbart i den valda
externa textklienten med tydliga instruktioner. Det besvarar inte vilka
garantier en produktionslösning eller alla externa klienter kan ge.

Inloggning, återkallelse av åtkomst, fjärranslutning, andra enheter och
produktionslagring är inte verifierade. Textprovet omfattar inte tal
eller desktopklientens godkännandedialoger. Startarens instruktioner och
verktygsbeskrivningar är en del av den prövade konfigurationen.

Provledaren förmedlar beställarens text och återger klientens svar i
det pågående samtalet. Det är inte ett direkt användarprov av Codex CLI:s
terminalpresentation. Skild egen ljudbehandling, talförståelse och
talåterkoppling ingår inte, även när texten innehåller vardagligt tal.

Servern validerar versioner och konflikter. Att kontrollera ett
sparbesked mot användarens avsikt är fortfarande klientens ansvar;
verktygsargumenten är inget oberoende bevis för vad människan säger.
Intern modellkontroll kan instrueras och bedömas genom verktygsval och
utfall, men är ingen verifierad garanti mot feltolkning.

Återanslutningen efter kvittobortfall sker genom provledaren. De
identiska återförsökens idempotens har separata direkta MCP-kontroller;
det levande klientsamtalet väljer kvittokontroll utan nytt sparförsök.
Prototypens kontroll av hela kartversionen är konservativ och väljer
inte produktionslösningens detaljnivå för samtidighetskontroller.

Ångring av senaste kända spargrupp prövas i samtalet. Äldre historik
och ångring med senare överlappande ändringar har tekniska kontroller,
inte ett uttömmande mänskligt prov. Prototypens stopp vid överlapp med
ett eget osparat förslag är en uttrycklig begränsning, inte en ny
produktregel om att ångring alltid kräver ett tomt utkast.
