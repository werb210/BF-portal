import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createTask, fetchTasks, updateTask } from "@/api/tasks";
import { useAuth } from "@/hooks/useAuth";
import { useTasksStore } from "@/state/tasks.store";
import TaskListItem from "./TaskListItem";
import TaskEditor from "./TaskEditor";
import { getErrorMessage } from "@/utils/errors";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { getRequestId } from "@/utils/requestId";
import { logger } from "@/utils/logger";
const filterTasks = (tasks, filters, currentUserId) => {
    return tasks.filter((task) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
        const now = new Date();
        if (filters.mine && currentUserId && task.assignedToUserId !== currentUserId)
            return false;
        if (filters.createdByMe && currentUserId && task.createdByUserId !== currentUserId)
            return false;
        if (filters.overdue && dueDate && dueDate >= now)
            return false;
        if (filters.silo && task.silo !== filters.silo)
            return false;
        return true;
    });
};
const TaskPane = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: tasks = [], isLoading, error } = useQuery({
        queryKey: ["tasks"],
        queryFn: fetchTasks
    });
    const { filters, setFilters, selectedTask, setSelectedTask, toggleCompletion } = useTasksStore();
    const [showEditor, setShowEditor] = useState(false);
    const tasksToDisplay = useMemo(() => filterTasks(tasks, filters, user?.id), [filters, tasks, user?.id]);
    const errorMessage = error ? getErrorMessage(error, "Unable to load tasks.") : null;
    useEffect(() => {
        if (error) {
            logger.error("Failed to load tasks", { requestId: getRequestId(), error });
        }
    }, [error]);
    useEffect(() => {
        if (!isLoading && !error) {
            emitUiTelemetry("data_loaded", { view: "tasks", count: tasks.length });
        }
    }, [error, isLoading, tasks.length]);
    const createMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
    });
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => updateTask(id, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
    });
    const handleSaveTask = (task) => {
        if (task.id) {
            updateMutation.mutate({ id: task.id, payload: task });
        }
        else {
            createMutation.mutate(task);
        }
        setShowEditor(false);
    };
    const handleToggleComplete = (task) => {
        const updated = toggleCompletion(task);
        updateMutation.mutate({ id: task.id, payload: { status: updated.status } });
    };
    return (_jsxs(Card, { title: "Tasks", actions: _jsx(Button, { onClick: () => setShowEditor(true), "data-testid": "task-pane-add", children: "Add Task" }), children: [_jsxs("div", { className: "task-pane__filters", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: filters.mine, onChange: (event) => setFilters({ mine: event.target.checked }) }), " Assigned to me"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: filters.createdByMe, onChange: (event) => setFilters({ createdByMe: event.target.checked }) }), "Created by me"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: filters.overdue, onChange: (event) => setFilters({ overdue: event.target.checked }) }), " Overdue"] }), _jsx(Input, { placeholder: "Filter by silo", value: filters.silo ?? "", onChange: (event) => setFilters({ silo: event.target.value || undefined }) })] }), _jsxs("div", { className: "task-pane__lists", children: [_jsxs("section", { children: [_jsx("h4", { children: "My Tasks" }), _jsxs("ul", { children: [isLoading && _jsx("li", { children: "Loading tasks\u2026" }), errorMessage && _jsx("li", { className: "text-red-700", children: errorMessage }), !isLoading &&
                                        !error &&
                                        tasksToDisplay
                                            .filter((task) => task.assignedToUserId === user?.id)
                                            .map((task) => (_jsx(TaskListItem, { task: task, onSelect: setSelectedTask, onToggleComplete: handleToggleComplete }, task.id))), !isLoading &&
                                        !error &&
                                        tasksToDisplay.filter((task) => task.assignedToUserId === user?.id).length === 0 && (_jsx("li", { children: "No tasks assigned to you." }))] })] }), _jsxs("section", { children: [_jsx("h4", { children: "Assigned Tasks" }), _jsxs("ul", { children: [isLoading && _jsx("li", { children: "Loading tasks\u2026" }), errorMessage && _jsx("li", { className: "text-red-700", children: errorMessage }), !isLoading &&
                                        !error &&
                                        tasksToDisplay
                                            .filter((task) => task.assignedToUserId && task.assignedToUserId !== user?.id)
                                            .map((task) => (_jsx(TaskListItem, { task: task, onSelect: setSelectedTask, onToggleComplete: handleToggleComplete }, task.id))), !isLoading &&
                                        !error &&
                                        tasksToDisplay.filter((task) => task.assignedToUserId && task.assignedToUserId !== user?.id).length === 0 && (_jsx("li", { children: "No assigned tasks yet." }))] })] }), _jsxs("section", { children: [_jsx("h4", { children: "Due Today" }), _jsxs("ul", { children: [isLoading && _jsx("li", { children: "Loading tasks\u2026" }), errorMessage && _jsx("li", { className: "text-red-700", children: errorMessage }), !isLoading &&
                                        !error &&
                                        tasksToDisplay
                                            .filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString())
                                            .map((task) => (_jsx(TaskListItem, { task: task, onSelect: setSelectedTask, onToggleComplete: handleToggleComplete }, task.id))), !isLoading &&
                                        !error &&
                                        tasksToDisplay.filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()).length === 0 && (_jsx("li", { children: "No tasks due today." }))] })] }), _jsxs("section", { children: [_jsx("h4", { children: "Overdue" }), _jsxs("ul", { children: [isLoading && _jsx("li", { children: "Loading tasks\u2026" }), errorMessage && _jsx("li", { className: "text-red-700", children: errorMessage }), !isLoading &&
                                        !error &&
                                        tasksToDisplay
                                            .filter((task) => task.dueDate && new Date(task.dueDate) < new Date())
                                            .map((task) => (_jsx(TaskListItem, { task: task, onSelect: setSelectedTask, onToggleComplete: handleToggleComplete }, task.id))), !isLoading &&
                                        !error &&
                                        tasksToDisplay.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()).length === 0 && (_jsx("li", { children: "No overdue tasks." }))] })] })] }), (showEditor || selectedTask) && (_jsx(TaskEditor, { defaultValues: selectedTask, onClose: () => {
                    setShowEditor(false);
                    setSelectedTask(undefined);
                }, onSave: handleSaveTask }))] }));
};
export default TaskPane;
