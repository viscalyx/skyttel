# Manuella testfall för permanent radering

Testfallen omfattar administratörens granskning, uttrycklig bekräftelse,
osäkert resultat, ändrat underlag och väntande städning efter omstart.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Använd en isolerad testinstallation enligt
[installationsguiden](../operations/installation.md).

- **Alex** är administratör i hushållet Linden och använder profil A.
- Profil B använder samma administratör för samtidig ändring av utkastet.

Använd bara påhittade uppgifter och testbilder. Permanent radering kan
inte ångras i Skyttel. Kör inte testfallen mot ett verkligt hushåll.

## Allmän förberedelse

1. Skapa Linden som Alex. Lägg **Lampan att radera** och
   **Stolen att bevara** i samma utkast och spara hela utkastet.
2. Lägg en testbild på lampan och spara. Anteckna bildens adress från
   webbläsarens nätverksverktyg för senare kontroll. Flytta lampan och
   stolen i din personliga vy så att båda får sparade placeringar.
3. Ändra stolens beskrivning till **Oberoende privat förslag** och lägg
   ändringen i det privata utkastet utan att spara hela utkastet.
4. Börja med en ny testinstallation eller återställ testunderlaget inför
   varje fall. Vid omstart inom ett fall ska samma databas finnas kvar.
5. Förbered operatörsåtkomst för omstart och för det kontrollerade
   anslutningsfelet i RADERING-02. Radera hämtade testexporter efter provet.

## Granska och genomför

### RADERING-01: Radera valt innehåll med tangentbordet

**Syfte:** Kontrollera att omfattningen granskas före radering och att
oberoende innehåll och privat arbete finns kvar efter omstart.

**Användare:** Alex som administratör.

**Förutsättningar:** Lampan har bild och historik. Stolen har ett privat
förslag enligt förberedelsen.

**Integrationstest:**
[household-erasure.spec.ts](../../tests/integration/household-erasure.spec.ts),
testfallet “RADERING-01: keyboard review erases selected content and
preserves unrelated work after restart”.

**Steg:**

1. Öppna **Administrera tillgång** och gå till **Permanent radering**.
   Läs skillnaden mot vanlig borttagning och upphört innehåll samt
   begränsningarna för nedladdade exporter och leverantörens interna kopior.
2. Använd Tab till lampans kryssruta och välj den med mellanslag.
   Välj **Granska raderingen** med tangentbordet.
3. Kontrollera **Omfattning att bekräfta**. Lampan, dess bildversion och
   en personlig placering ingår; stolen ska inte ingå. Bildens identifierare
   visas. Andra användares privata bildversioner och innehåll visas som antal.
4. Kontrollera att **Radera permanent** är inaktiverad. Skriv
   **RADERA PERMANENT** i bekräftelsefältet och aktivera knappen med Enter.
5. Invänta uttryckligt besked om slutförd radering. Starta om installationen
   med samma databas och ladda om sidan. Kontrollera raderingsstatus igen.
6. Öppna kartan, utkastet och historiken. Kontrollera att lampan är borta,
   stolen finns kvar och stolens privata beskrivning finns kvar.
7. Öppna lampans tidigare bildadress. Hämta en ny fullständig export och
   granska innehållet enligt [exportfallen](household-export.md).

**Förväntat resultat:**

- Enbart granskning raderar inget. Bekräftelse kräver den angivna texten.
- Lampan, dess tidigare värden och dess bild är inte åtkomliga genom
  kartan, historiken, bildadressen eller den nya exporten, även efter omstart.
- Stolen, dess bevarade historik, privata förslag och placering finns kvar.
- Ett besked om slutförd radering visas först när servern bekräftar hela
  rutinen. En tidigare nedladdad export ändras inte av raderingen.

## Osäkert och förändrat underlag

### RADERING-02: Återfinn resultatet efter förlorat svar

**Syfte:** Kontrollera att ett anslutningsavbrott inte presenteras som
slutförd radering och att serverns beständiga resultat kan återfinnas.

**Användare:** Alex som administratör.

**Förutsättningar:** En ny provkarta är förberedd. Operatören kan bryta
svaret på raderingsanropet efter att servern har slutfört det, utan att
ändra begäran. Integrationstestet bryter motsvarande svar vid nätverket.

**Integrationstest:**
[household-erasure.spec.ts](../../tests/integration/household-erasure.spec.ts),
testfallet “RADERING-02: a lost completion reply is recovered from durable
status without another erasure”.

