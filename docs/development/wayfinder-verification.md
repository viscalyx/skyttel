# Verifiering mot Wayfinder

Dokumentet hjälper utvecklare och granskare att spåra implementationen av
[specifikation #31](https://github.com/viscalyx/skyttel/issues/31) till
[beslutskartan #2](https://github.com/viscalyx/skyttel/issues/2).
Varje ärende granskas i ett eget bakgrundsjobb med ny kontext: hela
diskussionen, godkänt underlag, faktisk kod och relevanta testassertioner.
Ett stängt ärende eller ett grönt test är inte ensamt bevis för rätt beteende.

## Prototypernas olika ansvar

[#16:s slutliga prototyp](https://github.com/viscalyx/skyttel/issues/16#issuecomment-5678916527)
styr kartans utseende, pekgester, menyer och redigering. Källan är commit
`38cf6abbc5de0828e6ec4ab15fbe97d7b2a74c6d`, med den rumsliga vyn från
ärende #8. Stjärnhimlen följer rotation och zoom, inte panorering eller flytt av
objekt. Den kan slås av och på; systemets minskade rörelse stänger av den.

[#14:s slutliga godkännande](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674)
styr tal, dialog, modellarbete, MCP, ändringsöversikt och verifierade
resultat. Den prototypens enklare karta ersätter inte #16:s rumsliga vy.
Experimentella modellväljare, provbudgetar och exakta kamerakonstanter
ingår inte i produktkraven enligt #31.

Den publicerade talgrenen slutar på den äldre MCP-basen `90cf757`.
Den slutliga talprototypens återfunna källor finns därför bevarade separat
i den lokala grenen `recovery/final-swedish-voice`, commit `976f31b`.
`prototypes/swedish-voice/RECOVERY.md` på den grenen beskriver ursprung,
kontrollsummor och begränsningar. Hela UI-patchföljden kan återställas;
serverkoden påstås inte vara en exakt kopia av de saknade slutliga filerna.
Råa sessionsloggar, hemligheter och kördata ingår inte i grenen.

## Spårning per ärende

<!-- markdownlint-disable MD013 -->
| Ärende | Utfall | Spårbart underlag och kontroll |
| --- | --- | --- |
| [#3](https://github.com/viscalyx/skyttel/issues/3#issuecomment-5654166004) | Implementerat | Begrepp, familjeabonnemang och avtalsexempel. [Ordlista](../../CONTEXT.md), [familjeprov](../../tests/integration/family.spec.ts). |
| [#4](https://github.com/viscalyx/skyttel/issues/4#issuecomment-5653964246) | Underlag och valt spår | Talalternativen är utredda; #14/#31 väljer Live och Terra via MCP. [Fast underlag](https://github.com/viscalyx/skyttel/blob/ff1b9f632264cfce74013a36b7f903447e4d06fa/docs/research/voice-input.md). |
| [#5](https://github.com/viscalyx/skyttel/issues/5#issuecomment-5653964755) | Underlag och valt spår | Extern klient skiljs från modell-API; OAuth och gemensam MCP-ingång används. [Fast underlag](https://github.com/viscalyx/skyttel/blob/80104303e5163ac72c7e4cd04c2e28b8c0cb64cb/docs/research/external-assistants.md). |
| [#6](https://github.com/viscalyx/skyttel/issues/6#issuecomment-5654275475) | Implementerat | Lika vardagsåtkomst, separat administration och återkallelse. [Åtkomstprov](../../tests/integration/access.spec.ts). |
| [#7](https://github.com/viscalyx/skyttel/issues/7#issuecomment-5654691943) | Implementerat med rättelser | Privat utkast, rättelser, hela sparandet och synliga resultat. [Textflöden](../../tests/integration/text-assistant.spec.ts). |
| [#8](https://github.com/viscalyx/skyttel/issues/8#issuecomment-5655478727) | Implementerat med rättelser | Rumslig vy, stjärnor, fokus och höjdhjälp. [Grafikprov](../../tests/browser/spatial.test.tsx). |
| [#9](https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457) | Implementerat med rättelser | Historik, återställning och kvitton efter återimport. [Ägar- och kvittoprov](../../tests/unit/server/assistant-ownership.test.ts). |
| [#10](https://github.com/viscalyx/skyttel/issues/10#issuecomment-5662601732) | Implementerat med rättelser | Gemensamma MCP-regler och aktuellt uttryckligt sparbesked. [Assistentprov](../../tests/unit/server/text-assistant.test.ts). |
| [#11](https://github.com/viscalyx/skyttel/issues/11#issuecomment-5663538779) | Implementerat; enhetsprov separat | Responsiv webb, alternativa inmatningar och bevarat arbete. [Layoutprov](../../tests/browser/household-layout.test.tsx). |
| [#12](https://github.com/viscalyx/skyttel/issues/12#issuecomment-5691771132) | Implementerat med rättelser | Render, SQLite och portabel lagring; beständig utvecklingsmiljö. [Miljöguide](devcontainer-persistence.md). |
| [#13](https://github.com/viscalyx/skyttel/issues/13#issuecomment-5697070021) | Implementerat | De 13 scenarierna och åtta typfallen spåras till tester; [stor karta](large-map-results.md) klarar gränserna. |
| [#14](https://github.com/viscalyx/skyttel/issues/14#issuecomment-5688291674) | Implementerat med rättelser | Dialog, paus, arbetstid, samlat slutförande och verifierade besked. [Röstprov](../../tests/integration/voice-assistant.spec.ts). |
| [#15](https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819) | Implementerat | Verklig MCP-väg, gemensamma utkast och exakta kvitton. [MCP-prov](../../tests/integration/assistant-work.spec.ts). |
| [#16](https://github.com/viscalyx/skyttel/issues/16#issuecomment-5678916527) | Implementerat med rättelser | Pekgester, separat redigering, hel karta och rörelseval. [Rumsliga flöden](../../tests/integration/spatial.spec.ts). |
| [#17](https://github.com/viscalyx/skyttel/issues/17#issuecomment-5679042669) | Avslutat avgränsat prov | Den historiska API-åtkomsten och provramen är dokumenterade. Ingen ny betald körning krävs. |
| [#18](https://github.com/viscalyx/skyttel/issues/18#issuecomment-5688577251) | Underlag och uttryckligt urval | Driftalternativen är utredda; #12/#31 väljer Render och SQLite utan extra automatisk backup. [Fast underlag](https://github.com/viscalyx/skyttel/blob/96c641dbf5d9f34944f8f285212bb44c7b959c9b/docs/research/hosting-storage.md). |
| [#19](https://github.com/viscalyx/skyttel/issues/19#issuecomment-5688577722) | Underlag och valt spår | Modeller, villkor, kostnader och klientgränser är spårade. Mänskliga bekräftelser ligger i #97. [Fast underlag](https://github.com/viscalyx/skyttel/blob/64fddd101e4e1ca3437e183f056a113d773c959c/docs/research/ai-mcp-production.md). |
| [#20](https://github.com/viscalyx/skyttel/issues/20#issuecomment-5688731768) | Underlag; alternativ bortvalt | Cloudflare är utrett. #12/#31 kräver inte parallell Cloudflare-drift. [Fast underlag](https://github.com/viscalyx/skyttel/blob/9964630664215caec5204c4d3999d1527f922d5b/docs/research/cloudflare.md). |
| [#21](https://github.com/viscalyx/skyttel/issues/21#issuecomment-5688766972) | Underlag; alternativ bortvalt | Gandi är utrett. Render är det uttryckligen valda driftspåret. [Fast underlag](https://github.com/viscalyx/skyttel/blob/04dd6291a582149cc9376b07fb6e50de03de0e39/docs/research/gandi.md). |
| [#22](https://github.com/viscalyx/skyttel/issues/22#issuecomment-5688787471) | Underlag; alternativ bortvalt | Azure är utrett. Render är det uttryckligen valda driftspåret. [Fast underlag](https://github.com/viscalyx/skyttel/blob/331c21fc8b05232cb6718cc873a724bdbe2d5bc9/docs/research/azure.md). |
| [#23](https://github.com/viscalyx/skyttel/issues/23#issuecomment-5691424692) | Implementerat med rättelser | Säkerhetsgrindar, uppdateringar och bevakning; felrapporter bevaras och undantag kräver åtgärdsplan. [Fast underlag](https://github.com/viscalyx/skyttel/blob/a590d9b6cdd06bdfc3e61c86f04df7dc3dd1babc/docs/research/security-maintenance.md). |
| [#24](https://github.com/viscalyx/skyttel/issues/24#issuecomment-5691593794) | Implementerat med rättelser | Codex-miljö och personliga inställningar. #33/#72 undantar automatiserade miljöprov och versionslåsta utvecklarverktyg. [Fast underlag](https://github.com/viscalyx/skyttel/blob/dc82219845092331dafe90b2dbc1b7ea968d96c4/docs/research/devcontainer-codex.md). |
| [#26](https://github.com/viscalyx/skyttel/issues/26#issuecomment-5696089834) | Implementerat | Alla åtta typfallen: fältlivscykel, riktning, privata konflikter, borttagning, historik och MCP. [Typfall](../manual-tests/object-types.md), [MCP-fall](../../tests/integration/assistant-advanced.spec.ts). |
| [#28](https://github.com/viscalyx/skyttel/issues/28#issuecomment-5697479965) | Underlag och uttryckligt urval | Samtliga 23 dåvarande kartärenden och 16 kandidater är bedömda; #29 väljer sju samt separat autentisering. [Fast underlag](https://github.com/viscalyx/skyttel/blob/226c5569c697ea4621f6b2e7a9def22a6500b698/docs/research/adr-candidates.md). |
| [#29](https://github.com/viscalyx/skyttel/issues/29#issuecomment-5697731641) | Godkända dokument överensstämmer | Alla åtta ADR:er motsvarar godkänd revision `577b02d6`. [Beslutsöversikten](../planning/README.md#arkitekturbeslut) länkar dem och deras källor. |
| [#30](https://github.com/viscalyx/skyttel/issues/30#issuecomment-5697500300) | Underlag och korrekt avgränsning | Inventeringens 23 poster, källor och regelhashar stämmer; inga tillfälliga gränser blir permanenta avslag i `.out-of-scope/`. [Fast underlag](https://github.com/viscalyx/skyttel/blob/1d6892150c8da2286a596f428f70baf5a2e1d56d/docs/research/scope-boundaries.md). |
<!-- markdownlint-enable MD013 -->

## Rättelser som granskningen kräver

- #8 och #16: rumslig presentation, separata namn, bildsymboler,
  stjärnhimmel, fokus, höjdhjälp, mus- och pekgester, hel kartvy och
  uttrycklig redigering. Att markera visar uppgifter; en separat knapp
  öppnar formuläret. Borttagning visar följden för anslutna samband.
- #14: samlad dialog, mikrofonpaus, arbetstid, fullständig ändringslista,
  naturliga uttryckliga sparbesked och samlat slutförande av modellarbete.
  Sparbesked kommer från kvittot. Markeringsbesked kräver att rätt objekt
  eller samband faktiskt syns i kartan och detaljpanelen, även på telefon
  och i lägre datorfönster. Begärda detaljer beskriver verkliga tidigare
  och nya värden för status, identitet, bilder och egna typdefinitioner.
  Sambandets tidigare betydelse kommer från det historiska underlaget.
- #9 och #10: sparande efter återimport verifierar den uttryckligt kopplade
  innehållsägaren. En nekad sakuppgift i samma mening som ett uttryckligt
  sparbesked får inte felaktigt blockera hela sparandet. En faktuell
  beskrivning som **Information om bilen** skiljs från villkor för att spara.
- #12: normal ombyggnad av devcontainern bevarar utvecklingsdata och
  personliga Codex-inställningar. Första inloggningen kräver inte en
  befintlig autentiseringsfil på värddatorn.
- #24: personlig konfiguration bevaras även vid sammanslagning under
  ombyggnad. Skyttels godkännande-, plugin- och skillregler hör till
  projektkonfigurationen; användarens lagrade val skrivs inte över.
- #23: rapporter från en underkänd releasekandidat bevaras separat från
  verifierade kandidater. Sårbarhetsundantag kräver en uttrycklig
  åtgärdsplan; ingen ny riskacceptans eller något undantag tillkommer.

## Verifiering och kvarvarande mänskliga prov

Revision `1be47e5` klarar `npm run check`: typkontroll, Biome,
Markdown och stavning, 96 release- och säkerhetsprov, produktionsbygge,
922 enhets- och webbläsartester samt 182 integrationstester.
Täckningen är 93,85 procent satser, 90,52 procent grenar, 93,76 procent
funktioner och 96,12 procent rader. Gränsvärdena är oförändrade.
Produktionscontainerns nio kontrollgrupper går igenom för samma
revision, inklusive
beständighet vid byte av container, MCP, text, röst och återimport.
De proven använder kontrollerade leverantörer och gör inga modellköp.
Slutgranskningens två axlar, kodstandard och specifikation, redovisas
separat i #31 mot den fasta utgångspunkten
`79f4d4f9bb4937277dba010de0dd59a0ee18e97f`.

[Mätningen av en stor karta](large-map-results.md#prototype-aligned-implementation)
anger exakt commit, miljö och sex observationer med 500 objekt och
1 500 samband. Alla observationer klarar de ursprungliga gränserna och
har noll överlappande namn i översiktsläget. Det är ett lokalt resultat
med påhittade uppgifter, inte ett kapacitetslöfte för drift eller enheter.

Automatiserade appfall behöver inte upprepas manuellt. Separata kommandon
för [modellprov](real-model-tests.md), [talprov](real-voice-tests.md),
[devcontainerbeständighet](devcontainer-persistence.md#automatiskt-prov-av-omstart-och-ombyggnad)
och [driftverifiering](../operations/security-monitoring.md#automated-live-verification)
ger eget körunderlag. Personlig inloggning och medgivanden, mänsklig
bedömning av ljud och användning samt bekräftelse från larmmottagaren
återstår i den icke blockerande
[restlistan #97](https://github.com/viscalyx/skyttel/issues/97).
Automatiska ersättare och skärmbilder räknas inte som mänskliga observationer.
