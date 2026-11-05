export type UUID = string
export type ISODate = string
export type ISODateTime = string

export type UserRole =
  | 'STUDENT'
  | 'COACH'
  | 'EXTERNAL_TUTOR'
  | 'ADMIN'
  | 'MENTOR'
  | 'EMPLOYER'
  | 'RECRUITER'
  | 'EXTERNAL_MENTOR'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshRequest {
  refreshToken: string
}

export interface MeResponse {
  id: UUID
  email: string
  firstName: string
  lastName: string
  role: UserRole
  startDate?: ISODate | null
}

export interface ErrorResponse {
  error: string
}

export interface AdminCreateUserRequest extends RegisterRequest {
  role: UserRole
}

export type AdminUserResponse = MeResponse

export interface AssignRoleRequest {
  role: UserRole
}

export interface CohortRequest {
  name: string
  startDate?: ISODate | null
  endDate?: ISODate | null
}

export interface CohortResponse {
  id: UUID
  name: string
  startDate: ISODate | null
  endDate: ISODate | null
}

export interface CreateAssignmentRequest {
  cohortId: UUID
  title: string
  description?: string | null
  dueAt: ISODateTime
}

export interface AssignmentResponse {
  id: UUID
  cohortId: UUID
  title: string
  description: string | null
  dueAt: ISODateTime | null
}

export type SubmissionStatus = 'ON_TIME' | 'LATE'
export type AnalysisStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export interface SubmissionResponse {
  id: UUID
  assignmentId: UUID
  filename: string | null
  contentType: string | null
  fileSize: number | null
  submittedAt: ISODateTime
  status: SubmissionStatus
  analysisStatus: AnalysisStatus | null
}

export interface PunctualityResponse {
  studentProfileId: UUID
  totalSubmissions: number
  onTimeSubmissions: number
  percentage: number
  overallScore: number | null
}

export interface SubmissionAnalysisResponse {
  status: AnalysisStatus
  score: number | null
  quality: number | null
  correctness: number | null
  originality: number | null
  communication: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  suggestions: string[] | null
  errorMessage: string | null
}

export interface GrantRequest {
  externalMentorId: UUID
  expiresAt?: ISODateTime | null
}

export interface GrantResponse {
  id: UUID
  submissionId: UUID
  externalMentorId: UUID
  expiresAt: ISODateTime | null
  revoked: boolean
}

export type CvEntryCategory = 'EDUCATION' | 'EXPERIENCE' | 'SKILLS' | 'CERTIFICATION'

export interface CvEntryRequest {
  title: string
  category: CvEntryCategory
  organization?: string | null
  description?: string | null
  startDate?: ISODate | null
  endDate?: ISODate | null
  skills?: string[]
}

export interface CvEntryResponse {
  id: UUID
  title: string
  category: CvEntryCategory
  organization: string | null
  description: string | null
  startDate: ISODate | null
  endDate: ISODate | null
  skills: string[]
}

export type RecommendationLetterStatus = 'DRAFT' | 'PUBLISHED'

export interface CreateRecommendationLetterRequest {
  studentProfileId: UUID
  content: string
}

export interface UpdateRecommendationLetterRequest {
  content: string
}

export interface RecommendationLetterResponse {
  id: UUID
  studentProfileId: UUID
  authorName: string
  content: string
  status: RecommendationLetterStatus
  createdAt: ISODateTime
  publishedAt: ISODateTime | null
}

export interface CreateMessageThreadRequest {
  submissionId: UUID
  externalMentorId?: UUID | null
}

export interface SendMessageRequest {
  body: string
}

export interface MessageThreadSummary {
  id: UUID
  submissionId: UUID
  studentId: UUID
  externalMentorId: UUID
  externalMentorName: string
  createdAt: ISODateTime
  unreadCount: number
}

export interface MessageView {
  id: UUID
  threadId: UUID
  senderId: UUID
  recipientId: UUID
  body: string
  sentAt: ISODateTime
  readAt: ISODateTime | null
}

export interface ThreadMessages {
  thread: MessageThreadSummary
  messages: MessageView[]
}

export interface UnreadCount {
  unreadCount: number
}

export interface CreateHireRequest {
  studentProfileId: UUID
  companyName: string
  contactEmail?: string | null
  message?: string | null
}

export type HireRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export interface HireRequestResponse {
  id: UUID
  studentProfileId: UUID
  companyName: string
  contactEmail: string | null
  message: string | null
  status: HireRequestStatus
  requestedAt: ISODateTime
}

export interface StudentSummary {
  studentProfileId: UUID
  firstName: string
  lastName: string
  startDate: ISODate
  overallScore: number | null
  yearsExperience: number
  qualifications: string[]
  skills: string[]
}

export interface StudentPage {
  content: StudentSummary[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface StudentDetail {
  student: StudentSummary
  cv: CvEntryResponse[]
  scoreCards: ScoreCardDetail[]
  recommendationLetters: RecommendationLetterSummary[]
}

export interface ScoreCardDetail {
  submissionId: UUID
  status: AnalysisStatus
  score: number | null
  quality: number | null
  correctness: number | null
  originality: number | null
  communication: number | null
  strengths: string[] | null
  weaknesses: string[] | null
  suggestions: string[] | null
}

export interface RecommendationLetterSummary {
  id: UUID
  authorName: string
  content: string
  publishedAt: ISODateTime | null
}

export interface TalentSearchParams {
  qualification?: string
  minYearsExperience?: number
  skill?: string
  page?: number
  size?: number
}