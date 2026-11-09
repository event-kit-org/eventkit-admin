import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Schemas } from '@/api/client';

export const API = 'http://api.test';
export const P = `${API}/v1/platform`;
export const TEST_CONFIG = { apiUrl: API, platformApiKey: 'test-platform-key' };

export const admin: Schemas['PlatformAdmin'] = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'root@eventkit.test',
  name: 'Root Admin',
};

export const EVENT_ID = '22222222-2222-4222-8222-222222222222';

const owner = { id: '33333333-3333-4333-8333-333333333333', name: 'Asha', email: 'asha@club.test' };

export const summary = (over: Partial<Schemas['PlatformEventSummary']> = {}) =>
  ({
    id: EVENT_ID,
    name: 'MachZero',
    hostedBy: 'PESOS',
    venue: 'MRD Auditorium',
    startAt: '2026-11-07T03:30:00.000Z',
    endAt: '2026-11-08T12:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    owner,
    teams: 12,
    people: 40,
    features: [
      { feature: 'mailing', enabled: false },
      { feature: 'registration', enabled: true },
      { feature: 'scanning', enabled: true },
    ],
    ...over,
  }) satisfies Schemas['PlatformEventSummary'];

export const overview = (
  over: Partial<Schemas['PlatformEventOverview']> = {},
): Schemas['PlatformEventOverview'] => ({
  event: {
    id: EVENT_ID,
    name: 'MachZero',
    hostedBy: 'PESOS',
    startAt: '2026-11-07T03:30:00.000Z',
    endAt: '2026-11-08T12:00:00.000Z',
    venue: 'MRD Auditorium',
    registrationStart: '2026-10-01T00:00:00.000Z',
    registrationDeadline: '2026-11-01T00:00:00.000Z',
    maxParticipants: 150,
    minTeamSize: 2,
    maxTeamSize: 4,
    paymentMode: 'at_registration',
    registrationFee: 50000,
    feeBasis: 'per_person',
    currency: 'INR',
    paymentDeadline: null,
    paymentInstructions: null,
    hasPaymentQr: false,
    hasPaymentInstructionsFile: false,
    portalUrl: 'https://portal.test',
    portalPaths: {
      register: '/register/{token}',
      staff: '/staff/{token}',
      me: '/me/{token}',
      notifications: '/notifications',
    },
    participantPrefix: 'MZ',
    discoverable: false,
    leaderboardVisible: false,
    rsvpEnabled: true,
    stagedRelease: false,
    exitReasons: ['Other'],
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  owner,
  organisers: [
    { ...owner, role: 'admin', isOwner: true },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Rhea',
      email: 'rhea@club.test',
      role: 'reviewer',
      isOwner: false,
    },
  ],
  counts: { teams: 12, people: 40, confirmed: 30, checkedIn: 25, cancelled: 2, staff: 6 },
  features: [
    { feature: 'mailing', enabled: false, updatedAt: null },
    { feature: 'registration', enabled: true, updatedAt: '2026-10-02T04:30:00.000Z' },
    { feature: 'scanning', enabled: true, updatedAt: '2026-10-02T04:30:00.000Z' },
  ],
  ...over,
});

export const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ error: { code, message } }, { status });

/** Default handlers: a valid session for token "good-token". */
export const handlers = [
  http.get(`${P}/auth/me`, ({ request }) =>
    request.headers.get('authorization') === 'Bearer good-token'
      ? HttpResponse.json(admin)
      : apiError(401, 'UNAUTHORIZED', 'A valid Bearer access token is required.'),
  ),
  http.post(`${P}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { password: string };
    return body.password === 'right-password'
      ? HttpResponse.json({
          admin,
          token: { accessToken: 'good-token', tokenType: 'Bearer', expiresIn: '12h' },
        })
      : apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }),
  http.get(`${P}/events`, () => HttpResponse.json([summary()])),
  http.get(`${P}/events/:eventId`, () => HttpResponse.json(overview())),
];

export const server = setupServer(...handlers);
