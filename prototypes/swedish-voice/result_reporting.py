"""THROWAWAY: verify operation reports and describe actual results in Swedish."""

import json
from pathlib import Path


RELATION_LABELS = json.loads(Path(__file__).with_name("relation-labels.json").read_text())
LANGUAGE_INSTRUCTIONS = """
Säg relationerna på svenska i alla svar och allt tal. Engelska relationsnycklar
används bara i verktygsargument. Säg till exempel 'Kim betalar för Tonrum',
inte 'Kim pays Tonrum', och 'Alex använder Tonrum', inte 'Alex uses Tonrum'.
Även uppläsning av verktygsresultat ska använda svenska. Här är ordlistan:
""" + json.dumps(RELATION_LABELS, ensure_ascii=False)

REFERENCE_SCHEMA = {
    "type": "object", "properties": {
        "collection": {"type": "string", "enum": ["objects", "relations"]},
        "id": {"type": "string"},
    }, "required": ["collection", "id"], "additionalProperties": False,
}

QUESTION_SCHEMA = {
    "type": "object", "properties": {
        "kind": {"type": "string", "enum": ["identity", "field_choice", "missing_value"]},
        "operation": {"type": "string", "enum": ["inspect_object", "add_object", "delete_object", "add_relation", "change_field"]},
        "subject": {"anyOf": [REFERENCE_SCHEMA, {"type": "null"}]},
        "candidates": {"type": "array", "items": REFERENCE_SCHEMA, "maxItems": 3},
        "candidate_side": {"type": ["string", "null"], "enum": ["from", "to", None]},
        "fields": {"type": "array", "items": {"type": "string", "enum": ["name", "last_four", "price", "address"]},
                   "maxItems": 2},
        "relation_type": {"type": ["string", "null"], "enum": [*RELATION_LABELS, None]},
        "source_phrase": {"type": "string", "minLength": 1, "maxLength": 160,
                          "description": "Kort ordagrann fras från människans tal som frågan gäller."},
    }, "required": ["kind", "operation", "subject", "candidates", "candidate_side", "fields", "relation_type", "source_phrase"],
    "additionalProperties": False,
}

REPORT_TOOL = {
    "type": "function", "name": "report_result",
    "description": "Avsluta uppdraget med ett kontrollerbart resultat. Krävs i stället för ett vanligt textsvar. "
        "Välj deletions_restored endast efter faktisk återställning, saved endast efter nytt sparkvitto, "
        "draft_changed efter faktisk utkaständring. answer väljer verkliga poster med references; "
        "questions innehåller högst tre avgränsade frågor om det som återstår, även efter draft_changed. "
        "Varje fråga gäller en operation och använder befintliga objekt samt en ordagrann fras från människans tal. "
        "saved får inte ha frågor. clarification med questions använder clarification_kind none och references []. "
        "failure återger serverns senaste registrerade fel, med references [] och questions []. "
        "För frågan vad som sparades: answer med answer_scope last_save, references [] och questions []. "
        "För markering i kartan: map_selection med exakt en reference, answer_scope selected_records och questions []. "
        "Det begär bara en visuell markering; klienten måste bekräfta att den faktiskt visas. "
        "Inga fria svarstexter används. Utför först nödvändiga kartverktyg; rapportering utför ingen ändring.",
    "parameters": {
        "type": "object", "properties": {
            "kind": {"type": "string", "enum": ["answer", "clarification", "draft_changed", "deletions_restored", "saved", "failure", "map_selection"]},
            "references": {"type": "array", "items": REFERENCE_SCHEMA,
                "description": "Faktaposter eller namnkandidater som finns i aktuell draft_map/saved_map. "
                    "Vid vem betalar: välj betalarrelationen. Vid prisfråga: välj objektet med priset. "
                    "Tom lista för hela utkastet/kartan eller mutationsrapport."},
            "answer_scope": {"type": "string", "enum": ["selected_records", "draft", "saved_map", "last_save", "status"],
                "description": "selected_records visar valda aktuella fakta, draft visar hela osparade förslaget, "
                    "saved_map visar valda sparade fakta eller hela sparade kartan om references är tom. "
                    "last_save läser upp ändringarna i senaste sparandet från historiken, utan nya ändringar. "
                    "status ger bara ett kort besked när inget ändras; kräver answer och tomma references/questions. "
                    "Ange selected_records när kind inte är answer."},
            "clarification_kind": {"type": "string", "enum": ["conflict", "operation_failed", "none"],
                "description": "conflict kräver en aktuell konflikt; operation_failed bekräftar ingen framgång. "
                    "Ange none för strukturerade questions och när kind inte är clarification."},
            "questions": {"type": "array", "items": QUESTION_SCHEMA, "maxItems": 3,
                "description": "Tom lista utan frågor. identity: 1–3 kandidater av samma objektslag. "
                    "add_relation kräver subject (känd ändpunkt), relation_type och candidate_side from/to "
                    "(okänd ändpunkt). Övriga frågor har candidate_side null; övriga identity har subject null. "
                    "field_choice: change_field med subject, fields [name,last_four] och inga kandidater. "
                    "inspect_object används för identitet i en faktafråga och har inga fält eller relation_type. "
                    "missing_value: change_field med subject och ett fält, add_object med enbart fältet name, "
                    "eller add_relation med subject och relation_type. Övriga relation_type är null."},
        }, "required": ["kind", "references", "answer_scope", "clarification_kind", "questions"],
        "additionalProperties": False,
    }, "strict": True,
}


