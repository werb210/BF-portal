import { useContext } from "react";
import SiloContext from "@/context/SiloContext";
import { useBusinessUnit } from "@/hooks/useBusinessUnit";
export const useSilo = () => {
    const legacyContext = useContext(SiloContext);
    if (legacyContext) {
        return legacyContext;
    }
    const { activeBusinessUnit, setActiveBusinessUnit } = useBusinessUnit();
    return {
        silo: activeBusinessUnit,
        setSilo: setActiveBusinessUnit
    };
};
