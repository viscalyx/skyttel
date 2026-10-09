# Separat filförberedelse för återimportens rensningsfel

Driftansvarig kör denna förberedelse i en terminal för en separat lokal
provinstallation. Servern ska köras utan rootbehörighet. Använd den faktiska
provdatabasens absoluta sökväg och förberedelsens visade ID; välj inte den
senare granskningens ID i IMPORT-18. Inga produktionsfiler får användas.
Behåll terminalen genom hela fallet. UI-observationerna antecknas separat.

## Indata och körbar hjälpfunktion

Efter filkontrollen, före bekräftelse eller avbrott, ange båda uppgifterna:

```sh
printf 'Provdatabasens absoluta sökväg: '; read -r SKYTTEL_RECOVERY_DATABASE
printf 'Förberedelsens visade ID: '; read -r SKYTTEL_RECOVERY_PREPARATION
export SKYTTEL_RECOVERY_DATABASE SKYTTEL_RECOVERY_PREPARATION
```

Definiera följande funktion i samma terminal. Den ändrar endast den
utpekade underkatalogens rättigheter och kontrollerar att databas och
katalog finns. `block` sätter 500, `restore` sätter 700 och `check` kräver
att samma katalog är borttagen. Funktionen upprepar ingen importbegäran.

```sh
skyttel_recovery_files() {
  node --input-type=module - "$1" <<'JS'
import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
const database = process.env.SKYTTEL_RECOVERY_DATABASE;
const id = process.env.SKYTTEL_RECOVERY_PREPARATION;
assert.ok(database && isAbsolute(database), 'Ange absolut databassökväg');
assert.ok(id && /^[a-zA-Z0-9_-]+$/.test(id), 'Ange exakt förberedelse-ID');
assert.ok(lstatSync(database).isFile(), 'Provdatabasen måste finnas');
const directory = join(dirname(database), '.skyttel-imports', id);
const action = process.argv[2];
if (action === 'check') {
  assert.equal(existsSync(directory), false, 'Tillfälliga filer finns kvar');
  console.info('Rätt förberedelses tillfälliga katalog är borttagen');
} else {
  assert.ok(['block', 'restore'].includes(action), 'Okänd åtgärd');
  if (action === 'restore' && !existsSync(directory)) {
    console.info('Katalogen är redan borttagen; inga rättigheter ändras');
  } else {
    const entry = lstatSync(directory);
    assert.ok(entry.isDirectory() && !entry.isSymbolicLink(), 'Fel katalog');
    const mode = action === 'block' ? 0o500 : 0o700;
    chmodSync(directory, mode);
    assert.equal(statSync(directory).mode & 0o777, mode);
    console.info(action === 'block' ? 'Rensningsfel förberett' : 'Rensning tillåten');
  }
}
JS
}
```

## Tidpunkter för IMPORT-11

1. Efter UI-steg 1, före bekräftelsen i steg 3: kör
   `skyttel_recovery_files block` och invänta **Rensningsfel förberett**.
2. Efter att Robin ser samma väntande rensning i steg 4, före knappen i
   steg 5: kör `skyttel_recovery_files restore` och invänta
   **Rensning tillåten**.
3. Efter slutfört UI-resultat i steg 5: kör `skyttel_recovery_files check`.
   Anteckna den tekniska filkontrollen separat. Fortsätt till kartläsningen.

## Tidpunkter för IMPORT-17

1. Efter granskningen i UI-steg 1, före avbrottet i steg 2: kör
   `skyttel_recovery_files block` och invänta **Rensningsfel förberett**.
2. Efter att den andra profilen ser samma rensning i steg 3, före
   svarsförberedelsen och rensningsknappen i steg 4: kör
   `skyttel_recovery_files restore` och invänta **Rensning tillåten**.
3. Efter konsolbeskedet om utfört avbrott i steg 4: kör
   `skyttel_recovery_files check`. Läs därefter status enligt UI-steg 5–6.

## Tidpunkter för IMPORT-18

1. Efter att den andra granskningen finns i UI-steg 2, före avbrottet i
   steg 3: använd **första** granskningens ID i indata. Kör
   `skyttel_recovery_files block` och invänta **Rensningsfel förberett**.
2. Efter att den nya fliken visar första försökets rensning i steg 4,
   före rensningsknappen i steg 5: kör `skyttel_recovery_files restore`.
3. Efter slutfört avbrott i steg 5: kör `skyttel_recovery_files check`.
   Det andra ID:ts granskning ska fortfarande gå att läsa i UI-steg 6.

## Återställning och städning

Vid avbrutet prov: kör `skyttel_recovery_files restore` innan du stoppar
servern eller tar bort provdatabasen. Det är även giltigt om rensningen
redan tagit bort katalogen. Vid slutfört prov ska `check` redan ha godkänts.
Efter fallet, rensa funktionen och terminalens indata:

```sh
unset -f skyttel_recovery_files
unset SKYTTEL_RECOVERY_DATABASE SKYTTEL_RECOVERY_PREPARATION
```

Följ sedan provinstallationens vanliga städning. Funktionen och
indatavariablerna gäller bara det aktuella försöket och återanvänds inte
för nästa fall utan ny inmatning.
