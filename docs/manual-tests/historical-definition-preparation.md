# Förbered historiska definitioner och fält

Använd en isolerad provinstallation med påhittade uppgifter. Förberedaren
skapar ett hushåll och två inloggade sessioner. Robin arbetar i det synliga
fönstret; Alex förbereder de äldre ägda förslagen i en separat session.
Inga AI-anrop eller direkta databasändringar behövs.

Kör från repositoryts rot, efter en aktuell byggning:

```bash
npm run build
npm run test:env -- tsx scripts/manual-conflict-continuity.ts
```

För automatiserad kontroll kan förberedaren använda en redan startad
Chromium genom `--browser-ws WS_ADRESS`, där WS_ADRESS ersätts med den
browserns faktiska DevTools-adress som börjar med `ws://`. Argumentet
ändrar endast anslutningen till browsern; samma förberedelser, HTTP-anrop
och databas används. Utan argumentet startar kommandot sitt eget synliga
fönster. Integrationsprovet nedan använder det dokumenterade argumentet
med `--headless` och provar riktiga UI-val och kommandoloopen.

Välj ett av kommandona nedan i terminalen. Invänta `Ready:` med vald
förberedelse och den nya adressen innan UI-fallet börjar. Förberedaren
exporterar giltiga tidigare privata förslag, sparar de nyare gemensamma
definitionerna och återimporterar de ägda förslagen med kontrollerade
arkivdelar. Varje `new-…` skapar en ny installation och tar bort den förra.
Kör därför aldrig ett nytt sådant kommando mitt i ett återhämtningsförlopp.

<!-- markdownlint-disable MD013 -->
| Fall | Förberedelse | Faktiskt underlag |
| --- | --- | --- |
| UTKAST-64, 72 | `new-missing-object-type` | Borttagen Solcellsanläggning; ägt objekt med textsvaret Våren 2021. |
| UTKAST-65 | `new-invalid-datatype` | Samma fält ändrat från Text till Tal; det äldre privata textsvaret finns kvar. |
| UTKAST-66 | `new-missing-relationship-type` | Borttagen Förvaras i; äldre samband Lo Exempel till Molnmusik med textsvaret. |
| UTKAST-74, 138 | `new-replaced-object-field`, `new-replaced-relationship-field` | Typen finns kvar men textfältet ersätts av ett nytt talfält med samma namn. |
| UTKAST-75 | `new-multiple-blockers` | Både sambandets målobjekt och dess typ saknas. |
| UTKAST-67, 70, 71 | `new-object-restoration` | Faktiskt borttagen objekttyp och ägd definitionsändring. |
| UTKAST-140, 69 | `new-relationship-restoration` | Faktiskt borttagen sambandstyp och ägd definitionsändring. |
| UTKAST-68 | `new-restoration-two` | Båda användarna har egna äldre definitionsförslag. |
| UTKAST-76, 139 | `new-no-removed-object-definition`, `new-no-removed-relationship-definition` | Ägt definitionsförslag i en innehållsgeneration utan någon faktisk borttagningsrevision. |
| UTKAST-141 | `new-object-restoration` | Samma underlag som UTKAST-70; användaren väljer Tabell. |
<!-- markdownlint-enable MD013 -->

Det oberoende objektet **Oberoende förslag** finns i Robins utkast i samtliga
förberedelser. **Installationsår** är fältets synliga namn. Gamla
fältidentiteter, typidentiteter, revisioner och arkivkontrollsummor är
tekniskt underlag, inte uppgifter som användaren ska läsa i UI-fallet.

## Tidsordning för operatörens kontroller

`result` skriver den faktiska kartan, hela det privata utkastet och
historiken via offentlig HTTP. Kör det före och efter de gränser nedan som
ska vara oförändrade. Jämför hela resultatet; vid ett bekräftat privat val
får bara det uttryckligen berörda förslaget ändras. Vanlig historikläsning,
Escape och nekade begäranden ändrar inte den gemensamma kartan eller historiken.

- UTKAST-64 och 75: kör `result` före öppningen, efter Escape och efter
  det riktade kastandet. Det oberoende förslaget består; bara målobjektets
  eller målsambandets privata förslag försvinner.
