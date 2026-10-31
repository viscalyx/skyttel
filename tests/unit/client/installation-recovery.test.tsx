import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { InstallationRecovery } from '../../../src/client/InstallationRecovery.js';
import type { RecoveryReview } from '../../../src/shared/installation-recovery.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const confirm = 'Bekräfta hela listan och öppna åtkomsten';
const review: RecoveryReview = {
  generation: 'restored-installation',
  revision: 'current-memberships',
  actor: { userId: 'lo', name: 'Lo Exempel' },
  households: [
    {
      id: 'home',
      name: 'Hemma',
      members: [
        { userId: 'alex', name: 'Alex Exempel', role: 'administrator' },
        { userId: 'robin', name: 'Robin Exempel', role: 'member' },
      ],
    },
    {
      id: 'cabin',
      name: 'Stugan',
      members: [{ userId: 'lo', name: 'Lo Exempel', role: 'administrator' }],
    },
  ],
};

test('a person without review authority sees the barrier without fetching membership information', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<InstallationRecovery canReview={false} onComplete={vi.fn()} />);

  expect(document.activeElement).toBe(
    screen.getByRole('heading', { name: 'Bekräfta åtkomst efter återställning' }),
  );
  expect(screen.getByText(/Kontakta installationsansvarig/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: confirm })).toBeNull();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

test('a failed membership read keeps access blocked and can be checked again', async () => {
  let rejectRead!: (error: Error) => void;
  const pending = new Promise<Response>((_resolve, reject) => {
    rejectRead = reject;
  });
  const fetch = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(Response.json(review));
  vi.stubGlobal('fetch', fetch);
  const onComplete = vi.fn();
  render(<InstallationRecovery canReview onComplete={onComplete} />);

  expect(screen.getByRole('status').textContent).toBe('Hämtar medlemskap…');
  expect(screen.queryByRole('button', { name: confirm })).toBeNull();
  await act(async () => rejectRead(new TypeError('Connection lost')));
  expect(screen.getByRole('alert').textContent).toBe(
    'Granskningen kunde inte hämtas. Åtkomsten är fortfarande spärrad.',
  );
  expect(onComplete).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Kontrollera åtkomsten igen' }));
  expect(await screen.findByRole('combobox', { name: 'Alex Exempel – roll' })).toBeTruthy();
  expect(onComplete).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every(([path]) => path === '/api/recovery')).toBe(true);
  expect(screen.getByRole('alert').textContent).toBe('');
});

test('confirming an unchanged list preserves all households and waits for the server before reopening', async () => {
  let complete!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(review)).mockReturnValueOnce(pending);
  vi.stubGlobal('fetch', fetch);
  const onComplete = vi.fn();
  render(<InstallationRecovery canReview onComplete={onComplete} />);

  await userEvent.click(await screen.findByRole('button', { name: confirm }));
  const [path, options] = fetch.mock.calls[1];
  expect(path).toBe('/api/recovery/complete');
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({
    generation: review.generation,
    revision: review.revision,
    actor: review.actor,
    confirmed: true,
    households: [
      {
        id: 'home',
        members: [
          { userId: 'alex', role: 'administrator' },
          { userId: 'robin', role: 'member' },
        ],
      },
      { id: 'cabin', members: [{ userId: 'lo', role: 'administrator' }] },
    ],
  });
  expect((screen.getByRole('button', { name: 'Bekräftar…' }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  for (const group of screen.getAllByRole('group'))
    expect((group as HTMLFieldSetElement).disabled).toBe(true);
  expect(onComplete).not.toHaveBeenCalled();

  await act(async () => complete(Response.json({ complete: true })));
  expect(onComplete).toHaveBeenCalledOnce();
  expect((screen.getByRole('button', { name: confirm }) as HTMLButtonElement).disabled).toBe(false);
});

test('role changes and explicit appointment apply only to the selected household and omit revoked members', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json(review))
    .mockResolvedValueOnce(Response.json({ complete: true }));
  vi.stubGlobal('fetch', fetch);
  render(<InstallationRecovery canReview onComplete={vi.fn()} />);
  const home = within(await screen.findByRole('group', { name: 'Hemma' }));
  const cabin = within(screen.getByRole('group', { name: 'Stugan' }));
  expect(cabin.queryByRole('button', { name: /Utse mig/ })).toBeNull();
  const alex = home.getByRole('combobox', { name: 'Alex Exempel – roll' });
  expect(document.getElementById(alex.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
    'Användar-ID: alex',
  );
  await userEvent.selectOptions(alex, 'member');
  await userEvent.selectOptions(
    home.getByRole('combobox', { name: 'Robin Exempel – roll' }),
    'revoked',
  );
  await userEvent.click(home.getByRole('button', { name: 'Utse mig till administratör i Hemma' }));
  const appointed = home.getByRole('combobox', { name: 'Lo Exempel – roll' });
  expect(document.activeElement).toBe(appointed);
  expect((appointed as HTMLSelectElement).value).toBe('administrator');
  expect(home.queryByRole('button', { name: /Utse mig/ })).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: confirm }));
  expect(JSON.parse(fetch.mock.calls[1][1].body).households).toEqual([
    {
      id: 'home',
      members: [
        { userId: 'alex', role: 'member' },
        { userId: 'lo', role: 'administrator' },
      ],
    },
    { id: 'cabin', members: [{ userId: 'lo', role: 'administrator' }] },
  ]);
});

test.each([
  {
    failure: 'last administrator',
    respond: () => Response.json({ error: 'last_administrator' }, { status: 409 }),
    message: 'Varje hushåll måste ha minst en administratör. Åtkomsten är fortfarande spärrad.',
  },
  {
    failure: 'stale membership revision',
    respond: () => Response.json({ error: 'recovery_changed' }, { status: 409 }),
    message:
      'Granskningen kunde inte bekräftas. Kontrollera åtkomsten igen innan du försöker på nytt.',
  },
  {
    failure: 'lost reply',
    respond: () => {
      throw new TypeError('Connection lost');
    },
    message:
      'Granskningen kunde inte bekräftas. Kontrollera åtkomsten igen innan du försöker på nytt.',
  },
])(
  'a $failure does not reopen access and rechecking discards stale choices',
  async ({ respond, message }) => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json(review))
      .mockImplementationOnce(respond)
      .mockResolvedValueOnce(Response.json({ ...review, revision: 'refreshed-memberships' }))
      .mockResolvedValueOnce(Response.json({ complete: true }));
    vi.stubGlobal('fetch', fetch);
    const onComplete = vi.fn();
    render(<InstallationRecovery canReview onComplete={onComplete} />);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Alex Exempel – roll' }),
      'member',
    );
    await userEvent.click(screen.getByRole('button', { name: confirm }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message));
    expect(onComplete).not.toHaveBeenCalled();
    expect(
      (screen.getByRole('combobox', { name: 'Alex Exempel – roll' }) as HTMLSelectElement).value,
    ).toBe('member');
    expect((screen.getByRole('button', { name: confirm }) as HTMLButtonElement).disabled).toBe(
      false,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Kontrollera åtkomsten igen' }));
    await waitFor(() =>
      expect(
        (screen.getByRole('combobox', { name: 'Alex Exempel – roll' }) as HTMLSelectElement).value,
      ).toBe('administrator'),
    );
    expect(screen.getByRole('alert').textContent).toBe('');
    expect(onComplete).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: confirm }));
    expect(JSON.parse(fetch.mock.calls[3][1].body).revision).toBe('refreshed-memberships');
    expect(onComplete).toHaveBeenCalledTimes(2);
  },
);
