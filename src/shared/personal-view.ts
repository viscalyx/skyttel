export type Position = { x: number; y: number; z: number };
export type PersonalPosition = Position & { id: string; version: number };
// THROWAWAY combined background design; no production migration.
export type PrototypeBackgroundSettings = {
  enabled: boolean;
  light: 'A-light' | 'B-light' | 'E';
  dark: 'A' | 'B' | 'D' | 'E';
  pan: number;
  zoom: number;
  depth: number;
};
export const prototypeBackgroundDefaults: PrototypeBackgroundSettings = {
  enabled: true,
  light: 'A-light',
  dark: 'A',
  pan: 0.7,
  zoom: 0.7,
  depth: 1,
};
export function prototypeBackgroundSettings(settings: ViewSettings): PrototypeBackgroundSettings {
  return (
    settings.background ?? {
      ...prototypeBackgroundDefaults,
      enabled: settings.stars,
      dark: settings.stars ? 'B' : 'A',
    }
  );
}
export type ViewSettings = {
  invertX: boolean;
  invertY: boolean;
  axisCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  axisPinned: boolean;
  stars: boolean;
  allLabels: boolean;
  background?: PrototypeBackgroundSettings;
};
export const defaultViewSettings: ViewSettings = {
  invertX: false,
  invertY: false,
  axisCorner: 'bottom-right',
  axisPinned: false,
  stars: false,
  allLabels: false,
};
export type PersonalView = {
  contentVersion: number;
  positions: PersonalPosition[];
  settings: ViewSettings & { version: number };
};
