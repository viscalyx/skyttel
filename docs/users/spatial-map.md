# Hitta och redigera i rymdkartan

Rymdkartan, listan och detaljerna visar samma hushållskarta och ditt
privata utkast. På telefon och platta börjar du i **Lista och detaljer**.
**Öppna rymdkartan** fyller den tillgängliga webbytan. **Samlad vy** visar
kartan och listan tillsammans där det finns plats.

## Hitta innehåll

Utgångsläget omfattar alla objekt och samband. **Sök objekt** och
**Filtrera objekttyp** begränsar både karta och lista. I helskärmskartan
finns dessa kontroller under **Sök och fokus**.

Klicka på ett objekts etikett för att öppna samma detaljer som i listan.
Typikonen hjälper dig att känna igen objektets typ. Klicka på ett
sambands etikett för att redigera dess riktning, säkerhet och status.
Pilen går från det första objektet till det andra. Okänt och uttryckligen
inget är uppgifter om ett samband, inte nya objekt.

Ctrl-klick på ett objekt visar dess direkta samband. Du kan också välja
objektet i listan och använda **Visa objektets kopplingar** med tangentbord.
Valda samband framhävs; andra linjer tonas ned. Fokus och träffantal visas
vid sökningen. Klick på tom rymd, Escape utanför formuläret eller
**Visa hela rymden** lämnar fokus och rensar sökning och typfilter.
Kamerans vinkel, zoom och panorering behålls.

## Navigera rymden

Dra i tom rymd för att rotera. Använd mushjulet eller nyp med två fingrar
för att zooma. Två fingrar panorerar; med mus kan du dra med höger knapp.
Under **Navigera rymden** finns också knappar för panorering, rotation,
lutning och zoom. Kartdrag markerar inte etiketternas text.

**Återställ vy** rensar fokus, sökning och typfilter och ramar in hela
kartans placeringar. Det ändrar inga hushållsuppgifter.
**Alla etiketter** ger ett närmare utsnitt som går att
panorera. Objektnamn får plats före sambandens etiketter. Korta stödlinjer
till etiketter är heldragna och långa stödlinjer är streckade. Listan och
detaljerna ger tillgång till hela innehållet även när etiketter ligger
utanför det synliga utsnittet. På en smal telefon kan även en mindre
karta få överlappande eller delvis dolda etiketter. Använd zoom,
panorering, objektfokus eller listan för att nå dem.

## Ändra och granska

Högerklick eller långtryck på ett objekt ger **Redigera objekt**,
**Visa kopplingar** och **Ta bort objekt**. I listan finns också
**Redigera** och **Ta bort** vid det valda objektet.

Formulärtext skickas först när du lägger den i utkastet. Val och
oskickad text för samma objekt eller samband finns kvar vid vybyte,
storleksändring och vändning av enheten. I kartan öppnar **Visa detaljer
och utkast** den gemensamma redigeringen; **Till kartan** går tillbaka.

Markeringarna visar skillnaden mot sparad karta:

- **+** med grön markering: nytt förslag.
- **~** med gul markering: ändrat förslag.
- **×** med röd markering: föreslagen borttagning.

**Upphört** har en egen färg och visas även i rymdkartans objekt- och
sambandsetiketter. Statusen följer samma slutdatum och manuella val som
i listan. Den kan visas samtidigt med en ändringssymbol och finns kvar
efter sparandet. **Gäller fortfarande** åsidosätter ett passerat slutdatum.

**Ta bort** lägger omedelbart objektets och dess inkommande och utgående
sambands borttagning i utkastet. Andra objekt finns kvar. Granska
**Hela mitt utkast** och välj **Spara hela utkastet** för att ändra den
gemensamma kartan. **Kasta hela utkastet** tar bort osparade förslag;
det är inte ångring av ett tidigare sparande.

## Enheter och begränsningar

Lista och detaljer ger hela det vanliga kartarbetet med tangentbord utan
rumslig navigering. Fokusmarkeringar, fältnamn och statusbesked finns kvar.
Kameran byter läge direkt utan animation och systemets minskade rörelse
respekteras. Om grafiken avbryts finns utkast och oskickad text kvar.
Du kan fortsätta i listan medan grafiken återställs. Om WebGL 2 saknas
visas ett besked och listan kan fortfarande användas.

Chrome på Windows, macOS, iPhone och iPad är målplattformar. Automatiska
prov använder Chromium med påhittade hushåll, riktig lagring och emulerade
telefonstorlekar och pekhändelser. Detta är inte fysiska prov på iPhone
eller iPad och bekräftar inte fullständiga skärmläsarflöden. De godkända
avgränsningarna för senare enhets- och hjälpmedelsprov kvarstår.
Textredigering på liggande iPhone kan kräva att du vänder till stående läge.

## Ordna din personliga vy

Dra ett objekt för att flytta det i kamerans bildplan. Håll Shift när du
drar med mus för att flytta längs rummets höjdaxel. Med pekskärm flyttar
första fingret objektet. Lägg ett andra finger stilla på kartan och dra
det första uppåt eller nedåt för höjdled. Höjdhjälpen visar start och
riktning och är märkt som personlig vy. Släpp det andra fingret först
för att återgå till vanlig flyttning. Släpp sedan det första för att spara.

Om det andra fingret flyttas, det första släpps före det andra, fler
fingrar tillkommer eller gesten avbryts återställs objektets placering.
Ett långtryck öppnar menyn utan flyttning. Du kan välja objektet i listan,
öppna kartan och använda **Ordna min vy** för att flytta i alla sex
riktningar med knappar och tangentbord.

Under **Ordna min vy** kan du vända panoreringen separat i sidled och
höjdled. Axelvisaren visas under rörelse och en kort stund efteråt.
Välj mellan fyra hörn eller **Visa axlar hela tiden**. Den valbara
stjärnhimlen följer rotation och zoom men ligger still vid panorering
och objektflyttning. Hjälpvisare, avstånd och placeringar är presentation;
de tillför inga uppgifter om hushållet.

Flyttar och visningsval sparas direkt för din Skyttel-användare och det
aktuella hushållet. De ingår inte i utkastet eller kartans ändringshistorik.
De finns kvar efter omladdning, stängd app, enhetsbyte och serveromstart.
Andra medlemmar har egna placeringar och val. Nya objekt får en enkel
startplacering utan att flytta befintliga objekt eller kameran. Kameran
behålls under arbetet och vybyten; en ny sida börjar med en inramad karta.

Samtidiga flyttar av olika objekt bevaras. Om en annan klient redan flyttat
samma objekt avvisas din äldre flytt. Ett tydligt besked visas tillsammans
med den aktuella placeringen. Äldre visningsval avvisas på samma sätt.
Granska de aktuella valen och gör sedan din ändring igen vid behov.
**Läs in min aktuella vy** hämtar dina senaste placeringar och val utan
att ändra formulärtext eller hushållets karta. Om anslutningen avbryts
och sparandet inte kan bekräftas behöver du läsa in vyn innan du fortsätter.

Återkallad tillgång hindrar fortsatt läsning och sparande. Personliga
placeringar kan finnas kvar för borttaget innehåll och återkommer om det
återställs. Vanlig borttagning är inte permanent radering. Prov med stora
kartor ingår separat.
