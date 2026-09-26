// Kastbart bildunderlag. Bilderna finns bara i minnet och delar värdens sparbesked.
import { useEffect, useRef, useState } from 'react';
import type { StudyObject } from './map-study-types.js';

export type ProfileStudyImage = {
  url: string;
  fileName: string;
  width: number;
  height: number;
};

export const profileStudyLimits = {
  inputBytes: 10_000_000,
  inputPixels: 40_000_000,
  side: 300,
  outputBytes: 262_144,
} as const;

function supportedFormat(header: Uint8Array) {
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  const text = String.fromCharCode(...header);
  return png || jpeg || (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP');
}

async function thumbnail(file: File): Promise<ProfileStudyImage> {
  if (!file.size) throw new Error('Bilden är tom. Välj en annan bild.');
  if (file.size > profileStudyLimits.inputBytes)
    throw new Error('Bilden får vara högst 10 MB. Välj en mindre bild.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!supportedFormat(header)) throw new Error('Välj en bild i JPEG, PNG eller WebP.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Bilden kunde inte läsas. Välj en annan bild.');
  }
  try {
    if (!bitmap.width || !bitmap.height)
      throw new Error('Bilden kunde inte läsas. Välj en annan bild.');
    if (bitmap.width * bitmap.height > profileStudyLimits.inputPixels)
      throw new Error('Bilden får innehålla högst 40 miljoner bildpunkter. Välj en mindre bild.');
    const scale = Math.min(1, profileStudyLimits.side / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bilden kunde inte förberedas. Försök igen.');
    context.drawImage(bitmap, 0, 0, width, height);
    const url = canvas.toDataURL('image/webp', 0.8);
    const bytes = atob(url.slice(url.indexOf(',') + 1)).length;
    if (bytes > profileStudyLimits.outputBytes)
      throw new Error('Bilden kunde inte göras tillräckligt liten. Välj en annan bild.');
    return { url, fileName: file.name, width, height };
  } finally {
    bitmap.close();
  }
}

export function useProfileStudy() {
  const [saved, setSaved] = useState<Record<string, ProfileStudyImage | null>>({});
  const [staged, setStaged] = useState<Record<string, ProfileStudyImage | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requests = useRef<Record<string, symbol>>({});

  useEffect(
    () => () => {
      requests.current = {};
    },
    [],
  );

  function current(id: string) {
    return Object.hasOwn(staged, id) ? staged[id] : (saved[id] ?? null);
  }

  function clearError(id: string) {
    setErrors((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  }

  async function pick(id: string, file: File) {
    const request = Symbol();
    requests.current[id] = request;
    setLoading((previous) => ({ ...previous, [id]: true }));
    clearError(id);
    try {
      const image = await thumbnail(file);
      if (requests.current[id] !== request) return false;
      setStaged((previous) => ({ ...previous, [id]: image }));
      return true;
    } catch (error) {
      if (requests.current[id] !== request) return false;
      setErrors((previous) => ({
        ...previous,
        [id]: error instanceof Error ? error.message : 'Bilden kunde inte läsas. Försök igen.',
      }));
      return false;
    } finally {
      if (requests.current[id] === request) {
        delete requests.current[id];
        setLoading((previous) => ({ ...previous, [id]: false }));
      }
    }
  }

  function remove(id: string) {
    delete requests.current[id];
    setLoading((previous) => ({ ...previous, [id]: false }));
    clearError(id);
    setStaged((previous) => ({ ...previous, [id]: null }));
  }

  function commit() {
    setSaved((previous) => ({ ...previous, ...staged }));
    setStaged({});
  }

  function reset() {
    requests.current = {};
    setStaged({});
    setLoading({});
    setErrors({});
  }

  function receiptLines(objects: Pick<StudyObject, 'id' | 'name'>[] = []) {
    return Object.entries(staged).map(([id, image]) => {
      const name = objects.find((object) => object.id === id)?.name ?? id;
      if (!image) return `${name}: profilbild tas bort.`;
      return `${name}: profilbild ${saved[id] ? 'byts till' : 'läggs till,'} ${image.fileName}.`;
    });
  }

  return {
    current,
    saved,
    staged,
    loading,
    errors,
    pick,
    remove,
    clearError,
    commit,
    reset,
    receiptLines,
    draftCount: Object.keys(staged).length,
    loadingIds: Object.keys(loading).filter((id) => loading[id]),
  };
}

export type ProfileStudyModel = ReturnType<typeof useProfileStudy>;
