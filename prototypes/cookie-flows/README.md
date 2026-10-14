# Skyttels cookieflöden: kastbar prototyp

Prototypen ger underlag till
[Hur utformas Skyttels cookieflöden med viscalyx.se:s layout och formulär?](https://github.com/viscalyx/skyttel/issues/413).
Den är till för att välja sidram, profilingång och formulärbeteende.
Alternativen är förslag som användaren behöver bedöma.

## Öppna prototypen

Kör från denna gren med projektets installerade beroenden:

```sh
npm run dev:client -- --port 5413 --strictPort
```

Öppna <http://localhost:5413/cookies?variant=A>. Pilarna i den flytande
prototypbaren byter variant och uppdaterar adressen. Vänster- och högerpil
fungerar också när fokus inte är på en kontroll eller i en dialog.
Prototypen är tillgänglig endast i utvecklingsläge.

Alla uppgifter är påhittade. Inloggning, utloggning, tema och sparande
simuleras i minnet. Omladdning återgår till startläget. Inga API-anrop,
cookies eller lagringsposter skapas av flödet.

## Jämför tre sidramar

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

Alla använder Skyttels befintliga tema och CSS. B visar
inställningsramens befintliga struktur; innehållet och kontodata
är simulerade. Den befintliga temahooken används inte, eftersom
den skriver till lokal lagring. Temakontrollen får minnestillstånd.
Viscalyx.se är förebild för kategorikort, utvecklingsbara detaljer,
sparbesked och återställningsdialog.

## Prova flödena

Öppna **Scenarier och simulerat tillstånd** i prototypbaren.
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

## Förslag att bedöma

- B behåller Skyttels befintliga inställningsnavigation och ger en
  permanent publik cookiesida före inloggning.
- En kompakt profilknapp med initialer och en meny med vanliga knappar
  ger en kort väg till cookieinställningarna. Menyn är en vanlig
  navigationsyta, utan ett särskilt menyprotokoll för tangentbordet.
- Ett uttryckligt sparande, möjlighet att ångra och skydd vid sidbyte
  gör skillnaden mellan redigerat och sparat val synlig.
- Första informationen är en ruta över innehållet utan modal fokusfälla.
  Den täcker inga inloggningskontroller och kan
  stängas och samma innehåll finns på den permanenta sidan.
  Stängningen finns bara i minnet; den skapar ingen ny lagringsnyckel.

Dessa förslag är inte resolutioner. Användaren kan välja en variant
eller kombinera delar från flera.

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
- Den observerade prototypsessionen gör inga `/api/`-anrop och har
  tom lokal lagring, fliklagring och cookielista.

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
