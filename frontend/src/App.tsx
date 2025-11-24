import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import StudentProjectsRedirect from './pages/StudentProjectsRedirect'
import ProjectDetails from './pages/ProjectDetails'
import MentorDashboard from './pages/MentorDashboard'
import MentorTeamOverview from './pages/MentorTeamOverview'
import PanelDashboard from './pages/PanelDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ManageStudents from './pages/ManageStudents'
import ManageFaculty from './pages/ManageFaculty'
import PresentationsPage from './pages/PresentationsPage'
import AnnouncementsPage from './pages/AnnouncementsPage'
import ReportsPage from './pages/ReportsPage'
import EvaluationForm from './pages/EvaluationForm'
import TeamManagement from './pages/TeamManagement'
import ProtectedRoute from './components/ProtectedRoute'
import PublicProjectIdea from './pages/PublicProjectIdea'
import AllocationsPage from './pages/AllocationsPage'
import AuthWrapper from './components/AuthWrapper'

function App() {
  return (
    <AuthWrapper>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/projects" element={<ProtectedRoute><StudentProjectsRedirect /></ProtectedRoute>} />
        <Route path="/student/project/:projectId" element={<ProtectedRoute><ProjectDetails /></ProtectedRoute>} />
        <Route path="/student/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
        <Route path="/student/presentations" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/calendar" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />

        {/* Mentor Routes */}
        <Route path="/mentor" element={<ProtectedRoute><MentorDashboard /></ProtectedRoute>} />
        <Route path="/mentor/team/:teamId" element={<ProtectedRoute><MentorTeamOverview /></ProtectedRoute>} />

        {/* Panel Routes */}
        <Route path="/panel" element={<ProtectedRoute><PanelDashboard /></ProtectedRoute>} />
        <Route path="/panel/presentations" element={<ProtectedRoute><PanelDashboard /></ProtectedRoute>} />
        <Route path="/panel/history" element={<ProtectedRoute><PanelDashboard /></ProtectedRoute>} />
        <Route path="/panel/evaluate/:presentationId" element={<ProtectedRoute><EvaluationForm /></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute><ManageStudents /></ProtectedRoute>} />
        <Route path="/admin/mentors" element={<ProtectedRoute><ManageFaculty /></ProtectedRoute>} />
        <Route path="/admin/allocations" element={<ProtectedRoute><AllocationsPage /></ProtectedRoute>} />
        {/* Removed Manage Teams route */}
        <Route path="/admin/presentations" element={<ProtectedRoute><PresentationsPage /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

        {/* Public routes */}
        <Route path="/ideas/submit/:token" element={<PublicProjectIdea />} />
      </Routes>
    </AuthWrapper>
  )
}

export default App
