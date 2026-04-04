import { jsx as _jsx } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { useSilo } from "../context/SiloContext";
import { useAuth } from "../auth/AuthContext";
import { SILOS } from "../types/silo";
const siloLabels = {
    bf: "BF",
    bi: "BI",
    slf: "SLF",
    admin: "Admin",
};
export default function SiloSelector() {
    const { silo, setSilo } = useSilo();
    const { canAccessSilo } = useAuth();
    const navigate = useNavigate();
    return (_jsx("div", { style: { display: "flex", gap: 12 }, children: SILOS.map((s) => (_jsx("button", { onClick: () => {
                if (!canAccessSilo(s))
                    return;
                setSilo(s);
                navigate(`/${s}`);
            }, disabled: silo === s, children: siloLabels[s] }, s))) }));
}
