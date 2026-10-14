# Återanvändning av cookieformulär och layout

## Fråga och källor

Underlag till
[Vilka delar av viscalyx.se:s cookieformulär och layout kan Skyttel återanvända?](https://github.com/viscalyx/skyttel/issues/410),
granskat 2026-10-14. Frågan gäller cookie- och lagringshantering före och
efter inloggning. Andra formulär och ett generellt formsystem ingår inte.

Primärkällor är koden i två låsta versioner:

- viscalyx.se: `72d6554acf3915cf8cc4dc80800dec9e9780c823`.
- Skyttel: `99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c`.

Alla kodlänkar nedan använder dessa versioner. Granskningen är läsning av
kod och testdefinitioner. Inga funktionstester, webbläsarflöden eller
kontroller med skärmläsare körs. Inga
kontrastmätningar körs för detta underlag. Resultaten är därför inte en
verifiering av tillgänglighet eller fungerande produktflöden.

## Strukturer och kontroller som kan återanvändas

Referensens cookieinställningar har en centrerad innehållsyta, rubrik med
ikon, introduktion, senaste ändring och separata spar-/felbesked. Därunder
finns snabbåtgärder, kategorikort och en avslutande sparknapp. Kortens
gemensamma struktur är ikon, namn, obligatorisk markering, toggle,
förklaring och utvecklingsbara detaljer. Detaljerna visar namn, ändamål,
varaktighet och leverantör. Strukturen kan överföras till Skyttels faktiska
lagringsregister utan att överföra referensens antal kategorier eller
registrerade nycklar.
[CookieSettings, rubrik och besked](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L196-L254),
[åtgärder, kort och sparknapp](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L256-L401).

Första valet presenteras som en dialog vid skärmens nederkant med mörk
bakgrund och tre tydliga vägar: avvisa, anpassa och acceptera. Anpassning
visar samma kategorier och detaljer i en yta med begränsad höjd och egen
rullning. Detta är konkret underlag till prototypen, inklusive behovet att
se åtgärder och detaljer på en liten skärm.
[CookieConsentBanner, enkel och detaljerad vy](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieConsentBanner.tsx#L216-L460).

Kategoriikon och toggle är redan delade mellan banner och inställningssida.
Toggle bygger på en riktig checkbox med etikett, beskrivningskoppling,
synligt fokus och minst 44 pixlars träffyta; nödvändig kategori är låst.
Kontraktet är cookiespecifikt. Kontrollens och beskrivningens id:n härleds
från kategorin, så samtidig rendering av båda formulären behöver unika
id:n. Kategorikortens övriga markup är dubblerad mellan formulären.
[CookieCategoryToggle](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieCategoryToggle.tsx#L5-L70),
[delade kontroller i banner](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieConsentBanner.tsx#L342-L389),
[delade kontroller på sidan](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L302-L345).

Återställning använder en separat bekräftelse med titel, förklaring,
knappar för att avbryta/bekräfta och farlig variant. Utseendet och texten kan
återanvändas utan att kopiera dialogens tekniska beteende.
[Återställningsdialogens användning](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L403-L415),
[ConfirmationModal-kontrakt](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/ConfirmationModal.tsx#L8-L40).

## Formulärflöden och skillnader

I bannern sparar acceptera och avvisa direkt. Anpassade kategorier ändras
i formuläret och sparas med en knapp. Bannern stängs efter sparanropet.
På inställningssidan ändrar däremot acceptera/avvisa bara formulärets
värden; sparknappen krävs även för dessa snabbval. Återställning sker
direkt efter bekräftelse. Exporten tar formulärets aktuella värden och
kan därför innehålla ännu osparade val. Dessa beteenden behöver beskrivas
tydligt eller väljas om i det senare flödesbeslutet.
[Banneråtgärder](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieConsentBanner.tsx#L175-L207),
[sidans ändring, sparning och återställning](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L48-L117),
[exportens källa](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L154-L166).

Skyttel har redan omedelbart sparade samtalspreferenser med besked per
kontroll. Det betyder inte att cookieformuläret måste spara så, men en
gemensam sidram innebär inte gemensam sparsemantik.
[ConversationSettings](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/ConversationSettings.tsx#L14-L62).

Skyttels FormLeaveProvider kan registrera skydd vid navigering. Den
befintliga FormLossGuard är specifik för hushållets kartformulär: den
kräver hushållsid och talar om förslag i utkastet. Cookieformulär med
osparade värden behöver ett eget beslut om lämna-/ångrabeteende och rätt
text, inte en direkt kopia av detta skydd.
[FormLeaveProvider](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/FormLeave.tsx#L4-L55),
[FormLossGuard](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/FormLossGuard.tsx#L6-L108).

## Sidram, profil och teknik

Referensens permanenta cookiesida är en fristående webbplatssida med
Header, innehåll, cookieformulär och Footer. Footer ger en återkommande
länk dit. Den saknar koppling till ett inloggat användarkonto.
[Cookiesidan](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/app/%5Blocale%5D/cookies/page.tsx#L47-L176),
[Footer-länk](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/Footer.tsx#L84-L91).

Skyttels SettingsScreen har sidhuvud, tema, återgång, grupperad navigation,
mobil meny och fokus på sidans h1 vid byte. Nuvarande kod visar ramen
endast för autentiserade användare. Befintlig footer döljs i kartan och
inställningarna. Enbart en ny footer-länk räcker därför inte för kravet
att inställningarna alltid ska gå att nå.
[SettingsScreen](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/SettingsScreen.tsx#L122-L233),
[åtkomstvillkor](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/App.tsx#L1304-L1321),
[rendering och dold footer](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/App.tsx#L1494-L1558).

Din profil går för hushållsanslutna användare till kartans profilpanel;
utan ett färdigt hushåll finns en separat kontosida. Båda använder samma
kontoinnehåll med namn, roll, inbjudan och länkar för inloggningssätt och
assistentanslutningar. Det är konkreta ingångar för en cookielänk.
En sådan länk innebär inte att cookieval lagras på kontot eller följer
användaren mellan webbläsare. Profilbilder på kartobjekt är en annan sak.
[Profilväg och gemensamt kontoinnehåll](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/App.tsx#L1342-L1391),
[kartans profilpanel](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/WorkspaceTools.tsx#L389-L423),
[kartobjektets profilbild](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/ProfileImage.tsx#L6-L51).

Referensen använder Next.js, next-intl, Tailwind, Framer Motion och Lucide.
Skyttel använder React, React Router, Vite och egen CSS. Direkt kopiering
kräver därför nya beroenden eller ersättning av översättningar, ikoner,
animationer och utility-klasser. Nexts metadata, locale-route och dynamiska
import med `ssr: false` är ramverkskopplingar, inte delar av cookievalets
domän. Skyttels CSS-variabler för ljus/mörk yta och befintliga tema är
anpassningspunkter för samma layout och kontrollutseende.
[Referensens beroenden](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/package.json),
[Next-wrapper](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettingsWrapper.tsx#L1-L25),
[Skyttels beroenden](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/package.json),
[temavariabler och sidram](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/settings.css#L1-L139).

Referenskoden har MIT-licens. Vid faktisk kodkopiering behöver licensens
copyright- och tillståndstext följa med enligt dess villkor.
[LICENSE](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/LICENSE).

## Bekräftade fel och risker att inte föra över

- Sparfunktionen fångar lagringsfel och returnerar utan felstatus. Sidans
  try/catch får då inget fel och visar sparat; bannern stängs också ändå.
  Anpassningen måste kunna visa korrekt utfall från faktisk lagring.
  [Sparfunktion](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/cookie-consent.ts#L170-L197),
  [sidans framgångsbesked](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L60-L76).
- Läsning kontrollerar version men inte innehållets struktur eller
  tidsstämpelns giltighet. Spegelcookien har ett års livslängd medan
  localStorage-valet inte löper ut i läsningen.
  [Läsning och sparning](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/cookie-consent.ts#L147-L185).
- Rensning och återställning tar berörda cookies men inte temanyckeln i
  localStorage. Initialt temaskript läser dessutom `theme` utan kontroll
  av kategorival, medan ThemeProvider kontrollerar preferensmedgivande.
  Skyttel har sin egen `skyttel-theme` och behöver egna bestämda regler.
  [Rensning/återställning](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/cookie-consent.ts#L222-L279),
  [initialt temaskript](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/app/layout.tsx#L17-L40),
  [ThemeProvider](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/theme-context.tsx#L48-L71),
  [Skyttels tema](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/WorkspaceTheme.tsx#L13-L39).
- Analysens lyssnare för andra flikar kontrollerar `cookie-consent`, men
  samtyckets lagringsnyckel är `viscalyx.org-cookie-consent`. Bannern och
  settings laddar val vid montering; de har ingen generell synkronisering
  av ändrade val från andra flikar. Återställning har en lokal eventväg.
  [Analyslyssnare](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/analytics.ts#L69-L94),
  [lagringsnyckel](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/lib/cookie-consent.ts#L91-L92),
  [bannerinitiering och återställning](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieConsentBanner.tsx#L29-L50),
  [settingsinitiering](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieSettings.tsx#L38-L46).

## Tillgänglighet och testernas bevisgräns

Bannern har dialognamn, beskrivning, fokusåtergång och egen Tab-hantering.
Escape flyttar fokus till avvisa; det avvisar inte automatiskt. Detta
är definierat beteende att diskutera, inte ett färdigt tillgänglighetsbevis.
Bekräftelsedialogen hanterar Escape och fokusåtergång, men dess komponent
gör inte bakgrunden inert och har ingen Tab-fälla. `aria-modal` och mörk
bakgrund skapar inte dessa beteenden i sig. Skyttels native dialoger och
befintliga Tab-hjälpfunktion ger en lokal jämförelse inför anpassningen.
[Bannerfokus](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/CookieConsentBanner.tsx#L81-L173),
[ConfirmationModal](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/ConfirmationModal.tsx#L42-L200),
[Skyttels dialoghjälp](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/src/client/modal-focus.ts#L13-L41).

Referensens integrationstest definierar första visning, acceptera/avvisa,
kategorival, omladdning och begränsad tangentbords-/fokuskontroll. Sidans
enhetstest simulerar sparfel genom en funktion som kastar ett fel. Det
provar inte produktens uppfångade localStorage-fel. Testerna ger användbart
scenariounderlag, men underlaget påstår inte att de passerar i denna version.
[Integrationstest](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/tests/integration/cookie-consent.spec.ts#L29-L250),
[mockad lagring](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/__tests__/CookieSettings.test.tsx#L7-L28),
[mockat sparfel](https://github.com/viscalyx/viscalyx.se/blob/72d6554acf3915cf8cc4dc80800dec9e9780c823/components/__tests__/CookieSettings.test.tsx#L176-L195).

Kvar att verifiera i prototyp och implementation: båda teman, liten skärm,
förstoring och omflöde, kontrast, tangentbord genom hela dialogen,
skärmläsarnamn/besked, fokus vid återställning och sidbyte, samtidiga
dialoger samt lagringsfel och ändringar mellan flikar. Kategorikontroller
får inte dela id:n när två vyer är monterade. Skyttels dokumenterade mål
är WCAG 2.2 AA för hela flöden, även inloggning.
[Tillgänglighetsinstruktion](https://github.com/viscalyx/skyttel/blob/99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c/.github/instructions/accessibility.instructions.md).

## Alternativ och beslut som underlaget möjliggör

Följande är alternativ för senare prototypbeslut, inte vald design:

1. En fristående permanent cookiesida med referensens innehållslayout,
   samma sida före/efter inloggning och ytterligare ingång från profilen.
2. Referensens cookieformulär i Skyttels inställningsram efter inloggning,
   med en publik motsvarighet före inloggning och delat formulärinnehåll.
3. En gemensam cookieinställningsram som kan visas utan konto och som
   anpassar navigationsingångar när användaren är inloggad.

Alla behöver bevara en åtkomlig ingång i karta, kontosida och anonymt
flöde. Alternativen följer av skillnaden mellan referensens publika sida
och Skyttels autentiserade ram, beskriven med källor ovan.

Beslut som fortfarande krävs: sidans placering och ingångar, bannerdialogens
samspel med inloggning, sparning av snabbval, hantering av osparade ändringar,
vilka lagringsuppgifter som visas och vad återställning betyder. Koppling
från profilen ska hållas skild från frågan om valets ägare och eventuell
synkronisering. Detta underlag väljer varken kategorier, lagringsmodell,
giltighetstid eller juridisk klassificering.