**Steg:**

1. Välj lampan och granska omfattningen. Förbered avbrottet enligt
   förutsättningarna och bekräfta raderingen.
2. Kontrollera beskedet när svaret försvinner. Återställ anslutningen.
3. Välj **Kontrollera raderingsstatus och läs in aktuellt innehåll**.
   Kontrollera att den genomförda raderingen återfinns.
4. Ladda om sidan och kontrollera samma slutförda resultat. Öppna kartan
   och kontrollera att stolen finns kvar.

**Förväntat resultat:**

- Ett förlorat svar ger **Utfallet är oklart** och inget påstående om
  slutförd radering. Nytt innehåll kan inte väljas medan utfallet är oklart.
- Statuskontrollen återfinner den genomförda raderingen utan att skicka
  en andra radering. Resultatet finns kvar efter omladdning.
- Lampan är borta och stolen finns kvar. Avbrottet återställer inget.

### RADERING-03: Granska på nytt efter en samtidig ändring

**Syfte:** Kontrollera att en tidigare bekräftelse inte används när
innehållet ändras efter granskningen.

**Användare:** Alex i profil A och B.

**Förutsättningar:** Samma nya provkarta är öppen i båda profilerna.

**Integrationstest:**
[household-erasure.spec.ts](../../tests/integration/household-erasure.spec.ts),
testfallet “RADERING-03: a changed scope requires a new review and
confirmation before erasure”.

**Steg:**

1. Välj lampan och granska raderingen i profil A utan att bekräfta ännu.
2. Ändra stolens privata beskrivning till **Senare privat förslag** i
   profil B och lägg den i utkastet.
3. Skriv bekräftelsetexten och välj **Radera permanent** i profil A.
4. Kontrollera beskedet om ändrat innehåll och att båda objekten finns
   kvar. Välj **Granska raderingen** igen.
5. Kontrollera att bekräftelsefältet är tomt och knappen inaktiverad.
   Granska, skriv bekräftelsen igen och genomför raderingen.
6. Kontrollera att stolen och dess senare privata beskrivning finns kvar.

**Förväntat resultat:**

- Den gamla granskningen avvisas utan radering och kräver en ny granskning.
- Bekräftelsetexten återanvänds inte för den nya omfattningen.
- Den nya bekräftelsen kan slutföra raderingen och bevarar stolens
  oberoende privata förslag.

## Återhämtning av väntande städning

### RADERING-04: Slutför väntande städning efter omstart

**Syfte:** Kontrollera att en upptagen databas inte ger falskt besked om
slutförd radering och att ärendet kan fortsättas efter omstart.

**Användare:** Alex som administratör samt testinstallationens operatör.

**Förutsättningar:** En ny provkarta är förberedd. Operatören håller en
separat SQLite-läsning öppen mot testdatabasen före raderingen så att äldre
journalsidor inte kan städas. Läsningen ska kunna avslutas uttryckligen.
Integrationstestet håller en riktig separat lästransaktion och startar om
applikationsservern med samma databas medan läsningen är kvar.

**Integrationstest:**
[household-erasure.spec.ts](../../tests/integration/household-erasure.spec.ts),
testfallet “RADERING-04: pending cleanup survives application restart and
completes only after the reader releases”.

**Steg:**

1. Välj lampan, granska och bekräfta permanent radering medan operatörens
   läsning är öppen.
2. Kontrollera beskedet om väntande städning. Försök läsa hushållets karta
   och förbereda en export; innehållet ska vara tillfälligt otillgängligt.
3. Låt operatören starta om applikationsservern med samma databas utan att
   avsluta den separata läsningen. Ladda om administrationssidan.
4. Kontrollera att raderingen fortfarande inte påstås vara slutförd och
   att **Försök slutföra raderingen** erbjuds.
5. Låt operatören avsluta läsningen. Välj **Försök slutföra raderingen**.
6. Invänta slutförd status. Kontrollera kartan, stolens privata utkast
   och lampans tidigare bildadress.

**Förväntat resultat:**

- Raderingen är inte slutförd medan äldre journalsidor är låsta.
  Berört hushållsinnehåll kan inte läsas eller exporteras under väntan.
- Väntande status och stängd tillgång finns kvar efter serveromstart.
- När läsningen släpps kan samma ärende slutföras. Lampan och dess bild
  återkommer inte; stolen och dess privata förslag finns kvar.
