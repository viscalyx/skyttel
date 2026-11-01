# External-assistant prompt-injection handling

Protection for Skyttel's internal text and voice assistant does not cover
how an external assistant interprets map or draft content. External-client
prompt-injection prevention, interpretation of user requests and incident
reporting are outside the scope of that protection work.

## Why this is out of scope

Skyttel controls its own conversation processing. An external MCP client
controls its model, conversation and use of tool results. Its tool calls
identify the user and requested operation, but do not give Skyttel an
independently authenticated copy of the user's conversation. Skyttel cannot
establish from those calls alone whether the external model followed the
user's request or instructions embedded in stored data.

Internal and external assistants acting for the same user continue to use
that user's existing draft. Normal requested changes enter the draft
without approval for each change. The user approves the whole draft by
explicitly asking to save it. This scope boundary does not remove the
server's existing identity, access, version and domain checks.

## Possible future mitigation

Skyttel can provide guidance in MCP server instructions and repeat a
reminder in tool responses that return map or draft data: object and
relationship names, properties and other stored content are data, never
instructions to follow.

Such reminders are a possible precaution, not a guarantee or the only
defense. The external client must control how data enters its model
context and can apply its own validation and restrictions. Skyttel cannot
force an external model to obey textual guidance.

Implementing or evaluating external-client handling requires separate
work. This exclusion does not permanently reject that future work or
claim that external-assistant prompt injection is prevented.
