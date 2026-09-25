# Manuella testfall

Testfallen är grupperade efter område i applikationen. Varje områdesfil
beskriver användare, förberedelser, steg och förväntat resultat samt länkar
till motsvarande automatiserade integrationstester. Fall som uttryckligen
kräver verkliga externa konton anges som enbart manuella och körs inte i CI.

För specifikation #31 görs all manuell provning efter att implementationen
är klar. Följ fallen här och registrera resultaten i den separata
[restlistan #97](https://github.com/viscalyx/skyttel/issues/97).
Restlistan blockerar inga implementationsärenden; ett stängt ärende
betyder inte att dess manuella prov är genomfört.

## Områden

- [Återställning och flytt](household-recovery.md): tomma lokala installationer,
  uttrycklig verifierad ägarkoppling, bevarat undanträngt privat arbete,
  gamla sessioner och sparförsök, omstart och fortsatt export till en tredje
  installation utan gammal databas eller inloggningsbehörighet.

- [Typer, historik och rättelser genom MCP](assistant-advanced.md):
  egna typer och fält, daterade avtal, riktning och typbyte, skyddade
  definitioner, granskad sammanslagning med bilder samt ångring efter import.

- [Permanent radering](household-erasure.md): uttrycklig granskning och
  bekräftelse, bevarat oberoende innehåll efter omstart, förlorat svar och
  förnyad granskning efter samtidig ändring samt väntande städning och
  återhämtning efter omstart. Radering av en tidigare typ tar bort dess
  sista historiska bildversion utan att ta bort objektets nuvarande bild.

- [Fullständig återimport](household-import.md): uttrycklig ersättning,
  bevarad åtkomst, privata uppgifter, bildhistorik, äldre fältbetydelser,
  lokalt prov med tappat sparbesked, avvisade gamla sparbegäranden,
  ny förberedelse efter omstart och ångring med aktuellt underlag.

- [Fullständig export](household-export.md): privata uppgifter före
  export, nedladdning, avbrott, återkallad aktiv hämtning, giltighetstid samt
  bevarade identiteter, bildversioner, utkast och placeringar efter
  sammanslagning.

- [Sammanslagning](object-merge.md): uttrycklig identitet, val av uppgifter
  och samband, privata förslag, avbrott, omstart och ångring av hela sparandet.

- [Profilbilder](profile-images.md): privata bildförslag, formatfel,
  gränser, omstart, bildbyte, borttagning, ångring, kvitton och bildåtkomst.

- [Externa assistenter](assistants.md): OAuth, separat AI-val, avböjd
  anslutning, avgränsade läsningar, egna utkast, hushållsgränser och
  återkallad åtkomst, särskilt kartmedgivande, hela utkast, rättelser,
  konflikter och återfunna kvitton samt ett separat manuellt Codex CLI-prov
  med verklig Google-inloggning i devcontainern, utan CI-hemligheter.
  En kontrollerad lokal MCP-klient behåller gamla begäranden, tappar ett
  lyckat sparbesked och provar exakta återförsök efter serveromstart.

- [Inloggning och hushållets start](access.md): skapa hushåll, använda
  tangentbord, återhämta anslutningsfel, logga ut och länka inloggningssätt.
- [Tillgång och medlemskap](membership.md): inbjudningar, utgångna och
  ersatta koder, delad administration samt återkallad och återställd
  tillgång med bevarat innehåll i kartan.
- [Objekt och samband](map.md): skapa, söka, rätta och ta bort uppgifter,
  skilja lika namn åt och bevara ofullständiga uppgifter.
- [Rymdkarta](spatial-map.md): gemensam redigering och navigering,
  fokus, filter, etiketter, pekmenyer, upphörd status, ändringssymboler och bevarad
  oskickad text vid vybyte, orientering och grafikavbrott samt fungerande
  navigation när tillgången återkallas i helskärm.
- [Stora kartor](large-map.md): åtkomst till 500 objekt och 1 500 samband
  genom sidvisning, sökning och fokus, med bevarad text och placering.
- [Personliga placeringar](personal-view.md): flyttning med mus, pekgester
  och tangentbord, visningsval, samtidighetskonflikter, bevarad text,
  beständighet och avskildhet mellan användare samt inramning vid sen
  första inläsning med bevarad kamera vid senare uppdateringar.
- [Avtal och ekonomiska uppgifter](contracts.md): registrera, hitta och
  rätta hyra, skuld och kredit, separata roller kring bostad och fordon,
  validering, konflikter, historik och bevarade äldre utkast.
- [Privata utkast](drafts.md): återuppta utkast, hantera gamla kastförsök
  och konfliktval samt granska samtidiga ändringar, dubbletter och
  borttagningar före ett gemensamt sparande. Bevara oberoende status
  och slutdatum i samband vid konfliktval samt rätt typdefinitioner
  vid borttagning efter typbyten.
- [Objekttyper och egna fält](object-types.md): skapa och rätta gemensamma
  definitioner, fyra frivilliga värdeslag, privata förslag, samtidiga
  ändringar med bevarade oberoende uppgifter och samma atomiska kvitto
  som objektens innehåll. Typbyten granskar tidigare och nya värden,
  bevarar identitet och samband samt följer historikens ångring.
- [Sambandstyper och riktning](relationship-types.md): benämningar från
  båda objekten, redigerbara definitioner, privata förslag, dubbletter
  och samtidiga sparanden utan delsparande.
- [Borttagning av typer och fält](definition-removal.md): granskad
  katalogborttagning, användningsspärrar för upphört innehåll och privata
  utkast samt uttrycklig återställning av saknade definitioner med innehållet.
- [Sparförsök](operations.md): återfinna genomförda, väntande och avvisade
  försök efter omstart, återförsöka från en annan klient och kontrollera
  privat tillgång.
- [Historik och ångring](history.md): läsa hela ändringsgrupper, skapa
  privata ångringsförslag, bevara oberoende arbete, granska överlapp och
  återställa borttagna objekt och samband med samma identiteter samt
  granska äldre fält mot dagens definitioner före återställning.
- [Upphört och borttaget](lifecycle.md): markera och rätta status, följa
  kända slutdatum och granska, kasta eller spara vanlig borttagning med
  bevarade anslutna objekt och historikunderlag, även efter privata typbyten.