def deletion_ids(view):
    return {(d["collection"], d["id"]) for d in view["full_diff"]
            if d["field"] == "*" and d["after"] is None}


def object_name(view, oid):
    for key in ("draft_map", "saved_map", "before_map", "before_saved_map"):
        record = view.get(key, {}).get("objects", {}).get(oid)
        if record:
            return record.get("name", "ett objekt")
    return "ett objekt"


def describe_record(view, collection, oid, fields):
    if collection == "objects":
        return fields.get("name", object_name(view, oid))
    label = RELATION_LABELS.get(fields.get("type"), "har samband med")
    if fields.get("type") == "pays":
        label += " för"
    text = f"{object_name(view, fields.get('from'))} {label} {object_name(view, fields.get('to'))}"
    if fields.get("uncertainty") in (True, "osäkert uppgivet", "uncertain"):
        text += " (osäkert uppgivet)"
    return text


def describe_changes(view, changes, saved=False):
    descriptions = []
    field_names = {"price": "priset", "name": "namnet", "address": "adressen",
                   "last_four": "kortets sista fyra siffror", "uncertainty": "osäkerheten"}
    missing = object()
    absent = {"$prototype_absent": True}
    target_map = view.get("saved_map" if saved else "draft_map", {})
    source_map = view.get("before_saved_map" if saved else "saved_map", {})
    baseline = {collection: {oid: dict(record) for oid, record in records.items()}
                for collection, records in view.get("saved_map", {}).items()}
    normalized = []
    for change in changes:
        collection, oid = change["collection"], change["id"]
        before, after = change.get("before", missing), change.get("after", missing)
        for key, mapping in (("before", source_map), ("after", target_map)):
            if key in change:
                continue
            records = mapping.get(collection)
            record = records.get(oid) if isinstance(records, dict) else missing
            value = record if change["field"] == "*" else (
                record.get(change["field"], absent) if isinstance(record, dict) else record)
            if key == "before":
                before = value
            else:
                after = value
        if change["field"] == "*" and isinstance(before, dict) and isinstance(after, dict):
            normalized.extend({**change, "field": field,
                               "before": before.get(field, absent), "after": after.get(field, absent)}
                              for field in sorted(before.keys() | after.keys()))
        else:
            normalized.append({**change, "before": before, "after": after})

    # full_diff starts at saved_map, even when this task starts with an older
    # draft. A save receipt carries the old values after saved_map has advanced.
    for change in normalized:
        collection, oid, field = change["collection"], change["id"], change["field"]
        records = baseline.setdefault(collection, {})
        before = change["before"]
        if field == "*":
            if isinstance(before, dict):
                records[oid] = dict(before)
            else:
                records.pop(oid, None)
        elif before is missing or before is None or before == absent:
            records.setdefault(oid, {}).pop(field, None)
        else:
            records.setdefault(oid, {})[field] = before
    baseline_view = {"draft_map": baseline, "saved_map": baseline}

    def value_text(value):
        if value is missing:
            return "okänt värde"
        if value is None or value == absent:
            return "saknas"
        if isinstance(value, bool):
            return "ja" if value else "nej"
        return str(value)

    for change in normalized:
        collection, oid = change["collection"], change["id"]
        before, after = change["before"], change["after"]
        if before == after:
            continue
        if change["field"] == "*":
            fields = after if isinstance(after, dict) else before
            if before is missing or after is missing or not isinstance(fields, dict):
                continue
            description = describe_record(baseline_view if after is None else view, collection, oid, fields)
            prefix = ("Borttaget: " if after is None else "Tillagt: ") if saved else (
                "Ta bort " if after is None else "Lägg till ")
            descriptions.append(prefix + description)
        elif collection == "relations":
            record = target_map.get("relations", {}).get(oid) or baseline.get("relations", {}).get(oid, {})
            descriptions.append(("Ändrat samband: " if saved else "Ändra samband: ")
                                + describe_record(view, collection, oid, record))
        else:
            subject = "" if change["field"] == "name" else f" för {object_name(baseline_view, oid)}"
            descriptions.append(f"{'Ändrat' if saved else 'Ändra'} {field_names.get(change['field'], 'uppgiften')} "
                                f"från {value_text(before)} till {value_text(after)}{subject}")
    return "; ".join(descriptions)


