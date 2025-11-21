import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import ProgressTracker from '../components/ProgressTracker'
import { toast } from 'react-toastify'

export default function MentorTeamOverview() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [team, setTeam] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchTeam()
    fetchTasks()
  }, [teamId])

  const fetchTeam = async () => {
    try {
      const response = await api.get(`/teams/${teamId}`)
      setTeam(response.data)
    } catch (error) {
      toast.error('Failed to load team')
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/')
      const teamTasks = response.data.filter((task: any) => task.team_id === teamId)
      setTasks(teamTasks)
    } catch (error) {
      toast.error('Failed to load tasks')
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  if (!team) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <button onClick={() => navigate('/mentor')} className="text-blue-600 mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
          <p className="text-gray-600 mt-1">{team.description || 'Team overview'}</p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tasks', label: 'Task Progress' },
              { id: 'files', label: 'Files' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'chat', label: 'Chat' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Team Members</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {team.members?.map((memberId: string, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white">
                      {memberId.substring(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium">Member {idx + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'tasks' && <ProgressTracker projectId="" tasks={tasks} />}
          {activeTab === 'feedback' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Feedback</h3>
              <p className="text-gray-600">Feedback management coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

