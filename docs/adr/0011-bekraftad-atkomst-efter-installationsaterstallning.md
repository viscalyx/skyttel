# Bekräftad åtkomst efter återställning av installationen

Vid återställning av en fullständig databas eller disk ska Skyttel spärra
vanlig åtkomst till hushållens information tills aktuella medlemskap och
administratörsroller uttryckligen bekräftas. En äldre kopia kan innehålla
åtkomst som därefter upphör, och ogiltiga gamla sessioner hindrar inte en
ny inloggning från att använda kopians medlemskap. Applikationen ska därför
kräva granskningen innan åtkomsten öppnas; enbart en driftinstruktion
räcker inte. Om aktuell åtkomst inte kan fastställas ska spärren bestå.

Installationsansvarig ska uttryckligen utse en återställningsadministratör
för varje återställning i konfiguration utanför kopian. Personen ska
identifieras med inloggningsleverantör och dess stabila kontoidentifierare
och styrka identiteten genom vanlig inloggning. Varken en e-postadress,
en administratörsroll i kopian eller installationens första administratör
ska automatiskt ge denna behörighet. Uppdraget ska ge tillfällig behörighet
för återställningen; personens vanliga roll i hushållet ska fastställas
genom granskningen.

Granskningen ska vara ett uttryckligt mänskligt beslut. En oberoende
tjänst som automatiskt återskapar senare medlemsändringar krävs inte.
Beslutet gäller fullständig återställning av installationen;
[hushållsexport och återimport](0006-export-med-separat-atkomst.md)
har en separat åtkomstgräns.
