# Manuella testfall för profilbilder

Testfallen omfattar privata bildförslag, historik, ångring, fel och åtkomst.
Anteckna commit, webbläsare och godkänt eller underkänt resultat vid körning.

## Konfigurerade användare

- Alex Exempel är administratör i testhushållet och använder Google.
- Robin Exempel är inbjuden medlem och använder Microsoft i en annan
  webbläsarprofil.
- En tredje profil är utloggad. För hushållsgränsen har Robin även tillgång
  till ett separat hushåll i den isolerade testinstallationen.

## Allmän förberedelse

1. Använd en isolerad installation med påhittade uppgifter. Skapa objektet
   Lo Exempel med en beskrivning och ett privat förslag. Förbered påhittade
   JPEG-, PNG- och WebP-bilder, en textfil döpt till PNG och en fil över 10 MB.
2. Använd ett nytt hushåll eller återställ samma testutgångsläge mellan
   fallen. Behåll inloggningar och databas vid normal omstart.

## Bildförslag och historik

### BILD-01: Bevara text och återställ tidigare bild efter omstart

**Syfte:** Verifiera samma privata utkast, beständighet och ångring för bilder.

**Användare:** Alex.

**Förutsättningar:** Lo Exempel finns i Alex utkast utan sparad bild.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-01: profile image proposals preserve text, survive restart
and undo replacement”.

**Steg:**

1. Öppna Lo Exempels detaljer. Välj en PNG-bild. Kontrollera förhandsbilden
   och beskedet om privat förslag.
2. Skriv en ny beskrivning utan att skicka. Kontrollera att bildvalet är
   inaktiverat. Växla till rymdkartan och öppna detaljerna. Lägg texten i
   utkastet och spara hela utkastet.
3. Starta om servern normalt och ladda om sidan. Öppna Lo och byt bilden
   till WebP. Stäng formuläret och spara hela utkastet.
4. Öppna historiken. Läs och se bilderna före och efter senaste sparandet.
   Ångra sparandet och spara hela utkastet.

**Förväntat resultat:**

- Bilden läggs på rätt objekt som privat förslag. Oskickad text bevaras vid
  vybyte och bildvalet kan inte skriva över den.
- Sparad bild och beskrivning överlever omstart. Historiken visar bytet.
- Ångring återför den första bilden och bevarar den ändrade beskrivningen.

### BILD-02: Avvisa felaktiga bilder och återhämta bildborttagning

**Syfte:** Bevara tidigare förslag vid fel och bekräfta endast ett sparande.

**Användare:** Alex.

**Förutsättningar:** Lo Exempel finns i Alex utkast. Testmiljön kan avbryta
svaret på ett genomfört sparande utan att stoppa servern.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-02: invalid images retain proposals and interrupted removal
recovers its durable receipt”.

**Steg:**

1. Välj en JPEG-bild på Lo. Försök sedan välja textfilen döpt till PNG och
   filen över 10 MB. Läs felen och kontrollera bilden och beskrivningen.
2. Stäng formuläret och spara. Öppna Lo och välj **Ta bort profilbild**.
   Granska att borttagningen är ett privat förslag.
3. Avbryt svaret på nästa sparande genom testmiljön. Spara hela utkastet.
   Läs beskedet om okänt utfall och välj **Hämta samma kvitto igen**.
4. Kontrollera historiken. Ångra bildborttagningen och granska utkastet.

**Förväntat resultat:**

- Ogiltiga och för stora filer ger begripliga fel med tidigare bild och
  beskrivning kvar. Det går fortfarande att spara det giltiga utkastet.
- Okänt utfall ger ingen falsk sparbekräftelse. Kvittot bekräftar en enda
  bildborttagning och historiken har inget dubbelt sparande.
- Ångring föreslår rätt tidigare bild igen.

### BILD-03: Neka privata och historiska bildadresser efter återkallad tillgång

**Syfte:** Verifiera privata förslag och aktuellt medlemskap för bildåtkomst.

**Användare:** Alex, Robin och den utloggade profilen.

**Förutsättningar:** Robin har tillgång till samma hushåll som Alex.
Testmiljön kan göra direkta API-anrop som respektive inloggad profil.

**Integrationstest:**
[profile-images.spec.ts](../../tests/integration/profile-images.spec.ts),
testfallet “BILD-03: private, historical and known image addresses enforce
current household access”.

**Steg:**

1. Lägg en WebP-bild på Lo i Alex utkast. Kopiera bildadressen och öppna
   den som Robin och utloggad. Spara som Alex och öppna samma adress som Robin.
2. Byt bilden i Alex utkast. Prova den nya bildadressen som Robin.
3. Återkalla Robins tillgång som Alex. Prova båda bildadresserna igen,
   även med det andra hushållets identitet i adressen.
4. Försök ladda upp och ta bort Los bild genom API som Robin och utloggad.

**Förväntat resultat:**

- Endast Alex ser osparade bildversioner. Robin ser den gemensamma bilden
  efter sparande. Utloggad får inte tillgång.
- Återkallad tillgång stoppar läsning av kända och äldre bildversioner samt
  bildändringar. En annan hushållsadress ger inte tillgång.
