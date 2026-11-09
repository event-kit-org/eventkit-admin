import { QueryClient } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '@/App';
import { Session } from '@/auth/session';
import { routes } from '@/routes';
import { server, TEST_CONFIG } from './server';

/** Renders the whole app at `path`, optionally signed in with `token`. */
export function renderApp(path: string, { token = null }: { token?: string | null } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const session = new Session(token);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <Providers config={TEST_CONFIG} session={session} queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...result, router, session };
}

/** Records the bodies sent to `url`, answering with `response`. */
export function capture(
  method: 'post' | 'put' | 'delete',
  url: string,
  response: unknown = { ok: true },
  status = 200,
) {
  const calls: { body: unknown; headers: Headers }[] = [];
  server.use(
    http[method](url, async ({ request }) => {
      const text = await request.text();
      calls.push({ body: text ? JSON.parse(text) : null, headers: request.headers });
      return status === 204
        ? new HttpResponse(null, { status })
        : HttpResponse.json(response as object, { status });
    }),
  );
  return calls;
}

/** Answers an "are you sure?" alert dialog with its `action` button. */
export async function confirmDialog(action: string) {
  const dialog = await screen.findByRole('alertdialog');
  await userEvent.click(within(dialog).getByRole('button', { name: action }));
}
