# Sambandstyper och riktning

[Till användarguidens innehåll](README.md)

En sambandstyp beskriver vad en koppling betyder. **Förvaring** kan till
exempel beskriva att Alex blå cykel **förvaras i** Garaget och att Garaget
**innehåller** Alex blå cykel. Det är ett samband med en identitet och en
riktning, sett från två håll. Ett annat föremål i samma garage får ett eget
samband av samma typ.

Alla hushållets medlemmar kan skapa och ändra sambandstyper. Definitionen
är gemensam efter sparandet. Före sparandet finns förslaget bara i ditt
privata utkast, tillsammans med objekt och samband du föreslår.

## Skapa en typ och ett samband

1. Öppna **Inställningar → Typer och egna fält → Sambandstyper och riktning**
   och välj **Ny sambandstyp**. Ange ett namn som hjälper hushållet att välja
   rätt betydelse och en förklarande beskrivning.
2. Ange benämningarna från startobjektet och målobjektet, till exempel
   **förvaras i** och **innehåller**. Lägg vid behov till egna fält med
   namn, beskrivning och värdeslaget Text, Tal, Datum eller Ja/nej.
   Lägg sambandstypen i ditt utkast.
3. Skapa de två objekten separat om de saknas. Öppna **Tabell**, välj
   **Samband för** startobjektet och **Nytt samband**. Startobjektet är
   förvalt. Välj sambandstyp, det andra objektet och riktning.
   Objektväljaren omfattar hushållets valbara objekt och nya objekt i
   ditt utkast, oberoende av kartans och tabellens filter. Typen är
   obligatorisk. Borttagna objekt kan inte väljas.
4. Välj **Lägg i utkastet**. Dialogen stannar öppen för nästa samband.
   Tidigare färdiga förslag behålls om nästa formulär innehåller ett
   fel eller avbryts. Välj **Stäng samband** när du är färdig.
5. Öppna **Skriv till Skyttel → Visa utkastet**, granska definitionen,
   riktningen och objekten och välj **Spara hela utkastet** när allt
   stämmer. Kvittot omfattar definitionen och kopplingen tillsammans.

Sambandets säkerhet, status och slutdatum
följer de vanliga reglerna för [upphört och borttaget](lifecycle.md).
Lika namn betyder inte samma typ; kontrollera beskrivningen och riktningen
innan du väljer. Skyttel slår inte ihop typer för att namnen liknar varandra.

## Egna uppgifter på samband

Förifyllda och egna sambandstyper kan ha valfria egna fält. Fyll i dem i
sambandets formulär. Lämna ett fält tomt eller välj **Obesvarat** om
uppgiften är obesvarad. Noll och Nej är uttryckliga svar och sparas som
sådana. Definitioner och värden kan läggas i samma utkast och sparas ihop.

Läs uppgifterna i objektets sambandsdialog och välj **Redigera samband**
för att rätta dem. Ett typbyte som tar bort egna svar öppnar
**Ta bort tidigare egna fält?**. Läs de berörda svaren och välj
**Ta bort fältvärdena och byt typ** om de ska tas bort ur formuläret.
Den nya typens egna fält börjar då tomma. Att avbryta behåller den
tidigare typen och svaren. Lika fältnamn flyttar eller omtolkar aldrig
svar automatiskt. Sparad historik behåller tidigare uppgifter.

Använda fält kan inte tas bort eller få annat värdeslag. Skyddet gäller
även upphörda samband och andra medlemmars privata utkast. Ett avslag
visar inte vem som använder fältet eller några privata värden. Skapa
ett nytt fält om uppgiften behöver ett annat värdeslag.

[Ändringshistoriken](history.md) behåller uppgifternas betydelse och
visar sparandets dåvarande definitioner och benämningar.

## Ordna avsnitt och fält

Öppna **Inställningar → Typer och egna fält → Sambandstyper och riktning**
och ändra sambandstypen. Namnge avsnitten och använd **Upp** och **Ned**
för deras visningsordning. Välj **Visa i avsnitt** för varje fält och
flytta det uppåt eller nedåt bland fälten i samma avsnitt. Ett tomt
avsnitt kan tas bort.

**Dölj** tar bort fältet från vanliga formulär och detaljer men behåller
fältets identitet och alla svar. Välj ett avsnitt igen för att återvisa
uppgiften, även efter omstart. Att dölja är varken radering eller ett
åtkomstskydd. Utkastets granskning och historiken visar bevarade dolda svar.

Lägg definitionen i ditt privata utkast. Sambandsformulär och detaljer
följer förslaget direkt. Använd **Spara hela utkastet** för att dela
definitionen och övriga förslag med hushållet. Namnbyte, flytt och
synlighet ändrar inga svar; obesvarat skiljer sig fortfarande från Noll
och Nej. Äldre definitioner visas först under **Egna fält**.

## Läs och rätta från båda objekten

Välj **Samband för Cykeln** i Tabell för att se
**Cykeln → förvaras i → Garaget**. Välj **Samband för Garaget** för att
se **Garaget → innehåller → Cykeln**. **Redigera samband** öppnar samma
koppling från båda hållen. Formuläret visar dess startobjekt och
målobjekt i den sparade riktningen.

Du kan ändra typ eller ändpunkter och lägga till fler samband. Andra
betydelser mellan samma objekt är tillåtna. Ett upprepat tillägg med
samma typ, riktning och ändpunkter visar **Sambandet finns redan** och
erbjuder **Redigera befintligt samband** utan att skapa en dubblett
eller skriva över sparade uppgifter. Ett ändrat formulär bevaras tills
du uttryckligen väljer att lämna det. Vid byte till det befintliga
sambandet gäller [förlustvarningen](map.md).

## Ändra en gemensam definition

Öppna **Sambandstyper och riktning** och välj **Ändra sambandstyp**.
Även förifyllda och använda typer kan få rättat namn, beskrivning och
benämningar. Ändringen byter inte identitet eller kopplar om några objekt.
Äldre typer utan benämning från målobjektet visas i den ursprungliga
riktningen även när du öppnar målobjektet. Ange båda benämningarna när du
redigerar en sådan definition.

Granska den tidigare definitionen och ditt förslag i utkastet. Om någon
annan ändrar definitionen före ditt sparande stoppas hela sparandet.
Hämta aktuellt underlag och välj sparad definition eller ditt förslag.
När du behåller ditt förslag bevaras oberoende rättelser från den andra
medlemmen. Granska resultatet och ge ett nytt sparbesked. Historiken och
kvittot bevarar tidigare definitioner och ändrade kopplingar.

Vid samtidiga likadana tillägg sparas bara ett samband. Den andra
medlemmens hela utkast finns kvar och visar vilket samband som redan
finns. Öppna **Granska konflikter** och bekräfta
**Ta bort sambandet ur ditt utkast** för det överlappande förslaget.
Det sparade sambandet och andra förslag behålls. Granska övriga förslag
innan du sparar igen.

Läs också om [objekttyper och egna fält](object-types.md) och
[hushållets abonnemang](family-subscription.md). Oanvända typer kan
[tas bort](definition-removal.md);
användande samband måste först hanteras och ändpunkterna kan finnas kvar.
