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
Släpp eller tappa en hållen leverans innan `clear` eller `quit`. Avsluta
transporten med `quit` och återställ HTTPS-ingången enligt förberedelsen.
Återställ provhushållet mellan fall, aldrig under återhämtningen.

UTKAST-49–63, 73, 77–78 och deras egna varianter använder i stället den
befintliga [tillfälliga konfliktinstallationen](drafts.md#bevarade-konfliktval-och-kontrollerat-utfall).
Dess `lose-applied` genomför serveranropet och tappar svaret;
`lose-unsent` stoppar anropet före servern. `hold` håller begäran före
servern och `release` skickar den vidare. `check-error` blockerar bara
kartans hämtning; `network-ok` återställer normal leverans och hämtning.
`result` skriver separata HTTP-jämförelser; identifierare, versionsräkning
och full kvittojämförelse är tekniskt underlag, inga vanliga UI-resultat.
