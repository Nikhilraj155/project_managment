import { useEffect, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { format } from 'date-fns'
import { toast } from 'react-toastify'

interface Message {
  id: string
  sender_id: string
  sender_name?: string
  content: string
  timestamp: string
  student_id?: string
  mentor_id?: string
}

export default function MentorCommunication() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = user?.id

  useEffect(() => {
    fetchMessages()
    fetchStudents()
    // Set up polling to fetch new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchStudents = async () => {
    try {
      if (!currentUserId) return
      
      // Get teams where this mentor is assigned
      const teamsResponse = await api.get('/teams/')
      const mentorTeams = teamsResponse.data.filter((team: any) => team.mentor_id === currentUserId)
      
      // Get all student IDs from these teams
      const studentIds = new Set<string>()
      mentorTeams.forEach((team: any) => {
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach((memberId: string) => studentIds.add(memberId))
        }
      })
      
      if (studentIds.size === 0) {
        setStudents([])
        return
      }
      
      // Get student details
      const allUsers = await api.get('/users/', { params: { role: 'student' } })
      const studentList = allUsers.data.filter((u: any) => studentIds.has(u.id))
      setStudents(studentList)
      
      // Auto-select first student if available
      if (studentList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentList[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await api.get('/chat/mentor')
      let allMessages = response.data || []
      
      // Filter by selected student if one is selected
      if (selectedStudentId) {
        allMessages = allMessages.filter((msg: Message) => 
          msg.student_id === selectedStudentId || msg.sender_id === selectedStudentId
        )
      }
      
      setMessages(allMessages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return
    
    if (!selectedStudentId) {
      toast.error('Please select a student to send a message')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/chat/', {
        sender_id: currentUserId,
        content: newMessage,
        mentor_id: currentUserId,
        student_id: selectedStudentId,
      })
      await fetchMessages()
      setNewMessage('')
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-600 mt-1">Chat with your assigned students</p>
        </div>

        <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '700px' }}>
          {/* Student Selection */}
          {students.length > 0 && (
            <div className="p-4 border-b">
              <label className="block text-sm font-medium mb-2">Select Student:</label>
              <select
                className="input-field"
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.username} ({student.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {selectedStudentId 
                  ? 'No messages yet. Start the conversation!'
                  : 'Select a student to view messages'}
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUserId
                let displayTime = ''
                try {
                  const timestamp = message.timestamp
                  if (timestamp) {
                    displayTime = format(new Date(timestamp), 'MMM dd, HH:mm')
                  }
                } catch {
                  displayTime = ''
                }
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-semibold mb-1 text-gray-600">
                          {message.sender_name || 'Student'}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {displayTime}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {selectedStudentId && (
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 input-field"
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !newMessage.trim()}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}

