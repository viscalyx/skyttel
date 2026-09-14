# Rekommendation inför teknikvalet

Status: provet och rekommendationen godkända av beställaren 2026-09-14
med svaret ”Ja, det fungerar.”
Underlag för
[Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?](https://github.com/viscalyx/skyttel/issues/15).

## Slutsats

Det gemensamma MCP-flödet är genomförbart i den prövade externa
textklienten: Codex CLI 0.153.0 på macOS 26.6.2, arm64, med lokal stdio.
Fortsätt teknikvalet med detta flöde som underlag. Provet väljer inte
produktionsklient, drift, autentisering, lagring eller transport.

Sparandet följer
[beställarens förtydligande om hela utkastet](https://github.com/viscalyx/skyttel/issues/15#issuecomment-5666680822).
Det är ett uttryckligt sparbesked för alla hittills gjorda ändringar,
även med en entydig rättelse i samma besked. Klienten kontrollerar
förslaget internt och bekräftar kvittots faktiska ändringar.

De faktiskt observerade utfallen finns i
[observations.md](observations.md). De omfattar befintligt utkast,
förtydligande av person, rättelse, separat samlat sparande, ångring,
inaktuell granskning, konfliktval med sparande och återhämtning efter
ett simulerat kvittobortfall. Återhämtningen kräver provledarens
återanslutning. Administrativa åtgärder hänvisas till Skyttels eget
gränssnitt, som inte finns i prototypen.

## Krav att bära in i teknikvalet

- En gemensam tillämpning av reglerna för den egna och externa assistenter.
- Verktyg som återger hela det aktuella egna utkastets ändringar,
  version, konflikter och hinder, med tydlig skillnad mot sparad karta.
- Ett separat atomiskt sparanrop med kontroller av användare, hushåll,
  förslagsversion och underlag. Olösta konflikter får inte leda till
  att bara en del av utkastet sparas tyst.
- Kvitton som anger den faktiskt sparade ändringsgruppen och dess
  innehåll, samt en stabil begärandeidentitet för säkra återförsök och
  kontroll när svaret saknas.
- Ångring som nytt förslag och uttrycklig hantering av senare ändringar.
- Tillräckliga instruktioner i varje extern klient och verktygssvar för
  hela utkastet, sparbeskedets omfattning och korrekt återkoppling.
- En verifierad väg från den valda externa klienten till Skyttels eget
  gränssnitt för administratörens åtgärder, med en faktisk betrodd adress.

## Vad teknikvalet fortfarande måste precisera

- Produktionsidentitet, åtkomst, återkallelse och isolering mellan hushåll.
- Fjärranslutning och fungerande återanslutning i den valda externa
  klienten; lokal stdio på Mac bevisar inte webb- eller mobilstöd.
- Lagring, hållbarhet för utkast och kvitton samt samtidighetskontrollens
  detaljnivå. Scratchfilen väljer ingen produktionsdatabas eller garanti.
- Hur den egna assistenten använder samma MCP-ingång och hur relevanta
  klienter får och följer den beslutade sparregeln.
- Verkligt tal genom det befintliga talprovet. Dessa provmeddelanden
  passerar som text och verifierar ingen talmodell.

Intern modellkontroll ersätter inte serverns validering och bevisar
inte oberoende vad människan godkänner. Det här är ett underlag för
grundspecifikationen, inte en produktionsimplementation.