def report_schema_error(arguments):
    """Enforce the same closed shape locally, including rejection of free text."""
    properties = REPORT_TOOL["parameters"]["properties"]
    if not isinstance(arguments, dict) or set(arguments) != set(properties):
        return {"error": "report_requires_only_kind_references_scope_clarification_and_questions"}
    for key in ("kind", "answer_scope", "clarification_kind"):
        if arguments[key] not in properties[key]["enum"]:
            return {"error": "unknown_report_value", "field": key}
    if not isinstance(arguments["references"], list):
        return {"error": "report_reference_list_required", "field": "references"}
    for item in arguments["references"]:
        if not valid_reference(item):
            return {"error": "invalid_report_reference", "field": "references"}
    questions = arguments["questions"]
    if not isinstance(questions, list) or len(questions) > 3:
        return {"error": "report_requires_at_most_three_questions"}
    for index, question in enumerate(questions):
        error = question_schema_error(question)
        if error:
            return {"error": error, "question_index": index}
    if questions and arguments["kind"] == "saved":
        return {"error": "saved_report_cannot_have_unresolved_questions"}
    if arguments["kind"] == "map_selection" and (
            len(arguments["references"]) != 1 or questions or arguments["answer_scope"] != "selected_records"):
        return {"error": "map_selection_requires_one_reference_selected_records_and_no_questions"}
    if arguments["kind"] == "failure" and (questions or arguments["references"]):
        return {"error": "failure_report_requires_empty_questions_and_references"}
    if arguments["answer_scope"] == "last_save" and (
            arguments["kind"] != "answer" or questions or arguments["references"]):
        return {"error": "last_save_requires_answer_and_empty_questions_and_references"}
    if arguments["answer_scope"] == "status" and (
            arguments["kind"] != "answer" or questions or arguments["references"]):
        return {"error": "status_requires_answer_and_empty_questions_and_references"}
    if questions and arguments["kind"] == "clarification" and (
            arguments["clarification_kind"] != "none" or arguments["references"]):
        return {"error": "scoped_clarification_requires_none_and_empty_references"}
    if arguments["kind"] != "clarification" and arguments["clarification_kind"] != "none":
        return {"error": "clarification_kind_must_be_none_for_other_reports"}
    return None


def valid_reference(item):
    return (isinstance(item, dict) and set(item) == {"collection", "id"}
            and item["collection"] in ("objects", "relations")
            and isinstance(item["id"], str) and bool(item["id"]))


