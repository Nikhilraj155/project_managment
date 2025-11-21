import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'

interface Team {
  id: string
  name: string
  members: string[]
  project_id?: string
}

export default function MentorDashboard() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/teams/', token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      setTeams(response.data)
    } catch (error) {
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
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
            Welcome, Professor {user?.username || 'Mentor'}!
          </h1>
          <p className="text-gray-600 mt-1">Manage your mentored teams and projects</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Mentored Teams</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{teams.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active Projects</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{teams.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Pending Evaluations</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">-</p>
          </div>
        </div>

        {/* My Mentored Teams */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">My Mentored Teams</h2>
          </div>
          <div className="p-6">
            {teams.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No teams assigned yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    onClick={() => navigate(`/mentor/team/${team.id}`)}
                    className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <h3 className="font-semibold text-lg mb-2">{team.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {team.members?.length || 0} members
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }} />
                      </div>
                      <button className="text-blue-600 text-sm font-medium ml-2">View →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Evaluations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Upcoming Evaluations</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-500">No upcoming evaluations scheduled.</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

