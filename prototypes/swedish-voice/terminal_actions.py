"""THROWAWAY: one model-planned batch, checked locally before completion."""
import copy
from functools import lru_cache
from pathlib import Path
import runpy

from result_reporting import QUESTION_SCHEMA, question_schema_error


def make_terminal_tool(propose_tool, *, can_save):
    properties = copy.deepcopy(propose_tool["inputSchema"]["properties"])
    del properties["request_id"]
    properties.update({
        "reviewed_map_version": {"type": "integer", "minimum": 1},
        "completion": {"type": "string", "enum": ["draft", "save"] if can_save else ["draft"]},
        "questions": {"type": "array", "items": copy.deepcopy(QUESTION_SCHEMA), "maxItems": 3},
    })
    return {"type": "function", "name": "submit_changes", "strict": False,
            "description": "Utför ett färdigt ändringsuppdrag i en batch och avsluta med kontrollerat svar. "
                "Ange ALLA entydiga beställda operationer; completion draft lämnar dem osparade. "
                "Lägg återstående riktade frågor i questions. completion save kräver uttrycklig "
                "sparbegäran, hela uppdraget färdigt och questions []. Ange båda versionerna från "
                "kartunderlaget du läst. Servern ändrar, kontrollerar och eventuellt sparar hela "
                "utkastet lokalt. Svar eller framgång formuleras först efter faktisk kontroll. "
                "Detta ska vara det enda verktygsanropet i svaret. Använd vanliga verktyg om "
                "uppdraget kräver flera mellanliggande läsningar eller återställning.",
            "parameters": {"type": "object", "properties": properties,
                           "required": list(properties), "additionalProperties": False}}


def terminal_schema_error(arguments, *, can_save):
    if not isinstance(arguments, dict) or set(arguments) != {
            "expected_draft_version", "reviewed_map_version", "operations", "completion", "questions"}:
        return {"error": "invalid_terminal_arguments"}
    if any(type(arguments[key]) is not int or arguments[key] < 1
           for key in ("expected_draft_version", "reviewed_map_version")):
        return {"error": "invalid_terminal_versions"}
    if arguments["completion"] not in ("draft", "save"):
        return {"error": "invalid_terminal_completion"}
    questions = arguments["questions"]
    if not isinstance(questions, list) or len(questions) > 3:
        return {"error": "invalid_terminal_questions"}
    for question in questions:
        error = question_schema_error(question)
        if error:
            return {"error": error}
    if arguments["completion"] == "save" and (not can_save or questions):
        return {"error": "terminal_save_requires_current_authorization_and_no_questions"}
    if not isinstance(arguments["operations"], list) or not arguments["operations"]:
        return {"error": "terminal_operations_required"}
    return None


@lru_cache(maxsize=1)
def domain():
    return runpy.run_path(str(Path(__file__).resolve().parents[1] / "external-mcp" / "server.py"))


def project(arguments, before):
    """Use unchanged domain operations on a copy; no storage or external calls."""
    if arguments["expected_draft_version"] != before["draft_version"]:
        return None, {"error": "stale_draft_version: read the entire current draft again"}
    if arguments["reviewed_map_version"] != before["map_version"]:
        return None, {"error": "stale_reviewed_map_version: read the entire saved map again"}
    candidate = copy.deepcopy(before["draft_map"])
    try:
        domain()["operations"](candidate, arguments["operations"])
    except (ValueError, TypeError, KeyError, domain()["DomainError"]) as error:
        return None, {"error": "invalid_terminal_operations: " + str(error)}
    return {**copy.deepcopy(before), "draft_map": candidate,
            "full_diff": domain()["differences"](before["saved_map"], candidate)}, None


def proposal_arguments(arguments):
    return {key: copy.deepcopy(arguments[key]) for key in ("expected_draft_version", "operations")}


def completion_report(arguments, before, after):
    changed = before["draft_map"] != after["draft_map"]
    return {"kind": "draft_changed" if changed else "clarification" if arguments["questions"] else "answer",
            "answer_scope": "selected_records" if changed or arguments["questions"] else "status",
            "references": [], "clarification_kind": "none",
            "questions": copy.deepcopy(arguments["questions"])}


def save_arguments(arguments, after):
    # A terminal batch executes exactly one proposal, which advances its version
    # once. Never adopt a newer concurrent draft from a subsequent read.
    return {"draft_version": arguments["expected_draft_version"] + 1,
            "reviewed_map_version": arguments["reviewed_map_version"]}


def matches_proposal(arguments, projected, proposed, actual):
    return (actual["draft_version"] == proposed.get("draft_version") == arguments["expected_draft_version"] + 1
            and actual["map_version"] == proposed.get("map_version") == arguments["reviewed_map_version"]
            and actual["draft_map"] == projected["draft_map"]
            and actual["saved_map"] == projected["saved_map"]
            and actual["full_diff"] == proposed.get("full_diff") == projected["full_diff"])
