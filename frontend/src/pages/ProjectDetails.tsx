import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { HiFolder, HiDocumentText } from 'react-icons/hi'
import { HiPresentationChartBar, HiChartBar } from 'react-icons/hi2'
import { toast } from 'react-toastify'
import KanbanBoard from '../components/KanbanBoard'
import FileManager from '../components/FileManager'
import ProgressTracker from '../components/ProgressTracker'

export default function ProjectDetails() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [activeTab, setActiveTab] = useState('kanban')
  const [project, setProject] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [uploadingRound, setUploadingRound] = useState<number | null>(null)
  const [presentations, setPresentations] = useState<any[]>([])
  const [studentFeedback, setStudentFeedback] = useState({
    student_name: '',
    enrollment_number: '',
    email: '',
    feedback_text: '',
    rating: 5,
  })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)

  useEffect(() => {
    fetchProject()
    fetchTasks()
    fetchPresentations()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`)
      setProject(response.data)
      console.log('Project data:', response.data) // Debug: Check if team_id exists
    } catch (error) {
      toast.error('Failed to load project')
    }
  }

  const handleRoundUpload = async (round: number, file: File) => {
    if (!projectId || !project) return
    setUploadingRound(round)
    try {
      const formData = new FormData()
      formData.append('team_id', project.team_id || '')
      formData.append('project_id', projectId)
      formData.append('round_number', String(round))
      formData.append('date', new Date().toISOString())
      formData.append('file', file)
      await api.post('/presentations/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Round ${round} file uploaded successfully`)
      await fetchPresentations()
    } catch (e) {
      toast.error('Upload failed')
    } finally {
      setUploadingRound(null)
    }
  }

  const getPresentationForRound = (round: number) => {
    return presentations.find((p: any) => p.round_number === round)
  }

  const downloadFile = (fileId: string) => {
    window.open(`/api/presentations/file/${fileId}`, '_blank')
  }

  const submitStudentFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingFeedback(true)
    try {
      await api.post('/student-feedback/', {
        ...studentFeedback,
        project_id: projectId,
        team_id: project?.team_id,
      })
      toast.success('Feedback submitted')
      setStudentFeedback({ student_name: '', enrollment_number: '', email: '', feedback_text: '', rating: 5 })
    } catch (e) {
      toast.error('Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }


  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks/')
      // Filter tasks for this project
      const projectTasks = response.data.filter((task: any) => task.project_id === projectId)
      setTasks(projectTasks)
    } catch (error) {
      toast.error('Failed to load tasks')
    }
  }

  const fetchPresentations = async () => {
    if (!projectId) return
    try {
      const response = await api.get(`/presentations/project/${projectId}`)
      setPresentations(response.data || [])
    } catch (error) {
      console.error('Failed to load presentations:', error)
    }
  }

  const handleDeletePresentation = async (presentationId: string) => {
    if (!window.confirm('Are you sure you want to delete this presentation?')) return
    
    try {
      await api.delete(`/presentations/${presentationId}`)
      toast.success('Presentation deleted successfully')
      await fetchPresentations()
    } catch (error) {
      toast.error('Failed to delete presentation')
    }
  }

  const handleEditPresentation = async (round: number, file: File, presentationId: string) => {
    if (!projectId || !project) return
    setUploadingRound(round)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.put(`/presentations/${presentationId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`Round ${round} file updated successfully`)
      await fetchPresentations()
    } catch (e) {
      toast.error('Update failed')
    } finally {
      setUploadingRound(null)
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  const tabs = [
    { id: 'kanban', label: 'Kanban Board', icon: <HiFolder size={18} /> },
    { id: 'files', label: 'Files', icon: <HiDocumentText size={18} /> },
    { id: 'progress', label: 'Progress', icon: <HiChartBar size={18} /> },
    { id: 'presentations', label: 'Presentations', icon: <HiPresentationChartBar size={18} /> },
    { id: 'feedback', label: 'Feedback', icon: <HiPresentationChartBar size={18} /> },
  ]

  if (!project) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <button onClick={() => navigate('/student')} className="text-blue-600 mb-4">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-gray-600 mt-1">{project.description || 'No description'}</p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-medium'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'kanban' && (
            <KanbanBoard projectId={projectId!} tasks={tasks} onTasksChange={setTasks} />
          )}
          {activeTab === 'files' && <FileManager projectId={projectId!} />}
          {activeTab === 'progress' && <ProgressTracker projectId={projectId!} tasks={tasks} />}
          {activeTab === 'presentations' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Presentation Rounds</h3>
              <div className="space-y-4">
                {[1,2,3].map((round) => {
                  const presentation = getPresentationForRound(round)
                  const hasUpload = !!presentation && presentation.file_list && presentation.file_list.length > 0
                  const file = hasUpload ? presentation.file_list[0] : null
                  
                  return (
                    <div key={round} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <p className="font-medium text-lg">Round {round}</p>
                          {hasUpload && (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              ✓ Uploaded
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {hasUpload && file && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <HiDocumentText size={20} className="text-blue-600" />
                              <span className="font-medium text-gray-700">{file.filename}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => downloadFile(file.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                View/Download
                              </button>
                            </div>
                          </div>
                          {file.uploaded_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {hasUpload ? (
                          <>
                            <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="file"
                                accept=".ppt,.pptx"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0]
                                  if (f && presentation) {
                                    handleEditPresentation(round, f, presentation.id)
                                  }
                                }}
                                disabled={uploadingRound !== null}
                              />
                              {uploadingRound === round ? 'Updating...' : 'Edit/Replace'}
                            </label>
                            <button
                              onClick={() => handleDeletePresentation(presentation.id)}
                              className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={uploadingRound !== null}
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="file"
                              accept=".ppt,.pptx"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleRoundUpload(round, f)
                              }}
                              disabled={uploadingRound !== null}
                            />
                            {uploadingRound === round ? 'Uploading...' : 'Upload PPT'}
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Student Feedback</h3>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitStudentFeedback}>
                <div>
                  <label className="block text-sm font-medium mb-1">Student Name</label>
                  <input className="input-field" value={studentFeedback.student_name} onChange={(e)=>setStudentFeedback({...studentFeedback, student_name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Enrollment Number</label>
                  <input className="input-field" value={studentFeedback.enrollment_number} onChange={(e)=>setStudentFeedback({...studentFeedback, enrollment_number: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="input-field" value={studentFeedback.email} onChange={(e)=>setStudentFeedback({...studentFeedback, email: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rating (1-5)</label>
                  <input type="number" min={1} max={5} className="input-field" value={studentFeedback.rating} onChange={(e)=>setStudentFeedback({...studentFeedback, rating: parseInt(e.target.value||'5')})} required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Feedback</label>
                  <textarea className="input-field" rows={4} value={studentFeedback.feedback_text} onChange={(e)=>setStudentFeedback({...studentFeedback, feedback_text: e.target.value})} required />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="btn-primary" disabled={submittingFeedback}>{submittingFeedback ? 'Submitting...' : 'Submit Feedback'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

