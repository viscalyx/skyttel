# Manuella testfall för objektikoner

Testfallen omfattar ikonval, sökning, bildens företräde, beständighet och
tangentbord i smala vyer. Anteckna commit, webbläsare och godkänt eller
underkänt resultat vid körning.

## Konfigurerade användare

- Alex Exempel är administratör i testhushållet och använder Google.

## Allmän förberedelse

1. Använd en isolerad installation med påhittade uppgifter. Följ
   [ingångarna till arbetsytorna](README.md#öppna-arbetsytor). Förbered en
   giltig PNG-bild enligt [bildfallen](profile-images.md#allmän-förberedelse).
2. Börja varje fall med ett nytt hushåll eller motsvarande återställt läge.
   Behåll inloggning och databas vid normal serveromstart.

## Ikonval och visning

### IKON-01: Bevara ikon genom typbyte, bildval och omstart

**Syfte:** Verifiera samma objektförslag och uttrycklig återgång till standard.

**Användare:** Alex.

**Förutsättningar:** Hushållet har inget objekt med namnet Min cykel.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-01: icon choice survives type and image changes, save and
restart before explicit reset”.

**Steg:**

1. Öppna **Lista** och **Nytt objekt**. Skriv Min cykel och en beskrivning.
   Välj **Lägg uppgifterna i utkastet först** i avsnittet **Ikon**.
2. Sök cykel och välj **Cykel**. Byt objekttyp till **Fordon**. Lägg de
   oskickade uppgifterna i utkastet med samma knapp i ikonavsnittet.
3. Välj PNG-bilden. Visa kartan och kontrollera att bilden syns i objektets
   symbol. Återgå till formuläret och välj **Ta bort profilbild**.
   Kontrollera att Cykel åter visas i detaljerna och kartan.
4. Skriv mer i beskrivningen, välj **Lägg i mitt utkast** och
   **Spara hela utkastet**. Vänta på bekräftat sparande. Starta om servern
   normalt och ladda om sidan. Öppna objektet och kontrollera uppgifterna.
5. Redigera objektet, välj **Typens standardikon**, stäng formuläret och
   spara hela utkastet. Kontrollera objektets standardikon.

**Förväntat resultat:**

- Formuläret stannar öppet vid den första knappen. Ikonvalet hör till samma
  privata objektförslag och kan inte ersätta oskickad text.
- Efter att uppgifterna lagts i utkastet flyttas fokus till ikonsökningen,
  om användaren inte redan har valt ett annat fält under väntan.
- Bilden har företräde. Bildborttagning återger Cykel och typbytet behåller
  valet. Ikon och beskrivning finns kvar efter sparande och omstart.
- Standardvalet blir ett privat förslag och delas först efter sparandet.

### IKON-02: Sök hela katalogen med tangentbord i smala teman

**Syfte:** Verifiera sökresultat, sidval, fokus och tillgängliga kontroller.

**Användare:** Alex.

**Förutsättningar:** Objektet Lo finns i det privata utkastet.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-02: full catalog search, empty results and keyboard
pagination work in narrow themes”.

**Steg:**

1. Öppna Lo och **Redigera valt objekt**. Upprepa följande kontroller på
   dator och i smala telefonvyer, med ljust och mörkt systemtema.
2. Sök telescope. Gå till motsvarande val med tangentbord och tryck Enter.
   Kontrollera markeringen. Sök sedan ingen-symbol-xyz och läs beskedet.
3. Välj **Rensa sökningen**. Kontrollera fokus i sökfältet. Välj **Nästa**
   och kontrollera fokus på den första ikonen på nästa sida. Välj
   **Föregående** och kontrollera att första sidan visas igen.
4. Sök bike och kontrollera att Cykel går att välja. Kontrollera läsbarhet,
   synligt fokus och att kontrollerna ryms utan vågrät sidrullning.

**Förväntat resultat:**

- Både ikonnamn och svenska benämningar går att söka. Hela katalogen kan
  bläddras; tomma resultat erbjuder en tydlig väg tillbaka.
- Tangentbordet kan välja ikoner och byta sida. Fokus stannar i det aktiva
  arbetsflödet. Resultat och valt läge har text och tillgängliga namn.
- Smala vyer och båda teman behåller läsbara, åtkomliga kontroller.
