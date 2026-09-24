# Manuella testfall

Testfallen är grupperade efter område i applikationen. Varje områdesfil
beskriver användare, förberedelser, steg och förväntat resultat samt länkar
till motsvarande automatiserade integrationstester.

## Områden

- [Externa assistenter](assistants.md): OAuth, separat AI-val, avböjd
  anslutning, avgränsade läsningar, egna utkast, hushållsgränser och
  återkallad åtkomst.

- [Inloggning och hushållets start](access.md): skapa hushåll, använda
  tangentbord, återhämta anslutningsfel, logga ut och länka inloggningssätt.
- [Tillgång och medlemskap](membership.md): inbjudningar, utgångna och
  ersatta koder, delad administration samt återkallad och återställd
  tillgång med bevarat innehåll i kartan.
- [Objekt och samband](map.md): skapa, söka, rätta och ta bort uppgifter,
  skilja lika namn åt och bevara ofullständiga uppgifter.
- [Rymdkarta](spatial-map.md): gemensam redigering och navigering,
  fokus, filter, etiketter, pekmenyer, ändringssymboler och bevarad
  oskickad text vid vybyte, orientering och grafikavbrott samt fungerande
  navigation när tillgången återkallas i helskärm.
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
  som objektens innehåll.
- [Sambandstyper och riktning](relationship-types.md): benämningar från
  båda objekten, redigerbara definitioner, privata förslag, dubbletter
  och samtidiga sparanden utan delsparande.
- [Sparförsök](operations.md): återfinna genomförda, väntande och avvisade
  försök efter omstart, återförsöka från en annan klient och kontrollera
  privat tillgång.
- [Historik och ångring](history.md): läsa hela ändringsgrupper, skapa
  privata ångringsförslag, bevara oberoende arbete, granska överlapp och
  återställa borttagna objekt och samband med samma identiteter.
- [Upphört och borttaget](lifecycle.md): markera och rätta status, följa
  kända slutdatum och granska, kasta eller spara vanlig borttagning med
  bevarade anslutna objekt och historikunderlag, även efter privata typbyten.
