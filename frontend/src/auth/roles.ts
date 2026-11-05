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
  ADMIN: 'Administrator',
  EMPLOYER: 'Employer',
}

export interface NavigationItem {
  label: string
  section: string
  icon: LucideIcon
}

const overview: NavigationItem = { label: 'Overview', section: 'dashboard', icon: LayoutDashboard }

export const roleNavigation: Record<AppRole, NavigationItem[]> = {
  STUDENT: [
    overview,
    { label: 'Assignments', section: 'assignments', icon: BookOpenCheck },
    { label: 'Submissions', section: 'submissions', icon: FileUser },
    { label: 'My CV', section: 'cv', icon: FileUser },
    { label: 'Recommendations', section: 'recommendations', icon: Award },
    { label: 'Messages', section: 'messages', icon: MessageSquareText },
  ],
  COACH: [
    overview,
    { label: 'Cohorts', section: 'cohorts', icon: Users },
    { label: 'Assignments', section: 'assignments', icon: BookOpenCheck },
    { label: 'Talent', section: 'talent', icon: Search },
  ],
  MENTOR: [
    overview,
    { label: 'Talent', section: 'talent', icon: Search },
    { label: 'Recommendations', section: 'recommendations', icon: Award },
    { label: 'Messages', section: 'messages', icon: MessageSquareText },
    { label: 'Hire requests', section: 'hire-requests', icon: BriefcaseBusiness },
  ],
  EXTERNAL_TUTOR: [
    overview,
    { label: 'Shared work', section: 'submissions', icon: BookOpenCheck },
  ],
  EXTERNAL_MENTOR: [
    overview,
    { label: 'Shared work', section: 'submissions', icon: BookOpenCheck },
    { label: 'Messages', section: 'messages', icon: MessageSquareText },
  ],
  RECRUITER: [
    overview,
    { label: 'Talent board', section: 'talent', icon: Search },
    { label: 'Shortlist', section: 'shortlist', icon: Bookmark },
    { label: 'Hire requests', section: 'hire-requests', icon: BriefcaseBusiness },
  ],
  ADMIN: [
    overview,
    { label: 'Users', section: 'users', icon: Users },
    { label: 'Cohorts', section: 'cohorts', icon: GraduationCap },
    { label: 'Settings', section: 'settings', icon: Settings2 },
  ],
  EMPLOYER: [
    overview,
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