import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInstallation } from '../../tests/support/installation.js';
import { approvedForVisit } from '../../tests/support/conversation.js';

export type ApplicationVersion = { id: string; directory: string; commit: string };

/** Load the selected committed application, while the common evaluator owns
 * scenarios, synthetic start data and provider/judge configuration. */
export async function applicationAdapter(selected?: ApplicationVersion) {
  if (!selected)
    return {
      version: undefined,
      approval: approvedForVisit,
      create: (options: Parameters<typeof createInstallation>[1]) =>
        createInstallation(undefined, options),
    };
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(selected.id) || !/^[a-f0-9]{40}$/.test(selected.commit))
    throw new Error('evaluation_application_version_invalid');
  let directory: string;
  try {
    directory = await realpath(selected.directory);
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim();
    if (await realpath(git('rev-parse', '--show-toplevel')) !== directory)
      throw new Error('not_worktree_root');
    if (git('rev-parse', 'HEAD') !== selected.commit) throw new Error('commit_mismatch');
    if (git('status', '--porcelain=v1', '--untracked-files=normal')) throw new Error('dirty');
    // Ignored build outputs are allowed, but ignored source cannot silently
    // become executable code absent from the recorded commit.
    if (git('ls-files', '--others', '--', 'src', 'migrations', 'scripts/seeds', 'tests/support'))
      throw new Error('untracked_application_source');
  } catch {
    throw new Error(`evaluation_application_unverified:${selected.id}`);
  }
  const implementation = await import(
    /* @vite-ignore */ pathToFileURL(join(directory, 'tests/support/installation.ts')).href
  );
  const consent = await import(
    /* @vite-ignore */ pathToFileURL(join(directory, 'src/shared/conversation-consent.ts')).href
  );
  if (
    typeof implementation.createInstallation !== 'function' ||
    !Number.isSafeInteger(consent.conversationConsentTextVersion) ||
    consent.conversationConsentTextVersion <= 0
  )
    throw new Error(`evaluation_application_incompatible:${selected.id}`);
  const create = implementation.createInstallation as typeof createInstallation;
  return {
    version: { ...selected, directory },
    approval: { consent: { textVersion: consent.conversationConsentTextVersion as number } },
    create: (options: Parameters<typeof createInstallation>[1]) =>
      create(undefined, { ...options, migrationsDirectory: join(directory, 'migrations') }),
  };
}
