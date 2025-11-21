import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { format } from 'date-fns'

interface Project {
  id: string
  title: string
  description?: string
  status: string
  team_id?: string
  mentor_id?: string
  start_date?: string
  end_date?: string
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [tasksDue, setTasksDue] = useState(0)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([])
  const [roundSchedules, setRoundSchedules] = useState<Record<string, any>>({})

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    fetchDeadlines()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects/all')
      setProjects(response.data)
      // fetch schedules for these projects
      const scheds: Record<string, any> = {}
      for (const p of response.data) {
        try {
          const s = await api.get(`/round-schedules/project/${p.id}`)
          if (s.data) scheds[p.id] = s.data
        } catch {}
      }
      setRoundSchedules(scheds)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/')
      const today = new Date()
      const dueTasks = response.data.filter((task: any) => {
        if (!task.due_date) return false
        const dueDate = new Date(task.due_date)
        return dueDate >= today && task.status !== 'completed'
      })
      setTasksDue(dueTasks.length)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    }
  }

  const fetchDeadlines = async () => {
    try {
      const tasks = await api.get('/tasks/')
      const today = new Date()
      const deadlines = tasks.data
        .filter((task: any) => task.due_date && new Date(task.due_date) >= today)
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
        .slice(0, 5)
        .map((task: any) => ({
          ...task,
          type: 'Task',
          date: task.due_date,
        }))
      setUpcomingDeadlines(deadlines)
    } catch (error) {
      console.error('Failed to fetch deadlines:', error)
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.username || 'Student'}!
          </h1>
          <p className="text-gray-600 mt-1">
            You have {tasksDue} tasks due this week
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active Projects</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{projects.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Tasks Due</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{tasksDue}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Team Members</p>
            <p className="text-3xl font-bold text-green-600 mt-2">-</p>
          </div>
        </div>

        {/* My Projects Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Projects</h2>
          </div>
          <div className="p-6">
            {projects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No projects assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/student/project/${project.id}`)}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {project.description || 'No description'}
                    </p>
                    {roundSchedules[project.id] && (
                      <div className="text-xs text-gray-600 space-y-1 mb-2">
                        <p><span className="font-medium">Round 1:</span> {roundSchedules[project.id].round1_date ? format(new Date(roundSchedules[project.id].round1_date), 'MMM dd, yyyy') : '-'} • Deadline: {roundSchedules[project.id].round1_deadline ? format(new Date(roundSchedules[project.id].round1_deadline), 'MMM dd, yyyy') : '-'}</p>
                        <p><span className="font-medium">Round 2:</span> {roundSchedules[project.id].round2_date ? format(new Date(roundSchedules[project.id].round2_date), 'MMM dd, yyyy') : '-'} • Deadline: {roundSchedules[project.id].round2_deadline ? format(new Date(roundSchedules[project.id].round2_deadline), 'MMM dd, yyyy') : '-'}</p>
                        <p><span className="font-medium">Round 3:</span> {roundSchedules[project.id].round3_date ? format(new Date(roundSchedules[project.id].round3_date), 'MMM dd, yyyy') : '-'} • Deadline: {roundSchedules[project.id].round3_deadline ? format(new Date(roundSchedules[project.id].round3_deadline), 'MMM dd, yyyy') : '-'}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.status === 'completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                      <button className="text-blue-600 text-sm font-medium">View →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Upcoming Deadlines</h2>
          </div>
          <div className="p-6">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-gray-500">No upcoming deadlines.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{deadline.title}</p>
                      <p className="text-sm text-gray-600">{deadline.type}</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(new Date(deadline.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

