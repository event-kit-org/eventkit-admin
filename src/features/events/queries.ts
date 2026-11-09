import { useQuery } from '@tanstack/react-query';
import { type Schemas, unwrap } from '@/api/client';
import { useApi } from '@/auth/context';

export type Feature = Schemas['Feature'];
export type EventSummary = Schemas['PlatformEventSummary'];
export type EventOverview = Schemas['PlatformEventOverview'];

/** What each feature gives an event, in the order they're listed. */
export const FEATURES: { value: Feature; label: string; explain: string }[] = [
  {
    value: 'registration',
    label: 'Registration',
    explain: 'Team registration on the portal, payments and registration links.',
  },
  { value: 'scanning', label: 'Scanning', explain: 'Checkpoints and QR scanning on event day.' },
  {
    value: 'mailing',
    label: 'Mailing',
    explain:
      "Emails the team leader everyone's participant ID and dashboard link after registering.",
  },
];

export const featureLabel = (f: Feature) => FEATURES.find((x) => x.value === f)?.label ?? f;

export function useEvents() {
  const api = useApi();
  return useQuery({
    queryKey: ['events'],
    queryFn: () => unwrap(api.GET('/v1/platform/events')),
  });
}

export function useEventOverview(eventId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['events', eventId],
    queryFn: () =>
      unwrap(api.GET('/v1/platform/events/{eventId}', { params: { path: { eventId } } })),
  });
}
