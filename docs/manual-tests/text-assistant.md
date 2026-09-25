# Manuella testfall för Skyttels textassistent

Fallen provar samlat utkast, rättelse och sparande, sena svar, avbrott,
kvittoåterhämtning och faktisk markering. Anteckna commit, webbläsare,
modell eller kontrollerad ersättare samt godkänt eller underkänt resultat.
All mänsklig körning görs efter specifikationens implementation i
[#97](https://github.com/viscalyx/skyttel/issues/97).

## Konfigurerade användare

- Alex Exempel är administratör i det påhittade hushållet Textprov.
- I den kontrollerade miljön väljs Google för lokal testinloggning utan
  externa konton. I verkligt modellprov använder Alex sin konfigurerade
  inloggning men enbart påhittat hushållsinnehåll.

## Allmän förberedelse

1. TEXT-01 använder den
   [verkliga modellens isolerade setup](../development/text-assistant.md#enable-real-provider-access).
   Övriga fall använder den
   [kontrollerade startguiden](../development/manual-text-assistant.md).
   Den senare håller varje modellsvar tills du släpper det i terminalen.
   Den provar inte en verklig modells svenska språkförståelse.
2. Skapa hushållet Textprov. Skapa objektet **Lo Exempel** av typen
   **Person**, med beskrivningen **Påhittad uppgift**, genom formuläret.
   Välj **Lägg i mitt utkast** och lämna förslaget osparat.
3. Starta textassistenten med båda uttryckliga valen. Kontrollera först
   att enbart AI-valet inte räcker för att aktivera startknappen.
4. Starta en ny tom kontrollerad installation mellan TEXT-02 till TEXT-06.
   Behåll samma databas under ett omstartsprov. Avsluta med `quit` och
   stäng provfönstret enligt startguidens städningssteg.

## Samtal och samlat sparande

### TEXT-01: familjeärendet sparas samlat med bevarad oskickad formulärtext

**Syfte:** Fortsätta ett befintligt utkast och spara en tydlig rättelse
utan extra ja, med ett riktigt kvitto.

**Användare:** Alex med verklig Terra low. CI använder en deterministisk
leverantörsersättare för samma applikationsflöde.

**Förutsättningar:** Isolerad installation med serverns privata OpenAI-nyckel.
Lo-förslaget finns redan. API-anrop i detta mänskliga prov kan kosta pengar.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
testfallet “TEXT-01: familjeärendet sparas samlat med bevarad oskickad
formulärtext”.

**Steg:**

1. Beskriv familjens påhittade Molnmusik: tjänstekonto, separat kontakt-
   och inloggningsadress, Alex som avtalspart, Kim som betalare och ett
   kort som betalningsmedel. Lo använder tjänsten. Ange 149 kr per månad.
2. Svara på frågor om identiteter. Ange uttryckligen att ett omnämnt
   bankkonto är ospecificerat; låt en uppgift vara okänd och en annan
   osäkert uppgiven. Be om en begriplig sammanställning av hela utkastet.
3. Kontrollera att tidigare Lo-förslaget ingår och att kontot inte har
   blivit en e-postadress. Be om en rättelse av inloggningsadressen.
4. Öppna ett objekt i formuläret och skriv **Osänd text som ska finnas
   kvar** i beskrivningen utan att lägga texten i utkastet.
5. Skriv **Rätta priset till 189 kr och spara** i assistenten. Öppna kvittot.
6. Återläs abonnemang, betalare, betalningsmedel, konto och adresser.
   Kontrollera också okända och osäkra uppgifter samt den osända texten.

**Förväntat resultat:**

- Hela det beständiga utkastet sparas samlat. Ett extra ja krävs inte
  enbart därför att rättelsen ändrar version. Osäker identitet eller
  samtidig konflikt måste däremot redas ut före ett nytt sparbesked.
- Statusen bekräftar ett beständigt kvitto. Pris är 189 kr och de olika
  rollerna samt uppgifternas kunskapsstatus bevaras utan antagna fakta.
- Oskickad formulärtext finns kvar och har inte blivit del av sparandet.
- Dokumentera verklig modellförståelse separat från CI:s deterministiska
  verifiering. Ingen sådan mänsklig körning påstås här vara genomförd.

## Kontrollerade sena svar och fel

### TEXT-02: sena svar efter kastat utkast och avbrott ändrar inte nytt arbete

**Syfte:** Ett äldre uppdrag får inte återinföra ett kastat förslag.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns. Terminalen håller modellsvar.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
testfallet “TEXT-02: sena svar efter kastat utkast och avbrott ändrar inte
nytt arbete”.

**Steg:**

1. Skriv **Rätta namnet**. Behåll numret från terminalens `held`-händelse.
   Kopiera `draft.version`, `contentVersion`, Lo-förslagets `id` och hela
   dess `after`-objekt. Byt bara `name` till **För sent** i kopian.
2. Välj **Kasta hela utkastet** i kartan medan svaret fortfarande hålls.
3. Släpp det gamla numret med `tool NUMMER propose_object JSON`.
   `JSON` ska innehålla de ursprungliga `version`, `contentVersion`,
   `id`, `baseRevision: null` och det kopierade objektet under `value`.
   Använd inte den nya versionen efter kastandet.
4. Skicka **Skapa ett nytt förslag**. När nästa svar hålls, välj
   **Avbryt uppdrag**. Släpp även det svaret som ett `propose_object`
   med den version som hörde till just det uppdraget och ett nytt ID.
5. Kontrollera utkast och sparad karta. Fortsätt med ett vanligt formulär.

**Förväntat resultat:**

- Pågående status syns medan svaret hålls. Den gamla versionen avvisas
  efter kastandet, och aktuellt underlag visas för nästa besked.
- Det avbrutna uppdraget lägger inte tillbaka något. Nya formulär fungerar.
- Ett avbrott påstås aldrig ångra ett redan genomfört sparande.

### TEXT-03: nekade sparbesked och modellfel lämnar formulärarbetet tillgängligt

**Syfte:** Det verkliga meddelandet styr tillåtelsen att spara och ett
leverantörsfel förstör inte utkastet.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns osparat.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
testfallet “TEXT-03: nekade sparbesked och modellfel lämnar formulärarbetet
tillgängligt”.

**Steg:**

1. Skicka **Spara inte**. Släpp det hållna svaret med
   `tool NUMMER save_draft JSON`, där `JSON` innehåller terminalens aktuella
   `version`, `contentVersion` och `operationId: "nekad-1"`.
2. Upprepa med **Vad händer om vi sparar?**, **Spara ej**, **Spara senare**
   och **Skriv ”spara” i beskrivningen**. Använd ett nytt prov-ID varje gång.
3. Skicka **Beskriv mitt utkast** och skriv `fail NUMMER` för det svaret.
4. Öppna Lo i formuläret, rätta namnet till **Lo Lind** och lägg det i
   utkastet. Kontrollera att tidigare förslag finns kvar.

**Förväntat resultat:**

- Ingen av de nekade, hypotetiska, uppskjutna eller citerade begärandena
  sparar kartan, även när ersättaren försöker anropa sparverktyget.
- Modellfelet visas begripligt. Utkastet och vanligt formulärarbete finns
  kvar. Provet är ett kontrollerat verktygsprov, inte bevis på språkförståelse.

## Kvitton och faktisk visning

### TEXT-04: ett tappat sparbesked återfinns efter omstart utan dubbelt sparande

**Syfte:** Återfinna ett genomfört sparande när webbläsaren saknar svaret.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns. Chrome utvecklarverktyg är öppna.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
testfallet “TEXT-04: ett tappat sparbesked återfinns efter omstart utan
dubbelt sparande”.

**Steg:**

1. Skicka **Spara hela utkastet nu** och vänta på terminalens `held`.
2. I Chrome Network, välj **Offline**. Detta bryter webbläsarens hämtning
   av uppdragsstatus; serverns leverantörsersättare fortsätter i terminalen.
3. Släpp det hållna svaret med `tool NUMMER save_draft JSON`. Ange den
   ursprungliga utkastversionen, `contentVersion` och ett prov-ID.
4. Välj **No throttling** igen och stäng eller ladda inte om sidan än.
   Läs sparförsöken genom följande skrivskyddade konsolkommando. Ersätt
   `HUSHÅLL` med hushållets ID från den hållna begärans objekttyp:

   ```javascript
   const kontroll = await fetch('/api/households/HUSHÅLL/map/operations');
   console.log((await kontroll.json()).operations.map(
     ({ operationId, status }) => ({ operationId, status })
   ));
   ```

5. Vänta tills försöket visar `succeeded`. Om det ännu inte är klart,
   upprepa bara den skrivskyddade kontrollen; gör inget nytt sparförsök.
   Skriv sedan `restart` i launcher-terminalen.
6. Ladda om sidan, godkänn en ny textanslutning och öppna **Tidigare
   sparförsök**. Kontrollera kvittot, Lo och det nu tomma utkastet.

**Förväntat resultat:**

- Frånkopplingen visas som saknat svar. Det betyder inte att sparandet
  misslyckades. Omstart bevarar det genomförda försöket och dess enda kvitto.
- En ny normal MCP-anslutning återfinner kvittot. Ingen extra kopia eller
  nytt sparande behövs. Webbläsarens offlineprov bryter statushämtningen;
  CI avbryter dessutom det accepterade meddelandesvaret efter verklig commit.

### TEXT-05: markering kräver visning och skyddar oskickad text

**Syfte:** Markeringsbesked ska motsvara ett faktiskt visat urval.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns och inget formulär har osänd text.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
testfallet “TEXT-05: markering kräver visning och skyddar oskickad text”.

**Steg:**

1. Skriv **Markera Lo i kartan**. Kopiera Lo-förslagets ID från `held`.
   Svara med `tool NUMMER show_map_object {"objectId":"LO-ID"}`, där
   `LO-ID` ersätts med det verkliga prov-ID:t.
2. Kontrollera att Lo blir valt och att **Redigera Lo Exempel** visas.
   Nästa `held` ska innehålla `displayed: true`. Svara
   `reply NUMMER Markerat!` och kontrollera markeringsstatusen.
3. Öppna Lo och skriv **Osänd uppgift** i beskrivningen. Skicka
   **Markera Lo igen** och upprepa visningsanropet.
4. Kontrollera `displayed: false`, släpp sluttexten **Markerat!** igen
   och kontrollera både statusen och den oskickade texten.

**Förväntat resultat:**

- Första markeringsstatusen kommer efter faktisk webbläsarvisning.
- Det andra försöket ger ingen ny bekräftad markering. Oskickad text
  finns kvar. **Markerat!** visas som obekräftad samtalstext, skild från
  Skyttels status. Modellens text ensam ändrar inte den betrodda statusen.

### TEXT-06: obekräftad samtalstext skiljs från sparande och markering

**Syfte:** Skilja modellens fria svar från bekräftade resultat, även när
svaret påstår att något har utförts med andra ord.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns i utkastet. Anteckna aktuellt urval
i kartan innan du börjar. Inget sparande är genomfört.

**Integrationstest:**
[text-assistant.spec.ts](../../tests/integration/text-assistant.spec.ts),
“TEXT-06: obekräftad samtalstext skiljs från sparande och markering”.

**Steg:**

1. Skicka **Kontrollera utkastet.** till textassistenten. Vänta på `held`
   i terminalen och ersätt `NUMMER` med anropets ID:

   ```text
   reply NUMMER Klart. Ändringarna är nu lagrade i hushållets karta.
   ```

2. Kräv rubriken **Assistentens samtalstext – inte en bekräftelse** vid
   texten och förklaringen att bara Skyttels status och kvitton bekräftar
   sparande och markering. Kontrollera det osparade Lo-förslaget och att
   inget nytt spar- eller markeringsbesked visas i statusen.
3. Skicka samma fråga på nytt för varje svar nedan. Använd det nya
   `held`-numret och släpp ett svar i taget:

   ```text
   reply NUMMER Saved successfully.
   reply NUMMER Lo är nu vald och visas i kartan.
   reply NUMMER Har du sparat tidigare, och vem betalar?
   ```

4. Kontrollera att varje svar visas i samma tydligt märkta samtalsdel.
   Frågan ska gå att läsa som en vanlig följdfråga. Kontrollera utkastet,
   kartans urval och **Tidigare sparförsök** igen.
5. Skicka **Spara hela utkastet nu**. Läs `version` och `contentVersion`
   från det nya `held.draft`. Släpp anropet med följande kommando, efter
   att du ersatt `NUMMER`, `VERSION` och `CONTENT` med aktuella värden:

   ```text
   tool NUMMER save_draft {"version":VERSION,"contentVersion":CONTENT,"operationId":"text-proof-save"}
   ```

6. Kräv den verkliga statusen **Sparat. Hela utkastet finns i hushållets
   karta.** Öppna **Visa kvittot** och kontrollera Lo i den sparade kartan
   samt ett tomt utkast.

**Förväntat resultat:**

- Andra språk och omskrivningar blir inte bevis på sparande eller markering.
  Samtalstexten behålls men dess obekräftade källa framgår.
- Efter de fyra fria svaren är Lo fortfarande osparad, kartans urval är
  oförändrat och inget kvitto finns för dessa svar. Det sista riktiga
  sparanropet ger däremot kvitto, sparad Lo och bekräftad status.
- Användbara frågor försvinner inte genom en lista med förbjudna ord.
