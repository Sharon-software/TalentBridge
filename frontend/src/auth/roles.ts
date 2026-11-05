import {
  Award,
  Bookmark,
  BookOpenCheck,
  BriefcaseBusiness,
  FileUser,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Search,
  Share2,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '../api/types'

export type AppRole = UserRole | 'EXTERNAL_TUTOR'

export const roleSlugs: Record<AppRole, string> = {
  STUDENT: 'student',
  COACH: 'coach',
  MENTOR: 'mentor',
  EXTERNAL_TUTOR: 'external-tutor',
  EXTERNAL_MENTOR: 'external-mentor',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
  EMPLOYER: 'employer',
}

export const roleLabels: Record<AppRole, string> = {
  STUDENT: 'Student',
  COACH: 'Coach',
  MENTOR: 'Mentor',
  EXTERNAL_TUTOR: 'External Tutor',
  EXTERNAL_MENTOR: 'External Mentor',
  RECRUITER: 'Recruiter',
  ADMIN: 'Admin',
  EMPLOYER: 'Employer',
}

export const roleHomeSections: Record<AppRole, string> = {
  STUDENT: 'dashboard',
  COACH: 'talent',
  MENTOR: 'talent',
  EXTERNAL_TUTOR: 'dashboard',
  EXTERNAL_MENTOR: 'dashboard',
  RECRUITER: 'talent',
  ADMIN: 'dashboard',
  EMPLOYER: 'dashboard',
}

export function roleHomePath(role: AppRole): string {
  return `/${roleSlugs[role]}/${roleHomeSections[role]}`
}

export interface NavigationItem {
  label: string
  section: string
  icon: LucideIcon
}

const dashboard: NavigationItem = { label: 'Dashboard', section: 'dashboard', icon: LayoutDashboard }

export const roleNavigation: Record<AppRole, NavigationItem[]> = {
  STUDENT: [
    dashboard,
    { label: 'Submit work', section: 'assignments', icon: BookOpenCheck },
    { label: 'My CV', section: 'cv', icon: FileUser },
    { label: 'Recommendations', section: 'recommendations', icon: Award },
    { label: 'Messages', section: 'messages', icon: MessageSquareText },
  ],
  COACH: [
    { label: 'Students', section: 'talent', icon: Users },
    { label: 'External access', section: 'external-access', icon: Share2 },
    { label: 'Assignments', section: 'assignments', icon: BookOpenCheck },
    { label: 'Recommendation', section: 'recommendations', icon: Award },
  ],
  MENTOR: [
    { label: 'Students', section: 'talent', icon: Users },
    { label: 'External access', section: 'external-access', icon: Share2 },
    { label: 'Recommendation', section: 'recommendations', icon: Award },
    { label: 'Student chat', section: 'messages', icon: MessageSquareText },
    { label: 'Hire requests', section: 'hire-requests', icon: BriefcaseBusiness },
  ],
  EXTERNAL_TUTOR: [
    dashboard,
    { label: 'Shared work', section: 'submissions', icon: BookOpenCheck },
  ],
  EXTERNAL_MENTOR: [
    dashboard,
    { label: 'Shared work', section: 'submissions', icon: BookOpenCheck },
    { label: 'Student chat', section: 'messages', icon: MessageSquareText },
  ],
  RECRUITER: [
    { label: 'Talent board', section: 'talent', icon: Search },
    { label: 'Shortlist', section: 'shortlist', icon: Bookmark },
  ],
  ADMIN: [
    { label: 'Platform', section: 'dashboard', icon: LayoutDashboard },
    { label: 'Users', section: 'users', icon: Users },
    { label: 'Cohorts', section: 'cohorts', icon: GraduationCap },
    { label: 'Settings', section: 'settings', icon: Settings2 },
  ],
  EMPLOYER: [
    dashboard,
    { label: 'Talent', section: 'talent', icon: Search },
    { label: 'Hire requests', section: 'hire-requests', icon: Mail },
  ],
}

export function isAppRole(value: string): value is AppRole {
  return Object.prototype.hasOwnProperty.call(roleSlugs, value)
}

export function roleForSlug(slug: string): AppRole | null {
  return (Object.entries(roleSlugs).find(([, value]) => value === slug)?.[0] as AppRole | undefined) ?? null
}