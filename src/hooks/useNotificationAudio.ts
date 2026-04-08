import { useCallback, useEffect, useRef } from "react";

const canUseAudio = () =>
  typeof window !== "undefined" &&
  ("AudioContext" in window || "webkitAudioContext" in window);

const getAudioContext = () => {
  const AudioContextConstructor =
    (window as Window & { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  return new AudioContextConstructor();
};

export const useNotificationAudio = () => {
  const isPrimedRef = useRef(false);

  useEffect(() => {
    if (!canUseAudio()) return;

    const prime = () => {
      if (isPrimedRef.current) return;
      isPrimedRef.current = true;
      const context = getAudioContext();
      if (!context) return;
      context.resume?.().catch(() => undefined);
      context.close?.().catch(() => undefined);
    };

    const events: (keyof WindowEventMap)[] = ["click", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, prime, { once: true, passive: true }));

    return () => {
      events.forEach((event) => window.removeEventListener(event, prime));
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!isPrimedRef.current) return;
    if (typeof document !== "undefined" && !document.hidden) return;
    if (!canUseAudio()) return;

    const context = getAudioContext();
    if (!context) return;

    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
      oscillator.onended = () => {
        context.close().catch(() => undefined);
      };
    } catch {
      context.close?.().catch(() => undefined);
    }
  }, []);

  return { playNotificationSound };
};
