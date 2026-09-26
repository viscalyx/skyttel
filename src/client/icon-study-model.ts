// Kastbart ikonunderlag. Objektets ikon delar värdens utkast och sparbesked.
import { useState } from 'react';
import type { StudyObject } from './map-study-types.js';

export function useIconStudy() {
  const [saved, setSaved] = useState<Record<string, string | null>>({});
  const [staged, setStaged] = useState<Record<string, string | null>>({});

  function current(id: string) {
    return Object.hasOwn(staged, id) ? staged[id] : (saved[id] ?? null);
  }

  function pick(id: string, iconId: string | null) {
    setStaged((previous) => {
      if (iconId === (saved[id] ?? null)) {
        if (!Object.hasOwn(previous, id)) return previous;
        const next = { ...previous };
        delete next[id];
        return next;
      }
      if (Object.hasOwn(previous, id) && previous[id] === iconId) return previous;
      return { ...previous, [id]: iconId };
    });
  }

  function commit() {
    setSaved((previous) => ({ ...previous, ...staged }));
    setStaged({});
  }

  function reset() {
    setStaged({});
  }

  function receiptLines(
    objects: Pick<StudyObject, 'id' | 'name'>[] = [],
    iconName: (id: string) => string = (id) => id,
  ) {
    const label = (id: string | null) => (id === null ? 'Standardikon' : iconName(id));
    return Object.entries(staged).map(([id, iconId]) => {
      const name = objects.find((object) => object.id === id)?.name ?? id;
      return `${name}: ikon ${label(saved[id] ?? null)} → ${label(iconId)}.`;
    });
  }

  return {
    saved,
    staged,
    current,
    pick,
    commit,
    reset,
    receiptLines,
    draftCount: Object.keys(staged).length,
  };
}

export type IconStudyModel = ReturnType<typeof useIconStudy>;
