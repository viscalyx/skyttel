# Tidsbegränsad bekräftelse av sambandsformulär

Serverns bekräftelse av ett inskickat sambandsformulär ska kunna hämtas
i sju dygn från att servern accepterar försöket, även efter sparande och
omstart. Samma tidsgräns gäller när ett befintligt samband väljs utan att
utkastet ändras; kontroller och återförsök förlänger inte tiden.
Bekräftelsen är skild från utkastet, hushållets sparade uppgifter,
sparkvitton och ändringshistorik, som inte omfattas av denna tidsgräns.

Lagringen av formulärbekräftelser ska ha en bestämd övre gräns.
När gränsen nås ska nya försök avvisas innan utkastet ändras, med ett
begripligt besked och formulärets uppgifter bevarade. Redan accepterade
försök ska fortfarande kunna kontrolleras och upprepas med samma innehåll
under sina sju dygn; nya försök får inte tränga undan deras bekräftelser.

Efter tidsgränsen ska gränssnittet ange att bekräftelsen inte längre är
tillgänglig och kräva granskning av aktuellt underlag före ett nytt försök.
En utgången bekräftelse får inte tolkas som att formuläret aldrig nådde
servern eller att ändringen aldrig lades i utkastet. Begränsad återhämtning
väljs framför obegränsad lagring för att upprepade formulär utan ändringar
inte ska kunna förbruka allt lagringsutrymme.
