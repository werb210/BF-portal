import type { TaskItem } from "@/api/tasks";

interface TaskListItemProps {
  task: TaskItem;
  onSelect: (task: TaskItem) => void;
  onToggleComplete: (task: TaskItem) => void;
}

const priorityColor: Record<TaskItem["priority"], string> = {
  low: "var(--success-600, #16a34a)",
  medium: "var(--warning-600, #d97706)",
  high: "var(--danger-600, #dc2626)"
};

const TaskListItem = ({ task, onSelect, onToggleComplete }: TaskListItemProps) => (
  <li className="task-list-item" onClick={() => onSelect(task)}>
    <div className="task-list-item__left">
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={(event) => {
          event.stopPropagation();
          onToggleComplete(task);
        }}
      />
      <div className="task-list-item__content">
        <div className="task-list-item__title">{task.title}</div>
        <div className="task-list-item__meta">
          {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}
          {task.relatedContactId && <span data-testid="task-contact">Contact #{task.relatedContactId}</span>}
          {task.relatedApplicationId && <span data-testid="task-application">App #{task.relatedApplicationId}</span>}
        </div>
      </div>
    </div>
    <div className="task-list-item__badge" style={{ backgroundColor: priorityColor[task.priority] }} />
  </li>
);

export default TaskListItem;
