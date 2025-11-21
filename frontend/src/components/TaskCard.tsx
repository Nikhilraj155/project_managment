import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HiDotsVertical, HiCalendar, HiUser, HiPencil, HiTrash } from 'react-icons/hi'
import { format } from 'date-fns'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  assigned_to?: string
  due_date?: string
}

interface TaskCardProps {
  task: Task
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export default function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onEdit?.(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete?.(task.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg p-3 shadow-sm ${
        isDragging ? 'shadow-lg cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm flex-1">
          {task.title}
        </h4>
        <div 
          className="relative" 
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="p-1 hover:bg-gray-100 rounded"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
          >
            <HiDotsVertical size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[120px]">
              <button
                onClick={handleEdit}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <HiPencil size={14} />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <HiTrash size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {task.due_date && (
          <div className="flex items-center gap-1">
            <HiCalendar size={12} />
            <span>{format(new Date(task.due_date), 'MMM dd')}</span>
          </div>
        )}
        {task.assigned_to && (
          <div className="flex items-center gap-1">
            <HiUser size={12} />
            <span>Assigned</span>
          </div>
        )}
      </div>
    </div>
  )
}

