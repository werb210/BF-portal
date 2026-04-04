import { jsx as _jsx } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
const SettingsSectionLayout = ({ title = "Settings", children }) => (_jsx("div", { className: "page settings-page", children: _jsx(Card, { title: title, children: children }) }));
export default SettingsSectionLayout;
