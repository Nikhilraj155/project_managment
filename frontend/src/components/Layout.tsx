import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import { logout } from '../store/authSlice'
import { HiBell, HiSearch, HiUser, HiLogout, HiMenu, HiX, HiAcademicCap } from 'react-icons/hi'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import NotificationPanel from './NotificationPanel'

interface LayoutProps {
  children: ReactNode
  sidebarItems: { path: string; label: string; icon: ReactNode }[]
}

export default function Layout({ children, sidebarItems }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const { user } = useSelector((state: RootState) => state.auth)

  // Fetch unread count when component mounts and when notification panel opens/closes
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count')
      setUnreadCount(response.data.unread_count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  const handleNotificationPanelToggle = () => {
    setNotificationPanelOpen(!notificationPanelOpen)
    if (!notificationPanelOpen) {
      // When opening the panel, fetch fresh data
      fetchUnreadCount()
    }
  }

  const handleMarkAllRead = () => {
    setUnreadCount(0)
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`bg-white shadow-lg transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-blue-600">Project Management</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            {sidebarOpen ? <HiX size={20} /> : <HiMenu size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-blue-50 text-gray-700'
                }`}
              >
                {item.icon}
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <HiAcademicCap className="text-white" size={24} />
                </div>
                <h1 className="text-lg font-semibold text-gray-800">
                  College Project Management System
                </h1>
              </div>

              {/* Search Bar - Center */}
              <div className="flex-1 max-w-2xl mx-8">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Right Side Icons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handleNotificationPanelToggle}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <HiBell size={22} className="text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg p-2">
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      <HiUser size={20} />
                    </div>
                    {user && (
                      <span className="text-sm font-medium text-gray-700">{user.username}</span>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <HiLogout size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  )
}

