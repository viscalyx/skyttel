# Tillfällig riskbeskrivning för känslig administration

Detta dokument riktar sig till installationsansvariga och administratörer.
Det beskriver skydd som saknas i dagens Skyttel och försiktighetsåtgärder
fram till att extra bekräftelse för känslig administration finns på plats.
Den planerade bekräftelsen är ännu inte implementerad.

## Nuvarande risk

En giltig administratörsinloggning räcker för att begära fullständig
export, ersätta hushållets information genom återimport, radera information
permanent och ge någon annan administratörsrollen. Skyttel kräver ingen
separat, färsk bekräftelse av administratörens identitet för dessa åtgärder.

Någon som får kontroll över en olåst dator med en aktiv
administratörsinloggning, eller på annat sätt kan använda den inloggningen,
kan därför utföra åtgärderna med administratörens befintliga behörighet.
En fullständig export omfattar även privata utkast och historik. Möjliga
följder är röjd information, förlust eller ersättning av hushållets
information och att ytterligare en person får administratörsbehörighet.

Kontroller av aktuell behörighet och anropens ursprung finns kvar.
Granskning och uttrycklig bekräftelse vid radering och återimport skyddar
mot bland annat oavsiktliga eller inaktuella val, men bevisar inte vem som
sitter vid datorn. Risken innebär inte att en oinloggad person kan kringgå
autentiseringen. Denna beskrivning visar inte att ett angrepp har inträffat.

## Försiktighetsåtgärder tills extra bekräftelse finns

- Lås datorn när du lämnar den och dela inte en inloggad webbläsarprofil.
- Använd bara ihågkommen inloggning på en egen enhet. Logga ut när du är
  klar på en delad enhet.
- Ge administratörsrollen endast till personer som behöver den. Återkalla
  tillgång som inte längre ska gälla.
- Skydda exporter som känslig information och behåll skyddade
  säkerhetskopior för återställning vid informationsförlust.

Dessa åtgärder minskar exponeringen men ersätter inte en separat
bekräftelse. Se även [inloggning och tillgång](../user-guide/access.md),
[hushållsexport och återimport](../adr/0006-export-med-separat-atkomst.md)
och [återställning av installationen](database-restore.md).

## Planerat skydd och kvarstående risk

Den planerade lösningen använder passkeys eller fysiska säkerhetsnycklar
registrerade i Skyttel för de fyra känsliga åtgärderna. Vanlig inloggning
fortsätter med Google eller Microsoft. Bekräftelsen ska gälla en bestämd
åtgärd, användare, webbläsarsession och hushåll i högst fem minuter.

Den första administratören får registrera sin första nyckel efter vanlig
inloggning. En administratör utan registrerad nyckel ska behöva registrera
en vid inloggning innan vanligt arbete öppnas. Den första registreringen
ger därför inte samma skydd som bekräftelse med en redan betrodd nyckel:
någon som kontrollerar
administratörens inloggning innan en nyckel finns kan registrera sin egen.
Det är en kvarstående risk även i den planerade lösningen. Vid förlust av
samtliga registrerade nycklar ska installationsansvarig kontrollera personen
och godkänna återställning genom ett separat driftflöde. Vanlig inloggning
ska inte ensam räcka för att ersätta förlorade nycklar.

Flera nycklar ska kunna registreras, med stöd för vanliga passkeys och
fysiska säkerhetsnycklar som kräver PIN-kod eller biometrisk kontroll.
Ändringar av nycklar ska kräva bekräftelse med en redan betrodd nyckel.
Den sista nyckeln ska inte kunna tas bort utan en ersättare.

Ta bort eller ersätt detta tillfälliga dokument när skyddet är implementerat
och verifierat. För då över fortfarande gällande risker, särskilt risken
vid första registrering, till ordinarie säkerhetsvägledning och dokumentera
registrering, reservnycklar och återställning i berörda användar- och
driftinstruktioner.
