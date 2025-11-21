import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from 'react-toastify'

export default function StudentProjectsRedirect() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAndRedirect = async () => {
      try {
        const response = await api.get('/projects/all')
        const projects = response.data
        
        if (projects.length === 0) {
          toast.info('No projects assigned yet.')
          navigate('/student')
          return
        }
        
        // Navigate to the first project
        navigate(`/student/project/${projects[0].id}`)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        toast.error('Failed to load projects')
        navigate('/student')
      } finally {
        setLoading(false)
      }
    }

    fetchAndRedirect()
  }, [navigate])

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return null
}

