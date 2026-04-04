import { useCallback, useEffect, useState } from "react";
const DISMISS_KEY = "bf-install-dismissed";
export const useInstallPrompt = () => {
    const [promptEvent, setPromptEvent] = useState(null);
    const [isDismissed, setIsDismissed] = useState(() => {
        if (typeof sessionStorage === "undefined")
            return false;
        return sessionStorage.getItem(DISMISS_KEY) === "true";
    });
    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            if (isDismissed)
                return;
            event.preventDefault();
            setPromptEvent(event);
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [isDismissed]);
    const dismiss = useCallback(() => {
        setIsDismissed(true);
        setPromptEvent(null);
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(DISMISS_KEY, "true");
        }
    }, []);
    const promptInstall = useCallback(async () => {
        if (!promptEvent)
            return;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome !== "accepted") {
            dismiss();
        }
        setPromptEvent(null);
    }, [dismiss, promptEvent]);
    return {
        canInstall: Boolean(promptEvent) && !isDismissed,
        promptInstall,
        dismiss
    };
};
