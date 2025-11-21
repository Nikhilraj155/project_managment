import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { HiUsers, HiAcademicCap, HiFolderOpen } from 'react-icons/hi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { toast } from 'react-toastify'

interface DashboardStats {
  summary: {
    total_students: number
    total_mentors: number
    total_teams: number
    total_projects: number
    active_students_24h?: number | undefined
    active_mentors_24h?: number | undefined
  }
  projects_per_department: {
    "Computer Science": number
    "Mechanical": number
    "Electrical": number
    "Civil": number
  }
  project_status: {
    Ongoing: number
    Pending: number
    Completed: number
  }
  upcoming_events: Array<{
    event: string
    date: string
  }>
}

const COLORS = ['#3B82F6', '#60A5FA', '#9CA3AF']

export default function AdminDashboard() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [csvSummary, setCsvSummary] = useState<{ total_students_from_csv: number; total_guides_from_csv: number; total_teams_from_csv: number } | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
    fetchCsvSummary()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      toast.error('Failed to load dashboard statistics')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCsvSummary = async () => {
    try {
      const res = await api.get('/csv/summary')
      setCsvSummary(res.data)
    } catch {}
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const form = new FormData()
    form.append('file', file)
    setCsvUploading(true)
    try {
      // Let Axios set the correct multipart boundary automatically
      await api.post('/csv/upload', form)
      await fetchCsvSummary()
      toast.success('CSV uploaded')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'CSV upload failed'
      toast.error(detail)
    } finally {
      setCsvUploading(false)
      e.target.value = ''
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  if (loading) {
    return (
      <Layout sidebarItems={sidebarItems}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </Layout>
    )
  }

  // Prepare chart data
  const departmentData = stats ? Object.entries(stats.projects_per_department).map(([name, value]) => ({
    name,
    value
  })) : []

  const statusData = stats ? Object.entries(stats.project_status).map(([name, value]) => ({
    name,
    value
  })) : []

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.username || 'Admin'}!
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiUsers className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats?.summary.total_students || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total Students</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiAcademicCap className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats?.summary.total_mentors || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total Mentors</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiUsers className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats?.summary.total_teams || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total Teams</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <HiFolderOpen className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stats?.summary.total_projects || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Total Projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active users info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active Students (24h)</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">{stats?.summary.active_students_24h || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active Mentors (24h)</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">{stats?.summary.active_mentors_24h || 0}</p>
          </div>
        </div>

        {/* CSV Upload & Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upload Allocation CSV</h2>
            <label className="btn-primary cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              {csvUploading ? 'Uploading...' : 'Upload CSV'}
            </label>
          </div>
          {csvSummary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded bg-blue-50">
                <p className="text-sm text-gray-600">Students (CSV)</p>
                <p className="text-2xl font-semibold text-blue-700">{csvSummary.total_students_from_csv}</p>
              </div>
              <div className="p-4 rounded bg-green-50">
                <p className="text-sm text-gray-600">Guides (CSV)</p>
                <p className="text-2xl font-semibold text-green-700">{csvSummary.total_guides_from_csv}</p>
              </div>
              <div className="p-4 rounded bg-purple-50">
                <p className="text-sm text-gray-600">Teams (CSV)</p>
                <p className="text-2xl font-semibold text-purple-700">{csvSummary.total_teams_from_csv}</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects per Department Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Projects per Department</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Status Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Project Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          {stats && stats.upcoming_events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.upcoming_events.map((event, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">{event.event}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {format(new Date(event.date), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No upcoming events</p>
          )}
        </div>
      </div>
    </Layout>
  )
}

