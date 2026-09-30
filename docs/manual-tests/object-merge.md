# Manuella testfall för sammanslagning

Testfallen omfattar uttrycklig identitet, uppgifter och samband vid
sammanslagning samt privat utkast, kvitto, historik och ångring.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

Alex är administratör och medlem i hushållet Linden. Använd en andra
webbläsare med samma inloggning för att kontrollera återupptagning.
Robin är en annan inbjuden medlem i samma hushåll och använder en egen
webbläsarprofil. Använd endast påhittade uppgifter och installationens
testinloggning.

## Allmän förberedelse

Följ [ingångarna till arbetsytorna](README.md#öppna-arbetsytor) när
fallen anger formulär, samtal, profil eller administration.

1. Starta en isolerad testinstallation. Logga in som Alex och skapa Linden.
2. Återställ installationen mellan körningar. Behåll databasen vid omstart
   och använd samma hushåll och inloggning i båda webbläsarna.

## Sammanslagning och ångring

### SAMMANSLAGNING-01: granska identiteter, samband och ångra hela sparandet

**Syfte:** Kontrollera uttryckliga val, blockerad identitet, återupptagning
och återställning av originalidentiteter med oberoende arbete bevarat.

**Användare:** Alex i båda webbläsarna.

**Förutsättningar:** Två sparade objekt heter Lo Exempel. Det första har
beskrivningen Första uppgiften, det andra Andra uppgiften. Anteckna deras
identiteter. Båda har varsitt samband av samma typ till Blått kort;
det andra sambandet är manuellt upphört. Lägg Robin Exempel i ett eget
utkast och behåll förslaget osparat.

**Integrationstest:**
[merge.spec.ts](../../tests/integration/merge.spec.ts),
testfallet “SAMMANSLAGNING-01: explicit identities and edge choices survive
restart, lost receipt and whole-save undo”.

**Steg:**

1. Välj **Slå samman objekt**. Välj första Lo som objekt som behåller sin
   identitet och andra Lo som objekt som tas in. Granska identifierare,
   beskrivningar och samband. Välj andra objektets beskrivning.
2. Välj **Behåll sambandet** för båda och lägg förslaget i utkastet.
   Kontrollera att dubbletten avvisas utan att utkastet ändras.
3. Välj **Ta bort sambandet** för det första sambandet. Lämna bekräftelsen
   av samma företeelse omarkerad och lägg förslaget i utkastet.
4. Kontrollera att **Spara hela utkastet** är spärrad. Välj **Kasta
   sammanslagningen för att rätta**. Robin ska finnas kvar i utkastet.
5. Välj objekten och uppgifterna igen, behåll endast det andra sambandet
   och bekräfta uttryckligen att objekten är samma företeelse.
6. Lägg förslaget i utkastet. Starta om installationen och ladda om sidan.
   Kontrollera hela skillnaden. Kör engångskoden för förlorat sparsvar i
   [BILD-02](profile-images.md#bild-02-avvisa-felaktiga-bilder-och-återhämta-bildborttagning)
   i den här sidans Console **före** nästa sparande. Välj **Spara hela
   utkastet** utan att ladda om först. Koden inväntar serversvaret innan
   appen får anslutningsfelet. Kontrollera det okända utfallet och välj
   **Hämta samma kvitto igen**. Ladda om, öppna **Mina sparförsök** och
   **Visa historik**: samma genomförda försök och kvitto ska finnas, med
   exakt en ändringsgrupp för sammanslagningen. Koden återställer `fetch`
   efter ett svar; ladda om sidan för att återställa om provet avbryts.
7. Rätta det kvarvarande objektets namn till Senare namn och spara.
   Lägg Eget senare objekt i utkastet. Starta om installationen.
8. Öppna den andra webbläsaren. Välj **Visa historik**, hitta
   sammanslagningen och välj **Visa ändringarna**. Öppna **Granskade objekt
   före sammanslagningen** och granska identiteter och upphörd status.
9. Välj **Ångra sparandet**, granska hela förslaget och spara.

**Förväntat resultat:**

- Samma namn bekräftar inte identiteten. Olika uppgifter och kolliderande
  samband kräver uttryckliga val. Obesvarad identitet spärrar hela sparandet.
- Utkastet och historiken överlever omstart. Förlorat svar skapar inte en
  extra ändringsgrupp. Kvitto och gemensam karta beskriver samma resultat.
- Ångringen återställer båda ursprungliga identiteterna, beskrivningarna
  och sambanden, inklusive upphörd status. Senare namn och Eget senare
  objekt bevaras. Robin ingår i samma ursprungliga sparande och ångras också.

### SAMMANSLAGNING-02: granska ändrat underlag utan att tappa oberoende val

**Syfte:** Kräv nya uttryckliga val när granskade uppgifter ändras och
behåll granskningen när bara oberoende innehåll ändras.

**Användare:** Alex och Robin i varsin webbläsarprofil.

**Förutsättningar:** Två sparade objekt heter Lo Exempel med olika
beskrivningar. Båda har varsitt likadant samband till Blått kort. Ett
fjärde sparat objekt heter Oberoende objekt. Alex har Eget privat förslag
i sitt utkast. Anteckna de båda objektens och sambandens identiteter.

**Integrationstest:**
[merge.spec.ts](../../tests/integration/merge.spec.ts),
testfallet “SAMMANSLAGNING-02: refreshed source facts require new choices
while independent changes preserve review”.

**Steg:**

1. Alex öppnar **Slå samman objekt**, väljer de två Lo, den andra
   beskrivningen och att behålla båda sambanden. Bekräfta samma företeelse.
2. Robin ändrar beskrivningen på Oberoende objekt och sparar hela utkastet.
3. Alex lägger sammanslagningen i utkastet och läser dubblettfelet.
   Välj **Hämta aktuellt underlag**. Kontrollera att identitetsbekräftelse,
   beskrivningsval och sambandsval finns kvar. Välj nu att ta bort det
   första sambandet.
4. Robin ändrar beskrivningen på det andra Lo till Ändrat efter
   granskningen och sparar hela utkastet.
5. Alex försöker lägga sammanslagningen i utkastet. Läs beskedet om ändrat
   underlag och välj **Hämta aktuellt underlag**. Läs den nya beskrivningen
   och kontrollera att tidigare val och identitetsbekräftelse är tömda.
6. Granska båda objekten igen, välj den nya andra beskrivningen, bekräfta
   samma företeelse och behåll endast det andra sambandet. Lägg förslaget
   i utkastet och välj uttryckligen **Spara hela utkastet**.
7. Starta om installationen och öppna kartan och historiken igen.

**Förväntat resultat:**

- Oberoende sparade ändringar återställer inte granskningen. Dubblettfel
  och inaktuellt underlag ändrar inget i Alex privata utkast.
- Ändrade granskade uppgifter kräver nya val och ny identitetsbekräftelse.
  Det gamla valet tillämpas inte automatiskt på ett nytt värde.
- Efter uttryckligt sparande behålls första identiteten, den nya andra
  beskrivningen, Robins oberoende ändring och Alex privata förslag. Endast
  det andra sambandet finns kvar och pekar på första objektet.
- Historiken återger de faktiskt granskade nya uppgifterna. Avvisade
  försök skapar inga extra sparanden. Resultatet överlever omstart.

### SAMMANSLAGNING-03: tangentbord, återgång och oberoende oskickat arbete

**Syfte:** Hålla granskning och oberoende text kvar vid tillfällig
navigering samt ge synligt fokus vid öppning, avbrott och nytt förslag.

**Användare:** Alex.

**Förutsättningar:** Två sparade objekt heter Lo Exempel med olika
beskrivningar. Ett tredje sparat objekt heter Oberoende objekt. Inga
privata förslag eller oskickade formulär finns när provet börjar.

**Integrationstest:**
[merge.spec.ts](../../tests/integration/merge.spec.ts),
testfallet “SAMMANSLAGNING-03: keyboard merge review survives panels and
Settings with independent unsent work”.

**Steg:**

1. Öppna Lista och använd tangentbordet för **Slå samman objekt**.
   Kontrollera synligt fokus på sammanslagningens rubrik.
2. Välj båda Lo, den andra beskrivningen och bekräfta samma företeelse.
3. Öppna uppgifterna för Oberoende objekt och läs beskrivningen.
4. Växla till **Lista och utkast**. Besök Inställningar och välj
   **Tillbaka till kartan**. Stäng arbetsytan och öppna Lista igen.
   Kontrollera att sammanslagningens val finns kvar efter varje återgång.
5. Använd tangentbordet för **Stäng sammanslagningen utan att skicka**.
   Kontrollera fokus på **Slå samman objekt** och att kartan är oförändrad.
   Återgå till Oberoende objekt och börja redigera beskrivningen. Skriv
   Oskickat arbete finns kvar utan att lägga texten i utkastet.
6. Öppna sammanslagningen igen. Kontrollera att det uttryckliga avbrottet
   tömmer valen. Välj objekten och den andra beskrivningen, bekräfta samma
   företeelse. Besök Inställningar och återgå med valen kvar. Lägg
   sammanslagningen i utkastet med tangentbordet.
7. Kontrollera fokus på **Hela mitt utkast**. Sparandet ska fortfarande
   vara spärrat eftersom den andra texten är oskickad. Återgå till den
   texten och välj **Lägg i mitt utkast**.
8. Välj **Spara hela utkastet**, invänta kvittot och starta om installationen.

**Förväntat resultat:**

- Tillfällig navigering behåller granskningen och den oberoende texten.
  Ett uttryckligt avbrott tömmer enbart sammanslagningens formulärval.
- Öppning, avbrott och skickat förslag ger logiskt, synligt fokus.
  Oberoende oskickad text hindrar inte att sammanslagningen granskas.
- Varken navigering eller skickade förslag ändrar den gemensamma kartan.
  Hela sparandet inväntar att oskickad text hanteras uttryckligen.
- Ett kvitto omfattar sammanslagningen och den andra beskrivningen.
  Det första Lo behåller sin identitet; resultatet finns kvar efter omstart.
