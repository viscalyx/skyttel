# Extern MCP-klient: verifierat underlag

Kontrolldatum: 2026-09-14. Underlaget beskriver klientstöd, inte resultatet
av ett genomfört Skyttel-samtal. Kontrollen omfattar ingen AI-körning,
installation eller ändring av beständiga klientinställningar.

## Lokalt verifierat

<!-- markdownlint-disable MD013 -->

| Egenskap | Observation |
| --- | --- |
| Klient | Codex CLI, separat process |
| Binär | `/Users/johlju/.local/bin/codex` |
| Version | `codex-cli 0.153.0` |
| Operativsystem | macOS `26.6.2`, `arm64` |
| Tillfälliga värden | `-c key=value`; värdet tolkas som TOML |
| Användarkonfiguration | `--ignore-user-config` hoppar över `$CODEX_HOME/config.toml`; autentisering använder fortfarande `CODEX_HOME` |
| Text in/ut | `exec` och `exec resume` tar prompt via stdin med `-`; `--json` ger JSONL och `-o` skriver sista svaret |
| Fortsättning | `exec resume SESSION_ID` stöder explicit sessions-ID |
| Sessionsfiler | `--ephemeral` undviker beständiga sessionsfiler; används därför inte i det föreslagna flödet med återupptagning |
| MCP-transporter | Lokal hjälp för `mcp add` anger STDIO-kommando eller Streamable HTTP-URL |

<!-- markdownlint-enable MD013 -->

Kontrollkommandon: `command -v codex`, `codex --version`, `codex --help`,
`codex exec --help`, `codex exec resume --help`, `codex mcp --help`,
`codex mcp add --help`, `sw_vers -productVersion` och `uname -m`.
Hjälpkommandonas slutkod är 0. Utdata innehåller också en varning om att
PATH-alias inte kan skapas i sandlådan. Kontrollen läser inga
autentiseringshemligheter.

## Dokumenterade inställningar

Följande nycklar är verifierade i OpenAI:s aktuella
[konfigurationsreferens](https://learn.chatgpt.com/docs/config-file/config-reference).
Deras effekt på just denna installerade klients verktygskatalog har ännu inte
provats i en AI-körning.

<!-- markdownlint-disable MD013 -->

| Per-process-värde | Dokumenterad funktion |
| --- | --- |
| `features.shell_tool=false` | Stänger av standardverktyget för shell-kommandon |
| `features.unified_exec=false` | Stänger av unified exec |
| `web_search="disabled"` | Tar bort webbsökningsverktyget |
| `features.apps=false` | Stänger av app-/connector-integrering |
| `features.multi_agent=false` | Stänger av verktyg för agentdelegering |
| `features.remote_plugin=false` | Stänger av katalogen för fjärrplugins |

<!-- markdownlint-enable MD013 -->

Detta verifierar ingen generell garanti om att endast MCP-verktyg återstår.
Övriga inbyggda verktyg, installerade plugins och faktiskt exponerad
verktygskatalog måste kontrolleras i provet. `--ignore-user-config` är ingen
garanti om fullständig isolering från projektfiler eller andra
konfigurationslager.

MCP-servern kan anges med `mcp_servers.<namn>.command`, `args` och `cwd`
för STDIO eller `url` för Streamable HTTP. `required=true` gör serverstarten
obligatorisk; `enabled_tools` begränsar serverns tillgängliga verktyg.
Se [OpenAI:s MCP-dokumentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

## Kommandostruktur för ett senare prov

Sökvägarna nedan är platshållare. Kommandona har inte körts.

<!-- markdownlint-disable MD013 -->

```sh
codex exec \
  --ignore-user-config --sandbox read-only --skip-git-repo-check \
  -C /ABS/PROBE \
  -c 'mcp_servers.skyttel_probe={command="/ABS/RUNTIME",args=["/ABS/SERVER"],required=true}' \
  -c features.shell_tool=false -c features.unified_exec=false \
  -c 'web_search="disabled"' -c features.apps=false \
  -c features.multi_agent=false -c features.remote_plugin=false \
  --json -o /ABS/PROBE/first-response.txt \
  - < /ABS/PROBE/first-prompt.txt > /ABS/PROBE/first-events.jsonl
```

<!-- markdownlint-enable MD013 -->

JSONL-händelsen `thread.started` innehåller `thread_id`. Första körningen
avslutar med ett svar som människan kan läsa. Först efter människans
faktiska sparbesked skickas det vidare i en ny prompt till samma session:

<!-- markdownlint-disable MD013 -->

```sh
codex exec \
  --sandbox read-only -C /ABS/PROBE \
  -c 'mcp_servers.skyttel_probe={command="/ABS/RUNTIME",args=["/ABS/SERVER"],required=true}' \
  -c features.shell_tool=false -c features.unified_exec=false \
  -c 'web_search="disabled"' -c features.apps=false \
  -c features.multi_agent=false -c features.remote_plugin=false \
  resume --ignore-user-config --skip-git-repo-check \
  --json -o /ABS/PROBE/second-response.txt \
  SESSION_UUID - < /ABS/PROBE/human-reply.txt > /ABS/PROBE/second-events.jsonl
```

<!-- markdownlint-enable MD013 -->

Använd ett explicit sessions-ID eftersom andra samtal kan köras samtidigt.
Upprepa de tillfälliga inställningarna vid återupptagning. STDIO-serverns
tillstånd behöver kunna återställas mellan processerna. JSONL och
återupptagning är
dokumenterade i [icke-interaktivt läge](https://learn.chatgpt.com/docs/non-interactive-mode).

## Återstår att verifiera

- Faktisk upptäckt av Skyttels verktyg, deras anrop och sessionsfortsättning.
- Att verktygskatalogen efter begränsningarna har önskat innehåll.
- Att sparbeskedet styr lagringen korrekt; klientens `read-only` för
  kommandokörning etablerar inte Skyttels skrivbehörighet.
- UI-dialoger, MCP-elicitering och eventuella interaktiva godkännanden.
  Textflödet ovan använder separata avslutade körningar.
- Talinmatning, talutmatning och ett sammanhängande röstsamtal.
- Giltig klientinloggning, modellåtkomst, kostnad samt MCP-autentisering.
- Fjärråtkomst, mobilklienter, andra operativsystem och andra externa
  klienter.
