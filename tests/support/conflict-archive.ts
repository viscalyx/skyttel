import { createHash } from 'node:crypto';
import { type APIRequestContext, expect } from '@playwright/test';
import { unzipSync, zipSync } from 'fflate';
import type { ImportContent } from '../../src/server/import-schema.js';
import type { ObjectType, RelationshipType } from '../../src/shared/map.js';
import { conflictCollaborators } from './conflict-properties.js';

export type ArchiveConflictKind =
  | 'missing-object-type'
  | 'missing-relationship-type'
  | 'invalid-datatype'
  | 'removed-object-definition'
  | 'removed-relationship-definition';
type ConflictApp = Awaited<ReturnType<typeof conflictCollaborators>>;
type ArchiveManifest = { parts: { path: string; bytes: number; sha256: string }[] };

export async function downloadConflictArchive(app: ConflictApp, administrator: APIRequestContext) {
  const householdPath = app.path.slice(0, -4);
  const ready = await administrator.post(`${householdPath}/exports`, {
    headers: { origin: app.installation.origin },
    data: {},
  });
  expect(ready.status()).toBe(201);
  const archive = await administrator.get(`${householdPath}/exports/${(await ready.json()).id}`);
  expect(archive.status()).toBe(200);
  const files = unzipSync(new Uint8Array(await archive.body()));
  const content = JSON.parse(Buffer.from(files['content.json']).toString()) as ImportContent;
  return { files, content };
}

export async function importConflictArchive(
  app: ConflictApp,
  administrator: APIRequestContext,
  archive: Awaited<ReturnType<typeof downloadConflictArchive>>,
) {
  archive.files['content.json'] = Buffer.from(JSON.stringify(archive.content));
  const manifest = JSON.parse(
    Buffer.from(archive.files['manifest.json']).toString(),
  ) as ArchiveManifest;
  for (const part of manifest.parts) {
    const bytes = archive.files[part.path];
    part.bytes = bytes.length;
    part.sha256 = createHash('sha256').update(bytes).digest('hex');
  }
  archive.files['manifest.json'] = Buffer.from(JSON.stringify(manifest));
  const contentVersion = (await app.read(administrator)).contentVersion;
  const householdPath = app.path.slice(0, -4);
  const upload = await administrator.post(`${householdPath}/imports`, {
    headers: {
      origin: app.installation.origin,
      'content-type': 'application/zip',
      'X-Skyttel-Content-Version': String(contentVersion),
    },
    data: Buffer.from(zipSync(archive.files)),
  });
  expect(upload.status(), await upload.text()).toBe(201);
  const preview = await upload.json();
  const inspected = await administrator.get(`${householdPath}/imports/${preview.id}`);
  expect(inspected.status()).toBe(200);
  expect((await inspected.json()).status).toBe('ready');
  const confirmed = await administrator.post(`${householdPath}/imports/${preview.id}/confirm`, {
    headers: { origin: app.installation.origin },
    data: { contentVersion, confirmed: true },
  });
  expect(confirmed.status(), await confirmed.text()).toBe(200);
  expect(await confirmed.json()).toMatchObject({
    status: 'completed',
    contentVersion: contentVersion + 1,
  });
}

