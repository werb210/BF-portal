import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Table = ({ headers, children }) => (_jsx("div", { className: "ui-table__wrapper", children: _jsxs("table", { className: "ui-table", children: [_jsx("thead", { children: _jsx("tr", { children: headers.map((header, index) => (_jsx("th", { children: header }, index))) }) }), _jsx("tbody", { children: children })] }) }));
export default Table;
