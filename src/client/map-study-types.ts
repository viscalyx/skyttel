// Kastbart kartunderlag. Samtliga uppgifter är påhittade.
export type StudyPosition = { x: number; y: number; z: number };
export type StudyObject = {
  id: string;
  name: string;
  type: string;
  description: string;
  relation: string;
  position: StudyPosition;
  change?: 'added' | 'changed' | 'removed';
  ended?: boolean;
};
export type StudyRelationship = {
  id: string;
  from: string;
  to: string;
  label: string;
  change?: 'added' | 'changed' | 'removed';
};
export type StudyVariant = 'A' | 'B' | 'C';
export type StudyCameraAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'in'
  | 'out'
  | 'rotate-left'
  | 'rotate-right'
  | 'tilt-up'
  | 'tilt-down';
export type StudyCamera = {
  navigate: (action: StudyCameraAction) => void;
  frame: (ids?: string[]) => void;
  back: () => void;
  toggleOverview: () => void;
};
