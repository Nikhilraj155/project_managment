import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'

interface Presentation {
  id: string
  team_id: string
  project_id: string
  round_number: number
  date: string
  file_ids?: string[]
}

export default function PresentationsPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [presentations, setPresentations] = useState<Presentation[]>([])

  useEffect(() => {
    api.get('/presentations/all').then(res => setPresentations(res.data))
  }, [])

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Presentations</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentations.map(p => (
              <div key={p.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Team: {p.team_id}</div>
                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">Round {p.round_number}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">Project: {p.project_id}</div>
                <div className="text-sm text-gray-600">Date: {new Date(p.date).toLocaleString()}</div>
              </div>
            ))}
            {presentations.length === 0 && <div className="text-gray-500">No presentations.</div>}
          </div>
        </div>
      </div>
    </Layout>
  )
}


