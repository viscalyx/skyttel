# Privata utkast sparas som en kontrollerad ändringsgrupp

Användaren granskar förslag löpande i sitt privata, beständiga utkast och
godkänner hela det aktuella utkastet genom ett uttryckligt sparbesked,
så att samtalets sammanfattning ersätter ett separat granskningssteg.
Servern kontrollerar åtkomst, utkastversion, berörda värden och
domänvillkor och skriver karta, historik, förbrukad version och kvitto
tillsammans; kvittot styr bekräftelsen och samma operations-ID med samma
innehåll ger samma resultat vid återförsök.
En entydig rättelse med sparbesked får slutföras utan extra ja, medan
konflikter kräver ett aktuellt sparbesked och ångring blir ett nytt
förslag som bevarar oberoende senare ändringar.

Källor:
[Hur ska samtalet skapa, rätta och spara en begriplig karta?](https://github.com/viscalyx/skyttel/issues/7#issuecomment-5654691943),
[Kan en extern assistent genomföra Skyttels gemensamma MCP-flöde?](https://github.com/viscalyx/skyttel/issues/15#issuecomment-5667325819),
[Skyttels teknikbeslut: lagring och samlat sparande](https://github.com/viscalyx/skyttel/blob/ec59c74119e28ada77ab23e6c5919b8c9ecc2292/docs/planning/technology-proposal.md#lagring-och-samlat-sparande).
