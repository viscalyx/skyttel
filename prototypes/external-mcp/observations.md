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

Beställarens val mellan Lo Lind och Lo Berg behövs för nästa omgång.
Det finns ännu inget mänskligt sparbesked eller omdöme om hela flödet.

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

- Förtydligande, ändringsförslag, rättelse och begriplig återgivning av
  hela utkastet, följt av människans sparbesked och separat sparanrop.
- Klientens faktiska återkoppling vid ändrat underlag, konflikt och
  saknat sparkvitto.
- Klientens hantering av ångring och administrativa önskemål.
- Beställarens bedömning och rekommendationen till teknikvalet.

Inloggning, återkallelse av åtkomst, fjärranslutning, andra enheter och
produktionslagring är inte verifierade. Textprovet omfattar inte tal
eller desktopklientens godkännandedialoger. Startarens instruktioner och
verktygsbeskrivningar är en del av den prövade konfigurationen.
