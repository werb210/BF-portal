import { useInstallPrompt } from "./useInstallPrompt";

export default function InstallBanner() {
  const { isInstallable, install } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white text-black p-3 rounded-xl shadow-lg flex justify-between items-center">
      <span className="text-sm font-medium">Install Boreal App</span>
      <button
        onClick={install}
        className="bg-[#020C1C] text-white px-3 py-1 rounded-lg text-sm"
      >
        Install
      </button>
    </div>
  );
}
