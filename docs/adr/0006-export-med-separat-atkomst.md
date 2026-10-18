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
arkivformat. Äldre format avvisas före innehållsändring, eftersom en
automatisk tolkning av typfält eller mållösa samband skulle kunna ändra
hushållets avsikt; befintliga data kräver en separat beslutad
ersättningsprocedur. Nyformatsarkiv bevarar egenskapsidentiteter, ordning,
tomma värden och legitima blockerade eller undertryckta utkastförslag,
men bevarad historisk härkomst ger ingen ny spar- eller åtkomstbehörighet.
