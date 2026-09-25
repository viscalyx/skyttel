# Manuella testfall för Skyttels röst

Fallen provar samma privata utkast, MCP-regler och kvitton som textassistenten.
Anteckna commit, webbläsare, operativsystem, mikrofon, modell eller kontrollerad
ersättare samt resultat. All mänsklig körning sker efter implementationen i
[#97](https://github.com/viscalyx/skyttel/issues/97).

## Konfigurerade användare

- Alex Exempel är administratör i det påhittade hushållet Talprov, eller
  TestHousehold när det färdiga familjeunderlaget används.
- Kontrollerad inloggning använder Google utan ett verkligt externt konto.
- Verkliga modellprov använder konfigurerad inloggning och enbart påhittade data.

## Allmän förberedelse

1. Välj den kontrollerade vägen eller det verkliga talprovet i TAL-01.
   TAL-02 och TAL-03 använder den
   [kontrollerade startguiden](../development/manual-voice-assistant.md).
   Den senare håller varje Terra-anrop och använder tysta mediespår; den
   lyssnar inte på din mikrofon och provar inte svensk talförståelse.
2. För TAL-02 och TAL-03: skapa Talprov och lägg **Lo Exempel**, typ
   **Person**, med beskrivningen **Påhittad uppgift** i ditt utkast.
   Spara inte. TAL-01 har egna förberedelser nedan.
3. För TAL-02 och TAL-03: godkänn båda valen i textassistenten, välj
   **Starta textassistenten** och sedan **Starta röst**.
   Kontrollerade kommandon nedan skrivs i startguidens
   terminal. Ersätt `REQUEST`, `VERSION`, `CONTENT` och objekt-ID med värden
   från första `held`-meddelandets `draft`. Efter ett verktyg som ändrar
   utkastet hämtas den nya versionen från nästa `held.lastToolResult.version`.
   Läs hela verktygsresultatet; ett avvisat verktyg ger ingen ny godkänd version.
4. Starta en ny tom installation mellan fallen. Behåll samma databas under
   omstartsprovet. Stäng med `quit` och kontrollera städningen enligt guiden.

## Samtal och samlat sparande

### TAL-01: familjeärendet sparas med röst och bevarad oskickad formulärtext

**Syfte:** Utföra ett svenskt familjeärende utan tangentbord efter röststart,
inklusive rättelse och samlat sparande med verifierat kvitto.

**Användare:** Alex med kontrollerade leverantörer eller verklig Live,
marin och Terra low. Redovisa de två vägarna var för sig.

**Förutsättningar:** Den kontrollerade vägen kräver bara startguiden.
Det verkliga talprovet kräver isolerad installation, privat servernyckel
och fungerande mikrofon. Verkliga leverantörsanrop kan kosta pengar.
CI ersätter leverantörerna och mediegränsen; det bevisar inte språkförståelse
eller ljud.

**Integrationstest:**
[voice-assistant.spec.ts](../../tests/integration/voice-assistant.spec.ts),
“TAL-01: familjeärendet sparas med röst och bevarad oskickad formulärtext”.

**Steg, kontrollerat familjeunderlag:**

1. Starta en ny kontrollerad installation. Kör `seed-family` i terminalen
   före första inloggningen och vänta på `seeded`. Logga in som Alex.
   Hushållet TestHousehold finns redan; skapa inget nytt.
2. Välj **Kim Exempel** i listan. Skriv **Osänd text som ska finnas kvar**
   i beskrivningen utan att lägga texten i utkastet. Starta assistenten och
   rösten. Kontrollera Lo-förslaget, adressändringen och namnkonflikten
   i assistentens hela utkast.
3. Skriv `user Behåll Lo-förslaget, rätta priset till 189 kr och spara.`
   och sedan `delegate`. Från `held.draft` kopieras `version`,
   `contentVersion` och hela första objektet i `conflicts`. Ersätt markörerna
   nedan; `CONFLICT` ska vara det kopierade JSON-objektet, utan extra citattecken:

   ```text
   tool REQUEST resolve_conflict {"version":VERSION,"contentVersion":CONTENT,"conflict":CONFLICT,"choice":"proposed"}
   ```

4. Nästa `held.lastToolResult.version` är den nya utkastversionen. Anteckna
   den och skicka följande med det nya anropets ID:

   ```text
   tool REQUEST read_map {"query":"Familjens Molnmusik"}
   ```

5. Från nästa `held.lastToolResult.objects` kopieras abonnemangets `id`,
   `revision` och övriga värden. Bygg argumentet till `propose_object` med
   antecknad utkastversion, samma `contentVersion`, kopierat `id` och
   `baseRevision` lika med objektets `revision`. `value` ska innehålla hela
   det kopierade objektet utom `id`, `householdId` och `revision`. Ändra
   `description` till **Familjeabonnemang 189 kr per månad.** och ersätt
   `financialFacts` med följande JSON:

   ```json
   {
     "price": { "knowledge": "known", "value": "189" },
     "currency": { "knowledge": "known", "value": "SEK" },
     "paymentInterval": { "knowledge": "known", "value": "månad" }
   }
   ```

   Skriv `tool REQUEST propose_object` följt av hela argumentet som JSON
   på samma terminalrad. De tidigare delarna i utkastet ska finnas kvar.
6. Läs den nya `lastToolResult.version`. Släpp det nya hållna anropet med:

   ```text
   tool REQUEST save_draft {"version":VERSION,"contentVersion":CONTENT,"operationId":"family-manual-save"}
   ```

7. Kräv **Sparat. Hela utkastet finns i hushållets karta.** och öppna
   **Visa kvittot**. Återläs priset 189, Lo Lind, inloggningsadressen och
   befintliga betalningsroller. Utkastet ska vara tomt, osänd formulärtext
   bevarad och tidigare okända/osäkra uppgifter oförändrade.
8. Stäng rösten och kontrollera avslutade spår enligt startguiden.
   Avsluta med `quit` och kontrollera att den tillfälliga katalogen försvinner.

**Steg, verkligt svenskt tal:**

1. Följ [röstguidens verkliga setup](../development/voice-assistant.md#enable-and-operate)
   i en ny isolerad installation med påhittade data. Skapa Talprov och lägg
   Lo Exempel, typ Person, med beskrivningen Påhittad uppgift i utkastet.
   Välj Lo och skriv **Osänd text som ska finnas kvar** i beskrivningen
   utan att lägga texten i utkastet. Godkänn assistentens båda val.
   Kontrollera att mikrofonen inte används före **Starta röst**. Starta
   rösten och tillåt mikrofonen. Om ljud blockeras, välj **Spela upp ljud**.
2. Beskriv familjens Molnmusik med rösten: separat tjänstekonto, kontaktadress
   och inloggningsadress, Alex som avtalspart, Kim som betalare och ett kort
   som betalningsmedel. Lo använder tjänsten. Ange 149 kr per månad.
3. Svara muntligt på frågor, även med korta svar och rättelser. Ange ett
   bankkonto uttryckligen som ospecificerat. Lämna en uppgift okänd och en
   annan osäkert uppgiven. Be om en sammanställning av hela utkastet.
4. Kontrollera att det tidigare Lo-förslaget ingår. Konto och e-postadress
   ska förbli olika objekt. Säg en rättelse av inloggningsadressen.
5. Säg **Rätta priset till 189 kr och spara**. Inget tangentbord behövs
   för kartarbetet efter röststart.
6. Öppna kvittot och återläs roller, pris, kunskapsstatus och osänd text.
   Stäng rösten. Fortsätt med ett normalt formulär.
7. Anteckna den faktiskt provade enheten, mikrofonen och ljudutgången.
   Ytterligare Windows-, iPhone- och iPad-prov hör till den uppskjutna
   enhetsmatrisen i #97. De är inga nya villkor för detta falls eller
   specifikationens avslut. När sådana prov väljs, redovisa varje
   kombination separat, inklusive mikrofonavslag och ljuduppspelning.

**Förväntat resultat:**

- Rösten ställer följdfrågor när identiteten är oklar och bevarar rättelser.
  Ett fragment eller en paus blir inte ett nytt sparbesked.
- Ett tydligt aktuellt besked sparar hela utkastet, även den egna rättelsen,
  utan ett extra obligatoriskt ja. Konflikter behöver däremot redas ut.
- Sparstatus bygger på ett riktigt kvitto. Osänd text blir inte sparad.
  Konto, adresser och roller behåller sin betydelse och kunskapsstatus.
- Mikrofon och ljudresurser avslutas. Inget verkligt plattformsresultat
  tillskrivs CI eller de tysta kontrollerade ersättarna.

## Avbrott och återhämtning

### TAL-02: negativa besked och förlorad anslutning stoppar sena röständringar

**Syfte:** Stoppa otillåtna sparanden och sena förslag när anslutningen bryts.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns och rösten är igång.

**Integrationstest:**
[voice-assistant.spec.ts](../../tests/integration/voice-assistant.spec.ts),
“TAL-02: negativa besked och förlorad anslutning stoppar sena röständringar”.

**Steg:**

1. Skriv `user Spara inte.` och sedan `delegate`. Släpp det hållna anropet
   med följande rad, efter att du ersatt markörerna med aktuella tal:

   ```text
   tool REQUEST save_draft {"version":VERSION,"contentVersion":CONTENT,"operationId":"tal-prov"}
   ```

2. Kräv **Inget sparades**. Upprepa med `user Spara senare.`,
   `user Om jag säger spara.` och `user Säg ”spara”.`, alltid följt av
   `delegate` och en ny verktygsrad med det nya anropets ID och versioner.
3. Skriv `user Rätta namnet.` och `delegate`. Låt anropet vara hållet.
   Kopiera Lo-förslagets fullständiga `after`-värde och versioner från `held`.
4. Kör `window.skyttelVoiceFixture.disconnect()` i webbläsarkonsolen.
   Kräv avstängd mikrofon direkt och avslutad röst efter tre sekunder.
5. Släpp det gamla anropet med `tool REQUEST propose_object` följt av JSON
   med ursprunglig `version`, `contentVersion`, Lo-förslagets `id`,
   `baseRevision:null` och `value` lika med kopierat `after`, men ändrat
   `name` till **För sent**. Ta bort eventuella servermetadata som `id`,
   `householdId` och `revision` ur `value`.
6. Kontrollera Lo i utkastet och att vanlig formulärredigering fungerar.
   Kontrollera avslutade spår med `window.skyttelVoiceFixture.stats()`.
7. Prova även guidens exakta kontroller för nekad mikrofon och blockerad
   ljuduppspelning; återställ dem och kontrollera ett nytt uttryckligt startval.

**Förväntat resultat:**

- Inga negativa, uppskjutna, hypotetiska eller citerade besked sparar.
- Det sena förslaget ändrar ingenting. Lo heter fortfarande Lo Exempel.
- Alla mediespår avslutas och text/formulär är fortsatt användbara.
  Inget avbrutet ljudsvar påstås ha ångrat ett redan genomfört sparande.

### TAL-03: synlig markering och exakt sparåterhämtning fungerar efter röstomstart

**Syfte:** Bekräfta verklig markering och återhämta samma beständiga sparförsök.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Lo-förslaget finns och rösten är igång.

**Integrationstest:**
[voice-assistant.spec.ts](../../tests/integration/voice-assistant.spec.ts),
“TAL-03: synlig markering och exakt sparåterhämtning fungerar efter röstomstart”.

Det kontrollerade fallet förbereder ett väntande försök och bryter senare
anslutningen efter bekräftat sparande. Det döljer inget kvittosvar efter
databasens sparande; redovisa inte det som ett prov av förlorat sådant svar.

**Steg:**

1. Skriv `user Markera Lo Exempel.` och `delegate`. Hämta Lo-förslagets ID
   från `held`. Släpp med `tool REQUEST show_map_object {"objectId":"LO-ID"}`.
   Nästa `held` ska visa `displayed:true`. Avsluta med
   `reply REQUEST Objektet visas.`. Kräv synlig markering i kartan.
2. Skriv `user Spara.` och `delegate`. Släpp det hållna anropet med
   `tool REQUEST prepare_save {"version":VERSION,"contentVersion":CONTENT,"operationId":"tal-prov"}`.
   Avsluta nästa anrop med `reply REQUEST Försöket är förberett.`.
3. Kräv väntande sparförsök och ingen sparbekräftelse. Anteckna det riktiga
   operation-ID:t från **Tidigare sparförsök**; modellens `tal-prov` är inte
   kvittots ID. Stäng rösten och kör `restart` i terminalen.
4. Ladda om webbläsaren, godkänn en ny assistentanslutning och starta rösten.
   Skriv `user Slutför samma sparförsök.` och `delegate`. Inget Terra-svar
   behöver släppas: det exakta väntande försöket återhämtas via MCP.
5. Kontrollera ett genomfört kvitto med samma operation-ID och Lo i kartan.
   Kör `drop` efter sparandet; kontrollera att det genomförda kvittot finns
   kvar även om ett ljudsvar inte hördes. Vänta på avstängd röst, ladda om
   och godkänn en ny textassistentanslutning. Öppna **Tidigare sparförsök**
   och kontrollera samma genomförda kvitto igen.
6. Starta rösten igen. Kör `usage 12`, `usage 15` och `finalize off`.
   Stäng rösten. Kontrollera nätverkssvarets `voice.seconds:15` och
   `voice.usageFinal:false`. Återställ `finalize on` innan nästa prov.

**Förväntat resultat:**

- Markering bekräftas först efter den verkliga webbläsarens återkoppling.
  Ett accepterat kommentarspaket är inte bevis för hörbart tal.
- Omstart glömmer samtalet men bevarar utkast och sparförsök. Samma försök
  slutförs exakt en gång; korta ja eller nya allmänna uppdrag ersätter det inte.
- Avbrutet ljud återtar inget genomfört sparande. Saknad slutlig mätning
  förblir osäker: 12 följt av 15 är 15 kända sekunder, inte 27 eller säkert noll.

### TAL-04: samtalstext hålls isär från verifierade röstresultat

**Syfte:** Hålla modellens samtalstext skild från bekräftade resultat även
när den gemensamma assistenten används genom rösten.

**Användare:** Alex i den kontrollerade installationen.

**Förutsättningar:** Starta en ny installation enligt
[röstförberedelsen](../development/manual-voice-assistant.md). Skapa Talprov
med Lo Exempel som osparat Person-förslag. Starta textassistenten och rösten.
Vänta på **Lyssnar**. Anteckna kartans aktuella urval. Tysta mediespår
och terminalens kommentarspaket är inte bevis för hört tal.

**Integrationstest:**
[voice-assistant.spec.ts](../../tests/integration/voice-assistant.spec.ts),
“TAL-04: samtalstext hålls isär från verifierade röstresultat”.

**Steg:**

1. Kontrollera röstens synliga förklaring: AI-rösten kan innehålla fel;
   Skyttels status och kvitton bekräftar vad som har sparats eller markerats.
2. Kör `user Kontrollera utkastet.` och `delegate` i terminalen. Vänta på
   `held` och ersätt `REQUEST` med anropets ID:

   ```text
   reply REQUEST Klart. Ändringarna är nu lagrade i hushållets karta.
   ```

3. Kontrollera webbläsarens **Assistentens samtalstext – inte en
   bekräftelse**, kvarvarande Lo-förslag och status utan bekräftat sparande
   eller ny markering.
4. Kör `sessions`. Läs det senaste paketet med typen
   `session.commentary.append`. **Skyttels resultat** ska säga att inget
   nytt sparande eller markering är bekräftad. Modellens svar ska stå
   separat under **Modellens obekräftade samtalstext (inte ett resultatbesked)**.
5. Upprepa `user Kontrollera utkastet.` och `delegate` för varje rad
   nedan. Använd det nya hållna anropets ID och släpp ett svar i taget:

   ```text
   reply REQUEST Saved successfully.
   reply REQUEST Lo är nu vald och visas i kartan.
   reply REQUEST Har du sparat tidigare, och vem betalar?
   ```

6. Kontrollera oförändrat utkast och urval samt avsaknad av nytt kvitto.
   Frågan ska finnas i samtalsdelen och som obekräftad text i det senaste
   kommentarspaketet.
7. Kör `user Markera Lo Exempel.` och `delegate`. Kopiera Lo-förslagets
   ID från `held.draft` och använd följande kommando:

   ```text
   tool REQUEST show_map_object {"objectId":"LO-ID"}
   ```

8. Nästa `held.lastToolResult` ska visa `displayed:true`. Släpp med
   `reply REQUEST Vem betalar?`. Kräv verkligt markerad Lo, bekräftad
   markeringsstatus och kvarvarande fråga som obekräftad samtalstext.
   Kontrollera samma uppdelning i det senaste kommentarspaketet.
9. Kör `user Spara hela utkastet nu.` och `delegate`. Läs `version` och
   `contentVersion` från det nya `held.draft`. Ersätt markörerna och kör:

   ```text
   tool REQUEST save_draft {"version":VERSION,"contentVersion":CONTENT,"operationId":"voice-proof-save"}
   ```

10. Kräv statusen **Sparat. Hela utkastet finns i hushållets karta.**
    Öppna kvittot och återläs Lo. Kontrollera att det senaste
    kommentarspaketets sparbesked är verifierat. Stäng rösten, välj
    `quit` och kontrollera städningen enligt guiden.

**Förväntat resultat:**

- Kommentarspaketet skiljer verifierbar status från modellens fria ord.
  Ett lyckat mottaget paket innebär inte att tal hördes eller var korrekt.
- De fyra fria svaren ändrar inte kartan eller bekräftad status.
  Samtalsfrågor finns kvar och kan besvaras, även efter verklig markering.
- De sista verktygsanropen ger faktisk markeringsbekräftelse respektive
  sparat innehåll och kvitto. De fria orden ersätter aldrig dessa bevis.
