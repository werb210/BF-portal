import { useEffect, useState } from "react";
import { getToken } from "./token";
import { decodeJwt } from "./jwt";
export function useAuth() {
    const [state, setState] = useState({ status: "pending" });
    useEffect(() => {
        const token = getToken();
        const decoded = decodeJwt(token);
        if (!decoded) {
            setState({ status: "unauthenticated" });
            return;
        }
        setState({ status: "authenticated", user: decoded });
    }, []);
    return state;
}
