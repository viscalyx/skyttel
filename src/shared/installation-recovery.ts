import type { HouseholdMember } from './administration.js';

export interface RecoveryReview {
  generation: string;
  revision: string;
  actor: { userId: string; name: string };
  households: { id: string; name: string; members: HouseholdMember[] }[];
}
