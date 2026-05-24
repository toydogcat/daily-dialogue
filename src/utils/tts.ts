import { KokoroTTS } from "kokoro-js";

export interface TTSProgress {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress: number; // 0 to 100
  message: string;
}

type ProgressListener = (state: TTSProgress) => void;

class KokoroTTSManager {
  private ttsInstance: KokoroTTS | null = null;
  private isInitializing = false;
  private progressListeners: Set<ProgressListener> = new Set();
  private currentProgress: TTSProgress = { status: 'idle', progress: 0, message: '' };
  private audioContext: AudioContext | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;

  // Track progress of individual files being downloaded
  private fileProgresses: Record<string, { loaded: number; total: number }> = {};

  addProgressListener(listener: ProgressListener) {
    this.progressListeners.add(listener);
    listener(this.currentProgress); // Emit current state immediately
    return () => this.progressListeners.delete(listener);
  }

  private notify(state: Partial<TTSProgress>) {
    this.currentProgress = { ...this.currentProgress, ...state };
    this.progressListeners.forEach(listener => listener(this.currentProgress));
  }

  getCurrentProgress() {
    return this.currentProgress;
  }

  async init(force: boolean = false) {
    if (this.ttsInstance && !force) return this.ttsInstance;
    if (this.isInitializing) {
      // Return a promise that resolves when ready
      return new Promise<KokoroTTS>((resolve, reject) => {
        const check = () => {
          if (this.ttsInstance) resolve(this.ttsInstance);
          else if (this.currentProgress.status === 'error') reject(new Error(this.currentProgress.message));
          else setTimeout(check, 100);
        };
        setTimeout(check, 100);
      });
    }

    this.isInitializing = true;
    this.fileProgresses = {};
    this.notify({ status: 'loading', progress: 0, message: '正在初始化本機 AI 語音引擎...' });

    try {
      const model_id = "onnx-community/Kokoro-82M-v1.1-zh-ONNX";
      const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
      // Default to wasm, fallback if webgpu has initialization errors
      const device = hasWebGPU ? 'webgpu' : 'wasm';

      console.log(`Initializing Kokoro-82M TTS on device: ${device}`);

      const tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "q8",
        device: device,
        progress_callback: (info: any) => {
          if (info.status === 'initiate') {
            this.fileProgresses[info.file] = { loaded: 0, total: 0 };
          } else if (info.status === 'progress') {
            this.fileProgresses[info.file] = {
              loaded: info.loaded || 0,
              total: info.total || 0
            };
          } else if (info.status === 'done') {
            if (this.fileProgresses[info.file]) {
              this.fileProgresses[info.file].loaded = this.fileProgresses[info.file].total;
            }
          }

          // Compute overall progress
          let totalBytes = 0;
          let loadedBytes = 0;
          let activeFiles = 0;

          Object.values(this.fileProgresses).forEach(file => {
            if (file.total > 0) {
              totalBytes += file.total;
              loadedBytes += file.loaded;
              activeFiles++;
            }
          });

          let percent = 0;
          let message = '正在載入離線語音模型...';

          if (totalBytes > 0) {
            percent = Math.round((loadedBytes / totalBytes) * 100);
            const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
            message = `正在下載 AI 模型檔案: ${loadedMB}MB / ${totalMB}MB (${percent}%)`;
          } else if (info.file) {
            message = `正在初始化: ${info.file.substring(info.file.lastIndexOf('/') + 1)}`;
          }

          this.notify({
            status: 'loading',
            progress: percent,
            message: message
          });
        }
      });

      this.ttsInstance = tts;
      this.isInitializing = false;
      this.notify({ status: 'ready', progress: 100, message: 'AI 離線語音引擎就緒' });
      return tts;
    } catch (error: any) {
      console.error("Failed to initialize KokoroTTS:", error);
      this.isInitializing = false;
      this.notify({
        status: 'error',
        progress: 0,
        message: `載入失敗: ${error.message || '未知錯誤'}`
      });
      throw error;
    }
  }

  stop() {
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
      } catch (e) {
        // Already stopped
      }
      this.currentSourceNode = null;
    }
  }

  async speak(
    text: string, 
    voice: string = 'af_sky', 
    speed: number = 1.0, 
    onStart?: () => void, 
    onEnd?: () => void, 
    onError?: (err: any) => void
  ) {
    this.stop();

    try {
      // 1. Ensure TTS loaded
      const tts = await this.init();
      
      if (onStart) onStart();

      // Clean text from bracket notation like [BOOK:id] or emojis
      const cleanText = text
        .replace(/\[BOOK:[^\]]+\]/g, "")
        .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
        .replace(/[\(\)（）【】]/g, "，");

      console.log(`Generating local TTS for text: "${cleanText.substring(0, 30)}..."`);

      // 2. Generate audio
      const rawAudio = await tts.generate(cleanText, {
        voice: voice as any,
        speed: speed
      });

      // 3. Play via Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume context if suspended (browser security policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const audioBuffer = this.audioContext.createBuffer(
        1, 
        rawAudio.audio.length, 
        rawAudio.sampling_rate
      );
      audioBuffer.copyToChannel(rawAudio.audio, 0);

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioContext.destination);
      
      this.currentSourceNode = sourceNode;

      sourceNode.onended = () => {
        if (this.currentSourceNode === sourceNode) {
          this.currentSourceNode = null;
          if (onEnd) onEnd();
        }
      };

      sourceNode.start();
    } catch (err: any) {
      console.error("Kokoro speech generation failed:", err);
      if (onError) onError(err);
    }
  }
}

export const kokoroTTSManager = new KokoroTTSManager();
