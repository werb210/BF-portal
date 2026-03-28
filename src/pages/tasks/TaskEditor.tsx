import { useEffect, useState } from "react";
import type { TaskItem } from "@/api/tasks";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTasksStore } from "@/state/tasks.store";

interface TaskEditorProps {
  onSave: (task: Partial<TaskItem>) => void;
  onClose: () => void;
  defaultValues?: TaskItem;
}

const TaskEditor = ({ onSave, onClose, defaultValues }: TaskEditorProps) => {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [dueDate, setDueDate] = useState(defaultValues?.dueDate?.slice(0, 10) ?? "");
  const [priority, setPriority] = useState<TaskItem["priority"]>(defaultValues?.priority ?? "medium");
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

  return (
    <div className="task-editor">
      <div className="task-editor__header">
        <h4>{defaultValues ? "Edit Task" : "Add Task"}</h4>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="task-editor__body">
        <label>
          Title
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Due Date
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(event) => setPriority(event.target.value as TaskItem["priority"])}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Assign To (User ID)
          <Input value={assignedToUserId} onChange={(event) => setAssignedToUserId(event.target.value)} />
        </label>
        <label>
          Related Contact ID
          <Input value={relatedContactId} onChange={(event) => setRelatedContactId(event.target.value)} />
        </label>
        <label>
          Related Application ID
          <Input value={relatedApplicationId} onChange={(event) => setRelatedApplicationId(event.target.value)} />
        </label>
      </div>
      <div className="task-editor__footer">
        <Button onClick={handleSave}>Save Task</Button>
      </div>
    </div>
  );
};

export default TaskEditor;
