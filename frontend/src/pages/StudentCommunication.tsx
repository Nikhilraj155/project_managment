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

export default function StudentCommunication() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [mentor, setMentor] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = user?.id

  useEffect(() => {
    fetchMentor()
    fetchMessages()
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

  const fetchMentor = async () => {
    try {
      if (!currentUserId) return
      
      // Try to get mentor from team first (most reliable)
      const teamsResponse = await api.get('/teams/')
      const studentTeam = teamsResponse.data.find((team: any) => 
        team.members && Array.isArray(team.members) && team.members.includes(currentUserId)
      )
      
      if (studentTeam?.mentor_id) {
        try {
          const mentorResponse = await api.get(`/users/${studentTeam.mentor_id}`)
          setMentor(mentorResponse.data)
          return
        } catch (error) {
          console.error('Failed to fetch mentor details:', error)
        }
      }
      
      // Try to get mentor from user record as fallback
      try {
        const userResponse = await api.get(`/users/${currentUserId}`)
        if (userResponse.data?.mentor_id) {
          const mentorResponse = await api.get(`/users/${userResponse.data.mentor_id}`)
          setMentor(mentorResponse.data)
        }
      } catch (error) {
        console.error('Failed to fetch user or mentor:', error)
      }
    } catch (error) {
      console.error('Failed to fetch mentor:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await api.get('/chat/student')
      setMessages(response.data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return
    
    if (!mentor) {
      toast.error('No mentor assigned. Please contact admin.')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/chat/', {
        sender_id: currentUserId,
        content: newMessage,
        mentor_id: mentor.id,
        student_id: currentUserId,
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
          <h1 className="text-3xl font-bold text-gray-900">Mentor Chat</h1>
          <p className="text-gray-600 mt-1">
            {mentor 
              ? `Chat with your mentor: ${mentor.username || mentor.email}`
              : 'No mentor assigned. Please contact admin.'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '700px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {mentor 
                  ? 'No messages yet. Start the conversation!'
                  : 'Waiting for mentor assignment...'}
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
                          {message.sender_name || 'Mentor'}
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
          {mentor && (
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

