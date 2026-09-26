// Kastbar markör: profilbild, valt ikonmotiv och sist kartans typsymbol.
import { useState } from 'react';
import { IconStudyGlyph } from './IconStudyGlyph.js';
import { findIconStudyIcon } from './icon-study-catalog.js';
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
  if (findIconStudyIcon(object.iconId)) return <IconStudyGlyph iconId={object.iconId} />;
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
