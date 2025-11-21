import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'

interface UserItem {
  id: string
  username: string
  email: string
  mentor_id?: string
}

export default function ManageStudents() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [students, setStudents] = useState<UserItem[]>([])
  const [mentors, setMentors] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [s, m] = await Promise.all([
        api.get('/users/', { params: { role: 'student' } }),
        api.get('/users/', { params: { role: 'mentor' } })
      ])
      setStudents(s.data)
      setMentors(m.data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const assignMentor = async (studentId: string, mentorId: string) => {
    try {
      await api.put(`/users/${studentId}/assign-mentor`, null, { params: { mentor_id: mentorId } })
      toast.success('Mentor assigned')
      await load()
    } catch {
      toast.error('Failed to assign mentor')
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Student</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Assigned Mentor</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="py-3 px-4">{s.username}</td>
                      <td className="py-3 px-4 text-gray-600">{s.email}</td>
                      <td className="py-3 px-4">
                        <select
                          className="input-field"
                          value={s.mentor_id || ''}
                          onChange={(e) => assignMentor(s.id, e.target.value)}
                        >
                          <option value="">-- Assign Mentor --</option>
                          {mentors.map((m) => (
                            <option key={m.id} value={m.id}>{m.username} ({m.email})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}


