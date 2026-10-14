# Underlag för Skyttels cookie- och lagringsval

Kontrollerat: 2026-10-14. Avser Sverige och EU. Läsare: de som fattar
besluten i cookiehanteringens beslutskarta. Underlaget beskriver rättsliga
utgångspunkter; klassificering av Skyttels faktiska lagring och verifiering
av produktens efterlevnad kräver separat underlag.

- Fråga: [Vilka krav gäller för Skyttels cookie- och lagringsval i Sverige och EU?](https://github.com/viscalyx/skyttel/issues/411).
- Karta: [Skyttel – väg till cookie- och lagringshantering med återanvända formulär](https://github.com/viscalyx/skyttel/issues/27).
- Kodbasens utgångspunkt: `99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c`.
- Tillfällig gren: `research/cookie-requirements-411`; ingen PR eller
  produktionsimplementation ingår.

## Källornas status

**Lag** anger uttryckliga bestämmelser. **Myndighetstolkning** anger hur
myndigheter tillämpar reglerna; den är inte ytterligare lagtext.
**Rekommendation** är uttryckligen råd om ett lämpligt arbetssätt.
**Tillämpningsfråga** kräver fakta eller produktbeslut för Skyttel.

LEK:s 9 kap. 28 § är den svenska utgångspunkten för lagring och åtkomst i
användarens utrustning. GDPR tillkommer när personuppgifter behandlas;
LEK:s samtyckesbegrepp hänvisar till GDPR genom 1 kap. 8 §.
[LEK][lek], [PTS:s tillämpning, s. 3–4][pts-case].

EU:s Digital Omnibus, som föreslår ändringar av bland annat GDPR och
e-dataskyddsdirektivet, visas som pågående i lagstiftningsförfarandet
2025/0360/COD vid kontrollen. Förslagets cookieändringar behandlas därför
inte som gällande krav här. Kontrollera status igen inför implementation.
[EUR-Lex, förfarandets status][omnibus].

## Faktamatris för besluten

<!-- markdownlint-disable MD013 -->
| Fråga | Fast utgångspunkt och status | Kvar att avgöra för Skyttel |
| :--- | :--- | :--- |
| Vad omfattas? | **Lag:** lagring eller hämtning av uppgifter i användarens utrustning. **Myndighetstolkning:** även information som inte är personuppgifter och annan teknik än cookies omfattas. [LEK][lek], [EDPB 2/2023, punkterna 6–9, 35–40][scope] | Inventera cookies, `localStorage`, `sessionStorage`, IndexedDB, cache och lagring i minne efter faktisk användning och ändamål. Detta är en tillämpning av den tekniska omfattningen, inte en färdig klassificering. |
| När krävs samtycke? | **Lag:** information om ändamålet och samtycke före lagring/åtkomst, utom överföring av elektroniskt meddelande eller nödvändig lagring för en uttryckligen begärd tjänst. [LEK 9 kap. 28 §][lek] | Motivera varje undantag med funktionen användaren begär, inte verksamhetens önskan att samla data. |
| Är inloggning och inställningar alltid nödvändiga? | **Myndighetstolkning:** sessionsautentisering, viss säkerhet och kortvarigt ihågkomna uttryckliga gränssnittsval kan undantas under villkor. Beständig inloggning och längre ihågkomna val behandlas separat i vägledningen. [WP29 04/2012, avsnitt 3.2–3.3, 3.6][exemption] | Bedöm begäran, varaktighet och sekundära ändamål för varje funktion. Ett namn som ”inställning” avgör inte undantaget. |
| Vilka val är giltiga? | **Myndighetstolkning:** aktivt och ändamålsspecifikt samtycke; nej erbjuds samtidigt och i samma vy som ja, med liknande knapputformning. Förkryssning, fortsatt användning och tvång via orelaterade cookiekrav vid inloggning godtas inte. [PTS][pts] | Utgå från inventerade ändamål. Tre kategorier från referensen är inget krav. |
| Vad gäller utan val eller efter nej? | **Myndighetstolkning:** före aktivt samtycke får bara nödvändiga cookies lagras. Berättigat intresse ersätter inte samtycke för icke undantagen lagring/åtkomst. [PTS][pts], [EDPB:s rapport, punkt 24][banner] | Beskriv hur faktisk lagring och åtkomst blockeras; ett formulär räcker inte som bevis. |
| Vad ska informationen innehålla? | **Myndighetstolkning:** ändamål, använda cookies, tredjepart, lagringstid, insamlade uppgifter och rätt att återkalla, begripligt presenterade. [PTS][pts] | Register över verklig lagring, mottagare och tider samt information för varje val. GDPR:s informationskrav behöver också hanteras vid personuppgifter. [GDPR art. 13][gdpr] |
| Hur återkallas ett ja? | **Lag:** när som helst och lika lätt som det ges. **Myndighetstolkning:** information om återkallelse behöver finnas i samma vy där samtycke begärs; åtkomst, knapptryck och placering spelar roll. [GDPR art. 7.3][gdpr], [PTS:s underrättelse, s. 5–7][pts-case] | Permanent åtkomst före och efter inloggning. En länk från profilen kan komplettera detta men får inte göra inloggning till enda återkallelsevägen för besökare. |
| Krävs en viss ikon eller sida? | **Myndighetstolkning:** lättåtkomlig återkallelse krävs; en särskild svävande ikon föreskrivs inte. Synlig länk eller ikon är exempel som behöver bedömas i sitt flöde. [EDPB:s rapport, punkterna 31–35][banner] | Layouten och den permanenta inställningssidan är produktens val inom kravet på enkel åtkomst. |
| Finns en ettårsfrist? | **Myndighetstolkning:** GDPR har ingen bestämd giltighetstid för samtycke; betydande förändringar kan kräva nytt samtycke. **Rekommendation:** förnya vid lämpliga intervall. [EDPB 05/2020, punkterna 110–111][consent] | Separata tider för själva lagringen, ihågkommet val och bevis. Referensens ettårsvärde eller spegelcookie är inget allmänt lagkrav. |
| Vad händer efter återkallelse? | **Myndighetstolkning:** samtyckesbaserad behandling upphör; uppgifter raderas om fortsatt lagring saknar annan berättigande grund. Tidigare laglig behandling blir inte retroaktivt olaglig. [EDPB 05/2020, punkterna 117–120][consent] | Vilken lagring kan rensas, vilka åtkomster stoppas och hur hanteras tredje parter? Radering av cookies ersätter inte beslut om redan insamlade personuppgifter. |
<!-- markdownlint-enable MD013 -->

## Undantag avgörs av faktisk funktion

WP29:s vägledning bedömer nödvändighet från användarens perspektiv och
kräver att varje ändamål ryms i ett undantag om samma cookie används till
flera ändamål. Förstapart eller session är därför inte ett automatiskt
undantag; analyscookies undantas inte bara för att webbplatsägaren behöver
statistiken. Dokumentet är äldre myndighetsvägledning, inte ett nytt
svenskt undantag. [WP29 04/2012, avsnitt 4.3 och 5][exemption].

EDPB:s rapport nämner lagring av uttryckta tjänstepreferenser som
nödvändig. Det stödjer bedömning av en mekanism som minns cookieval, men
godkänner inte automatiskt referensens dubbla lagring, innehåll eller
livslängd. Varje kopias ändamål behöver förklaras.
[EDPB:s rapport, punkterna 26–30][banner].

EDPB 2/2023 skiljer lagring från åtkomst: lokal bearbetning där information
stannar på enheten är inte i sig extern åtkomst; när information eller
härledningar lämnar enheten kan åtkomstregeln träffa behandlingen.
Lagring som webbplatsen instruerar är en separat fråga. Kort livslängd
eller användning av RAM utesluter inte lagring från regelns omfattning.
[EDPB 2/2023, punkterna 35–39 och 44][scope].

## Profilkoppling och val mellan webbläsare

Att lägga en navigationslänk i Skyttel-användarens profil innebär i sig
inget beslut att spara cookieval på servern eller synkronisera dem.

Ett val kopplat till ett identifierbart användarkonto är en behandling av
personuppgifter. Då behövs bland annat definierat ändamål och rättslig
grund, uppgiftsminimering, lagringstid och information. En serverpost
ersätter inte bedömningen av lagring eller åtkomst på varje enhet.
[GDPR art. 4.1, 5, 6 och 13][gdpr], [LEK][lek].

**Tillämpningsfrågor, inte redan beslutade krav:**

- Avser valet denna webbläsare, detta konto eller flera enheter, och
  förstår användaren omfattningen innan valet görs?
- Hur kopplas ett besökarval till rätt inloggad användare på delad dator?
  Vad gäller vid kontobyte, utloggning eller raderad lokal lagring?
- Vad sker när ett lokalt nej möter ett äldre profilsparat ja? Hur får
  återkallelse genomslag på andra aktiva och senare anslutna enheter?
- Är ändamål, mottagare och information desamma när ett val återanvänds?
  Källorna ger inte ett allmänt godkännande av automatisk synkronisering.
- Vilket minsta underlag visar när och hur samtycke gavs och vilken
  information som visades? EDPB avråder från överdriven datainsamling
  enbart för att bevisa samtycke. [EDPB 05/2020, punkterna 106–108][consent].

**Forskningsslutsats:** ett konto kan bidra till att identifiera vem som
har gjort ett val, men inloggning är inte i sig ett aktivt samtycke till
andra ändamål. Specifika ändamål och separata samtycken behöver hållas
begripliga. [IMY:s vägledning om samtycke][imy].

Skyttels **samtalsmedgivande** är ett befintligt, separat produktbegrepp
enligt [ordlistan](../GLOSSARY.md#samtal-med-skyttel). Cookieval beslutar
inte om OpenAI-behandling, och samtalsmedgivande avgör inte cookieval.
Ändamålen får inte flyta ihop i ett generellt ”godkänn allt”. Detta följer
av kartans avgränsning och stöds av kravet på specifika, särskiljbara
samtycken. [IMY][imy], [GDPR art. 7.2][gdpr].

## Kvarstående underlag

Inventeringen måste visa varje lagrings ändamål, livslängd, läsare och
skrivare samt flödena före och efter inloggning. Därefter går det att
bedöma undantag och formulera faktiska val. Åtkomst till externa tjänster,
barn som målgrupp och gränsöverskridande personuppgiftsbehandling behöver
vid behov egen granskning; den här undersökningen avgör dem inte.

## Primärkällor och datum

- LEK (2022:482), aktuell konsoliderad text på Riksdagens webbplats;
  kontrollen visar ändringar till och med SFS 2026:1681. Utgångspunkten
  här är 1 kap. 8 § och 9 kap. 28 §.
- PTS, *Kakor (cookies)*, sidan anger uppdatering 2024-05-14.
- PTS, underrättelse till Konsumentverket, dokumentdatum 2023-06-26,
  dnr 22–11377. Filnamnets datum är inte dokumentets datum.
  En underrättelse om misstänkta brister är inte en dom.
- GDPR (EU) 2016/679, artiklar 4–7 och 13, svensk fulltext hos IMY.
- IMY, *Samtycke som rättslig grund*, aktuell webbsida vid kontrollen.
- EDPB 2/2023, version 2.0, antagen 2024-10-07,
  publicerad på EDPB:s webbplats 2024-10-16.
- EDPB 05/2020, version 1.1, antagen 2020-05-04;
  formateringskorrigering 2020-05-13.
- EDPB:s Cookie Banner Taskforce, rapport antagen 2023-01-17,
  publicerad 2023-01-18. Rapporten anger själv att den inte ger ett
  godkännande av en viss webbplats.
- WP29 04/2012, antagen 2012-06-07, vägledning som EDPB:s rapport
  fortfarande hänvisar till för nödvändighetsundantag.
- EUR-Lex, Digital Omnibus 2025/0360/COD, pågående förfarande vid
  kontrollen 2026-10-14.

[lek]: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2022482-om-elektronisk-kommunikation_sfs-2022-482/
[pts]: https://www.pts.se/internet-och-telefoni/kakor-cookies/
[pts-case]: https://pts.se/contentassets/7b02c828f0984bfba1d1614dc666ab1a/underrattelse-konsumentverket-kaktillsyn_250304.pdf
[gdpr]: https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/introduktion-till-gdpr/dataskyddsforordningen-i-fulltext/
[imy]: https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/samtycke/
[scope]: https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
[consent]: https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf
[banner]: https://www.edpb.europa.eu/system/files/documents/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf
[exemption]: https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf
[omnibus]: https://eur-lex.europa.eu/procedure/EN/2025_360?qid=1765493894573&rid=4
