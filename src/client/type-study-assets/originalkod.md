# Originalkodens stöd för typer, egenskaper och avsnitt

Underlaget jämför önskemålet med originalkoden på
[version 466f5df](https://github.com/viscalyx/skyttel/tree/466f5dfb33fc70114587f36360bd0ed406a3e208).
Det riktar sig till den som ska genomföra ändringen efter designprovet.
Källhänvisningarna är låsta till den versionen. Beskrivna tester är
befintliga kontroller i koden; granskningen innebär ingen ny testkörning.

## Stöd som redan finns

Alla hushållets medlemmar kan skapa och ändra objekttyper, även förifyllda
typer. Varje typ har namn, beskrivning och egna fält med stabila ID.
Värdeslagen är text, tal, datum och ja/nej. Värdena får lämnas obesvarade;
ett obesvarat tal är inte noll och obesvarat ja/nej är inte nej.
[Objekttypernas schema](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/shared/map.ts#L4-L28)
och
[redigering av egna fält](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/client/ObjectTypes.tsx#L177-L237)
visar stödet.

Ändringar i typnamn och fältnamn behåller identiteter och värden. Använda
fält skyddas mot borttagning och ändrat värdeslag, även när användningen
finns i ett privat utkast.
[Serverns kontroll av använda fält](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/object-types.ts#L125-L173)
gäller både egna och förifyllda typer.

Även sambandstyper är redigerbara. Namn, beskrivning och benämningar från
båda ändpunkterna går att ändra. En sambandstyp kan användas mellan objekt
av vilka objekttyper som helst. Servern kontrollerar att ändpunkterna
finns, utan att begränsa kombinationen av objekttyper.
[Validering av samband](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/relationships.ts#L124-L177)
och
[användarguiden för sambandstyper](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/docs/user-guide/relationship-types.md#L11-L28)
beskriver detta. Typen och riktningen behåller sina betydelser när
benämningarna ändras; objekten kopplas inte om av ett namnbyte.

Typförslag delar det privata utkastet med objekt och samband. Gemensamt
sparande, konflikter, kvitton och historik omfattar redan definitionerna.
Assistenterna kan också föreslå typer.
[Utkastets schema](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/shared/map.ts#L91-L124)
och
[assistentens verktyg för objekttyper](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/assistant-work.ts#L199-L237)
ger en befintlig grund att bygga vidare på.

Integrationstester omfattar egna fält, varaktigt sparande och redigering
av förifyllda typer som vanlig medlem:
[objekttyper](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/tests/integration/object-types.spec.ts#L279-L298)
och
[sambandstyper](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/tests/integration/relationship-types.spec.ts#L87-L169).

## Stöd som saknas

**Egna avsnitt saknas för båda typerna.** Objekttypens fält har ingen
placering i avsnitt och typen har ingen lista över avsnitt. Egna fält visas
i en följd. Ekonomiska uppgifter är en fast katalog som visas i ett fast
avsnitt för alla objekttyper. Det går inte att välja eller ordna dessa
egenskaper per typ.
[Den fasta katalogen](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/shared/financial-facts.ts#L1-L18)
och
[det fasta ekonomiavsnittet](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/client/FinancialFacts.tsx#L29-L39)
visar begränsningen.

**Egna egenskaper på samband saknas.** Sambandstypen har inga egna fält och
sambandets värde har ingen motsvarighet till objektets egna fältvärden.
[Sambandstypens schema](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/shared/map.ts#L39-L42)
och
[sambandets värde](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/shared/map.ts#L142-L150)
behöver utökas. Servern tillåter bara namn, beskrivning och benämningar i
definitionen; ett extra `fields` avvisas uttryckligen.
[Serverns validering](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/relationship-types.ts#L29-L54)
och
[testet som förbjuder egna fält](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/tests/unit/server/relationship-types-http.test.ts#L70-L85)
bekräftar att detta kräver nytt produktionsstöd.

**Typverktygen ligger i kartvyn.** De finns under ”Objekttyper och egna
fält” samt ”Sambandstyper och riktning”, tillsammans med knappar för nya
typer. De ligger ännu inte under Inställningar.
[Kartvyns typverktyg](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/client/HouseholdMap.tsx#L1716-L1837)
är den nuvarande ingången.

## Kravet som designprovet ska pröva

- B:s avsnitt används som grund för detaljer och redigering.
- Alla medlemmar kan redigera objekt- och sambandstyper från Inställningar.
  Förifyllda typer har samma möjligheter som egna typer.
- Båda typerna kan ha valfria egna egenskaper av de fyra värdeslagen och
  egna namngivna avsnitt. Avsnitt och egenskaper kan ordnas.
- Egenskaper kan flyttas mellan avsnitt eller döljas i detaljvyn.
  Flytt och döljning bevarar egenskapens ID och samtliga befintliga värden.
  Att visa egenskapen igen återger värdena.
- Befintliga inbyggda objektegenskaper kan placeras i typens avsnitt.
  Deras betydelse och värden består även om placeringen ändras.
- Sambandstyper väljs fritt mellan objekt utan hårdkodade begränsningar
  utifrån objekttyper. Benämningarna kan redigeras i båda riktningarna.
- Definitioner och värden går genom samma privata utkast och uttryckliga
  sparande som övrigt arbete. Inställningar får inget separat sparflöde.

Valfria egenskaper betyder inte att identitet eller struktur upphör att
gälla. Originalkoden kräver objektets namn och typ samt sambandets typ och
giltiga ändpunkter enligt uppgiftens säkerhet. Dubbletter och information
utanför hushållet följer också befintliga regler.

## Gräns mot produktionsgenomförande

Prototypen är en designdemo med tillstånd i minnet. Den visar det avsedda
arbetet; den tillför inget beständigt produktionsstöd för egna avsnitt
eller egna egenskaper på samband.

Genomförandet behöver omfatta schema, validering, lagring, migrering,
formulär, assistenter, import och export, historik, ångring och konflikter.
Befintliga installationer och äldre definitioner behöver en fungerande
standardplacering utan att förlora fakta. Flytt och döljning behöver hållas
åtskilda från radering av en definition eller ett värde.

Det räcker inte att lägga nya uppgifter i gränssnittet. Exempelvis behöver
[assistentens strikta schema](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/assistant-work.ts#L209-L229),
[importens definitioner](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/import-schema.ts#L17-L34)
och
[ångringens fältjämförelse](https://github.com/viscalyx/skyttel/blob/466f5dfb33fc70114587f36360bd0ed406a3e208/src/server/undo-facts.ts#L9-L44)
kunna förstå och bevara de nya uppgifterna.
