export class SoundEngine {
    private context: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.3;

    constructor() {
        this.init();
    }

    private init() {
        try {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (enabled && this.context?.state === 'suspended') {
            this.context.resume();
        }
    }

    playDrop() {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.setValueAtTime(400, this.context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + 0.1);
    }

    playWin() {
        if (!this.enabled || !this.context) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
        notes.forEach((freq, i) => {
            const oscillator = this.context!.createOscillator();
            const gainNode = this.context!.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.context!.destination);

            const startTime = this.context!.currentTime + i * 0.1;

            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.5, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.4);
        });
    }

    playError() {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.setValueAtTime(150, this.context.currentTime);
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(this.volume * 0.3, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + 0.15);
    }
}