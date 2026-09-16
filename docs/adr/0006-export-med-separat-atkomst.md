# Fullständig export återställer innehåll men inte gammal åtkomst

Hushållets innehåll ska kunna återställas och flyttas utan den gamla
driftvärdens disk, så administratören exporterar allt unikt innehåll i
ett versionerat format med stabila identiteter, inklusive historik,
bildversioner, privata utkast och personliga vyer.
Återimport ersätter innehållet i en sammanhållen operation i stället för
att slå ihop det, men behåller aktuell åtkomst i ett befintligt hushåll;
i en ny installation bekräftas åtkomst och inloggningskopplingar
uttryckligen, så att en gammal export inte återaktiverar borttagna
användare.
Administratörens insyn i andras utkast genom exporten ska framgå, och
serverhemligheter, sessioner och aktiva OAuth-token ingår inte i formatet.

Källor:
[Vilken information ska sparas, ändras över tid och kunna återställas?](https://github.com/viscalyx/skyttel/issues/9#issuecomment-5655680457),
[Skyttels teknikbeslut: export, återimport och radering](https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#export-återimport-och-radering),
[Skyttels teknikbeslut: container, databas och byte av driftvärd](https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#container-databas-och-byte-av-driftvärd).
