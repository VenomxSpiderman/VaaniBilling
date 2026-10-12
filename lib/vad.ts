/**
 * Voice Activity Detection (VAD) Module
 *
 * Uses Web Audio API (AudioContext + AnalyserNode) to monitor mic input energy.
 * Detects speech start/end based on configurable energy thresholds and silence duration.
 * Captures audio via MediaRecorder and delivers blobs when speech ends.
 */

// ─── Configurable Parameters ───────────────────────────────────────────────────

/** Energy level below which we consider silence (0-1 float) */
export const SILENCE_THRESHOLD = 0.015;

/** Energy level above which we consider speech (0-1 float) */
export const SPEECH_THRESHOLD = 0.03;

/** How long silence must persist before auto-stopping (ms) */
export const SILENCE_DURATION_MS = 1200;

/** Minimum speech duration to avoid false triggers (ms) */
export const MIN_SPEECH_DURATION_MS = 300;

// ─── Callback Types ────────────────────────────────────────────────────────────

export type OnSpeechStartCallback = () => void;
export type OnSpeechEndCallback = (audioBlob: Blob) => void;
export type OnEnergyUpdateCallback = (energy: number) => void;

// ─── VoiceActivityDetector Class ───────────────────────────────────────────────

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private audioChunks: Blob[] = [];

  private listening = false;
  private isSpeaking = false;
  private speechStartTime = 0;
  private silenceStartTime = 0;

  private onSpeechStart: OnSpeechStartCallback | null = null;
  private onSpeechEnd: OnSpeechEndCallback | null = null;
  private onEnergyUpdate: OnEnergyUpdateCallback | null = null;

  /**
   * Start monitoring microphone input for voice activity.
   */
  async start(
    onSpeechStart: OnSpeechStartCallback,
    onSpeechEnd: OnSpeechEndCallback,
    onEnergyUpdate: OnEnergyUpdateCallback
  ): Promise<void> {
    if (this.listening) return;

    this.onSpeechStart = onSpeechStart;
    this.onSpeechEnd = onSpeechEnd;
    this.onEnergyUpdate = onEnergyUpdate;

    try {
      // Acquire microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up Web Audio API analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.listening = true;
      this.isSpeaking = false;
      this.silenceStartTime = 0;
      this.speechStartTime = 0;

      // Begin the monitoring loop
      this.monitorLoop();
    } catch (err) {
      console.error('[VAD] Microphone access error:', err);
      this.cleanup();
      throw err;
    }
  }

  /**
   * Stop monitoring and release all resources.
   */
  stop(): void {
    this.listening = false;

    // If we were mid-speech, discard the recording
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.cleanup();
  }

  /**
   * Returns whether the detector is currently in listening mode.
   */
  isListening(): boolean {
    return this.listening;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Core animation-frame loop that reads analyser energy and fires callbacks.
   */
  private monitorLoop = (): void => {
    if (!this.listening || !this.analyser) return;

    const energy = this.computeEnergy();

    // Report energy to the visualizer at ~60fps
    this.onEnergyUpdate?.(energy);

    const now = Date.now();

    if (!this.isSpeaking) {
      // ── Not currently speaking: check if speech has started ──
      if (energy > SPEECH_THRESHOLD) {
        this.isSpeaking = true;
        this.speechStartTime = now;
        this.silenceStartTime = 0;
        this.startRecording();
        this.onSpeechStart?.();
      }
    } else {
      // ── Currently speaking: check for silence ──
      if (energy < SILENCE_THRESHOLD) {
        if (this.silenceStartTime === 0) {
          this.silenceStartTime = now;
        } else if (now - this.silenceStartTime >= SILENCE_DURATION_MS) {
          const speechDuration = now - this.speechStartTime;
          if (speechDuration >= MIN_SPEECH_DURATION_MS) {
            // Valid speech ended — stop recording and deliver blob
            this.stopRecording();
          } else {
            // Too short — discard as false trigger
            this.discardRecording();
          }
          this.isSpeaking = false;
          this.silenceStartTime = 0;
        }
      } else {
        // Speech is continuing — reset silence timer
        this.silenceStartTime = 0;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.monitorLoop);
  };

  /**
   * Compute current RMS energy level from the analyser (returns 0-1 float).
   */
  private computeEnergy(): number {
    if (!this.analyser) return 0;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    // Compute RMS (root mean square)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128; // Convert to -1..1 range
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / bufferLength);

    // Clamp to 0-1 (RMS is typically 0-0.5 for speech, boost for visibility)
    return Math.min(1, rms * 2);
  }

  /**
   * Start a MediaRecorder to capture the speech segment.
   */
  private startRecording(): void {
    if (!this.mediaStream) return;

    this.audioChunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.onSpeechEnd?.(audioBlob);
        }
        this.audioChunks = [];
      };

      this.mediaRecorder.start();
    } catch (err) {
      console.error('[VAD] MediaRecorder error:', err);
    }
  }

  /**
   * Stop the active MediaRecorder (triggers onstop → delivers blob).
   */
  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Discard an active recording (false trigger / too short).
   */
  private discardRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      // Remove the onstop handler so no blob is delivered
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.audioChunks = [];
  }

  /**
   * Release all media and audio resources.
   */
  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isSpeaking = false;
    this.silenceStartTime = 0;
    this.speechStartTime = 0;
  }
}
