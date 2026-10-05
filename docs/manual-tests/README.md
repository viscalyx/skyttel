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

Hushållet öppnar rymdkartan. Välj **Lista** i **Kartans verktyg** före
fallens formulär, listor, typer, historik och utkast. Välj **Skriv till
Skyttel**
före samtalsfallen. Utan giltigt medgivande visas medgivanderutan först;
välj **Godkänn och starta**. På telefon öppnar **Visa verktygens namn**
även de kompletterande verktygen.

Välj **Uppgifter** vid objektet i Lista för att öppna dess panel. Namnet
visar i stället objektet i kartan. När ett fall återvänder
till ett redan öppet objekt, öppna Lista och välj dess **Uppgifter** igen.
Stäng panelerna med kryssen inför kartgester om panelerna täcker kartan eller
dess reglage;
öppna Lista igen för sökning, filter, samband och utkast.

**Din profil** innehåller användar-ID, inbjudningar, **Inloggningssätt**,
**Assistentanslutningar** och **Logga ut**. **Inställningar** öppnar en egen
sida med **Typer och egna fält**, **Administrera tillgång** för
administratören och **Månadskostnad** för driftansvarig. Mobilnavigationen
öppnas med **Välj inställning**. Följ dessa ingångar när ett fall anger en
sådan funktion. **Tillbaka till kartan** återger arbetet.
Objektformulärets kryss bekräftar förlust av oskickade ändringar. Stäng alla
paneler för att
återgå till kartan; stäng även textvyn på telefon.

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
  separat sökning, egna
  detaljträffar, flerval, teckensammansättning, utkastfiltrets återställning,
  markeringar, direkta sammanhang, utforskning utan indirekt expansion,
  upphört även i sammanhang och tabellens kartknapp med bevarat läge.

- [Navigeringsfönstret](map-navigation.md): normal- och miniläge, oberoende
  fönsterflytt, samtidiga detaljer, sex beständiga personliga riktningar och
  nypzoom med styrplatta.

- [Inställningar och profil](settings-profile.md): helsida, mobilnavigation,
  återgång med fokus, synligt tangentbordsfokus i båda riktningar, läsbara
  teman och typdefinitioner i kartans samlade utkast.

- [Fria paneler](workspace-panels.md): flera objekt och samtal, fri placering
  över legenden inom skärmens kanter, skydd för synliga samtalsytor och
  växling mellan hela vyer vid platsbrist,
  mobilnavigering genom Lista med synligt återgångsfokus, kompletta
  objektförslag, bevarade läsuppgifter och samtal, skyddad väntande
  objektdialog samt bevarade samband och typer.
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
  automatisk återkomst, bevarad text med stoppad sändning och mikrofon,
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
