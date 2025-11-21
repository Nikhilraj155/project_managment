import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from 'react-toastify'

export default function PublicProjectIdea() {
  const { token } = useParams()
  const [valid, setValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    student_name: '',
    mobile_number: '',
    email: '',
    idea1: '',
    idea2: '',
    idea3: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get(`/public/project-ideas/${token}`)
        setValid(Boolean(res.data.valid))
      } catch (e) {
        setValid(false)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [token])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post(`/public/project-ideas/${token}`, form)
      toast.success('Project ideas submitted')
      setForm({ student_name: '', mobile_number: '', email: '', idea1: '', idea2: '', idea3: '' })
    } catch (e) {
      toast.error('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!valid) return <div className="flex items-center justify-center min-h-screen">Invalid or expired link.</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Project Idea Submission</h1>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-sm font-medium mb-1">Student Name</label>
          <input className="input-field" value={form.student_name} onChange={(e)=>setForm({...form, student_name: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mobile Number</label>
          <input className="input-field" value={form.mobile_number} onChange={(e)=>setForm({...form, mobile_number: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Project Idea 1</label>
          <input className="input-field" value={form.idea1} onChange={(e)=>setForm({...form, idea1: e.target.value})} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Project Idea 2</label>
          <input className="input-field" value={form.idea2} onChange={(e)=>setForm({...form, idea2: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Project Idea 3</label>
          <input className="input-field" value={form.idea3} onChange={(e)=>setForm({...form, idea3: e.target.value})} />
        </div>
        <div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
        </div>
      </form>
    </div>
  )
}
