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
  const [csvSummary, setCsvSummary] = useState<{
    total_students_from_csv: number;
    total_guides_from_csv: number;
    total_teams_from_csv: number;
    file_type_breakdown?: { CSV?: number; Excel?: number };
    excel_sheets_processed?: number;
  } | null>(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [deletingBatch, setDeletingBatch] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
    fetchCsvSummary()
    fetchBatches()
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
    } catch {
      // Fallback to old format if new fields aren't available
      setCsvSummary({
        total_students_from_csv: 0,
        total_guides_from_csv: 0,
        total_teams_from_csv: 0
      })
    }
  }

  const fetchBatches = async () => {
    try {
      const res = await api.get('/csv/batches')
      setBatches(res.data || [])
    } catch {
      setBatches([])
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    // Validate file type
    const allowedTypes = ['.csv', '.xlsx', '.xls']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExtension || '')) {
      toast.error('Unsupported file type. Please upload CSV or Excel files (.csv, .xlsx, .xls)')
      return
    }

    const form = new FormData()
    form.append('file', file)
    setCsvUploading(true)
    try {
      // Let Axios set the correct multipart boundary automatically
      const response = await api.post('/csv/upload', form)
      await fetchCsvSummary()
      await fetchBatches() // Refresh the batches list

      // Show success message with details
      const { inserted, file_type, sheets_processed } = response.data
      toast.success(`${file_type} file uploaded successfully: ${inserted} records processed${sheets_processed ? ` from ${sheets_processed} sheets` : ''}`)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'File upload failed'
      toast.error(detail)
    } finally {
      setCsvUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteBatch = async (batchId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete all records from "${fileName}"? This action cannot be undone.`)) {
      return
    }

    setDeletingBatch(batchId)
    try {
      const response = await api.delete(`/csv/batch/${batchId}`)
      await fetchCsvSummary()
      await fetchBatches() // Refresh the batches list
      toast.success(`${response.data.message}`)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to delete batch'
      toast.error(detail)
    } finally {
      setDeletingBatch(null)
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
            <h2 className="text-xl font-semibold">Upload Allocation File (CSV/Excel)</h2>
            <label className="btn-primary cursor-pointer">
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleCsvUpload} />
              {csvUploading ? 'Uploading...' : 'Upload File'}
            </label>
          </div>
          {csvSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-blue-50">
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-2xl font-semibold text-blue-700">{csvSummary.total_students_from_csv}</p>
                </div>
                <div className="p-4 rounded bg-green-50">
                  <p className="text-sm text-gray-600">Guides</p>
                  <p className="text-2xl font-semibold text-green-700">{csvSummary.total_guides_from_csv}</p>
                </div>
                <div className="p-4 rounded bg-purple-50">
                  <p className="text-sm text-gray-600">Teams</p>
                  <p className="text-2xl font-semibold text-purple-700">{csvSummary.total_teams_from_csv}</p>
                </div>
              </div>

              {/* File Type Breakdown */}
              {csvSummary.file_type_breakdown && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">File Upload Statistics:</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-blue-600">
                      CSV: {csvSummary.file_type_breakdown.CSV || 0} records
                    </span>
                    <span className="text-green-600">
                      Excel: {csvSummary.file_type_breakdown.Excel || 0} records
                    </span>
                    {csvSummary.excel_sheets_processed && csvSummary.excel_sheets_processed > 0 && (
                      <span className="text-purple-600">
                        Sheets: {csvSummary.excel_sheets_processed}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Uploaded Files / Batches Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Uploaded Allocation Files</h2>
          {batches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No allocation files have been uploaded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">File Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Records</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Groups</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Students</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Upload Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batches.map((batch) => {
                    const uploadDate = batch.uploaded_at ? new Date(batch.uploaded_at).toLocaleString() : 'Unknown'
                    const fileName = batch.file_type === 'Excel'
                      ? `Excel File (${batch.sheets} sheets)`
                      : 'CSV File'

                    return (
                      <tr key={batch.batch_id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{fileName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            batch.file_type === 'Excel'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {batch.file_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{batch.records}</td>
                        <td className="py-3 px-4 text-gray-700">{batch.groups}</td>
                        <td className="py-3 px-4 text-gray-700">{batch.students}</td>
                        <td className="py-3 px-4 text-gray-700">{uploadDate}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteBatch(batch.batch_id, fileName)}
                            disabled={deletingBatch === batch.batch_id}
                            className="btn-danger inline-flex items-center gap-2 text-sm"
                          >
                            {deletingBatch === batch.batch_id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Deleting...
                              </>
                            ) : (
                              'Delete'
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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

