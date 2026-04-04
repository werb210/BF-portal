import { useContext } from "react";
import LenderAuthContext from "./LenderAuthContext";
export const useLenderAuth = () => {
    const context = useContext(LenderAuthContext);
    if (!context) {
        throw new Error("useLenderAuth must be used within a LenderAuthProvider");
    }
    return context;
};
