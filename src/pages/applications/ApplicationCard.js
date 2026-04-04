import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import DrawerTabs from "./drawer/DrawerTabs";
const ApplicationCard = ({ tabs, selectedTab, onSelect, children }) => (_jsxs("div", { className: "application-card", children: [_jsx(DrawerTabs, { tabs: tabs, selectedTab: selectedTab, onSelect: onSelect }), _jsx("div", { className: "application-card__content", children: children })] }));
export default ApplicationCard;
