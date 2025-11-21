import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'

interface AllocationRow {
  id: string
  batch_id?: string
  uploaded_by?: string
  uploaded_at?: string
  group_no?: string
  student_name?: string
  enrollment_no?: string
  guide_name?: string
  title_1?: string
  title_2?: string
  title_3?: string
  team_name?: string
  project_title?: string
}

type AllocationGroup = {
  group_no: string
  members: AllocationRow[]
  team_name?: string
  project_title?: string
  guide_name?: string
}

export default function AllocationsPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [rows, setRows] = useState<AllocationRow[]>([])
  const [groups, setGroups] = useState<AllocationGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newGroup, setNewGroup] = useState({
    group_no: '',
    team_name: '',
    project_title: '',
    guide_name: '',
    students: [
      { student_name: '', enrollment_no: '' },
      { student_name: '', enrollment_no: '' },
      { student_name: '', enrollment_no: '' },
      { student_name: '', enrollment_no: '' },
    ] as { student_name: string; enrollment_no: string }[],
  })

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }
      const r = await api.get('/csv/records', { params: { limit: 500 }, headers: { Authorization: `Bearer ${token}` } })
      const items: AllocationRow[] = r.data || []
      setRows(items)
      // Build groups by group_no; single inputs per team
      const byGroup: Record<string, AllocationGroup> = {}
      for (const it of items) {
        const g = it.group_no || 'UNASSIGNED'
        if (!byGroup[g]) {
          byGroup[g] = {
            group_no: g,
            members: [],
            team_name: it.team_name,
            project_title: it.project_title ?? it.title_1,
            guide_name: it.guide_name,
          }
        }
        byGroup[g].members.push(it)
        // Prefer non-empty values to seed the group inputs
        if (!byGroup[g].team_name && it.team_name) byGroup[g].team_name = it.team_name
        const proj = it.project_title ?? it.title_1
        if (!byGroup[g].project_title && proj) byGroup[g].project_title = proj
        if (!byGroup[g].guide_name && it.guide_name) byGroup[g].guide_name = it.guide_name
      }
      setGroups(Object.values(byGroup).sort((a,b)=>a.group_no.localeCompare(b.group_no)))
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to load allocations'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const createGroup = async () => {
    try {
      setCreating(true)
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }
      const payload = {
        group_no: newGroup.group_no.trim(),
        team_name: newGroup.team_name.trim(),
        project_title: newGroup.project_title.trim(),
        guide_name: newGroup.guide_name.trim(),
        students: newGroup.students
          .filter(s => s.student_name.trim() !== '')
          .map(s => ({ student_name: s.student_name.trim(), enrollment_no: s.enrollment_no.trim() })),
      }
      await api.post('/csv/groups', payload, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Group created')
      // Reset form
      setNewGroup({
        group_no: '', team_name: '', project_title: '', guide_name: '',
        students: [
          { student_name: '', enrollment_no: '' },
          { student_name: '', enrollment_no: '' },
          { student_name: '', enrollment_no: '' },
          { student_name: '', enrollment_no: '' },
        ],
      })
      await load()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to create group'
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const saveGroup = async (grp: AllocationGroup) => {
    try {
      setSavingGroup(grp.group_no)
      const token = localStorage.getItem('token')
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      // Apply same values to every member row in this group
      await Promise.all(grp.members.map(m => api.patch(`/csv/${m.id}`, {
        team_name: grp.team_name || '',
        project_title: grp.project_title ?? m.title_1 ?? '',
        guide_name: grp.guide_name || '',
        student_name: m.student_name || '',
        group_no: m.group_no || '',
      }, headers)))
      toast.success('Group saved')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Save failed'
      toast.error(msg)
    } finally {
      setSavingGroup(null)
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">CSV Allocations</h1>
          {loading && <span className="text-sm text-gray-500">Loading...</span>}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Group</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Group</label>
              <input className="input-field" value={newGroup.group_no} onChange={e=>setNewGroup({...newGroup, group_no: e.target.value})} placeholder="G65" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Team Name</label>
              <input className="input-field" value={newGroup.team_name} onChange={e=>setNewGroup({...newGroup, team_name: e.target.value})} placeholder="Team Phoenix" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Project Title</label>
              <input className="input-field" value={newGroup.project_title} onChange={e=>setNewGroup({...newGroup, project_title: e.target.value})} placeholder="Awesome Project" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Guide Name</label>
              <input className="input-field" value={newGroup.guide_name} onChange={e=>setNewGroup({...newGroup, guide_name: e.target.value})} placeholder="Dr. Mentor" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {newGroup.students.map((s, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input className="input-field" value={s.student_name} onChange={e=>{
                  const students = [...newGroup.students]; students[idx] = { ...students[idx], student_name: e.target.value }; setNewGroup({ ...newGroup, students })
                }} placeholder={`Student ${idx+1} name`} />
                <input className="input-field" value={s.enrollment_no} onChange={e=>{
                  const students = [...newGroup.students]; students[idx] = { ...students[idx], enrollment_no: e.target.value }; setNewGroup({ ...newGroup, students })
                }} placeholder={`Enrollment ${idx+1}`} />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button className="btn-primary" disabled={creating} onClick={createGroup}>
              {creating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Group</th>
                  <th className="text-left py-3 px-4">Students</th>
                  <th className="text-left py-3 px-4">Team Name</th>
                  <th className="text-left py-3 px-4">Project Title</th>
                  <th className="text-left py-3 px-4">Guide Name</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.group_no} className="border-b align-top">
                    <td className="py-3 px-4 font-medium">{g.group_no}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <div className="space-y-2">
                        {g.members.map(m => (
                          <div key={m.id} className="text-gray-700 space-y-1">
                            <div className="flex gap-2 items-center">
                              <input
                                className="input-field flex-1"
                                defaultValue={m.student_name || ''}
                                placeholder="Student name"
                                onBlur={(e) => (m.student_name = e.target.value)}
                              />
                              <input
                                className="input-field w-28"
                                defaultValue={m.group_no || g.group_no || ''}
                                placeholder="Group"
                                onBlur={(e) => (m.group_no = e.target.value)}
                              />
                            </div>
                            {m.enrollment_no && (
                              <div className="text-gray-400 text-xs">{m.enrollment_no}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        className="input-field"
                        defaultValue={g.team_name || ''}
                        onBlur={(e) => (g.team_name = e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        className="input-field"
                        defaultValue={g.project_title || ''}
                        onBlur={(e) => (g.project_title = e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        className="input-field"
                        defaultValue={g.guide_name || ''}
                        onBlur={(e) => (g.guide_name = e.target.value)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="btn-primary"
                        disabled={savingGroup === g.group_no}
                        onClick={() => saveGroup(g)}
                      >
                        {savingGroup === g.group_no ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
                {groups.length === 0 && !loading && (
                  <tr>
                    <td className="py-3 px-4 text-gray-500" colSpan={6}>
                      No allocation data found. Upload an allocation file (CSV or Excel) on the Admin dashboard.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}


