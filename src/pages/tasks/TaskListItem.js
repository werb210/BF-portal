import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const priorityColor = {
    low: "var(--success-600, #16a34a)",
    medium: "var(--warning-600, #d97706)",
    high: "var(--danger-600, #dc2626)"
};
const TaskListItem = ({ task, onSelect, onToggleComplete }) => (_jsxs("li", { className: "task-list-item", onClick: () => onSelect(task), children: [_jsxs("div", { className: "task-list-item__left", children: [_jsx("input", { type: "checkbox", checked: task.status === "done", onChange: (event) => {
                        event.stopPropagation();
                        onToggleComplete(task);
                    } }), _jsxs("div", { className: "task-list-item__content", children: [_jsx("div", { className: "task-list-item__title", children: task.title }), _jsxs("div", { className: "task-list-item__meta", children: [task.dueDate && _jsxs("span", { children: ["Due ", new Date(task.dueDate).toLocaleDateString()] }), task.relatedContactId && _jsxs("span", { "data-testid": "task-contact", children: ["Contact #", task.relatedContactId] }), task.relatedApplicationId && _jsxs("span", { "data-testid": "task-application", children: ["App #", task.relatedApplicationId] })] })] })] }), _jsx("div", { className: "task-list-item__badge", style: { backgroundColor: priorityColor[task.priority] } })] }));
export default TaskListItem;
