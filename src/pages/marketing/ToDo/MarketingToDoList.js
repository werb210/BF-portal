import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useMarketingStore } from "@/state/marketing.store";
const MarketingToDoList = () => {
    const { todos, toggleTodo, addTodo } = useMarketingStore();
    return (_jsx(Card, { title: "Marketing To-Do", actions: _jsx(Button, { onClick: () => addTodo({ title: "Refresh retargeting audiences", assignedTo: "Casey" }), children: "Add task" }), children: _jsx("ul", { className: "space-y-2", children: todos.map((todo) => (_jsxs("li", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: `font-semibold ${todo.completed ? "line-through text-muted" : ""}`, children: todo.title }), todo.assignedTo && _jsxs("div", { className: "text-xs text-muted", children: ["Assigned to ", todo.assignedTo] })] }), _jsx(Button, { variant: "ghost", onClick: () => toggleTodo(todo.id), children: todo.completed ? "Reopen" : "Complete" })] }, todo.id))) }) }));
};
export default MarketingToDoList;
