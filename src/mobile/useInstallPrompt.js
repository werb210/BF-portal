import { useEffect, useState } from "react";
export function useInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    useEffect(() => {
        const handler = (e) => {
            const promptEvent = e;
            promptEvent.preventDefault();
            setDeferredPrompt(promptEvent);
            setIsInstallable(true);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);
    const install = async () => {
        if (!deferredPrompt)
            return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setIsInstallable(false);
    };
    return { isInstallable, install };
}
