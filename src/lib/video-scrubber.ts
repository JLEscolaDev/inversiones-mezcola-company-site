export type MobileMotion = { src: string; count: number; fps: number; width: number; height: number; bytes: number };
type Decoder = { video: HTMLVideoElement; desired: number; frame: number; ready: boolean; busy: boolean; dispose: () => void };

/** At most two native decoders, with one seek in flight per decoder.
 * Scroll only updates the desired frame. Finishing an older seek always paints
 * a valid full-resolution frame, then services the latest position.
 */
export class VideoScrubber {
  private decoders = new Map<number, Decoder>();
  private active = -1;
  private painted = '';
  private paintedIndex = -1;
  private disposed = false;

  constructor(private readonly canvas: HTMLCanvasElement,
    private readonly host: HTMLElement,
    private readonly sequences: readonly MobileMotion[],
    private readonly urls: readonly string[],
    private readonly onFrame: () => void,
    private readonly onError: () => void) {}

  request(index: number, frame: number) {
    if (this.disposed) return false;
    this.active = index;
    // Current and upcoming transition only. Compressed blobs stay cached, while
    // decoded video surfaces from every other sequence are released.
    for (const [key, decoder] of this.decoders) {
      if (key !== index && key !== index + 1) { decoder.dispose(); this.decoders.delete(key); }
    }
    const decoder = this.getDecoder(index);
    decoder.desired = frame;
    this.pump(index, decoder);
    if (decoder.ready && decoder.frame >= 0 && !decoder.busy) this.paint(index, decoder);
    if (index + 1 < this.sequences.length) this.getDecoder(index + 1);
    return this.paintedIndex === index;
  }

  private getDecoder(index: number) {
    const existing = this.decoders.get(index);
    if (existing) return existing;
    const sequence = this.sequences[index];
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    video.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    const decoder: Decoder = { video, desired: 0, frame: -1, ready: false, busy: false, dispose: () => {} };
    const fail = () => { if (!this.disposed && this.decoders.get(index) === decoder) this.onError(); };
    const timeout = window.setTimeout(fail, 30000);
    const loaded = () => {
      if (this.disposed || this.decoders.get(index) !== decoder || video.readyState < 2) return;
      if (video.videoWidth !== sequence.width || video.videoHeight !== sequence.height) { fail(); return; }
      window.clearTimeout(timeout);
      decoder.ready = true;
      decoder.frame = Math.round(video.currentTime * sequence.fps);
      if (decoder.frame === decoder.desired) this.paint(index, decoder);
      this.pump(index, decoder);
    };
    const seeked = () => {
      if (this.disposed || this.decoders.get(index) !== decoder) return;
      decoder.busy = false;
      decoder.frame = Math.min(sequence.count - 1, Math.round(video.currentTime * sequence.fps));
      // Do not require this frame to equal the newest scroll request: doing so
      // would starve all painting during continuous movement.
      this.paint(index, decoder);
      this.pump(index, decoder);
    };
    video.addEventListener('loadeddata', loaded);
    video.addEventListener('seeked', seeked);
    video.addEventListener('error', fail);
    decoder.dispose = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('seeked', seeked);
      video.removeEventListener('error', fail);
      video.pause(); video.removeAttribute('src'); video.load(); video.remove();
    };
    this.decoders.set(index, decoder);
    this.host.appendChild(video);
    video.src = this.urls[index];
    video.load();
    return decoder;
  }

  private pump(index: number, decoder: Decoder) {
    if (!decoder.ready || decoder.busy || decoder.video.seeking || decoder.frame === decoder.desired) return;
    decoder.busy = true;
    decoder.video.currentTime = (decoder.desired + 0.01) / this.sequences[index].fps;
  }

  private paint(index: number, decoder: Decoder) {
    if (this.disposed || this.active !== index || !decoder.ready || decoder.frame < 0) return;
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const key = `${index}:${decoder.frame}:${width}:${height}`;
    if (key === this.painted) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const sequence = this.sequences[index];
    const drawWidth = Math.max(width, height * sequence.width / sequence.height);
    const drawHeight = drawWidth * sequence.height / sequence.width;
    context.drawImage(decoder.video, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    this.painted = key;
    this.paintedIndex = index;
    canvas.dataset.sequence = String(index);
    canvas.dataset.frame = String(decoder.frame);
    this.onFrame();
  }

  dispose() {
    this.disposed = true;
    this.decoders.forEach(decoder => decoder.dispose());
    this.decoders.clear();
  }
}
