import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { api } from '../lib/api'
import { toast } from 'react-toastify'
import { HiPlus } from 'react-icons/hi'
import DroppableColumn from './DroppableColumn'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assigned_to?: string
  due_date?: string
}

interface KanbanBoardProps {
  projectId: string
  tasks: Task[]
  onTasksChange: (tasks: Task[]) => void
}

const columns = [
  { id: 'pending', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'review', title: 'Under Review' },
  { id: 'completed', title: 'Completed' },
]

export default function KanbanBoard({ projectId, tasks, onTasksChange }: KanbanBoardProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.data.current?.status || (over.id as string)

    // Only update if status changed
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Update task status
    try {
      await api.put(`/tasks/${taskId}`, {
        ...task,
        status: newStatus,
      })

      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
      onTasksChange(updatedTasks)
      toast.success('Task updated')
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleAddTask = async (taskData: any) => {
    try {
      const response = await api.post('/tasks/', {
        ...taskData,
        project_id: projectId,
        status: selectedColumn,
      })
      onTasksChange([...tasks, response.data])
      setShowAddModal(false)
      toast.success('Task created')
    } catch (error) {
      toast.error('Failed to create task')
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowEditModal(true)
  }

  const handleUpdateTask = async (taskData: any) => {
    if (!editingTask) return
    
    try {
      const response = await api.put(`/tasks/${editingTask.id}`, {
        ...editingTask,
        ...taskData,
      })
      const updatedTasks = tasks.map((t) =>
        t.id === editingTask.id ? response.data : t
      )
      onTasksChange(updatedTasks)
      setShowEditModal(false)
      setEditingTask(null)
      toast.success('Task updated')
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`)
      const updatedTasks = tasks.filter((t) => t.id !== taskId)
      onTasksChange(updatedTasks)
      toast.success('Task deleted')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <button
                  onClick={() => {
                    setSelectedColumn(column.id)
                    setShowAddModal(true)
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Add task"
                >
                  <HiPlus size={18} />
                </button>
              </div>
              <DroppableColumn 
                id={column.id} 
                tasks={getTasksByStatus(column.id)}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>
          ))}
        </div>
      </DndContext>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTask}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => {
            setShowEditModal(false)
            setEditingTask(null)
          }}
          onSubmit={handleUpdateTask}
        />
      )}
    </div>
  )
}

function AddTaskModal({ onClose, onSubmit }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    assigned_to: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Add New Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Create Task
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTaskModal({ task, onClose, onSubmit }: { task: Task; onClose: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
    assigned_to: task.assigned_to || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">Edit Task</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">
              Update Task
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