def question_schema_error(question):
    properties = QUESTION_SCHEMA["properties"]
    if not isinstance(question, dict) or set(question) != set(properties):
        return "question_requires_only_kind_operation_subject_candidates_candidate_side_fields_relation_type_and_source_phrase"
    for key in ("kind", "operation", "relation_type", "candidate_side"):
        if question[key] not in properties[key]["enum"]:
            return "unknown_question_value"
    subject, candidates, fields = question["subject"], question["candidates"], question["fields"]
    if subject is not None and not valid_reference(subject):
        return "invalid_question_subject"
    if (not isinstance(candidates, list) or len(candidates) > 3
            or any(not valid_reference(item) for item in candidates)):
        return "invalid_question_candidates"
    if len({(item["collection"], item["id"]) for item in candidates}) != len(candidates):
        return "duplicate_question_candidates"
    if (not isinstance(fields, list) or len(fields) > 2
            or any(field not in properties["fields"]["items"]["enum"] for field in fields)):
        return "invalid_question_fields"
    if len(set(fields)) != len(fields):
        return "duplicate_question_fields"
    phrase = question["source_phrase"]
    if (not isinstance(phrase, str) or not phrase.strip() or len(phrase) > 160
            or phrase != phrase.strip() or any(ord(char) < 32 for char in phrase)):
        return "invalid_question_source_phrase"
    return None


def selected_record(view, collection, oid, saved=False):
    maps = ("saved_map",) if saved else ("draft_map", "saved_map")
    return next((view[key][collection][oid] for key in maps
                 if oid in view[key][collection]), None)


def record_facts(view, collection, oid, record):
    text = describe_record(view, collection, oid, record)
    if collection == "relations":
        return text
    details = []
    price_key = next((key for key in ("price", "price_sek", "monthly_price") if key in record), None)
    if price_key:
        value = str(record[price_key]).replace(".", ",")
        currency = record.get("currency", "SEK" if price_key == "price_sek" else "")
        unit = {"SEK": "kronor", "EUR": "euro", "USD": "dollar", "NOK": "norska kronor",
                "DKK": "danska kronor"}.get(currency, currency)
        interval = record.get("interval", record.get("billing_interval", "month" if price_key == "monthly_price" else ""))
        period = {"month": " per månad", "monthly": " per månad", "year": " per år",
                  "yearly": " per år", "annual": " per år", "week": " per vecka",
                  "weekly": " per vecka"}.get(interval, "")
        details.append(f"pris {value}{' ' + unit if unit else ''}{period}")
    last_four = record.get("last_four", record.get("last4"))
    if last_four is not None:
        details.append("kortets sista fyra siffror " + str(last_four))
    address = record.get("address", record.get("email"))
    if address is not None:
        details.append("adress " + str(address))
    return text + (": " + ", ".join(details) if details else "")


def current_draft_status(view):
    return ("Aktuella osparade förslag: " + describe_changes(view, view["full_diff"]) + "."
            if view["full_diff"] else "Det finns inga osparade ändringar i utkastet.")


def describe_answer(arguments, view):
    scope = arguments["answer_scope"]
    if scope == "status":
        return "Inget ändrat.", None
    if scope == "last_save":
        if "last_saved_changes" not in view:
            return None, {"error": "latest_saved_history_required"}
        group = view["last_saved_changes"]
        if not group:
            return "Det finns inga sparade ändringar att läsa upp.", None
        if group.get("map_version") != view["map_version"]:
            return None, {"error": "saved_history_changed_read_again"}
        saved_view = {**view, "draft_map": view["saved_map"]}
        return "Vid det senaste sparandet: " + describe_changes(saved_view, group["full_diff"], saved=True) + ".", None
    if scope == "draft":
        return current_draft_status(view), None
    references = arguments["references"]
    saved = scope == "saved_map"
    if not references:
        if not saved:
            return None, {"error": "selected_records_requires_references"}
        references = [{"collection": collection, "id": oid}
                      for collection in ("objects", "relations") for oid in view["saved_map"][collection]]
    if not references:
        return "Den sparade kartan är tom.", None
    fact_view = {**view, "draft_map": view["saved_map"]} if saved else view
    changed = {(d["collection"], d["id"]) for d in view["full_diff"]}
    removed = deletion_ids(view)
    descriptions = []
    for item in references:
        collection, oid = item["collection"], item["id"]
        record = selected_record(view, collection, oid, saved=saved)
        if record is None:
            return None, {"error": "selected_record_is_not_in_requested_map", "reference": item}
        description = record_facts(fact_view, collection, oid, record)
        if not saved and (collection, oid) in removed:
            description = "Föreslagen borttagning: " + description
        elif not saved and (collection, oid) in changed:
            description = "Osparat förslag: " + description
        descriptions.append(description)
    return ("I den sparade kartan: " if saved else "") + "; ".join(descriptions) + ".", None


