import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { draftConflicts } from '../shared/draft-conflicts.js';
import { financialFields } from '../shared/financial-facts.js';
import { proposedObjectTypes, proposedRelationshipTypes } from '../shared/map.js';
import type { householdMap } from './map.js';
import { MapError } from './map.js';

type HouseholdMap = ReturnType<typeof householdMap>;

export const assistantWorkInstructions = `Läs först hela det egna beständiga utkastet och tidigare sparförsök. Ta med förslag från webbläsaren och andra klienter. Läs bara relevanta kartdelar och aktuella typdefinitioner; använd stabila ID och red ut flera möjliga identiteter utan att gissa. Behåll skillnaden mellan obesvarat, okänt, uttryckligen inget, osäkert uppgivet och uttryckligen ospecificerat objekt. Förslagsanrop ändrar bara eget utkast. Återge hela utkastet begripligt, inklusive tillägg, rättelser, borttagningar, konflikter och olösta frågor. Spara inte vid nekade eller hypotetiska sparkommandon, exempelvis ”spara inte” eller ”vad händer om vi sparar?”. Endast ett aktuellt uttryckligt sparbesked gäller hela utkastet. En entydig rättelse och sparbegäran i samma meddelande får verkställas med den returnerade rättade versionen utan ett extra ja enbart på grund av versionsbytet, om hela förslaget fortfarande motsvarar begäran. Ett äldre godkännande får inte användas för tillkommande ändringar. Vid oväntad version, konflikt eller oklar identitet: spara inga delar, visa aktuellt underlag och invänta ett nytt sparbesked. Serverns versionskontroller och modellens tolkning är inget oberoende bevis på vad människan har sagt eller hört. Spara separat med save_draft och ett stabilt operations-ID; prepare_save kan först registrera försöket men är inget sparresultat. Uteblivet svar betyder okänt resultat: kontrollera read_save_operation eller read_my_save_operations före nya ändringar eller nytt sparförsök. Återförsök endast ett känt pending försök med exakt samma ID, version och contentVersion. null betyder inte att ett gammalt försök lyckades och ger inget nytt godkännande efter ersatt innehåll. Bekräfta kort endast vad det beständiga kvittot visar; ge detaljer på begäran. Avbrutet samtal återställer inte ett genomfört sparande. Lagra inte fullständiga samtal, ljud, lösenord eller fullständiga konto- och kortnummer i kartan.`;

export function assistantResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

export function assistantDraftReview(map: HouseholdMap) {
  const state = map.read();
  const { draft } = state;
  const conflicts = draftConflicts(state);
  const unresolvedIdentities = [
    ...draft.changes
      .filter((change) => change.after?.identity === 'unresolved')
      .map(({ id }) => ({ kind: 'object', id })),
    ...(draft.relationships ?? [])
      .filter((change) => change.after?.knowledge === 'unresolved')
      .map(({ id }) => ({ kind: 'relationship', id })),
  ];
  const changedObjectIds = new Set(draft.changes.map(({ id }) => id));
  const objectIds = new Set(changedObjectIds);
  for (const change of draft.relationships ?? []) {
    for (const edge of [change.before, change.after]) {
      if (edge) {
        objectIds.add(edge.sourceId);
        if (edge.targetId) objectIds.add(edge.targetId);
      }
    }
  }
  const relationships = state.relationships.filter(
    (edge) =>
      draft.relationships?.some((change) => change.id === edge.id) ||
      changedObjectIds.has(edge.sourceId) ||
      (edge.targetId !== null && changedObjectIds.has(edge.targetId)),
  );
  for (const edge of relationships) {
    objectIds.add(edge.sourceId);
    if (edge.targetId) objectIds.add(edge.targetId);
  }
  const pendingOperations = map
    .operations()
    .operations.filter(({ status }) => status === 'pending');
  const objects = state.objects
    .filter(({ id }) => objectIds.has(id))
    .map((object) =>
      changedObjectIds.has(object.id)
        ? object
        : { id: object.id, name: object.name, typeId: object.typeId },
    );
  const objectTypeIds = new Set([
    ...objects.map(({ typeId }) => typeId),
    ...(draft.objectTypes ?? []).map(({ id }) => id),
  ]);
  const relationshipTypeIds = new Set([
    ...relationships.map(({ typeId }) => typeId),
    ...(draft.relationshipTypes ?? []).map(({ id }) => id),
  ]);
  return {
    ...draft,
    contentVersion: state.contentVersion,
    current: {
      objects,
      relationships,
      types: state.types.filter(({ id }) => objectTypeIds.has(id)),
      relationshipTypes: state.relationshipTypes.filter(({ id }) => relationshipTypeIds.has(id)),
    },
    conflicts,
    unresolvedIdentities,
    pendingOperations,
    readyToSave:
      Boolean(
        draft.changes.length ||
          draft.relationships?.length ||
          draft.objectTypes?.length ||
          draft.relationshipTypes?.length,
      ) &&
      !conflicts.length &&
      !unresolvedIdentities.length &&
      !pendingOperations.length,
  };
}

