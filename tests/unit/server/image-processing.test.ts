import sharp from 'sharp';
import { afterEach, expect, test, vi } from 'vitest';
import { processProfileImage } from '../../../src/server/profile-images.js';

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

afterEach(() => vi.restoreAllMocks());

test('images above eight million pixels are rejected before resize', async () => {
  const encode = async (height: number) => {
    const bytes = await sharp({ create: { width: 4000, height, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    return processProfileImage(
      new Uint8Array(bytes).buffer,
      () => {},
      (image) => image,
    );
  };
  await expect(encode(2000)).resolves.toMatchObject({ width: 300, height: 150 });
  await expect(encode(2001)).rejects.toMatchObject({ code: 'invalid_image', status: 400 });
});

test('one image is processed at a time, two wait in order, and excess work is rejected', async () => {
  const source = new Uint8Array(
    await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } })
      .png()
      .toBuffer(),
  ).buffer;
  const gate = deferred();
  const entered = deferred();
  const metadata = sharp.prototype.metadata;
  const native = vi.spyOn(sharp.prototype, 'metadata').mockImplementationOnce(async function () {
    entered.resolve();
    await gate.promise;
    return metadata.call(this);
  });
  const order: number[] = [];
  const submit = (id: number) =>
    processProfileImage(
      source,
      () => {},
      () => order.push(id),
    );
  const first = submit(1);
  await entered.promise;
  const second = submit(2);
  const third = submit(3);
  try {
    await expect(submit(4)).rejects.toMatchObject({ code: 'image_processing_busy', status: 503 });
    expect(native).toHaveBeenCalledTimes(1);
  } finally {
    gate.resolve();
    await Promise.all([first, second, third]);
  }
  expect(order).toEqual([1, 2, 3]);
  await expect(submit(5)).resolves.toBe(4);
});

test.each(['metadata', 'decode', 'accept', 'recheck'] as const)(
  '%s failures release capacity and let queued work finish',
  async (failure) => {
    const source = new Uint8Array(
      await sharp({ create: { width: 10, height: 10, channels: 3, background: 'blue' } })
        .png()
        .toBuffer(),
    ).buffer;
    const gate = deferred();
    const entered = deferred();
    const metadata = sharp.prototype.metadata;
    vi.spyOn(sharp.prototype, 'metadata').mockImplementationOnce(async function () {
      entered.resolve();
      await gate.promise;
      if (failure === 'metadata') throw new Error('synthetic metadata failure');
      return metadata.call(this);
    });
    if (failure === 'decode')
      vi.spyOn(sharp.prototype, 'toBuffer').mockRejectedValueOnce(
        new Error('synthetic decode failure'),
      );
    const rejected = new Error('synthetic state failure');
    const first = processProfileImage(
      source,
      () => {},
      (image) => {
        if (failure === 'accept') throw rejected;
        return image;
      },
    );
    const firstResult = first.catch((error: unknown) => error);
    await entered.promise;
    let stale = false;
    const second = processProfileImage(
      source,
      () => {
        if (failure === 'recheck' && stale) throw rejected;
      },
      (image) => image,
    );
    const secondResult = second.catch((error: unknown) => error);
    const third = processProfileImage(
      source,
      () => {},
      (image) => image,
    );
    stale = true;
    gate.resolve();
    const [firstOutcome, secondOutcome, thirdOutcome] = await Promise.all([
      firstResult,
      secondResult,
      third,
    ]);
    if (failure === 'recheck') {
      expect(firstOutcome).toMatchObject({ width: 10, height: 10 });
      expect(secondOutcome).toBe(rejected);
    } else {
      expect(firstOutcome).toMatchObject({
        message:
          failure === 'accept'
            ? rejected.message
            : failure === 'metadata'
              ? 'invalid_image'
              : 'image_processing_failed',
      });
      expect(secondOutcome).toMatchObject({ width: 10, height: 10 });
    }
    expect(thirdOutcome).toMatchObject({ width: 10, height: 10 });
    await expect(
      processProfileImage(
        source,
        () => {},
        (image) => image,
      ),
    ).resolves.toMatchObject({ width: 10 });
  },
);
