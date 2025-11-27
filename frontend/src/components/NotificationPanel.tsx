import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import { api } from '../lib/api'
import { HiX, HiBell } from 'react-icons/hi'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-toastify'

interface Announcement {
  id: string
  title: string
  message: string
  audience: string
  created_at: string
}

interface Notification {
  _id: string
  user_id: string
  message: string
  notif_type: string
  related_id?: string
  read: boolean
  created_at: string
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  onMarkAllRead: () => void
}

export default function NotificationPanel({ isOpen, onClose, onMarkAllRead }: NotificationPanelProps) {
  const { user } = useSelector((state: RootState) => state.auth)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [announcementsRes, notificationsRes] = await Promise.all([
        api.get('/announcements/'),
        api.get('/notifications/')
      ])

      setAnnouncements(announcementsRes.data)
      setNotifications(notificationsRes.data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read')
      onMarkAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark notifications as read')
    }
  }

  const handleMarkRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/read/${notificationId}`)
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      )
      onMarkAllRead()
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'students': return 'bg-blue-100 text-blue-800'
      case 'mentors': return 'bg-green-100 text-green-800'
      case 'all': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'students': return '🎓'
      case 'mentors': return '👔'
      case 'all': return '📢'
      default: return '📢'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢'
      case 'deadline': return '⏰'
      case 'message': return '💬'
      case 'feedback': return '📝'
      default: return 'ℹ️'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'announcement': return 'bg-blue-100 text-blue-800'
      case 'deadline': return 'bg-red-100 text-red-800'
      case 'message': return 'bg-green-100 text-green-800'
      case 'feedback': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HiBell className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-blue-600 font-medium">
                ({unreadCount} new)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <HiX size={16} />
          </button>
        </div>

        <div className="px-4 py-2 border-b border-gray-100">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Loading notifications...
            </div>
          ) : [...notifications, ...announcements].length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications or announcements at this time.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Individual Notifications */}
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 transition-colors ${
                    !notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{getNotificationIcon(notification.notif_type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm leading-tight">
                        {notification.message}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getNotificationColor(notification.notif_type)}`}>
                          {getNotificationIcon(notification.notif_type)} {notification.notif_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkRead(notification._id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Announcements */}
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors border-t border-gray-100 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{getAudienceIcon(announcement.audience)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm leading-tight">
                        {announcement.title}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {announcement.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAudienceColor(announcement.audience)}`}>
                          {getAudienceIcon(announcement.audience)} {announcement.audience}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}