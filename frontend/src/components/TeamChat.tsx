import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { toast } from 'react-toastify'
import { HiPaperAirplane } from 'react-icons/hi'
import { format } from 'date-fns'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'

interface TeamChatProps {
  projectId: string
  teamId?: string
}

export default function TeamChat({ teamId }: TeamChatProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id)

  const isValidObjectId = (id: string | undefined): boolean => {
    if (!id || typeof id !== 'string') return false
    // MongoDB ObjectId is 24 hex characters
    return /^[0-9a-fA-F]{24}$/.test(id)
  }

  // Debug: Log teamId when component mounts or teamId changes
  useEffect(() => {
    console.log('TeamChat - teamId:', teamId, 'isValid:', teamId ? isValidObjectId(teamId) : false)
  }, [teamId])

  useEffect(() => {
    // Only fetch if teamId is valid
    if (teamId && isValidObjectId(teamId)) {
      fetchMessages()
      // Set up polling to fetch new messages every 3 seconds
      const interval = setInterval(() => {
        fetchMessages()
      }, 3000)
      
      return () => clearInterval(interval)
    } else {
      // Clear messages if teamId is invalid
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    // Validate teamId before making request
    if (!teamId || !isValidObjectId(teamId)) {
      setMessages([])
      return
    }
    
    try {
      const response = await api.get(`/chat/team/${teamId}`)
      const messages = response.data || []
      console.log('Fetched messages:', messages) // Debug log
      setMessages(messages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      // Log more details for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as { response?: { status?: number; data?: any } }
        console.error('Error response:', httpError.response?.status, httpError.response?.data)
        if (httpError.response?.status !== 400) {
          toast.error('Failed to load messages')
        }
      }
      setMessages([])
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !teamId || !isValidObjectId(teamId)) return;
    setLoading(true);
    try {
      const senderId = currentUserId || localStorage.getItem('userId');
      if (!senderId) throw new Error('User ID is missing');
      await api.post('/chat/', {
        team_id: teamId,
        sender_id: senderId,
        content: newMessage,
      });
      // Refresh messages after sending to get the latest
      await fetchMessages();
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[600px]">
      <div className="p-4 border-b">
        <h3 className="text-xl font-semibold">Team Chat</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!teamId || !isValidObjectId(teamId) ? (
          <div className="text-center text-gray-500 py-12">
            No team assigned to this project. Please contact your administrator.
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message, idx) => {
            const isCurrentUser = message.sender_id === currentUserId || message.sender_id === localStorage.getItem('userId');
            let displayTime = '';
            try {
              // Backend returns 'timestamp' field, not 'created_at'
              const timestamp = message.timestamp || message.created_at;
              if (timestamp) {
                displayTime = format(new Date(timestamp), 'HH:mm');
              }
            } catch {
              displayTime = '';
            }
            return (
              <div
                key={message.id || idx}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content || message.message}</p>
                  <p className={`text-xs mt-1 ${
                    isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {displayTime}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 input-field"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !newMessage.trim()} className="btn-primary">
          <HiPaperAirplane size={18} />
        </button>
      </form>
    </div>
  )
}

