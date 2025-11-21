import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const role = localStorage.getItem('userRole') || 'student'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Project Management System
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-700">Your role: <span className="font-semibold">{role}</span></p>
          <p className="text-gray-600 mt-2">Dashboard content coming soon...</p>
        </div>
      </div>
    </div>
  )
}

