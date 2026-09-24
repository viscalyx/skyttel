# Manuella testfall för fullständig återimport

Testfallen omfattar uttrycklig ersättning, bevarad åtkomst, bildhistorik,
privata utkast, personliga placeringar och ångring med nytt underlag.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.
Manuell körning sker efter att hela specifikationen är implementerad.

## Konfigurerade användare

Använd en isolerad testinstallation med påhittade uppgifter. Alex är
administratör i hushållet Linden. Använd två webbläsarprofiler med samma
kontrollerade inloggning när ett fall kräver en gammal och en aktuell klient.
Inloggning och provmiljö beskrivs i
[installationsguiden](../operations/installation.md).

## Allmän förberedelse

1. Skapa Linden och ett sparat objekt **Lampa från exporten**.
2. Hämta en fullständig export enligt
   [exportguiden](../users/household-export.md). Spara ZIP-filen privat.
3. Ändra objektets namn till **Senare namn** och spara hela utkastet.
4. Återställ provmiljön mellan fallen. Radera hämtade testfiler efteråt.
   Vid omstart ska samma databas användas.

## Bekräftad ersättning

### IMPORT-01: Ersätt hushållet med tangentbordet

**Syfte:** Kontrollera att förberedelse inte ändrar innehåll och att
ersättning kräver ett uttryckligt beslut från aktuell administratör.

**Användare:** Alex som administratör.

**Förutsättningar:** ZIP-filen och den senare namnändringen finns enligt
förberedelsen. Ingen annan ändrar hushållet under detta fall.

**Integrationstest:**
[household-import-ui.spec.ts](../../tests/integration/household-import-ui.spec.ts),
testfallet “IMPORT-01: an administrator reviews and explicitly replaces
household content with the keyboard”.

**Steg:**

1. Öppna **Administrera tillgång** och läs **Återimportera hushållet**.
2. Välj ZIP-filen. Använd Tab till **Kontrollera importfil** och Enter.
3. Läs sammanställningen. Kontrollera i den andra profilen att **Senare
   namn** fortfarande finns. Ersättningsknappen ska ännu vara avstängd.
4. Använd tangentbordet för att markera bekräftelsen. Tryck Enter på
   **Ersätt hushållets innehåll** och invänta resultatet.
5. Läs in hushållet igen och kontrollera objektets namn. Starta om servern
   med samma databas och kontrollera innehåll och administration igen.

**Förväntat resultat:**

- Förberedelsen ändrar inget. Efter uttrycklig bekräftelse visas **Lampa
  från exporten**, och den senare namnändringen saknas.
- Alex är fortfarande administratör efter ersättning och omstart.
- Ett tydligt resultat visas. Ett uteblivet svar ska följas upp med
  **Hämta importens status**, inte tolkas som ett säkert misslyckande.

## Historik och gamla klienter

### IMPORT-06: återställ bildhistorik och ångra med nytt underlag

**Syfte:** Kontrollera att en återimport bevarar sammanslagningens
bildversioner, privata förslag och personliga placeringar, samtidigt som
gamla klientunderlag inte kan skriva tillbaka senare innehåll.

**Användare:** Hushållets administratör i två separata webbläsarprofiler.

**Förutsättningar:** Ett separat provhushåll med påhittade data och inga
andra pågående sparförsök. Använd två tydligt olika små provbilder.

**Integrationstest:**
[household-import-history.spec.ts](../../tests/integration/household-import-history.spec.ts),
testfallet “IMPORT-06: replacement preserves merged image history and
private work, rejects a lost-receipt retry and permits fresh undo after
restart”.

**Steg:**

1. Skapa två objekt med namnet **Lo Exempel** som föreställer samma
   påhittade person. Spara ett samband från det andra objektet med okänd
   målpunkt. Placera objekten på två igenkännliga platser i rymdkartan.
2. Lägg den första provbilden på det andra objektet och spara den.
   Slå samman objekten med det första som kvarvarande identitet.
   Bekräfta identiteten, välj det andra objektets bild och behåll sambandet.
   Spara sammanslagningen och anteckna dess kvitto.
3. Lägg den andra provbilden som privat bildförslag på kvarvarande objekt.
   Låt förslaget vara osparat. Hämta en fullständig export i Administration.
4. Skapa **Senare objekt** och spara hela utkastet. Anteckna det senare
   kvittot. Börja därefter skriva ett nytt förslag i den första profilen,
   men lämna det öppet utan att lägga det i utkastet.
5. Öppna Administration i den andra profilen. Välj exporten från steg 3,
   granska rätt hushåll och bekräfta ersättningen. Starta om servern med
   samma databas och öppna hushållet igen i den andra profilen.
6. Kontrollera den sammanslagna kartan, den privata andra bilden och det
   ursprungliga sammanslagningskvittot. Kontrollera att **Senare objekt**
   saknas. Försök lägga det gamla öppna förslaget i utkastet från den första
   profilen; läs in aktuell karta när klienten begär det.
7. I den andra profilen: kasta det återställda privata bildförslaget,
   välj sammanslagningskvittot i historiken och ångra sparandet. Granska
   och spara hela det nya utkastet. Starta om med samma databas och
   kontrollera båda objektens bilder, samband och personliga placeringar.

**Förväntat resultat:**

- Efter importen finns den sammanslagna kartan och dess första bild samt
  det osparade förslaget med den andra bilden. Senare sparat innehåll
  blandas inte in. Det gamla öppna förslaget avvisas utan ny kartändring.
- Det ursprungliga kvittots identitet, författare och tidpunkt bevaras.
  Ett nytt aktuellt underlag kan ångra den importerade sammanslagningen.
- Efter ångrandet finns båda ursprungliga identiteterna. Det andra
  objektets första bild, okända målpunkt och båda personliga placeringarna
  är bevarade även efter omstart.

Tappat kvittosvar efter genomförd transaktion och återförsök med gamla
operations-ID provas endast automatiserat. Testet låter den riktiga
servern spara, bryter svaret, importerar och verifierar sedan att de gamla
återförsöken avvisas utan falsk sparbekräftelse eller ny ändring. Manuella
steg påstår inte att det kontrollerade nätavbrottet har utförts.
