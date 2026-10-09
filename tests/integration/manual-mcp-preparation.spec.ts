import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { expect, test } from '@playwright/test';
import { createHousehold, signIn } from '../support/client.js';
import { createInstallation } from '../support/installation.js';

for (const seeded of [false, true]) {
  test(`manual MCP read-only preparation preserves ${seeded ? 'seeded' : 'empty'} household work`, {
    tag: '@technical',
  }, async ({ page }) => {
    const app = await createInstallation();
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', 'scripts/manual-mcp-client.ts', app.origin, '0', 'read'],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const output: Record<string, unknown>[] = [];
    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => output.push(JSON.parse(line)));
    const exited = new Promise<number | null>((resolve) => child.once('exit', resolve));
    async function next(command: string, event: string) {
      const before = output.length;
      child.stdin.write(`${command}\n`);
      await expect
        .poll(() => output.slice(before).find((entry) => entry.event === event))
        .toBeTruthy();
      return output.slice(before).find((entry) => entry.event === event) as Record<string, unknown>;
    }
    try {
      const seededHousehold = seeded ? app.seedDemo() : undefined;
      await signIn(page.request, app.origin);
      const household =
        seededHousehold ??
        (await (await createHousehold(page.request, app.origin)).json()).household;
      const path = `${app.origin}/api/households/${household.id}/map`;
      const before = await (await page.request.get(path)).json();
      await expect.poll(() => output.find((entry) => entry.event === 'authorize')).toBeTruthy();
      await page.goto(String(output.find((entry) => entry.event === 'authorize')?.url));
      await page.getByLabel('Välj hushåll').selectOption(household.id);
      await expect(
        page.getByRole('button', { name: 'Godkänn läsåtkomst', exact: true }),
      ).toHaveCount(1);
      await expect(
        page.getByRole('button', { name: 'Godkänn läsåtkomst', exact: true }),
      ).toBeDisabled();
      await page.getByLabel(/Jag tillåter extern AI-behandling/).check();
      await page.getByRole('button', { name: 'Godkänn läsåtkomst', exact: true }).click();
      await expect.poll(() => output.some((entry) => entry.event === 'ready')).toBe(true);
      const tools = (await next('tools', 'result')).value as { tools: { name: string }[] };
      expect(tools.tools.map((tool) => tool.name)).toEqual(['read_map', 'read_my_draft']);
      const map = (await next('map', 'result')).value as { objects: unknown[] };
      expect(map.objects.length > 0).toBe(seeded);
      const draft = (await next('read', 'result')).value as { changes: unknown[] };
      expect(draft.changes.length > 0).toBe(seeded);
      expect(await (await page.request.get(path)).json()).toEqual(before);
      await page.goto(`${app.origin}/assistants`);
      await page
        .getByRole('button', { name: 'Återkalla anslutning för Skyttel manual MCP controls' })
        .click();
      expect((await next('read', 'error')).message).toBe('MCP HTTP 401');
      await next('quit', 'closed');
      expect(await exited).toBe(0);
    } finally {
      child.kill('SIGINT');
      await exited;
      lines.close();
      await app.close();
    }
  });
}