/** An administrator imports actual older owned private snapshots against lawful newer shared facts. */
export async function prepareArchiveConflict(
  administrator: APIRequestContext,
  member: APIRequestContext,
  kind: ArchiveConflictKind,
  options: { administratorDefinitionProposal?: boolean } = {},
) {
  const app = await conflictCollaborators(administrator, member);
  const relationship =
    kind === 'missing-relationship-type' || kind === 'removed-relationship-definition';
  const definitionRoute = relationship ? 'relationship-type' : 'object-type';
  const typeId = 'historical-type';
  const definition = relationship
    ? {
        name: 'Förvaras i',
        description: 'Förvaring',
        forwardLabel: 'förvaras i',
        reverseLabel: 'förvarar',
        fields:
          kind === 'missing-relationship-type'
            ? [{ id: 'storage-year', name: 'Installationsår', description: '', kind: 'text' }]
            : [],
      }
    : {
        name: 'Solcellsanläggning',
        description: 'Anläggning',
        fields: [{ id: 'year', name: 'Installationsår', description: '', kind: 'text' }],
      };
  expect(
    (
      await app.post(administrator, definitionRoute, {
        version: (await app.read()).draft.version,
        id: typeId,
        baseRevision: null,
        value: definition,
      })
    ).status(),
  ).toBe(200);
  expect((await app.save(administrator, 'historical-definition')).status()).toBe(200);
  const current = await app.read(member);
  const type = (relationship ? current.relationshipTypes : current.types).find(
    (type) => type.id === typeId,
  );
  if (!type) throw new Error('Missing fixture definition');
  if (kind.startsWith('removed-'))
    expect(
      (
        await app.post(member, definitionRoute, {
          version: current.draft.version,
          id: typeId,
          baseRevision: type.revision,
          value: {
            ...definition,
            name: 'Min privata typbenämning',
            description: 'Min tidigare definition',
          },
        })
      ).status(),
    ).toBe(200);
  else
    await app.propose(
      member,
      relationship ? 'relationship' : 'draft',
      'private-target',
      relationship
        ? {
            typeId,
            sourceId: 'lo',
            targetId: 'service',
            knowledge: 'known',
            customValues: { 'storage-year': 'Våren 2021' },
          }
        : {
            typeId,
            name: 'Solcellsanläggningen',
            description: 'Tidigare privat förslag',
            customValues: { year: 'Våren 2021' },
          },
    );
  await app.propose(member, 'draft', 'independent', {
    typeId: current.types[0].id,
    name: 'Oberoende förslag',
    description: '',
  });
  if (options.administratorDefinitionProposal)
    expect(
      (
        await app.post(administrator, definitionRoute, {
          version: (await app.read(administrator)).draft.version,
          id: typeId,
          baseRevision: type.revision,
          value: { ...definition, name: 'Administratörens tidigare förslag' },
        })
      ).status(),
    ).toBe(200);
  const earlier = await downloadConflictArchive(app, administrator);
  const administratorId = (await app.read(administrator)).userId;
  const privateDraft = earlier.content.drafts.find((draft) => draft.userId === current.userId);
  if (!privateDraft) throw new Error('Missing owned fixture draft');
  expect(
    (
      await app.post(member, 'discard', { version: (await app.read(member)).draft.version })
    ).status(),
  ).toBe(200);
  const newer =
    kind === 'invalid-datatype'
      ? {
          ...definition,
          fields: [{ id: 'year', name: 'Installationsår', description: '', kind: 'number' }],
        }
      : null;
  expect(
    (
      await app.post(administrator, definitionRoute, {
        version: (await app.read()).draft.version,
        id: typeId,
        baseRevision: type.revision,
        value: newer,
      })
    ).status(),
  ).toBe(200);
  expect((await app.save(administrator, 'newer-definition')).status()).toBe(200);
  const archive = await downloadConflictArchive(app, administrator);
  archive.content.drafts = [
    ...archive.content.drafts.filter((draft) => draft.userId !== current.userId),
    privateDraft,
  ];
  if (options.administratorDefinitionProposal) {
    const administratorDraft = earlier.content.drafts.find(
      (draft) => draft.userId === administratorId,
    );
    if (!administratorDraft) throw new Error('Missing owned administrator fixture draft');
    archive.content.drafts = [
      ...archive.content.drafts.filter((draft) => draft.userId !== administratorDraft.userId),
      administratorDraft,
    ];
  }
  await importConflictArchive(app, administrator, archive);
  const restored = await app.read(member);
  expect(restored.userId).toBe(current.userId);
  expect(restored.contentVersion).toBe(current.contentVersion + 1);
  return {
    ...app,
    read: () => app.read(member),
    administratorRead: () => app.read(administrator),
    typeId,
    historicalType: type as ObjectType | RelationshipType,
  };
}
