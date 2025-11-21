import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'

interface UserItem {
  id: string
  username: string
  email: string
}

export default function ManageFaculty() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [mentors, setMentors] = useState<UserItem[]>([])
  const [panels, setPanels] = useState<UserItem[]>([])

  useEffect(() => {
    Promise.all([
      api.get('/users/', { params: { role: 'mentor' } }),
      api.get('/users/', { params: { role: 'panel' } })
    ]).then(([m, p]) => {
      setMentors(m.data)
      setPanels(p.data)
    })
  }, [])

  const sidebarItems = getSidebarItemsForRole(user?.role)

  const renderList = (title: string, list: UserItem[]) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <ul className="divide-y">
        {list.map(u => (
          <li key={u.id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium">{u.username}</p>
              <p className="text-sm text-gray-600">{u.email}</p>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="py-3 text-gray-500">No users</li>}
      </ul>
    </div>
  )

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Faculty / Mentors</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {renderList('Mentors', mentors)}
          {renderList('Panel Members', panels)}
        </div>
      </div>
    </Layout>
  )
}


