import { Den, Member, PlaceCandidate, StashItem } from '../types';

export const MOCK_USER_ID = 'u_amelia';

const members: Member[] = [
  { userId: 'u_amelia', displayName: 'Amelia', critter: 'raccoon' },
  { userId: 'u_mia',    displayName: 'Mia',    critter: 'possum' },
  { userId: 'u_josh',   displayName: 'Josh',   critter: 'chipmunk' },
  { userId: 'u_zoe',    displayName: 'Zoe',    critter: 'skunk' },
];

export const mockDen: Den = {
  id: 'den_1',
  name: 'Toronto Shenanigans',
  emblem: 'lantern',
  members,
};

export const mockStash: StashItem[] = [
  {
    id: 's1', denId: 'den_1', savedBy: 'u_mia', placeId: 'p_barraval',
    name: 'Bar Raval', neighbourhood: 'Little Italy', category: 'drink',
    lat: 43.6558, lng: -79.4118, sourceUrl: 'https://instagram.com/reel/abc',
    savedAt: '2026-08-24T19:12:00Z', interested: ['u_mia', 'u_amelia', 'u_josh'], wantCount: 3, iWant: true,
    note: 'Tiny plates, big Friday energy', distance: '1.2 km',
    takes: [
      { userId: 'u_josh', text: 'get there before 7, it fills up', at: '2026-08-26T22:10:00Z' },
      { userId: 'u_amelia', text: 'order the octopus', at: '2026-08-30T20:02:00Z' },
    ],
    address: '505 College St',
  },
  {
    id: 's6', denId: 'den_1', savedBy: 'u_josh', placeId: 'p_greygardens',
    name: 'Grey Gardens', neighbourhood: 'Kensington', category: 'eat',
    lat: 43.6552, lng: -79.4008, sourceUrl: 'https://instagram.com/reel/jkl',
    savedAt: '2026-08-29T18:30:00Z', interested: ['u_josh', 'u_mia', 'u_zoe'], wantCount: 3, iWant: false,
    note: "Josh won't shut up about the pierogi", distance: '2.0 km',
    takes: [
      { userId: 'u_mia', text: 'the beet salad is better than the pierogi', at: '2026-08-31T13:40:00Z' },
      { userId: 'u_zoe', text: 'sit at the bar, the tables are a long wait', at: '2026-09-01T19:15:00Z' },
    ],
    address: '199 Augusta Ave',
  },
  {
    id: 's3', denId: 'den_1', savedBy: 'u_josh', placeId: 'p_bellwoods',
    name: 'Bellwoods Brewery', neighbourhood: 'Ossington', category: 'drink',
    lat: 43.6470, lng: -79.4200, sourceUrl: null,
    savedAt: '2026-08-26T21:05:00Z', interested: ['u_josh', 'u_zoe'], wantCount: 2, iWant: false,
    note: 'Patio, and you can take cans home', distance: '2.4 km',
    takes: [
      { userId: 'u_zoe', text: 'jelly king on tap most weekends', at: '2026-08-28T17:00:00Z' },
    ],
    address: '124 Ossington Ave',
  },
  {
    id: 's4', denId: 'den_1', savedBy: 'u_zoe', placeId: 'p_trinity',
    name: 'Trinity Bellwoods', neighbourhood: 'Dundas West', category: 'do',
    lat: 43.6478, lng: -79.4136, sourceUrl: null,
    savedAt: '2026-08-27T14:22:00Z', interested: ['u_zoe', 'u_amelia'], wantCount: 2, iWant: true,
    note: 'Blanket, snacks, three hours gone', distance: '3.1 km',
    takes: [],
    address: '790 Queen St W',
  },
  {
    id: 's2', denId: 'den_1', savedBy: 'u_amelia', placeId: 'p_dualcitizen',
    name: 'Dual Citizen', neighbourhood: 'King West', category: 'eat',
    lat: 43.6440, lng: -79.4025, sourceUrl: 'https://instagram.com/reel/def',
    savedAt: '2026-08-25T09:40:00Z', interested: ['u_amelia'], wantCount: 1, iWant: true,
    note: 'The coffee that started all this', distance: '1.8 km',
    takes: [],
    address: '930 King St W',
  },
  {
    id: 's5', denId: 'den_1', savedBy: 'u_mia', placeId: 'p_sanagans',
    name: "Sanagan's", neighbourhood: 'Kensington', category: 'eat',
    lat: 43.6547, lng: -79.4021, sourceUrl: 'https://instagram.com/reel/ghi',
    savedAt: '2026-08-28T11:00:00Z', interested: ['u_mia'], wantCount: 1, iWant: false,
    note: 'Butcher counter, sandwiches at the back', distance: '2.7 km',
    takes: [],
    address: '176 Baldwin St',
  },
];

/** Candidates for the confirm screen, ranked best first. */
export const mockCandidates: PlaceCandidate[] = [
  {
    placeId: 'p_dualcitizen', name: 'Dual Citizen Coffee Bar',
    address: '930 King St W, Toronto', lat: 43.6440, lng: -79.4025,
    category: 'eat', reason: 'Matched from a tagged handle',
  },
  {
    placeId: 'p_citizen2', name: 'Citizen Coffee',
    address: '412 Queen St W, Toronto', lat: 43.6482, lng: -79.3975,
    category: 'eat', reason: 'Name is close',
  },
  {
    placeId: 'p_dualcafe', name: 'Dual Café',
    address: '75 Ossington Ave, Toronto', lat: 43.6465, lng: -79.4195,
    category: 'eat', reason: 'Name is close',
  },
];

/** Results for the manual search. */
export const mockSearch: PlaceCandidate[] = [
  ...mockCandidates,
  {
    placeId: 'p_barraval', name: 'Bar Raval', address: '505 College St, Toronto',
    lat: 43.6558, lng: -79.4118, category: 'drink',
  },
  {
    placeId: 'p_sanagans', name: "Sanagan's Meat Locker", address: '176 Baldwin St, Toronto',
    lat: 43.6547, lng: -79.4021, category: 'eat',
  },
];
