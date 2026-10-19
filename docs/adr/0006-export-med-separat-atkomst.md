# Fullständig export återställer innehåll men inte gammal åtkomst

Hushållets innehåll ska kunna återställas och flyttas utan den gamla
driftvärdens disk, så administratören exporterar allt unikt innehåll i
ett format med angiven version och stabila identiteter, inklusive
historik, bildversioner, privata utkast och personliga vyer.
Återimport ersätter innehållet i en sammanhållen operation i stället för
att slå ihop det, men behåller aktuell åtkomst i ett befintligt hushåll;
i en ny installation bekräftas åtkomst och inloggningskopplingar
uttryckligen, så att en gammal export inte återaktiverar borttagna
användare.
Administratörens insyn i andras utkast genom exporten ska framgå, och
serverhemligheter, sessioner och aktiva OAuth-token ingår inte i formatet.

Den fria egenskapsmodellen använder ett identifierbart nytt databas- och
arkivformat. Äldre arkiv och databaser utanför den uttryckligen stödda
förhandsversionen avvisas före innehållsändring. Automatisk tolkning av
typfält eller mållösa samband skulle kunna ändra hushållets avsikt.
Den stödda förhandsversionen uppgraderas automatiskt en gång genom att
gammalt innehåll raderas medan installationen, hushållet och åtkomsten
behålls enligt [uppgraderingsinformationen](../operations/operator-upgrade-notes.md).
Detta undantag konverterar inte gammalt innehåll och upprepas inte för
databaser i det nya formatet. Nyformatsarkiv bevarar
egenskapsidentiteter, ordning, tomma värden och legitima blockerade eller
undertryckta utkastförslag, men bevarad historisk härkomst ger ingen ny
spar- eller åtkomstbehörighet.
