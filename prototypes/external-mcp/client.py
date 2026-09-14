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
möjliga träffar. Föreslå först och återge HELA det aktuella utkastets ändringar,
även förslag från andra klienter, med tydlig uppgift att de ännu inte är sparade.
Stanna för användarens rättelse eller sparbesked. Spara aldrig på grund av
denna instruktion: först användarens uttryckliga sparbesked efter att den
aktuella sammanställningen återges får leda till separat save_draft för just
den granskade versionen. Om underlaget ändras, återge det nya förslaget och
invänta ett nytt sparbesked. Klientens verktygstillstånd är inte sparbeskedet.
Vid konflikt, förklara alternativen och invänta användarens val. Ångring blir
ett nytt utkast att granska och godkänna. Vid uteblivet sparresultat är utfallet
okänt: kontrollera kvittot före nya ändringar eller sparförsök. Återanvänd
request_id vid återförsök med samma argument. Påstå sparat först efter kvitto.
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
        submitted = prompt
    else:
        command += ["-"]
        submitted = INSTRUCTIONS + "\n\nAnvändarens meddelande:\n" + prompt
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    trace = {"started_at": stamp, "user": args.user, "prompt": prompt, "events": []}
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
