import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assigned_to?: string
  due_date?: string
}

interface DroppableColumnProps {
  id: string
  tasks: Task[]
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export default function DroppableColumn({ id, tasks, onEdit, onDelete }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      status: id,
    },
  })

  return (
    <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`min-h-[200px] space-y-2 ${isOver ? 'bg-blue-50' : ''}`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </SortableContext>
  )
}

