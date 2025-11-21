import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'

interface Summary {
  totals: { students: number; mentors: number; teams: number; projects: number }
  per_mentor: { mentor_id: string; mentor_name: string; teams: number }[]
  project_status: { pending: number; active: number; completed: number }
}

export default function ReportsPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [data, setData] = useState<Summary | null>(null)

  useEffect(() => {
    api.get('/reports/summary').then(res => setData(res.data))
  }, [])

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.entries(data.totals).map(([k,v]) => (
                <div key={k} className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 capitalize">{k}</p>
                  <p className="text-3xl font-bold mt-2">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">Teams per Mentor</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Mentor</th>
                      <th className="text-left py-3 px-4">Teams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_mentor.map(row => (
                      <tr key={row.mentor_id} className="border-b">
                        <td className="py-3 px-4">{row.mentor_name}</td>
                        <td className="py-3 px-4">{row.teams}</td>
                      </tr>
                    ))}
                    {data.per_mentor.length === 0 && (
                      <tr><td className="py-3 px-4" colSpan={2}>No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}


