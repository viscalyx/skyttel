import { MapStudyProvider } from './MapStudy.js';
import { NavigationPrototype } from './NavigationPrototype.js';

export function MapStudyEntry() {
  return (
    <MapStudyProvider>
      <NavigationPrototype />
    </MapStudyProvider>
  );
}
