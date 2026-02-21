import { useRef, useCallback, useEffect } from 'react';

export const useSound = (soundUrl: string, isMuted: boolean) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(soundUrl);
        audioRef.current.volume = 0.3;
        audioRef.current.muted = isMuted;
    }, [soundUrl, isMuted]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted]);

    const play = useCallback(() => {
        if (!audioRef.current || isMuted) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => {
            console.warn('Sound playback failed:', err);
        });
    }, [isMuted]);

    return { play };
};