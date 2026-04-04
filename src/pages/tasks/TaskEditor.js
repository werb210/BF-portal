import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTasksStore } from "@/state/tasks.store";
const TaskEditor = ({ onSave, onClose, defaultValues }) => {
    const [title, setTitle] = useState(defaultValues?.title ?? "");
    const [description, setDescription] = useState(defaultValues?.description ?? "");
    const [dueDate, setDueDate] = useState(defaultValues?.dueDate?.slice(0, 10) ?? "");
    const [priority, setPriority] = useState(defaultValues?.priority ?? "medium");
    const [assignedToUserId, setAssignedToUserId] = useState(defaultValues?.assignedToUserId ?? "");
    const [relatedContactId, setRelatedContactId] = useState(defaultValues?.relatedContactId ?? "");
    const [relatedApplicationId, setRelatedApplicationId] = useState(defaultValues?.relatedApplicationId ?? "");
    const { setSelectedTask } = useTasksStore();
    useEffect(() => {
        setTitle(defaultValues?.title ?? "");
        setDescription(defaultValues?.description ?? "");
        setDueDate(defaultValues?.dueDate?.slice(0, 10) ?? "");
        setPriority(defaultValues?.priority ?? "medium");
        setAssignedToUserId(defaultValues?.assignedToUserId ?? "");
        setRelatedContactId(defaultValues?.relatedContactId ?? "");
        setRelatedApplicationId(defaultValues?.relatedApplicationId ?? "");
    }, [defaultValues]);
    const handleSave = () => {
        onSave({
            ...defaultValues,
            title,
            description,
            dueDate,
            priority,
            assignedToUserId: assignedToUserId || undefined,
            relatedContactId: relatedContactId || undefined,
            relatedApplicationId: relatedApplicationId || undefined
        });
        setSelectedTask(undefined);
    };
    return (_jsxs("div", { className: "task-editor", children: [_jsxs("div", { className: "task-editor__header", children: [_jsx("h4", { children: defaultValues ? "Edit Task" : "Add Task" }), _jsx(Button, { variant: "secondary", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "task-editor__body", children: [_jsxs("label", { children: ["Title", _jsx(Input, { value: title, onChange: (event) => setTitle(event.target.value) })] }), _jsxs("label", { children: ["Description", _jsx("textarea", { value: description, onChange: (event) => setDescription(event.target.value) })] }), _jsxs("label", { children: ["Due Date", _jsx(Input, { type: "date", value: dueDate, onChange: (event) => setDueDate(event.target.value) })] }), _jsxs("label", { children: ["Priority", _jsxs("select", { value: priority, onChange: (event) => setPriority(event.target.value), children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] })] }), _jsxs("label", { children: ["Assign To (User ID)", _jsx(Input, { value: assignedToUserId, onChange: (event) => setAssignedToUserId(event.target.value) })] }), _jsxs("label", { children: ["Related Contact ID", _jsx(Input, { value: relatedContactId, onChange: (event) => setRelatedContactId(event.target.value) })] }), _jsxs("label", { children: ["Related Application ID", _jsx(Input, { value: relatedApplicationId, onChange: (event) => setRelatedApplicationId(event.target.value) })] })] }), _jsx("div", { className: "task-editor__footer", children: _jsx(Button, { onClick: handleSave, children: "Save Task" }) })] }));
};
export default TaskEditor;
