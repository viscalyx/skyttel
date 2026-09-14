#!/usr/bin/env python3
"""Kastbar klientstartare: en faktisk Codex CLI-process med en stdio MCP-server."""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent
RUNTIME = ROOT / ".runtime"

INSTRUCTIONS = """Du är en separat extern assistent i ett kastbart Skyttel-prov.
Samtala kort och begripligt på svenska. Alla hushållsuppgifter är påhittade.
Använd bara Skyttels MCP-verktyg för kartarbetet. Läs kartan och ditt eget
befintliga utkast innan du föreslår ändringar. Personer i kartan är inte samma
sak som Skyttel-användaren. Hitta objekt via verktygen; gissa inte vid flera
möjliga träffar. Återge HELA det aktuella utkastets ändringar, även befintliga
förslag från andra klienter, och skilj tydligt mellan osparat och kvitterat.
Användarens uttryckliga 'spara' gäller ALLA hittills gjorda ändringar i det
aktuella privata utkastet, inte bara det senast nämnda förslaget. Om samma
meddelande innehåller en entydig rättelse och 'spara', utför rättelsen med
propose_changes, återge hela sammanställningen och anropa save_draft separat
i samma omgång. Kräv inget ytterligare ja bara för att den begärda rättelsen
ger en ny utkastversion eller för att andra förslag också ingår. Samma regel
gäller ett tydligt konfliktval eller en ångrabegäran tillsammans med 'spara'.
Före sparanropet gör du en intern kontroll av verktygssvaret: begärda värden
och samband ska motsvara användarens avsikt, och andra tidigare förslag ska
finnas med om användaren inte ändrar dem. Kontrollera HELA full_diff, inte
bara senaste ändringen. Rätta egna avvikelser före sparandet; vid verklig
tvetydighet behöver du ett förtydligande. Ingen extra bekräftelse krävs när
resultatet motsvarar det redan uttryckliga sparbeskedet.
Utan uttryckligt sparbesked: ändra endast utkastet, återge det och invänta
användaren. Dessa provregler är inte själva ett sparbesked.
Spara exakt den version och kartversion som det aktuella verktygssvaret anger.
Om samtidighetskontrollen avvisar anropet eller oväntat nytt underlag tillkommer
efter sparbeskedet, återge ändringen och invänta ett nytt besked. Förväxla inte
användarens uttryckligen begärda rättelse med en sådan oväntad ändring.
Klientens verktygstillstånd är inte sparbeskedet. Olösta identitetsfrågor och
konflikter hindrar sparande av hela utkastet; förklara och invänta användarens
val, utan att tyst spara bara en del. Ångring skapar först ett nytt utkast och
följer samma regel om uttryckligt sparbesked. Vid uteblivet sparresultat är utfallet
okänt: kontrollera kvittot före nya ändringar eller sparförsök. Återanvänd
request_id vid återförsök med samma argument. Påstå sparat först efter kvitto.
Kontrollera kvittots saved_diff mot det kontrollerade utkastet och bekräfta
begripligt ALLA ändringar som faktiskt sparas. Bygg bekräftelsen på kvittot,
inte på vad du tänkte spara. Om kvittot avviker, redovisa det faktiska utfallet
och avvikelsen utan att påstå att önskat resultat är uppnått.
Utför inga administrativa åtgärder: hänvisa sådana till Skyttels eget
gränssnitt (det är inte byggt i detta prov). Ändra inga lokala filer, kör inga
skalverktyg och använd inte webben. All dataåtkomst sker genom MCP.
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--user", choices=["alex", "kim"], default="alex")
    parser.add_argument("--state", type=pathlib.Path)
    parser.add_argument("--label", default="live")
    parser.add_argument("prompt", nargs="?", help="Utelämna för att läsa stdin.")
    args = parser.parse_args()
    prompt = args.prompt if args.prompt is not None else sys.stdin.read()
    if not prompt.strip():
        parser.error("Skriv ett meddelande till den externa assistenten.")
    RUNTIME.mkdir(exist_ok=True)
    state = (args.state or RUNTIME / "PROTOTYPE-state.json").resolve()
    session_file = RUNTIME / f"{args.label}-{args.user}-session.json"
    if args.resume and not session_file.exists():
        parser.error("Det finns inget samtal att återuppta för detta provnamn.")
    codex = shutil.which("codex") or str(pathlib.Path.home() / ".local/bin/codex")
    config = {
        "mcp_servers.skyttel.command": sys.executable,
        "mcp_servers.skyttel.args": [str(ROOT / "server.py"), "--state", str(state), "--user", args.user],
        "mcp_servers.skyttel.required": True,
        "sandbox_mode": "read-only",
        "features.shell_tool": False,
        "features.unified_exec": False,
        "features.apps": False,
        "features.multi_agent": False,
        "features.remote_plugin": False,
        "web_search": "disabled",
    }
    command = [codex, "exec"]
    if args.resume:
        command += ["resume"]
    command += ["--ignore-user-config", "--json", "--skip-git-repo-check"]
    for key, value in config.items():
        command += ["-c", key + "=" + json.dumps(value, ensure_ascii=False)]
    if args.resume:
        command += [json.loads(session_file.read_text())["thread_id"], "-"]
    else:
        command += ["-"]
    submitted = ("Aktuella provregler, som ersätter tidigare provinstruktioner:\n"
                 + INSTRUCTIONS + "\n\nFörmedlat meddelande:\n" + prompt)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    trace = {"started_at": stamp, "user": args.user, "prompt": prompt,
             "instructions": INSTRUCTIONS, "events": []}
    process = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate(submitted)
    (RUNTIME / f"{stamp}.jsonl").write_text(stdout)
    (RUNTIME / f"{stamp}.stderr.txt").write_text(stderr)
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("type") == "thread.started":
            session_file.write_text(json.dumps({"thread_id": event["thread_id"]}))
            trace["thread_id"] = event["thread_id"]
        item = event.get("item", {})
        if event.get("type") == "item.completed" and item.get("type") in ("mcp_tool_call", "agent_message"):
            trace["events"].append(item)
            if item["type"] == "agent_message":
                print(item.get("text", ""))
            else:
                print(f"[MCP {item.get('tool', item.get('name', '?'))}: {item.get('status', '?')}]", file=sys.stderr)
        if event.get("type") in ("error", "turn.failed"):
            print(json.dumps(event, ensure_ascii=False), file=sys.stderr)
    trace["returncode"] = process.returncode
    output = RUNTIME / f"{stamp}-trace.json"
    output.write_text(json.dumps(trace, ensure_ascii=False, indent=2) + "\n")
    print(f"Spår: {output}", file=sys.stderr)
    if process.returncode:
        print(stderr[-6000:], file=sys.stderr)
    raise SystemExit(process.returncode)


if __name__ == "__main__":
    main()
