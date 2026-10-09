# Förbered styrd konfliktleverans

UTKAST-23 och UTKAST-24 använder ett nytt provhushåll och två vanliga
inloggningar enligt [utkastfallen](drafts.md#allmän-förberedelse).
Förbered namnkonflikten före armning. Behåll samma databas och publika
adress under kontrollen. Inga AI-anrop behövs.

Använd den befintliga transporten enligt
[vanlig installation och annan klient](save-preparation.md#vanlig-installation-och-annan-klient).
Kopiera hushållets ID från adressen och ersätt PROVADRESS, HOUSEHOLD_ID och
applikationens loopbackport i kommandot. Kontrollera normal inloggning i
båda profilerna innan du styr leveransen.

- `arm resolve:after` genomför nästa konfliktval och håller dess svar.
  Invänta `application-completed` med status 200 och sedan `held-after`.
  `release` levererar det riktiga svaret. Detta används i UTKAST-23.
- `arm resolve:drop-after` genomför nästa konfliktval och tappar dess svar.
  Kräv `application-completed` med status 200 innan du behandlar det som
  genomfört. Använd sedan dialogens **Kontrollera om valet lades i utkastet**.
- `arm save:drop-after` genomför nästa hela sparande och tappar kvittosvaret.
  Kräv status 200 och använd **Kontrollera sparandet igen**. Skicka inte
  ett nytt sparande för att ersätta det okända utfallet.

Armning sker före den handling som skickar anropet. Transporten styr bara
den valda rutten en gång; andra klienters vanliga läsning fungerar.
Vanligt offlineläge ersätter inte ett tappat svar efter transaktionen.
Släpp eller tappa en hållen leverans innan `clear` eller `quit`. Återställ
HTTPS-ingången till applikationens ursprungliga lyssnare **före** `quit`.
Avsluta sedan transporten. Kontrollera eventuella oklara utfall genom den
vanliga applikationen efteråt enligt
[transportens avstängning](../development/testing.md#delivery-controls-for-an-ordinary-https-test-installation).
Återställ provhushållet mellan fall, aldrig under återhämtningen.

UTKAST-49–63, 73, 77–78 och deras egna varianter använder i stället den
befintliga [tillfälliga konfliktinstallationen](drafts.md#bevarade-konfliktval-och-kontrollerat-utfall).
Dess `lose-applied` genomför serveranropet och tappar svaret;
`lose-unsent` stoppar anropet före servern. `hold` håller begäran före
servern och `release` skickar den vidare. `check-error` blockerar bara
kartans hämtning; `network-ok` återställer normal leverans och hämtning.
`result` skriver separata HTTP-jämförelser; identifierare, versionsräkning
och full kvittojämförelse är tekniskt underlag, inga vanliga UI-resultat.

## Tidsordning för tekniskt underlag

Operatören använder samma provhushåll, sessioner och databas som UI-fallet.
Terminalens protokollbesked hör till förberedelsen; den vanliga användaren
läser väntande, oklart och bekräftat utfall i gränssnittet.

- UTKAST-23: arma `resolve:after` före steg 1. Efter bekräftelsen krävs
  `application-completed` med status 200 och `held-after`. Meddela då att
  svaret hålls så att användaren kan prova Escape i steg 2. Kör `release`
  först i steg 3; lämna samma genomförda svar kvar tills dess.
- UTKAST-24 och 116: arma `resolve:drop-after` före steg 1. Kräv
  `application-completed` med status 200 innan kontrollen i steg 2.
  Efter omladdningen i steg 3, arma `save:drop-after` före steg 4.
  Kräv åter status 200 innan användaren kontrollerar sparandet i steg 5.
  Spara inga ersättningsförsök för ett oklart utfall.
- UTKAST-60: välj `new-missing-endpoint` i konfliktinstallationen. Kör
  `result` före öppningen i steg 1, efter Escape i steg 2 och efter kastandet
  i steg 4. Jämför den sparade kartan, historiken och det oberoende förslaget;
  bara det berörda sambandsförslaget ska försvinna vid bekräftelsen.
- UTKAST-78: välj `new-two`. Kör `result` före Lo-bekräftelsen i steg 2,
  direkt efter bekräftelsen och efter navigeringen i steg 3 och 4.
  Bara bekräftelsen ökar utkastets version en gång. Navigering ska behålla
  hela utkastet, den sparade kartan och historiken.

De bevarade integrationsproven jämför hela konfliktvalets utfall och,
för UTKAST-24/116, hela kvittot som fångas före det tappade svaret. De kräver
samma beständiga försök, exakt ett sparanrop, ett nytt avslutat försök och
en ny historikgrupp. Det är automatiserat HTTP-underlag, inte ett påstående
om vad användaren kan läsa i sparmodalen. Kör från repositoryts rot:

```bash
npm run build
npm run test:integration -- tests/integration/draft-conflicts.spec.ts --grep 'UTKAST-(23|24|116):'
npm run test:integration -- tests/integration/conflict-special.spec.ts --grep 'UTKAST-(60|78):'
```

Avsluta konfliktinstallationen med `quit` efter de sista jämförelserna;
den tar bort provdatabasen. Den vanliga transporten avslutas med den
HTTPS-återställning som anges ovan. Förbered alltid nytt provhushåll mellan
fallen och bevara det aktuella hushållet under varje återhämtning.