def describe_clarification(arguments, view):
    kind = arguments["clarification_kind"]
    if kind == "conflict":
        if not view.get("conflicts"):
            return None, {"error": "no_current_conflict_to_clarify"}
        text = "Det finns motstridiga uppgifter i utkastet. Ska utkastets eller den sparade kartans uppgift gälla?"
    elif kind == "operation_failed":
        text = "Jag kan inte bekräfta att den begärda ändringen är genomförd. " + current_draft_status(view)
    else:
        return None, {"error": "clarification_requires_a_question_type"}
    if kind != "operation_failed" and deletion_ids(view):
        text += " Det finns fortfarande föreslagna borttagningar i utkastet."
    return text, None


def object_kind(record):
    return record.get("kind", record.get("type"))


def question_fields_fit(fields, records):
    if "last_four" in fields:
        return all(object_kind(record) == "card" or (
            object_kind(record) is None and any(key in record for key in ("last_four", "last4")))
                   for record in records)
    return True


def describe_questions(questions, view, source_texts):
    """Render bounded questions using current records and actual human speech."""
    texts = []
    field_names = {"name": "namnet", "last_four": "kortets sista fyra siffror",
                   "price": "priset", "address": "adressen"}
    sources = source_texts if isinstance(source_texts, (list, tuple)) else []
    for index, question in enumerate(questions):
        def reject(error):
            return None, {"error": error, "question_index": index}

        phrase = question["source_phrase"]
        if not any(isinstance(source, str) and phrase in source for source in sources):
            return reject("question_source_phrase_is_not_in_human_speech")
        subject, candidates = question["subject"], question["candidates"]
        references = ([subject] if subject else []) + candidates
        records = []
        for item in references:
            if item["collection"] != "objects":
                return reject("question_operation_requires_object_references")
            record = view["draft_map"]["objects"].get(item["id"])
            if record is None:
                return reject("question_reference_is_not_in_current_draft")
            records.append(record)
        candidate_records = records[1:] if subject else records
        kinds = {object_kind(record) for record in candidate_records if object_kind(record) is not None}
        if len(kinds) > 1:
            return reject("question_candidates_must_have_the_same_object_kind")
        kind, operation = question["kind"], question["operation"]
        fields, relation_type = question["fields"], question["relation_type"]
        candidate_side = question["candidate_side"]
        if operation == "add_relation":
            if subject is None or relation_type is None or fields or candidate_side is None:
                return reject("relation_question_requires_subject_relation_type_candidate_side_and_no_fields")
            if subject in candidates:
                return reject("relation_question_candidate_must_differ_from_subject")
        elif relation_type is not None:
            return reject("relation_type_is_only_for_add_relation_questions")
        elif candidate_side is not None:
            return reject("candidate_side_is_only_for_add_relation_questions")
        if kind == "identity":
            if not candidates:
                return reject("identity_question_requires_candidates")
            if operation != "add_relation" and subject is not None:
                return reject("identity_subject_is_only_for_add_relation")
            if operation == "change_field":
                if len(fields) != 1:
                    return reject("identity_field_question_requires_one_field")
            elif fields:
                return reject("identity_object_question_cannot_have_fields")
        elif kind == "field_choice":
            if (operation != "change_field" or subject is None or candidates
                    or set(fields) != {"name", "last_four"}):
                return reject("field_choice_requires_subject_and_card_name_last_four_fields")
        elif kind == "missing_value":
            if candidates:
                return reject("missing_value_question_cannot_have_candidates")
            if operation == "change_field":
                if subject is None or len(fields) != 1:
                    return reject("missing_field_value_requires_subject_and_one_field")
            elif operation == "add_object":
                if subject is not None or fields != ["name"]:
                    return reject("missing_new_object_value_requires_only_name")
            elif operation == "inspect_object":
                if subject is not None or fields:
                    return reject("missing_identity_requires_no_subject_or_fields")
            elif operation != "add_relation":
                return reject("missing_value_does_not_apply_to_this_operation")
        if not question_fields_fit(fields, records):
            return reject("question_fields_do_not_apply_to_referenced_objects")

        prefix = f"När du säger ”{phrase}”, "
        names = " eller ".join(record.get("name", "ett objekt") for record in candidate_records)
        subject_name = records[0].get("name", "ett objekt") if subject else None
        if kind == "field_choice":
            prefix = ""
            question_text = f"Vill du ändra namnet på {subject_name}, kortets sista fyra siffror eller båda?"
        elif operation == "add_relation":
            label = RELATION_LABELS[relation_type] + (" för" if relation_type == "pays" else "")
            if candidate_side == "from":
                question_text = (f"menar du att {names} {label} {subject_name}?" if kind == "identity"
                                 else f"vilket objekt menar du {label} {subject_name}?")
            else:
                question_text = (f"menar du att {subject_name} {label} {names}?" if kind == "identity"
                                 else f"vilket objekt menar du att {subject_name} {label}?")
        elif operation == "delete_object":
            question_text = f"vill du ta bort {names}?"
        elif operation == "inspect_object":
            question_text = (f"menar du {names}?" if kind == "identity"
                             else "vilken person eller vilket objekt menar du? Ange gärna namnet.")
        elif operation == "add_object":
            question_text = (f"menar du {names} som redan finns i kartan, eller vill du lägga till ett nytt objekt?"
                             if kind == "identity" else "vilket namn ska det nya objektet ha?")
        else:
            field = field_names[fields[0]]
            question_text = (f"vill du ändra {field} för {names}?" if kind == "identity"
                             else f"vilket värde ska {field} för {subject_name} ha?")
        texts.append(prefix + question_text)
    return " ".join(texts), None


