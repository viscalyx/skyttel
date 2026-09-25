# Bevara utvecklingsdata och Codex vid ombyggnad

Den här guiden är för utvecklare som skapar eller bygger om Skyttels
devcontainer. Kör kommandon i containern om inte värddatorn anges.
Den vanliga profilen är utgångspunkt. Båda profilerna använder samma flöde
men har separata namngivna volymer.

## Ny värddator utan Codex-inloggning

På värddatorn, i repositoryts rot, förbered de delade katalogerna och den
privata miljöfilen:

```sh
mkdir -p "$HOME/.codex/sessions" "$HOME/.codex/plugins" \
  "$HOME/.codex/skills" "$HOME/.codex/rules"
cp -n .devcontainer/.env.example .devcontainer/.env
chmod 600 .devcontainer/.env
openssl rand -base64 48
```

Spara det genererade värdet i `BETTER_AUTH_SECRET` och behåll det vid
ombyggnad. Skapa ingen tom `auth.json` på värddatorn. Välj **Dev Containers:
Reopen in Container** och den vanliga Skyttel-profilen. Vänta tills
installationen och starten av Codex-daemonen är klara.

Skapandet kör `npm run db:migrate`: en ny databas får tabeller och
migrationshistorik, men inget hushåll eller demodata. En befintlig databas
behåller sitt innehåll. Exempelvärdena för identitetsleverantörerna räcker
för skapandet och inloggningssidan. Riktig inloggning i Skyttel kräver
[egna registreringar och administratörsidentitet](local-authentication.md).
Starta med `npm run dev:all` och följ installationsflödet för ett nytt hushåll.
Välj endast `npm run db:setup` om du vill ersätta alla utvecklingsdata och
sessioner med `TestHousehold`. Det är ett uttryckligt återställningskommando.

### Ange första administratören

Om du inte känner till din Google-identitet kan du ta reda på den efter
att containern skapats. Spara riktiga leverantörsuppgifter i
`.devcontainer/.env` enligt autentiseringsguiden och återskapa containern
för att läsa in dem. Behåll exempelvärdet för administratörens identitet
tills du har identifierat rätt konto.

1. Kör `npm run dev:all`, öppna `http://localhost:5173` och logga in med
   det tänkta administratörskontot. Förvänta **Du har inte tillgång till
   hushållet** när ingen administratör är utsedd.
1. Stoppa appen och läs identiteten i en privat containerterminal:

   ```sh
   sqlite3 -header "$SKYTTEL_DATABASE_PATH" \
     "SELECT providerId, accountId FROM account WHERE providerId = 'google';"
   ```

1. Identifiera rätt kontos `accountId`; välj inte första raden om flera
   konton visas. Spara värdet i `SKYTTEL_FIRST_ADMIN_SUBJECT` i
   `.devcontainer/.env` och behåll `SKYTTEL_FIRST_ADMIN_PROVIDER=google`.
   Publicera inte identiteten. Återskapa containern och starta appen igen.
1. Logga in och skapa ett nytt hushåll genom installationsflödet, eller
   välj uttryckligen demoåterställningen enligt ovan. För Microsoft används
   motsvarande verifierade identitet och `SKYTTEL_FIRST_ADMIN_PROVIDER`.

## Logga in i Codex i containern

Den nya användarkonfigurationen använder `cli_auth_credentials_store = "file"`.
Codex sparar då inloggningen i `~/.codex/auth.json` på volymen `codex-home`.
Filinnehållet hör varken hemma i Git, avbildningen eller offentliga loggar.
Om du själv väljer ett annat lagringssätt behöver du även ordna dess
beständighet. Personliga val skrivs inte över vid ombyggnad.

Samma bevarande gäller personliga modell-, godkännande-, plugin- och
skillinställningar. Skapandet uppdaterar den reserverade behörighetsprofilen
`permissions.skyttel-development` och tilliten till `/workspace`.
Standardprofil och lagringssätt för inloggning fylls bara i om de saknas.
Projektets `.codex/config.toml` väljer profil, `approval_policy = "never"`
och projektets begränsningar för plugins och skills när du arbetar i Skyttel.
De personliga värdena ligger kvar för andra projekt. Använd ett eget namn
för personliga behörighetsprofiler; se
[konfigurationens lager](codex-permissions.md).

Aktivera vid behov inloggning med enhetskod i kontots säkerhetsinställningar
eller genom arbetsytans administratör. Kör sedan i containerterminalen:

```sh
codex login --device-auth
codex login status
```