const versionFields = {
  version: z.number().int().nonnegative(),
  contentVersion: z.number().int().positive(),
};
const id = z.string().regex(/^[\w-]{1,128}$/);
const proposalFields = {
  ...versionFields,
  id,
  baseRevision: z.number().int().positive().nullable(),
  typeRevision: z.number().int().positive().optional(),
};
const fact = z.union([
  z
    .object({
      knowledge: z.enum(['known', 'uncertain']),
      value: z.string(),
      reportedOn: z.string().optional(),
    })
    .strict(),
  z.object({ knowledge: z.enum(['unknown', 'none']), reportedOn: z.string().optional() }).strict(),
]);
const lifecycle = z.enum(['active', 'ended']).optional();
const saveFields = z.object({ ...versionFields, operationId: id }).strict();

export function registerAssistantWork(server: McpServer, map: () => HouseholdMap) {
  function run(action: (domain: HouseholdMap) => unknown) {
    try {
      return assistantResult(action(map()));
    } catch (error) {
      const known = error instanceof MapError;
      const code = known ? error.code : 'result_unknown';
      const messages: Record<string, string> = {
        unresolved_identity:
          'Identiteten är olöst. Fråga vilken person eller sak som avses, eller låt användaren uttryckligen välja ospecificerat objekt. Inget sparades.',
        operation_pending:
          'Kontrollera det väntande sparförsöket innan nya ändringar. Återförsök endast samma ID och innehåll när resultatet är känt.',
        operation_conflict:
          'Samma operations-ID gäller ett annat innehåll. Kontrollera det ursprungliga försöket; inget nytt sparades.',
        content_conflict:
          'Hushållets innehåll har ersatts. Läs om underlaget. Gamla försök och godkännanden gäller inte det nya innehållet.',
        forbidden: 'Åtkomsten är återkallad. Anslut på nytt i Skyttel.',
        invalid_request:
          'Ogiltiga uppgifter. Rätta förslaget enligt verktygets och typens definitioner.',
        result_unknown:
          'Utfallet är okänt. Kontrollera sparförsöket före nya ändringar eller återförsök. Påstå inte att något sparades eller återställdes.',
      };
      let review: ReturnType<typeof assistantDraftReview> | undefined;
      if (known && error.status !== 403 && error.status !== 401) {
        try {
          review = assistantDraftReview(map());
        } catch {
          /* Access may no longer permit content. */
        }
      }
      return {
        ...assistantResult({
          error: code,
          message:
            messages[code] ??
            'Underlaget kan inte användas. Granska hela aktuella utkastet, red ut konflikten och invänta ett nytt sparbesked. Inga delar delsparas.',
          ...(review ? { review } : {}),
        }),
        isError: true,
      };
    }
  }
  server.registerTool(
    'read_type_catalog',
    {
      description:
        'Läs hushållets aktuella objekt- och sambandstyper, även i en tom karta. Egna typförslag i ditt utkast ingår. Använd deras stabila ID, revisioner, fält och riktning; anta aldrig en fast katalog.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () =>
      run((domain) => {
        const state = domain.read();
        return {
          contentVersion: state.contentVersion,
          types: proposedObjectTypes(state.types, state.draft.objectTypes),
          relationshipTypes: proposedRelationshipTypes(
            state.relationshipTypes,
            state.draft.relationshipTypes,
          ),
        };
      }),
  );
  server.registerTool(
    'propose_object',
    {
      description:
        'Föreslå ett nytt objekt, ersätt hela dess förslagsvärde eller föreslå vanlig borttagning med value null. Behåll alla fakta som inte ska ändras. Använd aktuella typ-ID, typrevision och stabila objekt-ID. Bara eget utkast ändras; hela utkastet returneras. Olöst identitet måste anges som unresolved; unspecified kräver användarens uttryckliga val.',
      inputSchema: z
        .object({
          ...proposalFields,
          value: z
            .object({
              typeId: z.string(),
              name: z.string().min(1).max(200),
              description: z.string().max(2000),
              identity: z.enum(['unspecified', 'unresolved']).optional(),
              financialFacts: z
                .object(
                  Object.fromEntries(financialFields.map(({ key }) => [key, fact.optional()])),
                )
                .strict()
                .optional(),
              customValues: z
                .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
                .optional(),
              lifecycle,
              profileImageId: z.string().optional(),
            })
            .strict()
            .nullable(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (body) =>
      run((domain) => {
        domain.propose(body);
        return assistantDraftReview(domain);
      }),
  );
  server.registerTool(
    'propose_relationship',
    {
      description:
        'Föreslå eller rätta ett riktat samband med aktuell typ, stabila ändpunkter och typrevision. value null föreslår vanlig borttagning. known/uncertain kräver mål-ID; unknown/none/unresolved har targetId null och betyder olika saker. Hela privata utkastet returneras. Ett upprepat tillägg anger befintligt samband i existingId.',
      inputSchema: z
        .object({
          ...proposalFields,
          value: z
            .object({
              typeId: z.string(),
              sourceId: z.string(),
              targetId: z.string().nullable(),
              knowledge: z.enum(['known', 'uncertain', 'unknown', 'none', 'unresolved']),
              lifecycle,
              endDate: fact.optional(),
            })
            .strict()
            .nullable(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (body) =>
      run((domain) => {
        const result = domain.proposeRelationship(body);
        return {
          ...assistantDraftReview(domain),
          ...(result.existingId ? { existingId: result.existingId } : {}),
        };
      }),
  );
  server.registerTool(
    'save_draft',
    {
      description:
        'Spara HELA aktuella utkastet endast på ett uttryckligt sparbesked. Använd granskad version och contentVersion, samt ett nytt stabilt operationId. Vid känt väntande försök återanvänd exakt samma ID och innehåll. Bekräfta endast det beständiga kvittot. Uteblivet svar är okänt resultat: läs sparförsöket innan något nytt görs.',
      inputSchema: saveFields,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (body) => run((domain) => domain.save(body)),
  );
  server.registerTool(
    'prepare_save',
    {
      description:
        'Registrera ett godkänt helt sparförsök beständigt före själva sparandet, med stabilt operationId och exakt granskad version/contentVersion. pending är INTE ett kvitto och ändrar inte den sparade kartan. Utkastet skyddas tills samma försök sparas eller avvisas. Använd bara efter aktuellt uttryckligt sparbesked.',
      inputSchema: saveFields,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (body) => run((domain) => domain.registerOperation(body)),
  );
  server.registerTool(
    'read_my_save_operations',
    {
      description:
        'Återfinn egna väntande och senaste sparförsök från andra klienter eller efter avbrott. Läs kvittot vid succeeded. Äldre kända ID kan hämtas med read_save_operation. Andra användares privata försök ingår inte.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => run((domain) => domain.operations()),
  );
  server.registerTool(
    'discard_proposal',
    {
      description:
        'Kasta ett eget osparat förslag, utan att ångra något sparat. Hela återstående utkastet returneras; beroende sambandsförslag följer formulärens regler.',
      inputSchema: z
        .object({
          ...versionFields,
          id,
          kind: z.enum(['object', 'relationship', 'objectType', 'relationshipType']),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async (body) =>
      run((domain) => {
        domain.discardChange(body);
        return assistantDraftReview(domain);
      }),
  );
  server.registerTool(
    'resolve_conflict',
    {
      description:
        'Lös en konflikt efter användarens val. Skicka exakt conflict från senaste hela utkastet och choice saved eller proposed. Samtidiga nya ändringar stoppar ett gammalt val. Svaret visar hela kvarvarande utkastet; spara först på ett aktuellt uttryckligt besked som omfattar det.',
      inputSchema: z
        .object({
          ...versionFields,
          choice: z.enum(['saved', 'proposed']),
          conflict: z.record(z.string(), z.unknown()),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (body) =>
      run((domain) => {
        domain.resolve(body);
        return assistantDraftReview(domain);
      }),
  );
  server.registerTool(
    'discard_draft',
    {
      description:
        'Kasta hela ditt aktuella privata utkast endast när användaren ber om det. Detta återställer inte tidigare sparanden. Hela det tomma utkastet och dess nya version returneras.',
      inputSchema: z.object(versionFields).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async (body) =>
      run((domain) => {
        domain.discard(body.version, body.contentVersion);
        return assistantDraftReview(domain);
      }),
  );
  server.registerTool(
    'read_save_operation',
    {
      description:
        'Kontrollera ditt sparförsök med dess operations-ID efter avbrott. succeeded ger beständigt kvitto; pending saknar slutresultat; rejected genomförde inte sparandet; null betyder att försöket inte registrerats i aktuellt innehåll. Kontrollera detta före nytt arbete.',
      inputSchema: z.object({ operationId: id }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ operationId }) => run((domain) => domain.operation(operationId)),
  );
}
