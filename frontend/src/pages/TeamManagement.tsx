import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'
import { HiUserAdd, HiX } from 'react-icons/hi'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'

export default function TeamManagement() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const currentUser = user

  useEffect(() => {
    fetchTeam()
  }, [])

  const fetchTeam = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get('/teams/', token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      if (response.data.length > 0) {
        setTeam(response.data[0])
        setMembers(response.data[0].members || [])
      } else {
        setTeam(null)
        setMembers([])
      }
    } catch (error) {
      toast.error('Failed to load team')
    }
  }

  const handleCreateTeam = async () => {
    if (!currentUser?.id) {
      toast.error('User not found. Please re-login.')
      return
    }
    try {
      const payload = {
        name: 'My Team',
        description: 'Student-created team',
        members: [currentUser.id],
      }
      const token = localStorage.getItem('token')
      const created = await api.post('/teams/', payload, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      toast.success('Team created')
      setTeam(created.data)
      setMembers(created.data.members || [])
    } catch (error) {
      toast.error('Failed to create team')
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail || members.length >= 4) {
      toast.error('Team is full or invalid email')
      return
    }

    try {
      // This would send an invitation
      toast.success('Invitation sent')
      setShowInviteModal(false)
      setInviteEmail('')
    } catch (error) {
      toast.error('Failed to send invitation')
    }
  }

  const handleRemoveMember = (memberId: string) => {
    // Remove member logic
    setMembers(members.filter((m) => m !== memberId))
    toast.success('Member removed')
  }

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-1">Manage your 4-member team</p>
        </div>

        {!team ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">You don't have a team yet</p>
            <button className="btn-primary" onClick={handleCreateTeam}>Create Team</button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{team.name}</h2>
              {members.length < 4 && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <HiUserAdd size={18} />
                  Invite Member
                </button>
              )}
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {members.map((memberId, idx) => (
                  <div key={idx} className="border rounded-lg p-4 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-xl">
                      {memberId.substring(0, 2).toUpperCase()}
                    </div>
                    <p className="font-medium mb-1">Member {idx + 1}</p>
                    <p className="text-sm text-gray-600 mb-3">{memberId}</p>
                    <button
                      onClick={() => handleRemoveMember(memberId)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <HiX size={16} className="inline" /> Remove
                    </button>
                  </div>
                ))}
                {members.length < 4 &&
                  Array.from({ length: 4 - members.length }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="border-2 border-dashed rounded-lg p-4 text-center flex items-center justify-center"
                    >
                      <p className="text-gray-400">Empty Slot</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="input-field"
                    placeholder="member@example.com"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleInviteMember} className="btn-primary flex-1">
                    Send Invitation
                  </button>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

