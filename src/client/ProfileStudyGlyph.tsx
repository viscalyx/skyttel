// Kastbar bildmarkör som återanvänder kartans typsymbol vid saknad bild.
import { useState } from 'react';
import type { StudyObject } from './map-study-types.js';
import { SpatialObjectGlyph } from './SpatialObjectGlyph.js';

export function ProfileStudyGlyph({ object }: { object: StudyObject }) {
  const [failed, setFailed] = useState<string>();
  if (object.profileImageUrl && object.profileImageUrl !== failed)
    return (
      <img
        className="ps-thumbnail"
        src={object.profileImageUrl}
        alt=""
        onError={() => setFailed(object.profileImageUrl)}
      />
    );
  return (
    <SpatialObjectGlyph
      typeName={
        object.type === 'Musiktjänst'
          ? 'Tjänst'
          : object.type === 'Betalkort'
            ? 'Kort'
            : object.type
      }
      name={object.name}
      householdId="prototype"
    />
  );
}
