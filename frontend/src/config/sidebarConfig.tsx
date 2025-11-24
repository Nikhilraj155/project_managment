import type { ReactNode } from 'react'
import { HiHome, HiFolder, HiUsers, HiPresentationChartBar, HiAcademicCap, HiFolderOpen, HiSpeakerphone, HiChartBar, HiClipboardCheck } from 'react-icons/hi'

export interface SidebarItem {
  path: string
  label: string
  icon: ReactNode
}

// Student sidebar configuration - consistent across all student pages
export const studentSidebarItems: SidebarItem[] = [
  { path: '/student', label: 'Dashboard', icon: <HiHome size={20} /> },
  { path: '/student/projects', label: 'My Projects', icon: <HiFolder size={20} /> },
  { path: '/student/team', label: 'My Team', icon: <HiUsers size={20} /> },
]

// Admin sidebar configuration - consistent across all admin pages
export const adminSidebarItems: SidebarItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <HiHome size={20} /> },
  { path: '/admin/students', label: 'Manage Students', icon: <HiUsers size={20} /> },
  { path: '/admin/mentors', label: 'Manage Faculty / Mentors', icon: <HiAcademicCap size={20} /> },
  { path: '/admin/allocations', label: 'Allocations', icon: <HiFolderOpen size={20} /> },
  { path: '/admin/presentations', label: 'Presentations', icon: <HiPresentationChartBar size={20} /> },
  { path: '/admin/announcements', label: 'Announcements', icon: <HiSpeakerphone size={20} /> },
  { path: '/admin/reports', label: 'Reports', icon: <HiChartBar size={20} /> },
]

// Mentor sidebar configuration
export const mentorSidebarItems: SidebarItem[] = [
  { path: '/mentor', label: 'Dashboard', icon: <HiHome size={20} /> },
]

// Panel sidebar configuration
export const panelSidebarItems: SidebarItem[] = [
  { path: '/panel', label: 'Dashboard', icon: <HiHome size={20} /> },
  { path: '/panel/presentations', label: 'Assigned Presentations', icon: <HiClipboardCheck size={20} /> },
]

/**
 * Get sidebar items based on user role
 * This ensures consistent sidebar across all pages for the same role
 */
export function getSidebarItemsForRole(role: string | undefined): SidebarItem[] {
  switch (role) {
    case 'student':
      return studentSidebarItems
    case 'admin':
      return adminSidebarItems
    case 'mentor':
    case 'faculty':
      return mentorSidebarItems
    case 'panel':
      return panelSidebarItems
    default:
      return []
  }
}

