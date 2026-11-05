/** Independent semantic obligation; structural pending-state checks alone
 * cannot establish that an unfinished request can safely be continued. */
export const retainedWorkRequirement =
  'Assess retained work from the independently declared original requests in ' +
  'observedState.expected.preservedRequests, the verified completed map/draft work ' +
  'and the active waiting/ready pendingParts together. Every unfinished action, ' +
  'target, value, uncertainty, prohibition and save restriction must remain ' +
  'recoverable from active pending work; exact wording and one part per request ' +
  'are not required. The declared requests state obligations, never evidence ' +
  'that those obligations survived. Recoverability must come from actual active ' +
  'parts, including their structured clarification evidence, and verified ' +
  'completed work. Already verified completed work need not remain pending. ' +
  'Apply authoritative user clarifications and corrections in order: a newer ' +
  'explicit correction replaces the earlier choice or value, while restrictions ' +
  'not changed by the user remain binding. A model paraphrase is not a user ' +
  'correction. Historical messages, summaries, a question or a success claim ' +
  'alone do not prove retained work. Missing, withdrawn or completed pending ' +
  'parts cannot retain unfinished work. Judge this state obligation independently ' +
  'of whether a scripted answer exists; do not infer retention from nonempty text.';
