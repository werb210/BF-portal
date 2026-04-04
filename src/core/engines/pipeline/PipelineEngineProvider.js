import { jsx as _jsx } from "react/jsx-runtime";
import { createContext } from "react";
export const PipelineEngineContext = createContext(null);
export const PipelineEngineProvider = ({ config, children, }) => {
    return (_jsx(PipelineEngineContext.Provider, { value: config, children: children }));
};
