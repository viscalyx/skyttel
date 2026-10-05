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

**Syfte:** Bevara ikon, text och bild i samma kompletta objektförslag.

**Användare:** Alex.

**Förutsättningar:** Hushållet saknar Min cykel. Ha en giltig PNG-bild.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-01: icon choice survives type and image changes, save and
restart before explicit reset”.

**Steg:**

1. Välj **Nytt objekt**. Skriv Min cykel och Bevara texten i Grunduppgifter.
   Öppna **Livscykel och utseende**, sök cykel och välj **Cykel**.
2. Öppna **Grunduppgifter**, byt typ till **Fordon** och återgå till
   **Livscykel och utseende**. Kontrollera ikonvalet. Välj PNG-bilden och
   kontrollera förklaringen att profilbilden visas före ikonen. Välj
   **Lägg i utkastet och stäng**. Kontrollera bilden i kartans symbol.
3. Redigera objektet. Öppna **Livscykel och utseende** och välj **Ta bort
   profilbilden ur formuläret**. Kontrollera att förklaringen nu anger
   ikonen som synlig. Lägg hela formuläret i utkastet och
   kontrollera cykelikonen i kartan.
4. Redigera beskrivningen till Bevara mer text, lägg hela formuläret i
   utkastet och spara hela utkastet separat. Starta om servern och ladda om.
5. Kontrollera ikon och beskrivning. Redigera, välj **Typens standardikon**
   och lägg hela formuläret i utkastet. Spara utkastet separat.

**Förväntat resultat:**

- Lokala ikon-, bild- och typval ändrar inga förslag före komplett tillägg.
- Bilden har företräde. Borttagningen återger Cykel. Typbytet behåller valet.
- Ikon och text finns kvar efter sparande och omstart. Standardvalet delas
  först efter komplett tillägg och separat sparande.

### IKON-02: Sök hela katalogen med tangentbord i smala teman

**Syfte:** Verifiera sökresultat, sidval, fokus och tillgängliga kontroller.

**Användare:** Alex.

**Förutsättningar:** Objektet Lo finns i det privata utkastet.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-02: full catalog search, empty results and keyboard
pagination work in narrow themes”.

**Steg:**

1. Redigera Lo och öppna **Livscykel och utseende**. Upprepa på dator och i
   smala telefonvyer, med ljust och mörkt systemtema.
2. Sök telescope. Gå till valet med tangentbord och tryck Enter. Kontrollera
   markeringen. Sök ingen-symbol-xyz och läs beskedet.
3. Välj **Rensa sökningen**. Kontrollera fokus i sökfältet. Välj **Nästa** och
   kontrollera fokus på första ikonen. Välj **Föregående**.
4. Sök bike. Kontrollera att Cykel går att välja, att text och fokus syns
   och att kontrollerna ryms utan vågrät sidrullning.

**Förväntat resultat:**

- Ikonnamn och svenska benämningar går att söka genom hela katalogen.
- Tomma resultat erbjuder återgång. Tangentbord kan välja ikon och byta sida.
- Fokus stannar i arbetsflödet. Resultat och valt läge har tillgängliga namn.
- Smala vyer och båda teman behåller läsbara, åtkomliga kontroller.

### IKON-03: Nå ikonval och sparande i ett kort fönster

**Syfte:** Verifiera att förstoring inte gör formuläret oåtkomligt.

**Användare:** Alex.

**Förutsättningar:** Hushållet saknar Lilla cykeln. Använd ett fönster på
ungefär 1 280 × 1 000 bildpunkter med 400 procents webbläsarzoom, eller
320 × 250 CSS-bildpunkter.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-03: a short viewport keeps icon controls, unsent text and
shared save reachable”.

**Steg:**

1. Välj **Nytt objekt**. Skriv Lilla cykeln och Min oskickade text.
2. Rulla till **Livscykel och utseende**. Sök cykel och välj **Cykel**.
3. Välj **Typens standardikon**. Kontrollera markeringen och att
   beskrivningen i Grunduppgifter finns kvar.
4. Rulla till **Lägg i utkastet och stäng** och välj den. Spara hela
   utkastet separat. Kontrollera sparat namn, beskrivning och standardikon.

**Förväntat resultat:**

- Fält, ikonval, sidval och knappar går att nå genom att rulla. Ingen fast
  rubrik eller knapp täcker den kontroll som används.
- Oskickad text bevaras. Återgången till standard sparas med objektet.
- Innehållet kräver ingen vågrät sidrullning.

### IKON-04: Behåll tangentbordsfokus under lokalt ikonval

**Syfte:** Behålla fokus utan att lägga ett ofärdigt formulär i utkastet.

**Användare:** Alex.

**Förutsättningar:** Ett nytt hushåll.

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-04: local keyboard icon choice and reset preserve the chosen
focus until complete staging”.

**Steg:**

1. Välj **Nytt objekt**, skriv Lo och öppna **Livscykel och utseende**.
2. Sök cykel. Välj Cykel, Typens standardikon och Cykel igen med Enter.
   Kontrollera markering och fokus efter varje val.
3. Flytta fokus till **Sök ikon**. Kontrollera att fokus stannar där och
   att utkastet ännu saknar förslag.
4. Välj **Lägg i utkastet och stäng**. Granska objektförslaget.

**Förväntat resultat:**

- Lokala val lämnar fokus på använd knapp och bevarar ett senare fokusval.
- Först komplett tillägg skapar ett privat förslag med vald cykelikon.

### IKON-05: Bevara ikon och text vid avvisat eller okänt tillägg

**Syfte:** Återhämta ett komplett objektförslag utan dubbla tillägg.

**Användare:** Alex.

**Förutsättningar:** Ett nytt hushåll. Använd kontrollerade svar enligt
[KARTA-17 och KARTA-18](map.md#karta-17-spärra-väntande-tillägg-och-behåll-ett-avvisat-formulär).

**Integrationstest:**
[object-icons.spec.ts](../../tests/integration/object-icons.spec.ts),
testfallet “IKON-05: rejected and lost complete icon staging preserve the
local choice and recover one proposal”.

**Steg:**

1. Välj **Nytt objekt**, skriv Lo och Bevarad ikontext. Öppna **Livscykel
   och utseende**, sök cykel och välj Cykel med Enter.
2. Avvisa nästa kompletta tillägg enligt KARTA-17. Aktivera **Lägg i utkastet
   och stäng** med Enter. Läs felet och kontrollera text och ikonmarkering.
3. Dölj svaret efter ett verkligt tillägg enligt KARTA-18. Försök igen och
   läs beskedet om okänt utfall. Kontrollera att vanligt tillägg är spärrat.
4. Fokusera **Kontrollera om ändringen lades i utkastet** och tryck Enter.
   Granska utkastet och historiken.

**Förväntat resultat:**

- Avvisat tillägg lämnar ikon och text kvar, utan något nytt förslag.
- Okänt utfall behåller ikonvalet och kräver kontroll före nytt försök.
- Bekräftad kontroll stänger formuläret och visar exakt ett privat
  objektförslag med text och cykelikon. Kartan och historiken är oförändrade.
