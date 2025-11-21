import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import Layout from '../components/Layout'
import { getSidebarItemsForRole } from '../config/sidebarConfig'
import { toast } from 'react-toastify'

export default function StudentCommunication() {
  const { user } = useSelector((state: RootState) => state.auth)

  const sidebarItems = getSidebarItemsForRole(user?.role)

  return (
    <Layout sidebarItems={sidebarItems}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communication</h1>
          <p className="text-gray-600 mt-1">Communication features are currently under development.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-4.082-.98L2 17l1.339-3.133.823-.622C2.466 12.125 2 11.094 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2v-2zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chat Feature Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              The chat functionality is currently being developed and will be available in a future update.
            </p>
            <button
              className="btn-primary"
              onClick={() => toast.info('Chat feature will be available soon!')}
            >
              Notify Me When Available
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}