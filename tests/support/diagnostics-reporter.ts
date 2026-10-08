import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

/** Keep runner and fixture-server output beside retained browser failure traces. */
export default class DiagnosticsReporter implements Reporter {
  private log = '';

  private write(chunk: string | Buffer) {
    if (this.log) appendFileSync(this.log, chunk);
  }

  onBegin(config: FullConfig) {
    const directory = join(config.projects[0].outputDir, 'diagnostics');
    mkdirSync(directory, { recursive: true });
    this.log = join(directory, 'runner.log');
    writeFileSync(this.log, 'Skyttel integration diagnostics\n');
  }

  onStdOut(chunk: string | Buffer) {
    this.write(chunk);
  }

  onStdErr(chunk: string | Buffer) {
    this.write(chunk);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.write(`\n${result.status}: ${test.titlePath().filter(Boolean).join(' > ')}\n`);
    for (const error of result.errors) {
      this.onError(error);
    }
  }

  onError(error: TestError) {
    this.write(`${error.stack ?? error.message ?? error.value}\n`);
  }

  onEnd(result: FullResult) {
    this.write(`\nRun status: ${result.status}\n`);
  }
}
