import { useState } from "react";
export function useCallState() {
    const [state, setState] = useState("idle");
    return {
        state,
        setState
    };
}
