# Skyttels textassistent

Öppna **Skyttels textassistent** i hushållets karta. Godkänn separat att
OpenAI behandlar uppgifter och att assistenten får föreslå ändringar och
spara när du ber om det. Detta är skilt från cookieval och andra klienters
medgivanden. Om assistenten inte är tillgänglig fungerar kartans formulär.

Assistenten finns i kartans detaljdel. I rymdkartans helskärmsvy väljer du
**Visa detaljer och utkast** för att öppna den. Samtalet och oskickad text
finns kvar när du växlar tillbaka till kartan.

Beskriv vad du vill hitta, lägga till eller rätta. Assistenten använder
hushållets egna typer och ditt befintliga privata utkast. Förslag från
andra klienter ingår också. Oskickad formulärtext ligger kvar i formuläret
och ingår först när du lägger den i utkastet.

## Granska, rätta och spara

**Hela ditt utkast** visar de samlade förslagen. Öppna detaljerna för
tidigare och föreslagna uppgifter. Fråga om något är oklart. Assistenten
ska fråga vid tvetydig identitet och skilja okänt, uttryckligen inget,
osäkert uppgivet och ospecificerat objekt åt.

Skriv exempelvis **Rätta priset till 189 kr och spara**. Ett tydligt
sparbesked gäller hela det aktuella utkastet, utan ett extra ja bara för
att rättelsen ändrar utkastversionen. Vid konflikt eller samtidig ändring
visas aktuellt underlag och ett nytt besked behövs. Nekade, citerade,
hypotetiska och uppskjutna sparkommandon ger inte tillåtelse att spara.
Om formuleringen är oklar kan du behöva skriva **Spara hela utkastet nu**.

Statusen **Sparat** kommer från ett beständigt kvitto. **Visa kvittot**
visar vad sparandet omfattar. Assistentens fria text är en modelltolkning;
den ersätter inte kvittot. En markeringsstatus visas först när den öppna
webbläsaren har visat det valda objektet. Oskickad formulärtext skyddas
genom att en sådan visningsbegäran kan nekas.

## Avbrott och återupptagning

**Avbryt uppdrag** stoppar fortsatta anrop från det uppdraget. Ett nytt
meddelande ersätter också pågående arbete. Genomförda förslag finns kvar
i utkastet. Ett genomfört sparande blir inte ångrat av ett avbrott.

Om svaret saknas, välj **Kontrollera sparresultat** innan nytt arbete.
Ett väntande försök kan slutföras med **Slutför samma sparförsök**. Det
återanvänder exakt det beständiga försöket. Efter omladdning eller omstart
startar du en ny anslutning och öppnar **Tidigare sparförsök**. Där finns
även kvitton från andra enheter. Ett avvisat försök behöver ett nytt
underlag och ett nytt sparbesked.

**Avsluta textassistenten** tar bort anslutningen och samtalsminnet.
Anslutningen upphör senast efter 30 minuter eller när dess medgivande
återkallas. Utkast, sparade uppgifter och kvitton finns kvar. Återimport
eller byte av innehållsägare kräver en ny anslutning.

## Vilka uppgifter behandlas?

Skyttel skickar meddelandet, hela det egna utkast som behöver granskas och
relevanta kartdelar till OpenAI. Bilder skickas inte i textanropen.
Fullständiga samtal sparas inte som hushållsinnehåll. Skriv inte lösenord,
fullständiga konto- eller kortnummer, pinkoder eller återställningskoder.

Anrop använder `store: false`. Det är ingen garanti om enbart behandling
i EU eller omedelbar radering av alla leverantörskopior. Läs
[OpenAI:s datavillkor](https://developers.openai.com/api/docs/guides/your-data).
Hushållets administratör hanterar användare, export, återimport och
permanent radering i Skyttels egna administrationsvyer.
