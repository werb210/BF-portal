import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { TaskItem } from "@/api/tasks";
import { createTask, fetchTasks, updateTask } from "@/api/tasks";
import { useAuth } from "@/hooks/useAuth";
import { useTasksStore, type TaskFilters } from "@/state/tasks.store";
import TaskListItem from "./TaskListItem";
import TaskEditor from "./TaskEditor";
import { getErrorMessage } from "@/utils/errors";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { getRequestId } from "@/utils/requestId";
import { logger } from "@/utils/logger";

const filterTasks = (tasks: TaskItem[], filters: TaskFilters, currentUserId?: string) => {
  return tasks.filter((task) => {
    const dueDate = task.dueDate ? new Date(task.dueDate) : undefined;
    const now = new Date();
    if (filters.mine && currentUserId && task.assignedToUserId !== currentUserId) return false;
    if (filters.createdByMe && currentUserId && task.createdByUserId !== currentUserId) return false;
    if (filters.overdue && dueDate && dueDate >= now) return false;
    if (filters.silo && task.silo !== filters.silo) return false;
    return true;
  });
};

const TaskPane = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    data: tasks = [],
    isLoading,
    error
  } = useQuery<TaskItem[], Error>({
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
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TaskItem> }) => updateTask(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const handleSaveTask = (task: Partial<TaskItem>) => {
    if (task.id) {
      updateMutation.mutate({ id: task.id, payload: task });
    } else {
      createMutation.mutate(task);
    }
    setShowEditor(false);
  };

  const handleToggleComplete = (task: TaskItem) => {
    const updated = toggleCompletion(task);
    updateMutation.mutate({ id: task.id, payload: { status: updated.status } });
  };

  return (
    <Card
      title="Tasks"
      actions={
        <Button onClick={() => setShowEditor(true)} data-testid="task-pane-add">
          Add Task
        </Button>
      }
    >
      <div className="task-pane__filters">
        <label>
          <input type="checkbox" checked={filters.mine} onChange={(event) => setFilters({ mine: event.target.checked })} /> Assigned to me
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.createdByMe}
            onChange={(event) => setFilters({ createdByMe: event.target.checked })}
          />
          Created by me
        </label>
        <label>
          <input type="checkbox" checked={filters.overdue} onChange={(event) => setFilters({ overdue: event.target.checked })} /> Overdue
        </label>
        <Input placeholder="Filter by silo" value={filters.silo ?? ""} onChange={(event) => setFilters({ silo: event.target.value || undefined })} />
      </div>
      <div className="task-pane__lists">
        <section>
          <h4>My Tasks</h4>
          <ul>
            {isLoading && <li>Loading tasks…</li>}
            {errorMessage && <li className="text-red-700">{errorMessage}</li>}
            {!isLoading &&
              !error &&
              tasksToDisplay
                .filter((task) => task.assignedToUserId === user?.id)
                .map((task) => (
                  <TaskListItem key={task.id} task={task} onSelect={setSelectedTask} onToggleComplete={handleToggleComplete} />
                ))}
            {!isLoading &&
              !error &&
              tasksToDisplay.filter((task) => task.assignedToUserId === user?.id).length === 0 && (
                <li>No tasks assigned to you.</li>
              )}
          </ul>
        </section>
        <section>
          <h4>Assigned Tasks</h4>
          <ul>
            {isLoading && <li>Loading tasks…</li>}
            {errorMessage && <li className="text-red-700">{errorMessage}</li>}
            {!isLoading &&
              !error &&
              tasksToDisplay
                .filter((task) => task.assignedToUserId && task.assignedToUserId !== user?.id)
                .map((task) => (
                  <TaskListItem key={task.id} task={task} onSelect={setSelectedTask} onToggleComplete={handleToggleComplete} />
                ))}
            {!isLoading &&
              !error &&
              tasksToDisplay.filter((task) => task.assignedToUserId && task.assignedToUserId !== user?.id).length === 0 && (
                <li>No assigned tasks yet.</li>
              )}
          </ul>
        </section>
        <section>
          <h4>Due Today</h4>
          <ul>
            {isLoading && <li>Loading tasks…</li>}
            {errorMessage && <li className="text-red-700">{errorMessage}</li>}
            {!isLoading &&
              !error &&
              tasksToDisplay
                .filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString())
                .map((task) => (
                  <TaskListItem key={task.id} task={task} onSelect={setSelectedTask} onToggleComplete={handleToggleComplete} />
                ))}
            {!isLoading &&
              !error &&
              tasksToDisplay.filter((task) => task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()).length === 0 && (
                <li>No tasks due today.</li>
              )}
          </ul>
        </section>
        <section>
          <h4>Overdue</h4>
          <ul>
            {isLoading && <li>Loading tasks…</li>}
            {errorMessage && <li className="text-red-700">{errorMessage}</li>}
            {!isLoading &&
              !error &&
              tasksToDisplay
                .filter((task) => task.dueDate && new Date(task.dueDate) < new Date())
                .map((task) => (
                  <TaskListItem key={task.id} task={task} onSelect={setSelectedTask} onToggleComplete={handleToggleComplete} />
                ))}
            {!isLoading &&
              !error &&
              tasksToDisplay.filter((task) => task.dueDate && new Date(task.dueDate) < new Date()).length === 0 && (
                <li>No overdue tasks.</li>
              )}
          </ul>
        </section>
      </div>
      {(showEditor || selectedTask) && (
        <TaskEditor
          defaultValues={selectedTask}
          onClose={() => {
            setShowEditor(false);
            setSelectedTask(undefined);
          }}
          onSave={handleSaveTask}
        />
      )}
    </Card>
  );
};

export default TaskPane;
