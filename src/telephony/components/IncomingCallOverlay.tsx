import { useCallState } from "../state/callState";

export default function IncomingCallOverlay() {
  const { incomingCall, setActiveCall, setCallStatus, setErrorMessage, clearCall } = useCallState();

  if (!incomingCall) return null;

  const accept = () => {
    incomingCall.accept();
    setActiveCall(incomingCall);
    setCallStatus("in_call");
    setErrorMessage(undefined);
  };

  const decline = () => {
    incomingCall.reject();
    clearCall();
  };

  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-lg rounded-lg p-4 w-72">
      <div className="font-semibold mb-2">Incoming Call</div>

      <div className="flex gap-2">
        <button
          onClick={accept}
          className="flex-1 bg-green-600 text-white rounded px-3 py-2"
        >
          Answer
        </button>

        <button
          onClick={decline}
          className="flex-1 bg-red-600 text-white rounded px-3 py-2"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