def checked_report(arguments, before, after, mutations, receipt, restored, source_texts=None, failure=None):
    """Reject ungrounded completion; mutation wording comes from checked state."""
    schema_error = report_schema_error(arguments)
    if schema_error:
        return None, schema_error
    after = {**after, "before_map": before["draft_map"], "before_saved_map": before["saved_map"]}
    questions, question_error = describe_questions(arguments["questions"], after, source_texts)
    if question_error:
        return None, question_error
    for item in arguments["references"]:
        if selected_record(after, item["collection"], item["id"]) is None:
            return None, {"error": "report_reference_is_not_in_current_map", "reference": item}
    actual = deletion_ids(after)
    kind = arguments.get("kind")
    if receipt and kind != "saved":
        return None, {"error": "this_task_has_a_save_receipt_report_the_actual_saved_result"}
    if kind == "failure":
        if mutations:
            return None, {"error": "report_actual_mutation_result_instead_of_previous_failure"}
        if not failure or not failure.get("text"):
            return None, {"error": "no_recorded_failure"}
        return "Det senaste registrerade felbeskedet var: " + failure["text"], None
    elif kind == "saved":
        if not receipt:
            return None, {"error": "no_save_receipt_in_this_task"}
        text = "Sparat."
        if after["full_diff"]:
            text += " Det finns också osparade ändringar kvar."
    elif kind == "deletions_restored":
        if not restored or any((c, oid) in actual for c, oid in restored):
            return None, {"error": "no_verified_restoration_in_this_task",
                          "instruction": "Använd restore_draft_deletions för aktuella osparade borttagningar. read_map återställer ingenting."}
        text = "Återställt."
    elif kind == "draft_changed":
        if not mutations or before["draft_map"] == after["draft_map"]:
            return None, {"error": "no_verified_draft_change_in_this_task"}
        text = ("Ångrat i utkastet." if set(mutations) == {"undo_as_draft"}
                else "Utkastet är uppdaterat.")
    elif kind == "map_selection":
        if mutations:
            return None, {"error": "report_actual_mutation_result_instead_of_selection"}
        text = "Markeringen behöver bekräftas av kartvyn."
    elif kind in ("answer", "clarification"):
        if mutations:
            return None, {"error": "report_actual_mutation_result_instead_of_answer"}
        if kind == "clarification" and questions:
            text, error = "", None
        else:
            text, error = (describe_answer(arguments, after) if kind == "answer"
                           else describe_clarification(arguments, after))
        if error:
            return None, error
    else:
        return None, {"error": "unknown_report_kind"}
    return " ".join(part for part in (text, questions) if part), None
