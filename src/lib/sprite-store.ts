// One foreground-aware network queue. Compact base motion stays ready;
// only the current original-detail sheet needs an additional decode.
class SupersededSpriteRequest extends Error {}

export class SpriteStore {
  private blobs = new Map<string, Blob>();
  private jobs = new Map<string, { priority: number; started: boolean; promise: Promise<Blob>; resolve: (blob: Blob) => void; reject: (error: unknown) => void }>();
  private controllers = new Set<AbortController>();
  private running = 0;
  private disposed = false;

  constructor(private readonly fetchBlob = async (src: string, signal: AbortSignal) => {
    const response = await fetch(src, { signal, cache: 'force-cache' });
    if (!response.ok) throw new Error(`Sprite HTTP ${response.status}`);
    return response.blob();
  }, private readonly concurrency = 2) {}

  request(src: string, priority: number): Promise<Blob> {
    if (this.disposed) return Promise.reject(new Error('Disposed sprite store'));
    const blob = this.blobs.get(src);
    if (blob) return Promise.resolve(blob);
    const previous = this.jobs.get(src);
    if (previous) {
      previous.priority = Math.min(previous.priority, priority);
      return previous.promise;
    }
    let resolve!: (blob: Blob) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<Blob>((yes, no) => { resolve = yes; reject = no; });
    this.jobs.set(src, { priority, started: false, promise, resolve, reject });
    // Batch same-turn requests so the current frame wins over speculative data.
    queueMicrotask(() => this.pump());
    return promise;
  }

  retain(keep: Set<string>) {
    for (const src of this.blobs.keys()) {
      if (!keep.has(src)) this.blobs.delete(src);
    }
    for (const [src, job] of this.jobs) {
      if (!job.started && !keep.has(src)) {
        this.jobs.delete(src);
        job.reject(new SupersededSpriteRequest('Superseded sprite request'));
      }
    }
  }

  private pump() {
    if (this.disposed) return;
    while (this.running < this.concurrency) {
      const next = [...this.jobs.entries()].filter(([, job]) => !job.started)
        .sort((a, b) => a[1].priority - b[1].priority)[0];
      if (!next) break;
      const [src, job] = next;
      job.started = true;
      this.running += 1;
      const controller = new AbortController();
      this.controllers.add(controller);
      void this.fetchBlob(src, controller.signal).then(blob => {
        if (!this.disposed) this.blobs.set(src, blob);
        job.resolve(blob);
      }, job.reject).finally(() => {
        this.controllers.delete(controller);
        this.jobs.delete(src);
        this.running -= 1;
        this.pump();
      });
    }
  }

  dispose() {
    this.disposed = true;
    this.controllers.forEach(controller => controller.abort());
    for (const job of this.jobs.values()) job.reject(new Error('Disposed sprite store'));
    this.jobs.clear();
    this.blobs.clear();
  }
}

type SpriteImage = CanvasImageSource & { width: number; height: number; close?: () => void };

export async function decodeSprite(blob: Blob): Promise<SpriteImage> {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(blob); } catch { /* Safari fallback */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally { URL.revokeObjectURL(url); }
}

export class DecodedSprites {
  private images = new Map<string, SpriteImage>();
  private pending = new Map<string, object>();
  private failedUntil = new Map<string, number>();
  private wanted = new Set<string>();
  private disposed = false;
  private decoding: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: SpriteStore, private readonly onReady: () => void,
    private readonly decode = decodeSprite, private readonly maxBytes = 128 * 1024 * 1024,
    private readonly onError?: (src: string, error: unknown) => void) {}

  retain(srcs: Set<string>) {
    this.wanted = srcs;
    for (const [src, image] of this.images) {
      if (!srcs.has(src)) { image.close?.(); this.images.delete(src); }
    }
  }

  get(src: string): SpriteImage | undefined { return this.images.get(src); }

  load(src: string, priority: number) {
    if (this.disposed || this.images.has(src) || this.pending.has(src) || (this.failedUntil.get(src) ?? 0) > Date.now()) return;
    const token = {};
    this.pending.set(src, token);
    void this.store.request(src, priority).then(blob => {
      const task = this.decoding.then(() => {
        if (this.disposed || !this.wanted.has(src)) return undefined;
        return this.decode(blob);
      });
      this.decoding = task.catch(() => undefined);
      return task;
    }).then(image => {
      if (!image) return;
      if (this.disposed || !this.wanted.has(src)) { image.close?.(); return; }
      // Existing current-frame data has priority over speculative decoded sheets.
      let bytes = [...this.images.values()].reduce((sum, item) => sum + item.width * item.height * 4, 0);
      const required = image.width * image.height * 4;
      for (const [key, item] of this.images) {
        if (bytes + required <= this.maxBytes) break;
        if (key === src) continue;
        bytes -= item.width * item.height * 4;
        item.close?.(); this.images.delete(key);
      }
      this.images.set(src, image);
      this.failedUntil.delete(src);
      this.onReady();
    }).catch(error => {
      if (this.pending.get(src) === token) this.pending.delete(src);
      if (this.disposed) return;
      if (error instanceof SupersededSpriteRequest) {
        // A navigation cancellation is not a network failure. If the user has
        // already returned, request the current frame again without another scroll.
        if (this.wanted.has(src)) this.onReady();
        return;
      }
      if (!this.wanted.has(src)) return;
      this.failedUntil.set(src, Date.now() + 5000);
      this.onError?.(src, error);
      this.onReady();
    }).finally(() => { if (this.pending.get(src) === token) this.pending.delete(src); });
  }

  dispose() {
    this.disposed = true;
    this.images.forEach(image => image.close?.());
    this.images.clear();
    this.wanted.clear();
  }
}