Öppna den angivna länken i värddatorns webbläsare och slutför inloggningen
med engångskoden. Dela inte koden. Om enhetskod inte är tillgänglig kan du
vidarebefordra port 1455 i VS Code och köra `codex login`, eller använda den
frivilliga kopieringen nedan. Se
[OpenAI:s autentiseringsguide](https://learn.chatgpt.com/docs/auth).

Kontrollera även Codex-tilläggets inloggning i containerns VS Code-fönster.
Statuskommandot visar bara inloggningsstatus; ett faktiskt klientprov följer
[ärende #25](https://github.com/viscalyx/skyttel/issues/25).

### Återanvänd värddatorns inloggning frivilligt

Om värddatorn redan har en riktig `~/.codex/auth.json` kan du kopiera den
en gång till den startade containern. Kör från repositoryts rot på värddatorn:

```sh
test -f "$HOME/.codex/auth.json" &&
docker compose -f .devcontainer/docker-compose.yml exec -T app \
  sh -c 'umask 077; set -C; cat > "$HOME/.codex/auth.json"' \
  < "$HOME/.codex/auth.json"
```

För den extra behörighetsprofilen använder du i stället
`.devcontainer/elevated/docker-compose.yml`. Kommandot vägrar skriva över
en befintlig målfil. Behåll containerns egen inloggning om den redan finns.
Kopian uppdateras därefter av Codex i containern och delas inte löpande med
värddatorn. Ett konto som enbart finns i värddatorns nyckelring behöver
inloggning i containern; skapa ingen ersättningsfil med påhittat innehåll.
Kör `codex login status` i containern och öppna om Codex-klienterna.

## Bevara befintliga inställningar vid första övergången

Om din körande container ännu saknar volymen `codex-home`, spara dess
personliga `config.toml` före den första ombyggnaden. Den separata volymen
för `~/.config` överlever ombyggnaden:

```sh
install -d -m 700 "$HOME/.config/skyttel"
install -m 600 "$HOME/.codex/config.toml" \
  "$HOME/.config/skyttel/codex-config.before-persistence.toml"
```

Stäng Codex-klienterna och bygg om samma profil. Återställ sedan filen och
lägg in projektets förvaltade inställningar igen:

```sh
install -m 600 "$HOME/.config/skyttel/codex-config.before-persistence.toml" \
  "$HOME/.codex/config.toml"
python3 .devcontainer/merge-codex-config.py \
  .devcontainer/codex-config.toml "$HOME/.codex/config.toml"
```

Öppna Codex-klienterna igen. Den befintliga `codex-state`-volymen ligger
kvar vid `~/.codex/sqlite`; delade sessioner, regler, tillägg och skills
ligger kvar på värddatorn. Den gamla bindningen av värddatorns `auth.json`
ersätts av egen inloggning eller den frivilliga kopieringen ovan.
Övriga personliga filer som du själv lagt i containerns disponibla
filsystem behöver sparas före denna första övergång. Vid följande ombyggnader
bevaras hela Codex-katalogen med undantag för dess separata monteringar,
som har egen lagring enligt [volymtabellen](devcontainer.md#state-and-rebuilds).

## Kontrollera personliga inställningar utan ombyggnad

Kontrollera sammanslagningen med en tillfällig syntetisk konfiguration före
ombyggnaden. Följande kommando ändrar ingen riktig användarkonfiguration,
startar ingen Codex-session och kräver ingen inloggning. Det kontrollerar
även att projektets avsiktliga begränsningar finns kvar.

<!-- markdownlint-disable MD013 -->
```sh
python3 - <<'PY'
from pathlib import Path
import runpy
import tempfile
import tomllib

merge = runpy.run_path('.devcontainer/merge-codex-config.py')
managed = Path('.devcontainer/codex-config.toml').read_text()
personal = '''approval_policy = "on-request"
default_permissions = ":read-only"
model = "personal-sentinel"
[plugins.plugin-management]
enabled = true
[[skills.config]]
path = "/home/vscode/.codex/skills/.system/skill-creator/SKILL.md"
enabled = true
'''
with tempfile.TemporaryDirectory(prefix='skyttel-config-') as directory:
    path = Path(directory) / 'config.toml'
    path.write_text(personal)
    for _ in range(2):
        merged = merge['merge_config'](path.read_text(), managed)
        merge['write_atomic'](path, merged)
    actual = tomllib.loads(path.read_text())
    expected = tomllib.loads(personal)
    for key, value in expected.items():
        assert actual[key] == value, key
    assert actual['cli_auth_credentials_store'] == 'file'
    assert actual['projects']['/workspace']['trust_level'] == 'trusted'
    assert actual['permissions'] == tomllib.loads(managed)['permissions']
    assert merge['merge_config'](path.read_text(), managed) == path.read_text()
project = tomllib.loads(Path('.codex/config.toml').read_text())
assert project['approval_policy'] == 'never'
assert project['default_permissions'] == 'skyttel-development'
assert project['plugins']['plugin-management']['enabled'] is False
assert all(entry['enabled'] is False for entry in project['skills']['config'])
assert project['permissions']['skyttel-development']['extends'] == ':workspace'
print('Personliga val bevarade; projektets policy kvar.')
PY
```
<!-- markdownlint-enable MD013 -->

Förvänta bevarade personliga val efter båda sammanslagningarna. Provet
kontrollerar filinnehåll; verklig inläsning i CLI och VS Code samt ombyggnad
följer det manuella provet nedan. Inställningar som redan saknas i din
personliga fil kan inte återskapas av sammanslagningen; återställ dem från
egen kopia eller välj dem igen i användarkonfigurationen.

## Manuellt prov av omstart och ombyggnad

Detta är ett körbart manuellt prov, inte ett automatiserat livscykeltest.
Faktisk körning med utvecklarens Docker, konton och VS Code återstår i
[ärende #97](https://github.com/viscalyx/skyttel/issues/97) och blockerar inte
implementeringen. Anteckna profil, värdplattform och verktygsversioner samt
resultaten från varje steg. Dokumentera inte hemligheter eller privata data.

1. Använd en utvecklingsdatabas med enbart syntetiskt innehåll. Starta Skyttel
   och skapa om möjligt ett sparat objekt samt ett separat privat utkast.
   Notera deras namn och utkastets status. Stoppa sedan appen med Ctrl+C.
   Kör inte `db:setup` under provet.
1. Lägg till en ofarlig databasmarkör. Kommandot fungerar även utan riktiga
   konton i en ny, migrerad databas. Ett befintligt markör-ID ger ett fel;
   kontrollera då den befintliga markören i stället för att ersätta den.

   ```sh
   sqlite3 -bail "$SKYTTEL_DATABASE_PATH" <<'SQL'
   INSERT INTO user (id, name, email, createdAt, updatedAt)
   VALUES ('devcontainer-persistence-sentinel', 'Bevarat utvecklingsprov',
     'devcontainer-persistence@example.test', 0, 0);
   SQL
   ```

1. Öppna `~/.codex/config.toml` och lägg till inställningen nedan under
   `[shell_environment_policy.set]`. Skapa sektionen sist i filen om den
   saknas; skapa inte två sektioner med samma namn.

   ```toml
   [shell_environment_policy.set]
   SKYTTEL_PERSISTENCE_SENTINEL = "retained"
   ```

1. Skapa markörer för övrigt Codex-arbetsläge och för dess SQLite-volym:

   ```sh
   printf 'retained\n' > "$HOME/.codex/persistence-sentinel.txt"
   printf 'retained\n' > "$HOME/.codex/sqlite/persistence-sentinel.txt"
   codex login status
   ```

   Anteckna om inloggningen är aktiv. En ny värddator utan inloggning ska
   fortfarande kunna starta containern; gör inloggningsprovet separat.
   Om en syntetisk Codex-session finns, notera även att den går att välja
   för återupptagning före ombyggnaden.
1. Stäng Codex-klienterna. Stoppa och starta samma container via Docker och
   öppna den i VS Code igen. Kör kontrollkommandona nedan, starta Skyttel
   och jämför objekt och privat utkast. Stoppa appen igen.
1. Välj **Dev Containers: Rebuild Container** för samma profil. Behåll
   Compose-projektnamn och volymer. Vänta tills skapandet är klart och kör
   samma kontroller igen.

   <!-- markdownlint-disable MD013 -->
   ```sh
   sqlite3 -bail "$SKYTTEL_DATABASE_PATH" \
     "SELECT name FROM user WHERE id = 'devcontainer-persistence-sentinel';"
   python3 - <<'PY'
   from pathlib import Path
   import tomllib
   home = Path.home() / '.codex'
   config = tomllib.loads((home / 'config.toml').read_text())
   assert config['shell_environment_policy']['set']['SKYTTEL_PERSISTENCE_SENTINEL'] == 'retained'
   for path in ('persistence-sentinel.txt', 'sqlite/persistence-sentinel.txt'):
       assert (home / path).read_text() == 'retained\n'
   print('Personlig inställning och Codex-markörer bevarade.')
   PY
   findmnt -T "$HOME/.codex/tmp" -o TARGET,SOURCE
   codex login status
   ```
   <!-- markdownlint-enable MD013 -->

   Förvänta `Bevarat utvecklingsprov`, bevarade markörer och samma personliga
   inställning. Temporärkatalogen ska ha sin separata montering vid
   `/home/vscode/.codex/tmp`, inte ligga i någon av värddatorns delade
   Codex-kataloger. Inloggningen ska finnas kvar om den var aktiv före provet;
   återkallade eller utgångna inloggningsuppgifter kan kräva ny inloggning.
   Kontrollera även VS Code-tillägget och att den noterade sessionen kan
   väljas igen. Starta Skyttel och kontrollera sparat objekt och privat utkast.
1. Upprepa med den extra behörighetsprofilen endast när den behöver
   verifieras. Förbered markörerna i den profilens egna volymer. Ett byte av
   profil flyttar inte data mellan de två Compose-projekten.
1. Ta bort de två markörfilerna och inställningen efter provet. Ta bort
   databasmarkören med:

   ```sh
   sqlite3 -bail "$SKYTTEL_DATABASE_PATH" \
     "DELETE FROM user WHERE id = 'devcontainer-persistence-sentinel';"
   ```

Om någon kontroll misslyckas, behåll volymerna och läs containerloggen.
`docker compose down --volumes` raderar arbetsläget och ska inte användas
för att felsöka beständighet.
