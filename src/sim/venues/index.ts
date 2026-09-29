import { classroom } from './classroom';
import { lectureHall } from './lectureHall';
import type { VenueDef } from './types';

export const VENUES = { classroom, lectureHall } satisfies Record<string, VenueDef>;
export type VenueId = keyof typeof VENUES;
export type { VenueDef };
