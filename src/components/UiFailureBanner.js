import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSyncExternalStore } from "react";
import { getUiFailure, subscribeUiFailure } from "@/utils/uiFailureStore";
const UiFailureBanner = () => {
    const failure = useSyncExternalStore(subscribeUiFailure, getUiFailure, getUiFailure);
    if (!failure)
        return null;
    return (_jsx("div", { role: "alert", className: "mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 shadow", children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("strong", { className: "text-sm font-semibold", children: "We hit an issue" }), _jsx("span", { className: "text-sm", children: failure.message }), failure.details && _jsx("span", { className: "text-xs text-red-700", children: failure.details })] }) }));
};
export default UiFailureBanner;
