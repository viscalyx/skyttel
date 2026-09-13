# Pröva Skyttels samtalsflöde

Kastbart underlag för
[Hur ska samtalet skapa, rätta och spara en begriplig karta?](https://github.com/viscalyx/skyttel/issues/7).

Öppna `conversation-prototype.html` direkt i en webbläsare. Filen innehåller
allt som behövs och kräver ingen installation eller server.

## Vad provet visar

Knappar motsvarar talade repliker eller simulerade fel. En roterbar rymdvy
visar objekt och kopplingar med perspektiv och djup. Dra för att rotera,
eller använd knapparna för rotation, lutning och zoom. Välj ett objekt
eller en koppling för att se dess samband och relationsnamn.

Nya objekt får en gul ring och markeringen `+ Ny`. Nya kopplingar är gula;
borttagna kopplingar är orange och streckade. Befintliga objekt är gröna
och behåller sina positioner när förslag tillkommer. När ändringarna
sparas övergår förslagen till befintliga objekt och kopplingar.
Markeringarna jämför med den sparade kartan, inte med senaste repliken.

Sammanfattningen byggs under samtalet och är synlig bredvid rymdvyn.
Användaren kan när som helst be om en lista på tillägg och ändringar,
även vid paus eller osäkert sparresultat. Rättelser uppdaterar både kartan
och sammanfattningen direkt. Den sparade kartan går att öppna separat.

Åtta guidade situationer prövar återanvändning av objekt, felaktiga
relationer, tvetydiga kort, ofullständiga uppgifter, adressroller,
konton med samma adress, avbrott, fel och osäkra sparresultat.
Knapparna under Prova fritt kan användas i valfri ordning.

## Inriktning från beställarens återkoppling

- Sammanfattningen byggs löpande under samtalet.
- Användaren säger ”spara ändringarna” när förslaget känns klart.
  Begäran godkänner det aktuella förslaget direkt, utan separat
  granskningssteg eller ytterligare ja i prototypen.
- Rymdvyn visar hur nya objekt och kopplingar ansluter till befintliga.
- Nya förslag skiljs tydligt från befintlig information.
- En koncis ändringslista går att få när som helst.

## Beteenden i den godkända prototypen

- En obesvarad identitetsfråga hindrar samlat godkännande. Ett uttryckligen
  ospecificerat objekt får däremot sparas utan antagen identitet eller ägare.
- Samtalsavbrott behåller förslagen på den öppna sidan. Att kasta förslag
  och att ångra ett sparande är skilda handlingar.
- Ett saknat sparkvitto visas som okänt resultat. Nya ändringar väntar
  tills resultatet är kontrollerat.
- Ångring omfattar senaste samlade sparandet. Provet har en enda redigerare.

## Begränsningar

All information är påhittad. Tal, AI, nätverk och sparande är simulerade.
Ingen mikrofon, extern tjänst eller beständig lagring används. Även sparad
information försvinner när sidan laddas om. Knapparna visar inte att
verkliga användare kan genomföra scenariot med enbart tal.

Provet mäter inte svensk talkvalitet, fördröjning eller korrekt tolkning.
Rymdvyn är ett första underlag för återkoppling, med fasta exempelpositioner
och enkel projektion. Den avgör inte den slutliga 3D-utformningen,
lagring, samtidiga ändringar eller teknikval. Val i rymdvyn visar samband;
redigering görs genom de simulerade replikerna.
Beställaren godkänner flödet och utseendet efter egen prövning och anger
inga konstigheter i de delar som beställaren provar. Godkännandet gäller
den simulerade prototypen; det är ingen mätning av verkligt tal eller
verifiering av varje felsituation. Beslutet och gränserna för fortsatt
arbete finns i ärendets resolution.
