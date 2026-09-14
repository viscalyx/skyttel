# Serverns tekniska prov

Detta är en kastbar prototyp med ett syntetiskt hushåll och en lokal JSON-fil.
Frågan är om en extern MCP-klient kan behandla ett befintligt privat utkast,
visa hela ändringsförslaget och invänta människans uttryckliga sparbesked.
Tekniska kontrollanrop utgör inget mänskligt beslut om arbetsflödet.

## Protokoll och data

- Stdio med en JSON-RPC-post per rad, `initialize`, `ping`, `tools/list` och
  `tools/call`. Meddelanden utan ID kräver inget svar.
- Förhandling stöder MCP-versionerna `2025-11-25`, `2025-06-18`,
  `2025-03-26` och `2024-11-05`; okänd version ger `2025-11-25`.
- Verktygssvar innehåller samma uppgifter i text och `structuredContent`.
- Identiteten kommer från processargumentet `--user alex` eller `--user kim`.
  Inget modellverktyg kan byta användare eller hushåll.
- `read_map` ger sparad karta, den egna utkastkartan, hela effektiva diffen,
  kartversion, utkastversion, konflikter, blockerare och sparberedskap.
- Förändringar av samma användares utkast delar version mellan processer.
  Varje användare har ett separat utkast. Sparad karta och historik är
  gemensamma.

## Avgränsningar

Sparbeskedet är en regel för AI-klienten och människans samtal. Servern kan
kontrollera versioner och blockerare, men autentiserar inte själva
sparbeskedet. Provet avgör hur klienten hanterar den gränsen.

JSON-filen och `fcntl`-låset simulerar beständighet och samtidighet på samma
dator. De ger inga produktionsgarantier för behörigheter, lagring eller
nätverksfel. Kör bara med syntetiska uppgifter. Fixture och scenariokontroller
är processargument utanför MCP, inte administratörsverktyg för modellen.

Objektborttagning tar inte automatiskt bort samband. Ett förslag som tar bort
ett objekt behöver också ange vilka samband som ska tas bort eller rättas;
kvarvarande samband till saknade objekt blockerar sparning.

Ångra återför bara den valda historikgruppens berörda fält. Senare sparade
ändringar av samma fält ger en konflikt som behöver ett uttryckligt val.
Överlapp med det egna befintliga utkastet avvisar hela ångraförsöket och
bevarar utkastet. Rätta eller spara det överlappande förslaget först.

Ett upprepat `request_id` med identiska argument ger exakt samma svar, även
om något senare ändrar utkastet. Läs då aktuell karta före nästa granskning.
Samma ID med andra argument avvisas. Saknat sparkvitto kan sökas separat med
`get_save_receipt` efter att klienten ansluter igen.

## Separata tekniska kontroller

Kontrollerna använder en separat fil i `/private/tmp` eller nya minnesfixturer.
De berör inte den interaktiva körningens tillstånd och finns inte som testsvit.

- MCP-start med `2025-06-18` förhandlar samma version. Verktygslistan innehåller
  åtta verktyg. Första läsningen visar Alex befintliga prisförslag,
  149 till 179.
- Ångra av sparat pris 179 när eget utkast föreslår 209 avvisas. Hela förslaget
  179 till 209 finns kvar, med oförändrad utkastversion.
- Ångra efter en oberoende sparad kortanteckning föreslår pris 179 till 149.
  Kortanteckningen finns kvar och skapar ingen konflikt.
- Ångra efter en senare sparad prisändring till 199 visar förslaget 199 till
  149 och blockerar med historiskt värde 179, sparat 199 och föreslaget 149.
- Identisk återupprepning av ett ändringsanrop ger samma svar. Ändrade argument
  under samma ID avvisas. Sparning med en äldre utkastversion avvisas och
  lämnar det sparade priset 149 orört.
