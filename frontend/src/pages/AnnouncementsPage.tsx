import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'

interface Announcement {
  id: string
  title: string
  message: string
  audience: string
  created_at: string
}

export default function AnnouncementsPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')

  const load = async () => {
    const res = await api.get('/announcements/')
    setItems(res.data)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    try {
      const response = await api.post('/announcements/', null, { params: { title, message, audience } })
      setTitle(''); setMessage('')
      await load()

      // Show success message with notification count
      const notificationCount = response.data.notification_count || 0
      toast.success(`Announcement posted! ${notificationCount} users notified.`)
    } catch (error) {
      console.error('Failed to post announcement:', error)
      toast.error('Failed to post announcement')
    }
  }

  const remove = async (id: string) => {
    await api.delete(`/announcements/${id}`)
    await load()
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input-field md:col-span-1" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
            <input className="input-field md:col-span-2" placeholder="Message" value={message} onChange={(e)=>setMessage(e.target.value)} />
            <select className="input-field" value={audience} onChange={(e)=>setAudience(e.target.value)}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="mentors">Mentors</option>
            </select>
          </div>
          <button className="btn-primary" onClick={create}>Post Announcement</button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Announcements</h2>
            <span className="text-sm text-gray-500">
              You are viewing announcements for: {user?.role === 'student' ? 'Students' : user?.role === 'mentor' ? 'Mentors' : user?.role}
            </span>
          </div>
          <ul className="divide-y">
            {items.map(a => (
              <li key={a.id} className="py-4 flex items-start justify-between">
                <div>
                  <div className="font-medium">{a.title} <span className="ml-2 text-xs px-2 py-1 bg-gray-100 rounded">{a.audience}</span></div>
                  <div className="text-gray-700 mt-1">{a.message}</div>
                  <div className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <button className="text-red-600" onClick={()=>remove(a.id)}>Delete</button>
              </li>
            ))}
            {items.length === 0 && <li className="py-3 text-gray-500">No announcements</li>}
          </ul>
        </div>
      </div>
    </Layout>
  )
}


