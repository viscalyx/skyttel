# Manuella testfall

Testfallen är grupperade efter område i applikationen. Varje områdesfil
beskriver användare, förberedelser, steg och förväntat resultat samt länkar
till motsvarande automatiserade integrationstester. Fall som uttryckligen
kräver verkliga externa konton anges som enbart manuella och körs inte i CI.

Fallen fungerar som körbara beskrivningar och stöd för felsökning.
Automatiserade fall behöver inte upprepas manuellt för specifikation #31.
Den separata [restlistan #97](https://github.com/viscalyx/skyttel/issues/97)
innehåller bara kvarvarande mänskliga bedömningar och bekräftelser.
Förberedelsen för dessa finns i
[ärendets kommentar](https://github.com/viscalyx/skyttel/issues/97#issuecomment-5835778540).
Registrera automatiska körningar med version och resultat; skilj dem från
verkliga leverantörsprov och mänskliga observationer.

Separata automatiska [modellprov](real-model-tests.md) och
[talprov](real-voice-tests.md) använder verkliga leverantörer.
De körs uttryckligen med privat konfiguration och redovisas separat från CI.

För det förenklade samtalet finns en separat kvarstående
[mänsklig verifiering #220](https://github.com/viscalyx/skyttel/issues/220).
Den omfattar verklig mikrofon, skärmtangentbord och skärmläsare på
Chrome för Windows, macOS, iPhone och iPad. Automatiska DOM-, medie- och
fönsterprov ska redovisas separat från de resultaten.

## Köra och förbereda prov

[Testguiden](../development/testing.md) beskriver kommandon för automatiska
kontroller och rapporter.
[Provförberedelsen](../development/devcontainer.md#disposable-local-database)
ger en separat lokal provdatabas. Förbered utvecklingsmiljön med
[utvecklingsguiden](../development/devcontainer.md). Områdesfallen länkar
till utvecklingsguidernas gemensamma miljöer. Särskilda provdata och
kontroller beskrivs tillsammans med respektive områdesfall.

För [stora kartor](large-map-performance.md) finns en separat mätplan och
[uppmätta resultat](large-map-results.md).
Den samlade kartupplevelsens
[verifieringsrapport](connected-experience-verification.md) redovisar hela
familjeflöden, verklig webbläsarzoom, granskade bilder och miljöbegränsningar.

## Öppna arbetsytor

Hushållet öppnar **Karta**. Välj **Tabell** i **Kartans verktyg** för sökning,
filter, sortering och alla objekt. Namnet expanderar radens läsuppgifter.
**Läs alla uppgifter för [namn]** öppnar fullständig läsning; **Samband för
[namn]** öppnar objektets samband och följbara objektlänkar. Läsning ändrar
inte uppgifter och behöver varken samtal eller medgivande.

Välj **Nytt objekt** i verktygen eller **Redigera [namn]** i tabellen för samma
fullständiga objektformulär. **Lägg i utkastet och stäng** lägger hela förslaget
i det privata utkastet. **Lägg i utkastet och öppna samband** övergår först
efter bekräftat förslag till objektets samband. Där finns **Nytt samband**
och **Redigera samband**. Radens läsuppgifter innehåller också **Åtgärder
för [namn]**, med vanliga objektåtgärder även när kartgrafiken inte fungerar.

Välj **Skriv till Skyttel** för textvyn. Den öppnas utan modellkontakt eller
nytt medgivande. **Visa utkastet** öppnar läsning, borttagning och sparande av
hela utkastet. Förslag kan läsas men redigeras via de vanliga formulären
efter borttagning och nytt förslag. Konflikter granskas från **Karta** eller
**Tabell**. **Rapporter** och **Ändringshistorik** visar gemensamt sparade fakta.
För att starta ett nytt samtal väljer du uttryckligen **Nytt samtal**; om
medgivande behövs väljer du därefter **Godkänn och starta**.

På telefon öppnar **Visa verktygens namn** de kompletterande verktygen.
**Visa detaljer** läser den aktuella kartmarkeringen i en fast läsyta.
Stäng den med **Stäng uppgifterna** före kartgester om den tar plats.
Stäng text med **Stäng textvyn** när ett fall behöver själva kartan.

**Din profil** innehåller användar-ID, inbjudningar, **Inloggningssätt**,
**Assistentanslutningar** och **Logga ut**. **Inställningar** öppnar en egen
sida med **Typer och egna fält**, **Administrera tillgång** för
administratören och **Månadskostnad** för driftansvarig. Mobilnavigationen
öppnas med **Välj inställning**. **Tillbaka till kartan** återger arbetet.

Objekt- och sambandsformulär skyddar oskickade ändringar när de stängs eller
lämnas. **Fortsätt redigera** eller Escape avbryter förlusten; endast
**Kasta ändringarna och fortsätt** kastar texten. Vid väntande eller oklart
utfall följer du formulärets uttryckliga kontroll före nytt försök.
Rent läsande dialoger stängs med kryss eller Escape och återför fokus.

## Områden

- [Samtalets samlade hjälpmedelsflöde](conversation-accessibility.md):
  naturlig läs- och tabbordning över verktyg, röstruta och flyttad notis,
  en enda statusförekomst, återkomst och fokus, minskad rörelse samt
  samlad WCAG-bedömning med kvarstående mänskliga prov.

- [Automatisk kontroll av sparande](save-check.md): återkomst efter nätfel,
  ursprungligt försöks-ID efter omstart utan nytt medgivande, ett enda
  utfallsbesked med röstval och kvitto, återkallat medgivande med tappat
  svar samt återförsök bara vid kontrollfel.

- [Röstfel och ljudåterhämtning](voice-errors.md): fyra mikrofonhinder, tre
  servergrupper, felreferenser, stängning, återförsök och **Starta ljudet**
  med avstängd mikrofon fram till fungerande uppspelning.

- [Objektlistor](object-lists.md): tabell med fullständiga uppgifter, skilda
  statusar, svenska sorteringsriktningar, 50 objekt per sida och bevarat
  läge på dator och mobil; fullständig läsning och sambandskedjor utan
  kartgrafik, uttrycklig identitet och sparade/föreslagna preciseringar,
  långa namn, modalernas fokus och återgång även när en sida försvinner;
  separat sökning, mobil filterdialog med knapp för aktuella träffar, egna
  detaljträffar, aktuell rad, teckensammansättning, utkastfiltrets återställning,
  markeringar, direkta sammanhang, utforskning utan indirekt expansion,
  upphört även i sammanhang och tabellens kartknapp med bevarat läge;
  textåtgärder med återfokus och verkliga borttagningsberoenden utan
  kartgrafik, med oberoende förslag och sparade uppgifter kvar.
  Kartknappen är inaktiv vid grafikavbrott, medan vanlig läsning och
  redigering fungerar. Återgång från inställningarna behåller användbart
  läge och synligt, otäckt fokus. LISTA-06:s gamla fönstergeometri är
  pensionerad utan återanvänt ID; första aktiveringens läsning finns kvar.

- [Navigeringsfönstret](map-navigation.md): normal- och miniläge, oberoende
  fönsterflytt, samtidiga detaljer, sex beständiga personliga riktningar och
  nypzoom med styrplatta.

- [Inställningar och profil](settings-profile.md): helsida, mobilnavigation,
  återgång med fokus, synligt tangentbordsfokus i båda riktningar, läsbara
  teman och typdefinitioner i kartans samlade utkast.

- [Objektarbete och samtal](workspace-panels.md): kompletta objektförslag,
  läsdialoger med återfokus genom dator- och mobilbyte, bevarat samtal,
  skyddad formulärförlust, väntande
  objektdialog och åtkomliga samband och typer genom vanliga ingångar.
  Gamla fria fönsters placeringsfall är pensionerade utan återanvända ID:n.
- [Kartans arbetsyta](workspace-shell.md): kompakt och expanderad verktygslåda,
  teman, läsbara hopplänkar och fokus, hjälp i det kompakta verktygsfältet,
  samtalshjälp med
  tangentkombination, medgivande och leverantörens datavillkor, formulär på
  telefon samt laddning och återhämtning efter nätfel. Hjälpens långa text
  går att rulla på telefon. På en tom mobilkarta förblir visningsval,
  verktyg och deras tangentbordsfokus nåbara, även med röstruta eller
  samtalsnotis. Höjdhjälpen finns i navigeringen och är inaktiv utan
  ett objektval.

- [Bevarat hushållsarbete](household-work.md): avbruten formulärförlust,
  lagda objektförslag, oskickad samtalstext, samtal,
  mikrofon, sökning, urval, synligt återställt fokus, personlig vy och samma
  sparförsök vid tillfälliga vybyten; avveckling vid utloggning, återkallad
  tillgång
  och ersatt hushållsinnehåll. Väntande permanent radering stoppar mikrofon,
  dolt formulär och registrerat sparförsök före omladdning; oberoende privat
  arbete finns kvar efter uttryckligt slutförande. Ett sammanhängande
  familjeärende går från synlig inloggning, text och tal till rättelse,
  Inställningar med röstruta och utkastets återkoppling, samlat kvitto, omstart
  och två medlemmars skilda utkast;
  samma fullständiga arbete provas med text och listor utan grafik eller ljud.

- [Månadskostnad](costs.md): separata Render-, Live- och Terra-belopp,
  prisunderlag, månadens antaganden, okända värden, kumulativa mätningar,
  omstart, hämtningsfel, okänt sparresultat, tangentbordsfokus och
  installationens särskilda kostnadsbehörighet på mobil och dator.
  En lokal startguide ger kontrollerade leverantörssvar och två identiteter.

- [Återställning och flytt](household-recovery.md): tomma lokala installationer,
  uttrycklig verifierad ägarkoppling, bevarat undanträngt privat arbete,
  fullständiga valda identiteter utanför vallistorna och förnyad bekräftelse,
  tappat svar vid identitetskoppling, oberoende privata tillstånd,
  gamla sessioner och sparförsök, omstart och fortsatt export till en tredje
  installation utan gammal databas eller inloggningsbehörighet.

- [Typer, historik och rättelser genom MCP](assistant-advanced.md):
  egna typer och fält, daterade avtal, riktning och typbyte, skyddade
  definitioner och läsbar historik efter import samt vanliga
  rättelser med aktuellt underlag och avvecklade verktygs frånvaro.

- [Samtalsmedgivandet](conversation-consent.md): medgivanderutan från
  verktygsraden och snabblänken, avbruten start med bevarat
  fokus, start med röst eller text efter vald knapp, medgivande för besöket
  eller sparat per användare och hushåll på flera enheter samt tangentbord,
  pekskärm och placering vid verktygsraden. Sidan **Samtal med Skyttel** i
  Inställningar: plats i menyn för alla medlemmar, sparat och återkallat
  medgivande, medgivande för besöket, återkallande från en annan enhet,
  bekräftelse under samtal, kvarvarande utkast och oskickad text,
  slutfört registrerat sparande med kvitto, tangentbord och pekskärm,
  otillgängligt samtal, misslyckat sparande och ny fråga efter en ny
  inbjudan. Ändrad medgivandetext kräver ett nytt sparat medgivande;
  en separat tillfällig installation förbereder det syntetiska tillståndet.
- [Samtalsnotiser](conversation-notices.md): bruten kontakt, otillgängligt
  samtal och uppdragsfel; en gemensam ordning, bara ett besked, stängning och
  automatisk återkomst, textåtkomst utan tillgängligt samtal, bevarad text
  med stoppad sändning och mikrofon,
  hjälpmedel utan dubbel uppläsning, fokus och placering vid röstrutan
  eller meddelandefältet med hela beskedet läsbart på bred och smal skärm,
  verkligt registrerat
  kontrollfel samt mätt text- och symbolkontrast i båda teman. NOT-11 har
  en separat körbar mänsklig granskning av alla symbolformer och typfärger.
- [Frågor och talade sparbesked](conversation-questions.md): identiteter,
  konflikter, väntan med mikrofonen av, beständigt kvitto och fyra
  sekunders sparbesked efter ljud eller stopp.
- [Skyttels röst](voice-assistant.md): svenska röstuppdrag,
  start efter medgivande, mikrofonen på och av med **Prata med Skyttel**,
  röstrutans statusord, vågform, stoppikon, plats och uppläsning,
  ljudaktivitet, fördröjda svar med mikrofonen av och fokus efter avbrott
  även i Inställningar samt avbrutet ljud som förblir stoppat över pauser,
  avbrott i långa samtal med bevarad kontext och mikrofonval,
  faktisk markering, exakt sparåterhämtning och tydlig skillnad mellan
  samtalstext och verifierade resultat, löpande dialog och
  raden Skyttel arbetar. Kontrollerat familjeunderlag och
  verkligt tal redovisas separat.
- [Utkastet i samtalet](conversation-draft.md): tabellen och dess symboler,
  personligt val mellan hushåll och enheter, första förslaget, tomt utkast,
  sparåterkoppling och kvittots plats i Utkast och historik.

- [Mikrofontryck](microphone-press.md): kort och långt tryck, släpp och
  systemavbrott, medgivande, pekfångst och tangentkombinationer på riktiga
  Windows- och macOS-enheter; väntande tal under starten, avbrott och
  spärrad ljuduppspelning och mikrofonens läge vid nytt samtal.

- [Textvyn](text-view.md): **Skriv till Skyttel** öppnar och stänger
  textvyn utan att samtalet avslutas, samtalstexten visar vem som skriver
  och raden Skyttel arbetar sist, **Nytt samtal** behåller utkast, mikrofon
  och oskickad text även vid dubbelklick under fördröjd omstart, och textvyn
  går att använda på pekskärm och smal skärm. Textknappens överlagrade
  markeringar visar skrivet arbete, olästa svar och väntande frågor med
  en enda artig uppläsning, fasta mått och minskad rörelse. Kommentarspaket
  och faktiskt hört tal provas separat. Mobilfallen provar iPhone och
  iPad, fast sidofält på bred pekskärm, kompakt rad vid kort synlig höjd,
  bibehållet fokus, 190 px synlig höjd med rösten på, fria kartkontroller
  och långa rullbara notiser. Datorfallen provar oberoende breddhandtag
  med mus och piltangenter, personliga bredder mellan hushåll och enheter,
  visningsbegränsning utan ändrat sparat val samt återställning även utan
  tillgängligt samtal. Mobil enhet och smal skärm behåller sina bredder.
  Aktuella och kompatibla äldre hushållsarkiv bevarar personliga samtalsval
  och håller dem och medgivandet utanför hushållsfilen.
- [Samtalets kö och avbrott](conversation-queue.md): serverns kö på dator,
  fokusstyrd Escape, stopp på mobil och smal skärm, talade och skrivna
  uppdrag samt kvarvarande utkast, oskickad text och återkoppling.
- [Röst och text i samma samtal](conversation-voice-text.md): skrivna svar
  med röst när mikrofonen är på, text när den är av, ordnad överlämning av
  långa svar, kvarvarande samtalstext och artig uppläsning bara av nya
  textlevererade Skyttel-rader. Obekräftad text ger inget sparkvitto.
- [Samtalets kontext](conversation-context.md): samma tillfälliga samtal
  genom utkast, sparande, avbrott, fel, mikrofon av och på samt byte mellan
  röst och text. Äldre sparbesked ger inget nytt sparande. Skrivna och
  talade kommandon börjar om samtalet och kastar hela utkastet.
  Kontextmätaren följer serverns procenttal, röstrutan visar procent från
  85 och ger en enda artig uppläsning, även på smal pekskärm. Nytt samtal
  återställer mätaren och gamla mätningar ignoreras.
  Full kontext sammanfattas automatiskt med kvarvarande samtalstext,
  aktuellt utkast, mikrofonläge och tidigare inspelat tal. Misslyckad
  sammanfattning blockerar nya uppdrag tills Nytt samtal. Pågående
  sparande och dess hörda kvitto avslutas före röstbytet.
- [Samtal med Skyttel](text-assistant.md): hela utkast,
  rättelse och samlat sparande, sena svar, avbrott, återfunna kvitton och
  samtidigt synliga objekt och samband i karta och detaljpanel även på
  telefon, med skyddad formulärtext samt obekräftad samtalstext
  skild från resultat samt synliga samband, typer och före-/eftervärden
  i hela ändringslistan och begärda samtalsdetaljer från utkast och kvitto.
  Kontrollerade lokala
  leverantörssvar och verklig modellförståelse redovisas separat.

- [Permanent radering](household-erasure.md): egen inställningssida,
  avbruten granskning med bevarat kartarbete, uttrycklig granskning och
  bekräftelse, bevarat oberoende innehåll efter omstart, förlorat svar och
  förnyad granskning efter samtidig ändring samt väntande städning och
  återhämtning efter omstart. Kända försök behåller sin identitet genom
  sidnavigation och omladdning trots senare resultat från en annan
  administratör. En annan aktuell administratör kan fortsätta samma
  väntande städning efter rollbyte, omstart och förlorat svar, med bevarat
  oberoende privat arbete. Ett saknat känt resultat är fortsatt okänt även
  efter omladdning och ett annat ärendes slutförande.
  Sena statussvar från en lämnad sida ändrar inte ett nyare försök eller fokus.
  Lagringsfel bevarar granskningen och verklig status för samma väntande
  ärende och blockerar nya åtgärder innan återhämtningen kan säkras.
  Hela granskningen och resultatet behåller läsbara identifierare och synligt
  tangentbordsfokus i båda teman, också på smala och korta fönster.
  Radering av en tidigare typ tar bort dess
  sista historiska bildversion utan att ta bort objektets nuvarande bild.

- [Fullständig återimport](household-import.md): egna inställningssidor,
  bevarat oskickat arbete före innehållsbyte, uttrycklig ersättning,
  bevarad åtkomst, privata uppgifter, bildhistorik, äldre fältbetydelser,
  lokalt prov med tappat sparbesked, avvisade gamla sparbegäranden,
  ny förberedelse efter omstart, samma importförsök i en annan
  administratörs webbläsare, tappat förberedelsesvar, väntande rensning
  efter rolländring, uppföljning av rätt försök trots en senare ersättning
  och vanliga rättelser med aktuellt underlag. Tangentbord och fokus följs genom
  filfel, granskning, uttryckligt avbrott av obekräftad förberedelse,
  avbrottets rensningsfel och tappade svar, flera samtidiga granskningar
  och fördröjda avbrotts- och statussvar efter navigering. Ersättning och
  innehållskoppling följs i båda teman. Fel i webbläsarens återhämtningsminne
  bevarar vald fil, faktisk granskning och bekräftat serverresultat.

- [Fullständig export](household-export.md): egen sida i Inställningar,
  privata uppgifter före export, tangentbord, fokus, bevarat kartarbete,
  nedladdning, verklig återimport av den hämtade filen efter omstart,
  avbrott med oklart rensningsresultat, sidbyte under hämtning,
  återkallad aktiv hämtning, giltighetstid samt
  bevarade identiteter, bildversioner, utkast och placeringar. En lokal
  kontrollklient pausar en stor HTTP-överföring,
  mäter olästa byte i serverns källfil och kontrollerar borttagna exportfiler.

- [Objektikoner](object-icons.md): svensk sökning och ikonnamn, tangentbord,
  mobil, korta fönster vid förstoring, bildens företräde, typbyte, omstart
  och återgång till standardikon, lokalt tangentbordsfokus samt kompletta
  tillägg med bevarade värden vid avvisat eller okänt utfall.
- [Profilbilder](profile-images.md): privata bildförslag, visning i
  rymdkartan, formatfel, gränser, omstart, bildbyte, borttagning, historikläsning,
  kvitton och bildåtkomst. Hela bildformulärets väntande tillägg spärrar
  navigering; avvisning behåller lokala värden, tidigare bild och oberoende
  förslag. Förlustvarningen har synligt tangentbordsfokus och läsbar text
  under pekaren i båda teman, också på korta fönster. Avbrutet filval
  ändrar inget och inaktuellt tillägg bevarar hela formuläret.
  Alla objekttyper delar text, ikon och bild i samma förslag och kvitto;
  bildborttagning återställer inte en äldre sparad bild.

- [Externa assistenter](assistants.md): OAuth, separat AI-val, avböjd
  anslutning, avgränsade läsningar, egna utkast, hushållsgränser och
  återkallad åtkomst, särskilt kartmedgivande, hela utkast, rättelser,
  konflikter och återfunna kvitton samt ett separat manuellt Codex CLI-prov
  med verklig Google-inloggning i devcontainern, utan CI-hemligheter.
  En kontrollerad lokal MCP-klient behåller gamla begäranden, tappar ett
  lyckat sparbesked och provar exakta återförsök efter serveromstart.
  Profilens anslutningar får tangentbordsfokus och återgången behåller
  oskickad text och oberoende privata förslag.

- [Inloggning och hushållets start](access.md): skapa hushåll, använda
  tangentbord, avbryta extern inloggning, återhämta utgångna försök, börja
  med kartans verktyg utan startdialoger, hantera förlorad tillgång och länka
  inloggningssätt.
  Länkningens två steg visar aktuell verifiering, båda tjänsternas status
  och övergången till respektive tjänst.
  Avbruten länkning bekräftas med bevarad tillgång och krav på ny verifiering.
  Utgången länkning förklarar ny verifiering och bevarar eget utkast och
  identitet.
  Även en redan öppen sida hanterar avvisad utgången verifiering utan ny
  koppling.
- [Tillgång och medlemskap](membership.md): inbjudningar, utgångna och
  ersatta koder, delad administration samt återkallad och återställd
  tillgång med bevarat innehåll i kartan. Stegvis inbjudan och verklig
  kopiering,
  separata medlems- och inbjudningsvyer samt avvecklat oskickat arbete när en
  redan öppen mottagarklient förlorar tillgång.
  Misslyckad urklippsknapp följs av manuell kopiering och faktisk acceptans.
- [Objekt och samband](map.md): skapa, söka, rätta och ta bort uppgifter,
  skilja lika namn åt och bevara ofullständiga uppgifter; det gemensamma
  objektformuläret med fullständiga värden, stängda avsnitts fel, typbyte,
  bild och ikon, förlustvarning, återfokus samt väntande, avvisat och oklart
  tillägg till utkastet på dator och mobil.
- [Markering och detaljer](map-selection.md): flerval, tomrumsgester,
  textkontroller, aktiv detaljikon och en fast läsyta med fullständiga
  uppgifter, vanliga formulär, återfokus och oförändrat utkast även i
  smala och korta fönster samt återgång från Rapporter till text och utkast.
- [Kamerans urvalsfokus](map-camera.md): personlig rotationspunkt, direkta
  grannar, återgångsvy, mus, tangentbord och pekskärm i smala och korta vyer;
  nå återkoppling och alla sex personliga flyttar utan täckta kontroller,
  återfå fokus efter flytt och bevara senare fokus eller stängd navigering
  när ett verkligt svar hålls och släpps.
- [Rymdkarta](spatial-map.md): gemensam redigering genom Tabell, kompletta
  formulär och utkastets läsning med bevarad kamera och markering;
  sökning och direkta samband, läsbara tidigare sparade samband,
  täta etiketter, publicerat medlemsbortfall och återhämtning av grafik.

- [Stora kartor](large-map.md): åtkomst till 500 objekt och 1 500 samband
  genom sidvisning, sökning och fokus, med bevarad text och placering.
- [Personliga placeringar](personal-view.md): stjärnval i Rymdkartans
  inställningar, minskad rörelse, flyttning med mus, pekgester
  och tangentbord, stabila fingerpar och kameraväxling, systemets minskade
  rörelse, visningsval, samtidighetskonflikter, bevarad text,
  beständighet och avskildhet mellan användare samt inramning vid sen
  första inläsning med bevarad kamera vid senare uppdateringar. Separata
  provhushåll på samma installation förbereds med ett lokalt kommando.
  Höjdhjälpen har stabil förhandsvisning och ett bevarat val i båda
  navigeringsstorlekarna.
- [Avtal och ekonomiska uppgifter](contracts.md): registrera, hitta och
  rätta hyra, skuld och kredit, separata roller kring bostad och fordon,
  validering, konflikter, historik och bevarade äldre utkast. Ett lokalt
  kommando förbereder äldre provdata för uppgraderingen.
- [Ditt utkast](drafts.md): fullständig läsning av objekt, samband och typer
  utan AI eller medgivande, giltighet, profilbilder och egna egenskapsnamn,
  långa fältnamn och sammanfattningar som skiljer giltighet från statusläge,
  direkt borttagning av oberoende förslag och bekräftad eller avbruten
  borttagning av nya objekt med deras verkliga sambandsberoenden,
  samt typförslag vars beroende förslag blir kvar med begriplig feltext,
  bekräftelse och avbrott för hela utkastet med oskickat meddelande kvar,
  uppdaterade beroenden efter inaktuell bekräftelse, typkonflikter med
  bevarade egna värden, fokus efter sista raden och återhämtning av
  borttagning efter tappat svar,
  beständig borttagningskontroll utan avbrott i senare samtalstext,
  tomt utkast och bevarat första meddelande;
  filtrerad teckenförklaring med kartans färger,
  tre sekunders sparbesked och beständiga fel med återhämtning; återuppta
  sparmodalens väntande, okända och avvisade försök från karta och tabell,
  även utan utkastikon efter omladdning; återgå till synligt Utkast efter
  bekräftad kontroll från Karta, behåll senare tangentbordsfokus
  och skilj bekräftat kvitto från fel vid efterföljande hämtning; återuppta
  utkast, hantera gamla kastförsök
  och konfliktval, kombinera egenskaper i Granska konflikter från karta
  och tabell, läsa långa namn, bevara konfigurerade egenskapsnamn och
  ange varje egenskaps verkliga sparare, förklara ogiltiga kombinationer
  och avvisa inaktuell jämförelse; bevara val mellan konflikter och återöppning,
  göra om endast berörda egenskapsval, pröva ändrade typer och referenser igen
  och kontrollera genomförda eller uteblivna konfliktval efter tappat svar
  samt acceptera redan genomförda objekt- och sambandsborttagningar genom
  att kasta endast den berörda postens förslag; hantera dubbletter och
  saknade ändpunkter, välja objektets och nya sambands borttagning oberoende,
  kontrollera flera privata borttagningar efter tappat svar och rätta
  inkompatibla egna fält i den vanliga objektdialogen, rätta saknade typer
  genom faktiska definitioner och läsa historiska fältnamn före typbytesförlust;
  bevara oberoende
  utkast och sparad historik; behålla ett ändrat samband och öppna
  objektborttagningens verkliga beroende igen; granska borttagna
  typdefinitioner som hela
  aktiva val, återställa endast deras historiska identitet med fortsatt
  revisionsföljd, avvisa inaktuellt sparande atomiskt, ompröva privat
  återställning efter import och kontrollera dess fullständiga privata
  utfall utan dubblerad mutation; behålla ändrade fakta när nya samband
  försvinner, visa samtidiga typ- och ändpunktshinder, läsa historiska
  fältnamn även när en aktuell definition saknar fältet, kasta ägda
  definitionsförslag utan faktisk borttagningsrevision och kontrollera
  oklara fasta kastval från både Karta och Tabell samt gå till nästa verkliga
  konflikt från resultatet med bevarade val och rubrikfokus
  med en beständig status utan fokusstöld
  samt granska samtidiga ändringar, dubbletter och
  borttagningar före ett gemensamt sparande. Bevara oberoende status
  och slutdatum i samband vid konfliktval samt rätt typdefinitioner
  vid borttagning efter typbyten. Följ status och legend med stängda
  dialoger, samma kvitto vid okänt utfall, bevarat tangentbordsfokus och
  ett samlat utkast från formulär, text och tal efter omstart. Besvara
  nödvändiga frågor före ett nytt uttryckligt sparbesked. Använd Navigation
  och kartans status och teckenförklaring tillsammans utan att tappa åtkomst
  till kontrollerna.
  Avbryt förlust av oskickad objekttext, lägg hela objektändringen i
  utkastet och öppna en namngiven konflikt från status med tangentbord.
  Följ alla fyra konfliktslag till rätt ändring och läs tidigare, föreslagna
  och aktuella
  avsnitt, dolda värden och hela ekonomiska uppgifter. Rätta ett
  konfliktobjekt med det oberoende förslaget och sparade uppgifter kvar
  före ett nytt uttryckligt sparande. Rätta ett sambands
  borttagna mål utan att återuppliva objektet eller spara i förtid.
  Rätta objekt- och sambandstyper genom inställningarna med oberoende
  sparade uppgifter kvar och ett nytt uttryckligt sparbesked.
  Återgå till hela utkastet efter ett konfliktval och bevara senare
  sökfokus när svaret fördröjs.
  Återfinn privata konfliktval efter tappade svar och bekräfta samma
  kvitto efter ett nytt uttryckligt sparande utan dubbletter.
- [Objekttyper och egna fält](object-types.md): skapa och rätta gemensamma
  definitioner, fyra frivilliga värdeslag, privata förslag, samtidiga
  ändringar i namngivna avsnitt, flytt och döljning utan värdeförlust,
  gemensamma egenskaper med bevarad säkerhet och datum, tangentbord
  och bevarat arbete på mobil, dator och korta fönster med synlig status.
  Konfigurerad läsordning följer formuläret genom utkast och tabell,
  med uttryckliga nollvärden och **Nej** bevarade.
  Samtidiga
  ändringar med bevarade oberoende uppgifter och samma atomiska kvitto
  som objektens innehåll. Upprepade typbyten granskar skilda gamla svar,
  kräver ny bekräftelse och bevarar identitet, ekonomiska uppgifter,
  bild, ikon och samband samt läser historiska värden.
  Felaktiga värden provas med aktuella versioner i det publika gränssnittet.
  Konfigurerad fältordning följer med till formulär, utkast och tabellens
  fullständiga läsning, inklusive uttrycklig noll och Nej.
- [Sambandsarbete](relationships.md): skapa objekt separat, koppla dem i den
  gemensamma dialogen och rätta objekt och samband oberoende. Fullständiga
  egna värden, typbyte, riktning och säkerhet behåller sin betydelse.
  Validering, dubbletter, borttagning, oklara utfall och förlustvarning
  bevarar tidigare förslag. Ett gammalt obekräftat försök efter en senare
  ändring kräver granskning av aktuellt underlag före nytt förslag.
  Läsning, filter, återfokus och smal skärm provas.
- [Sambandstyper och riktning](relationship-types.md): benämningar från
  båda objekten, redigerbara definitioner, fyra egna fältslag, obesvarat,
  noll och Nej, uttrycklig hantering vid typbyte, privata förslag,
  ordnade avsnitt och återvisade dolda svar efter omstart, dubbletter
  och samtidiga sparanden utan delsparande.
- [Borttagning av typer och fält](definition-removal.md): granskad
  katalogborttagning, användningsspärrar för upphört innehåll och privata
  utkast samt läsning av historiska definitioner som saknas i katalogen.
- [Sparutfall, återhämtning och gemensamma demodata](operations.md):
  kontrollera samma väntande eller obekräftade försök efter omstart,
  läsa genomförda sparanden i Rapporter och kontrollera privat tillgång;
  SPAR-05 provar styrd leverans av verkliga formulärförslag, avvisat inaktuellt
  sparande och återhämtning av ett tappat lyckat sparkvitto.
  DEMO-01 provar även färdigt TestHousehold med den
  konfigurerade Google- eller Microsoft-administratören.
- [Ändringshistorik](history.md): Rapporter visar genomförda sparanden
  senaste först, fullständiga historiska värden, direktlänkar och återgång
  till bevarat arbete. Omfattar tangentbord, smala skärmar, återförsök
  och fokus under fördröjd hämtning, sparlänkar med bevarad oskickad text
  och historiska ikonvärden bredvid profilbilder.
- [Upphört och borttaget](lifecycle.md): markera och rätta status, följa
  kända slutdatum och granska, kasta eller spara vanlig borttagning med
  bevarade anslutna objekt och historikunderlag, även efter privata typbyten.
  Kartans samband visar samma status med text och tillgänglig beskrivning
  vid tangentbordsarbete och efter omstart. Objekt och samband behåller
  sina egna namn, typer och statusuppgifter även när identifierare liknar
  varandra.
  Det gäller även tidigare samband som visas tillsammans med aktuella förslag.
