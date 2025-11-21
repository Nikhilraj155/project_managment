import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'
import { format } from 'date-fns'

interface Presentation {
  id: string
  team_id: string
  project_id: string
  round_number: number
  date: string
  status?: string
  team?: any
  project?: any
}

interface FileItem {
  id: string
  filename: string
  uploaded_at?: string
  content_type?: string
}

interface StudentFeedbackItem {
  id: string
  student_name: string
  enrollment_number: string
  email: string
  feedback_text: string
  rating: number
  created_at: string
}

interface ProjectIdeaItem {
  id: string
  student_name: string
  mobile_number: string
  email: string
  idea1: string
  idea2?: string
  idea3?: string
  created_at: string
}

export default function PanelDashboard() {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const [loading, setLoading] = useState(true)
  const [selectedRound, setSelectedRound] = useState<number | null>(null)
  const [seeHistory, setSeeHistory] = useState(false)
  const [presentationsWithFiles, setPresentationsWithFiles] = useState<(Presentation & { file_list?: FileItem[], project_title?: string, team_name?: string, team_members?: {id:string,name:string}[] })[]>([])
  const [studentFeedback, setStudentFeedback] = useState<StudentFeedbackItem[]>([])
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdeaItem[]>([])
  const [generatingLink, setGeneratingLink] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL as string) || window.location.origin

  useEffect(() => {
    fetchPresentations()
    fetchStudentFeedback()
    fetchProjectIdeas()
  }, [seeHistory, selectedRound])

  const fetchPresentations = async () => {
    setLoading(true)
    try {
      const response = await api.get('/presentations/assigned_full');
      let data = response.data as (Presentation & { file_list?: FileItem[] })[]
      // Filter for selected round if set
      if (selectedRound) {
        data = data.filter(p => p.round_number === selectedRound)
      }
      // Optionally—fetch team/project info for presentation rows via batch request if needed
      setPresentationsWithFiles(data)
    } catch (error) {
      toast.error('Failed to load assigned presentations')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentFeedback = async () => {
    try {
      const res = await api.get('/student-feedback/all')
      setStudentFeedback(res.data)
    } catch (e) {
      // silent
    }
  }

  const fetchProjectIdeas = async () => {
    try {
      const res = await api.get('/project-ideas')
      setProjectIdeas(res.data)
    } catch (e) {
      // silent
    }
  }

  const generateIdeaLink = async () => {
    setGeneratingLink(true)
    try {
      // In a real flow, pick a specific project/team context; here we generate a general link
      const res = await api.post('/project-ideas/generate-link', {})
      const token = res.data.token
      const url = `${FRONTEND_URL}/ideas/submit/${token}`
      setGeneratedLink(url)
      toast.success('Sharable link generated')
    } catch (e) {
      toast.error('Failed to generate link')
    } finally {
      setGeneratingLink(false)
    }
  }

  const copyGeneratedLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Panel Faculty Interface <span role="img" aria-label="panel">👨‍💼</span>
          </h1>
          <p className="text-gray-600 mt-1">
            {seeHistory
              ? 'View the grades and feedback you have given.'
              : 'List of all assigned presentations to you for evaluation.'}
          </p>
        </div>

        <div className="flex gap-3 pb-4">
          <button className={`btn ${!seeHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={()=>setSeeHistory(false)}>
            Assigned Presentations
          </button>
          <button className={`btn ${seeHistory ? 'btn-primary' : 'btn-secondary'}`} onClick={()=>setSeeHistory(true)}>
            Feedback History
          </button>
        </div>

        {!seeHistory && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex gap-2 mb-4">
              {[1, 2, 3].map((round) => (
                <button
                  key={round}
                  onClick={() => setSelectedRound(round)}
                  className={`px-4 py-2 rounded ${selectedRound === round ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Round {round}
                </button>
              ))}
              <button onClick={() => setSelectedRound(null)} className="ml-2 px-2 py-2 text-xs rounded bg-gray-200">Clear Filter</button>
            </div>
            {loading ? (
              <p>Loading...</p>
            ) : presentationsWithFiles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No assigned presentations for this round.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presentationsWithFiles.map((presentation) => (
                  <div
                    key={presentation.id}
                    className="border rounded-lg p-4 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{presentation.team_name || presentation.team_id}</h3>
                      <span
                        className={`px-2 py-1 rounded text-xs ${presentation.status === 'evaluated' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                      >
                        {presentation.status || 'Pending Evaluation'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Project: {presentation.project_title || presentation.project_id}<br/>
                      Date: {format(new Date(presentation.date), 'MMM dd, yyyy HH:mm')}
                    </p>
                    {presentation.team_members && presentation.team_members.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">Members: {presentation.team_members.map(m=>m.name).join(', ')}</p>
                    )}
                    {presentation.file_list && presentation.file_list.length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-sm font-medium mb-2">Uploaded Files</p>
                        <ul className="space-y-1">
                          {presentation.file_list.map(f => (
                            <li key={f.id} className="text-sm text-gray-700 flex items-center justify-between">
                              <span>{f.filename}</span>
                              <span className="text-gray-500">{f.uploaded_at ? format(new Date(f.uploaded_at), 'MMM dd, yyyy HH:mm') : ''}</span>
                              <a className="text-blue-600 ml-3" href={`${api.defaults.baseURL}/presentations/public/file/${f.id}`} target="_blank" rel="noreferrer">Download</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      {presentation.status === 'evaluated' ? (
                        <button
                          onClick={() => navigate(`/panel/presentation/${presentation.id}`)}
                          className="btn-secondary flex-1"
                        >
                          View Feedback
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/panel/evaluate/${presentation.id}`)}
                          className="btn-primary flex-1"
                        >
                          Evaluate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {seeHistory && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Student Feedback</h2>
            {studentFeedback.length === 0 ? (
              <p className="text-gray-600">No student feedback submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {studentFeedback.map(fb => (
                  <div key={fb.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{fb.student_name} ({fb.enrollment_number})</p>
                        <p className="text-xs text-gray-500">{fb.email}</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-sm">Rating: {fb.rating}/5</span>
                    </div>
                    <p className="text-gray-700 mt-2 text-sm">{fb.feedback_text}</p>
                    <p className="text-gray-400 text-xs mt-1">{format(new Date(fb.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Project Details: Project Ideas - Only show when not viewing feedback history */}
        {!seeHistory && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Project Details: Submitted Project Ideas</h2>
              <button className="btn-primary" onClick={generateIdeaLink} disabled={generatingLink}>
                {generatingLink ? 'Generating...' : 'Generate Form Link'}
              </button>
            </div>
            {generatedLink && (
              <div className="mb-4 text-sm text-gray-600 break-all flex items-center gap-2">
                <span>Link:</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{generatedLink}</span>
                <button className="btn-secondary" onClick={copyGeneratedLink}>Copy</button>
              </div>
            )}
            {projectIdeas.length === 0 ? (
              <p className="text-gray-600">No project idea forms submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {projectIdeas.map(idea => (
                  <div key={idea.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{idea.student_name}</p>
                        <p className="text-xs text-gray-500">{idea.email} • {idea.mobile_number}</p>
                      </div>
                      <span className="text-xs text-gray-400">{format(new Date(idea.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <ul className="mt-2 list-disc list-inside text-sm text-gray-700 space-y-1">
                      <li>{idea.idea1}</li>
                      {idea.idea2 && <li>{idea.idea2}</li>}
                      {idea.idea3 && <li>{idea.idea3}</li>}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

