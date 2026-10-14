# Skyttels cookieflöden: kastbar prototyp

Prototypen ger underlag till
[Hur utformas Skyttels cookieflöden med viscalyx.se:s layout och formulär?](https://github.com/viscalyx/skyttel/issues/413).
Den är till för att välja sidram, profilingång och formulärbeteende.
Användaren bedömer cookieformulärets utseende i D som fungerande och
begär att få prova det med appens riktiga profilverktyg och navigation.
Användaren godkänner därefter D i den faktiska applikationen.
Sidans svenska benämning är **Kakor och lagring**, i linje med
viscalyx.se:s svenska texter som använder kakor och Kakinställningar.

## Öppna prototypen

Kör från denna gren med projektets installerade beroenden:

```sh
npm run dev:cookie-prototype
```

Öppna <http://localhost:5416/>. Det är den faktiska applikationen med
ett isolerat testhushåll. Tryck på verktygsfältets befintliga profilikon,
välj **Kakor och lagring** i **Din profil** och prova D.
**Tillbaka till kartan** återgår till det riktiga kartverktyget.
På mobil kan verktygsfältet behöva fällas ut först.

D kan också öppnas direkt på
<http://localhost:5416/cookies?variant=D>. Konto, hushåll, profilpanel,
inställningsram, temakontroll och navigationsskydd är appens befintliga
komponenter. Den publika sidan kan visas utan inloggning när grenen körs
mot en vanlig utvecklingsserver.

Startkommandot använder appens riktiga serverkod med tillfällig databas,
påhittat demoinnehåll och en syntetisk inloggningsleverantör. Testsessionen
läggs på den lokala proxyn. Inga egna konton, AI-nycklar eller externa
modellanrop används. Databasen tas bort när processen avslutas.

Cookieval, giltighetstid, sparande och återställning är simulerade i
minnet. De påstår inte att visa testsessionens verkliga cookieval och
ändrar inte autentiseringscookien. Appens övriga funktioner använder
den isolerade servern och kan ändra testhushållet på vanligt sätt.
Prototypen är tillgänglig endast i utvecklingsläge.

## Jämför fyra alternativ

- **A, fristående sida:** ett centrerat formulär före och efter
  inloggning. Detaljregistret ligger i den nödvändiga lagringens kort.
  [Dator](A-1280.png) och [mobil](A-390.png).
- **B, Skyttels inställningsram:** samma cookieformulär, med Skyttels
  kontonavigation efter inloggning och en publik sida före inloggning.
  Mobilnavigationen kan fällas ut.
  [Dator](B-1280.png), [mobil](B-390.png) och [mörkt tema](B-dark-390.png).
- **C, gemensam sidram:** samma övre navigation före och efter
  inloggning, med separata avsnitt för val och lagringsregister.
  Webbläsarens omfattning får en egen sidokolumn på datorn.
  [Dator](C-1280.png) och [mobil](C-390.png).
- **D, viscalyx.se:s cookieformulär i appen:** blå rubrikikon,
  snabbåtgärder på grå yta, kategorikort med reglage till höger,
  utvecklingsbara detaljlistor, gröna sparbesked och sparknapp längst ned.
  Övriga delar använder appens faktiska sidram från B.
  [Profilverktyg på dator](D-app-profile-1280.png),
  [profilverktyg på mobil](D-app-profile-390.png),
  [cookiesidan på dator](D-app-1280.png),
  [cookiesidan på mobil](D-app-390.png) och
  [sparande på mobil](D-app-save-390.png).

På D kan **Jämför A–C** öppna de fristående alternativen i en ny flik.
Deras konton, inloggning, tema och flöden simuleras helt i minnet;
de gör inga API-anrop. Pilarna byter variant och uppdaterar adressen.
Vänster- och högerpil fungerar också utanför kontroller och dialoger.

A–C använder Skyttels befintliga tema och CSS. B visar
inställningsramens befintliga struktur; innehållet och kontodata
är simulerade. Den befintliga temahooken används inte, eftersom
den skriver till lokal lagring. Temakontrollen får minnestillstånd.
Viscalyx.se är förebild för kategorikort, utvecklingsbara detaljer,
sparbesked och återställningsdialog.
D anpassar referensens konkreta struktur, färger, avstånd och kontroller
till React och vanlig CSS. Skyttels lagringsposter och beslutade val
ersätter referensens kategorier. Ingen analyskategori, exportfunktion
eller aktivering av ihågkommen inloggning i en redan skapad session
införs för att fylla ut snabbåtgärderna. Referensens MIT-text finns i
`REFERENCE-LICENSE`.

De fristående [detaljbilderna](D-details-1280.png) och
[återställningsbilden](D-reset-1280.png) visar också formulärutseendet.

## Prova flödena

På D öppnar **Simulerade lagringsval** sparfel, osäker import och
omstart av cookieexemplet. Sparande och återställning påverkar bara
exemplet. Osparade ändringar skyddas av appens `FormLeaveProvider`,
även vid byte via riktiga länkar och **Tillbaka till kartan**.

På A–C: öppna **Scenarier och simulerat tillstånd** i prototypbaren.
Välj scenario och stäng sedan verktygen för att bedöma produktvyn.

1. **Första besöket:** information visas utan acceptera-/avvisaknappar.
   Stängning ger inget samtycke. Cookiesidan kan nås från sidhuvud,
   sidfot och informationsrutan. **Kom ihåg mig** är avmarkerat.
   [Mobilbild](first-visit-390.png).
2. **Inloggad, Kom ihåg mig:** stäng av reglaget. Valet är osparat
   tills **Spara ändring** väljs. **Ångra ändring** återtar ändringen.
   Ett sidbyte med osparade värden frågar om du vill stanna eller lämna.
3. **Sparfel:** välj **Simulera nästa sparfel**. Misslyckat sparande
   lämnar det tidigare valet aktivt och ger felbesked. Stäng av
   simuleringen för att prova ett lyckat sparande.
4. **Återställning:** bekräftelsen beskriver webbläsarens omfattning
   och bevarade uppgifter. Återställning stänger av ihågkommen
   inloggning utan utloggning. Samma felsimulering gäller dialogen.
5. **Import med osäkert utfall:** återhämtningsuppgifterna bevaras
   vid återställning. Andra enheter, kontots tema, hushållets information
   och samtalsmedgivande påverkas inte.
6. **Vanlig session:** ingen ihågkommen inloggning finns att återställa.
   Aktivering kan göras först vid nästa inloggning.
7. **Blockerad lagring vid inloggning:** försök med någon av
   inloggningsknapparna. Felbeskedet beskriver den hindrade funktionen.
8. **Profil:** välj meny eller dialog och initialer eller personsymbol.
   Öppna kartan, tryck på profilknappen och prova både den direkta
   cookielänken och vägen via **Din profil**.
   [Profilmeny](profile-menu.png) och [profildialog](profile-dialog.png).
9. **Tema:** före inloggning följer vyn det simulerade systemtemat.
   Efter inloggning styr kontots simulerade temaval. Utloggning återgår
   till systemtemat och lämnar nästa **Kom ihåg mig** avmarkerat.

## Flöden att bedöma

- D kombinerar referensens cookieutseende med appens faktiska
  inställningsnavigation och den befintliga profilpanelen.
- Appens nuvarande profilikon öppnar **Din profil**. En länk under
  **Ditt konto** går direkt till cookiesidan. Initialer och en separat
  profilmeny är tidigare jämförelsealternativ och ingår inte i D:s
  faktiska verktygsfält.
- Ett uttryckligt sparande, möjlighet att ångra och skydd vid sidbyte
  gör skillnaden mellan redigerat och sparat val synlig.
- Första informationen är en ruta över innehållet utan modal fokusfälla.
  Den täcker inga inloggningskontroller och kan
  stängas och samma innehåll finns på den permanenta sidan.
  Stängningen finns bara i minnet; den skapar ingen ny lagringsnyckel.

D är det valda underlaget för cookieformulärets utseende och vägen
från appens befintliga profilverktyg. Produktionsimplementationen
behöver serverunderlaget och den avslutande specifikationsgranskningen.

## Kontroller och begränsningar

Körda kontroller 2026-10-14:

- `npm run typecheck`, riktad Biome-kontroll via `npm run test:env`
  och `npm run build` passerar.
- Chromium visar samtliga varianter vid 1280, 390 och 320 pixlars
  bredd utan horisontellt sidöverflöde. Sidbyte fokuserar huvudrubriken.
- Native dialoger visar avbryt/stanna som första fokusmål.
  Tab och Shift+Tab stannar i återställningsdialogen. Escape stänger
  dialogen och återför fokus till öppningsknappen.
- Profilmenyns Escape återför fokus till profilknappen.
  Cookielänken från profildialogen öppnar cookiesidan.
- Simulerade sparfel, lyckat sparande, återställning, bevarad
  återhämtning, blockerad inloggning och avmarkerat inloggningsval
  efter utloggning ger de avsedda observerade tillstånden.
- Den observerade fristående prototypsessionen gör inga `/api/`-anrop och har
  tom lokal lagring, fliklagring och cookielista.
- Den integrerade D-vyn går från appens riktiga profilverktyg till
  den riktiga inställningsramen och tillbaka till kartan på dator och
  mobil. Vid 1280, 390 och 320 pixlar finns inget horisontellt
  sidöverflöde. Osparade val ger dialog genom appens navigationsskydd.
  Inga klientfel eller skrivande API-anrop observeras under detta flöde.
  Den riktiga testsessionen är fortsatt inloggad efter simulerat sparande.

HTML innehåller namngivna kontroller, beskrivningar, status- och
felregioner samt native modala dialoger. Ingen faktisk provning med
skärmläsare, fullständig kontrastutvärdering eller WCAG-granskning ingår.
Den flytande prototypbaren kan täcka innehåll under jämförelsen och
ingår inte i produktförslaget. Bilderna är exempel på utseende, inte
bevis för fullständig tillgänglighet.

Prototypen bevisar inte serveråterkallelse, sessionslivslängder,
OAuth-bindning, gallring eller verkligt lagringsskydd. Registrets
inloggningsposter och tider behöver stämmas av mot serverunderlaget
innan specifikationen fastställs. Inga billable anrop ingår.

## Underlag

- Skyttels basversion: `99f3ead1ea5fbdb6a354f6ebf678b315b7535f8c`.
- viscalyx.se:s förebild: `72d6554acf3915cf8cc4dc80800dec9e9780c823`.
- [Beslutat lagringsbeteende](https://github.com/viscalyx/skyttel/issues/412#issuecomment-6172094393).
- [Research om återanvändning](https://github.com/viscalyx/skyttel/blob/40aa2b25d8aba68a34aac7183813845dffec037a/research/cookie-ui-reuse.md).
- [Inventering av faktisk lagring](https://github.com/viscalyx/skyttel/blob/fa0af64c41e82350823b6c18dc2fd90232eb9030/research/cookie-storage.md).
- [Separat serverundersökning](https://github.com/viscalyx/skyttel/issues/415).

Grenen `prototype/cookie-flows-413` är ett kastbart beslutsunderlag.
Den ska inte slås ihop och ingen PR ska öppnas. Produktionsimplementation
följer först när beslutskartan är färdig.
