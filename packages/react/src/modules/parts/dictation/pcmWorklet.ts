// The audio worklet of dictation: it turns the microphone's samples into 16 kHz mono 16-bit PCM, averaging
// the samples of each 16 kHz step, and posts a frame every 100 ms with the frame's level for the waveform.
// It runs in the browser's audio thread, which has its own globals.

declare const sampleRate: number;
declare function registerProcessor(name: string, processor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}

const TARGET_RATE = 16_000;
const FRAME_SAMPLES = 1_600;

class PcmProcessor extends AudioWorkletProcessor {
  private readonly step = sampleRate / TARGET_RATE;
  private position = 0;
  private sum = 0;
  private count = 0;
  private frame = new Int16Array(FRAME_SAMPLES);
  private filled = 0;
  private energy = 0;

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) {
      return true;
    }
    for (const sample of channel) {
      this.sum += sample;
      this.count += 1;
      this.position += 1;
      if (this.position >= this.step) {
        this.position -= this.step;
        this.push(this.sum / this.count);
        this.sum = 0;
        this.count = 0;
      }
    }
    return true;
  }

  private push(value: number): void {
    const clamped = Math.max(-1, Math.min(1, value));
    this.frame[this.filled] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    this.energy += clamped * clamped;
    this.filled += 1;
    if (this.filled === FRAME_SAMPLES) {
      const level = Math.sqrt(this.energy / FRAME_SAMPLES);
      this.port.postMessage({ pcm: this.frame, level }, [this.frame.buffer]);
      this.frame = new Int16Array(FRAME_SAMPLES);
      this.filled = 0;
      this.energy = 0;
    }
  }
}

registerProcessor('aiconnect-pcm', PcmProcessor);