- UTKAST-65, 66, 72, 74 och 138: kör `result` före rättningen, efter en
  avbruten fältförlustbekräftelse och efter att den vanliga dialogen lägger
  rättningen i utkastet. Jämför gamla respektive nya fältidentiteter och
  värdeslag. Det gamla svaret får inte kopieras till en ny fältidentitet.
  Kontrollera kartan och historiken innan det separata sparandet.
- UTKAST-67 och 140: kör `result` före granskningen och efter bekräftelsen.
  Den historiska typidentiteten och nästa revision finns i det privata
  förslaget. Typen är fortfarande borttagen gemensamt. Efter separat
  sparande finns den återställda definitionen, men ingen privat
  återställningsbehörighet i sparkvittot eller historiken.
- UTKAST-68: kör `probe-definition-guards` före Robins första granskning.
  Det prövar felaktigt jämförelseunderlag och den andra privata ägaren;
  båda ska ge HTTP 409 utan ändring. Efter Robins bekräftelse kör
  `probe-reused-definition`; samma gamla jämförelse ska avvisas.
  Kör sedan `newer-definition` innan UI-fallet försöker spara. Kommandot
  granskar Alex eget förslag, sparar det, prövar typborttagning medan
  Robins beständiga återställningsförslag finns kvar och kräver HTTP 409
  utan ändring av bådas privata arbete, kartan eller historiken.
  Alex sparar därefter **Ny gemensam typbenämning**. Robins gamla förslag
  får inte sparas mot denna nyare definition. `try-restoration-save`
  prövar även samma gräns via HTTP; användaren provar det synliga avvisade
  sparandet enligt UI-fallet. Bevara samma installation under ny granskning.
- UTKAST-69: kör `reimport-restoration` efter första bekräftelsen och före
  omladdningen. Exporten bevarar det privata förslaget; importen ökar
  innehållsgenerationen och tar bort den gamla återställningsbehörigheten.
  Kör `try-restoration-save` före ny granskning och kräv HTTP 409 samt
  oförändrat utkast. Bevara samma användare och installation.
- UTKAST-71: kör `forge-restoration` efter det uttryckliga kastvalet, före
  skapandet av den nya vanliga typen. Kräv HTTP 409 utan ändrat utkast,
  gemensamma typer, objekt eller historik. Begäran anger det gamla ID:t
  och påstådd återställningsbehörighet. Vanligt nyskapande får en ny
  identitet och ingen sådan behörighet.
- UTKAST-76 och 139: kör `probe-unavailable-restoration` före öppningen.
  Utan faktisk borttagningsrevision krävs HTTP 409 utan ändring. Efter
  kastvalet jämför `result`: bara det ägda definitionsförslaget försvinner.

## Tappat svar efter genomfört privat val

UTKAST-70 och 141 använder samma installation under hela kontrollen.
Välj först den föreslagna definitionen. Kör `lose-applied` precis före
**Lägg valen i utkastet**. Förberedaren skickar begäran till den riktiga
servern och tappar sedan svaret; den ersätter inte serverns behandling.
Använd dialogens uppföljning och kör `result` efter kontrollen. Det krävs
ett bekräftat privat resultat och bara en skickad bekräftelse.

`lose-unsent` stoppar begäran före servern och är ett annat fel. Vanligt
offlineläge bevisar inte att ett faktiskt genomfört svar har tappats.
`network-ok` återställer normal leverans. Kör det före fortsatt arbete.
Avsluta med `quit`; förberedaren stänger fönstret och tar bort provdatabasen.
Vid en vanlig installation används
[transportens avstängning](current-conflict-preparation.md): återställ
HTTPS-ingången till den ursprungliga lyssnaren **före** `quit`.

## Kör automatiskt underlag separat

De fullständiga browserfallen behåller ytterligare protokollkontroller:
historiska identiteter, värdeslag, revisioner, felaktigt underlag, privat
ägarskap, arkivinnehåll och oförändrad historik. De är automatiserat
underlag till de synliga scenarierna, inte extra mänskliga UI-steg.

<!-- markdownlint-disable MD013 -->
```bash
npm run build
npm run test:integration -- tests/integration/conflict-external-corrections.spec.ts tests/integration/conflict-definition-restoration.spec.ts tests/integration/definition-removal.spec.ts
```
<!-- markdownlint-enable MD013 -->

Återställ provinstallationerna mellan fall. En serveromstart inom ett fall
ska behålla samma databas och båda användarnas sessioner. Dokumentera
manuell körning och automatiserad körning var för sig.
