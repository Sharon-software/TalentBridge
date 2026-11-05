import { apiClient, clearTokens, getRefreshToken, saveTokenResponse } from './client'
import type {
  AdminCreateUserRequest,
  AdminPlatformStats,
  AdminUserResponse,
  AssignRoleRequest,
  AssignmentResponse,
  CohortRequest,
  CohortResponse,
  CreateAssignmentRequest,
  CreateHireRequest,
  CreateMessageThreadRequest,
  CreateRecommendationLetterRequest,
  CvEntryRequest,
  CvEntryResponse,
  ExternalMentorSubmissionResponse,
  ExternalMentorSummary,
  ExternalTutorAssignmentResponse,
  ExternalTutorCohortResponse,
  ExternalTutorSubmissionResponse,
  GrantRequest,
  GrantResponse,
  HireRequestResponse,
  LoginRequest,
  MeResponse,
  MessageThreadSummary,
  MessageView,
  PunctualityResponse,
  RecommendationLetterResponse,
  RefreshRequest,
  RegisterRequest,
  SendMessageRequest,
  StudentDetail,
  StudentPage,
  SubmissionAnalysisResponse,
  SubmissionReviewRequest,
  SubmissionReviewResponse,
  SubmissionResponse,
  TalentSearchParams,
  TalentFilters,
  ThreadMessages,
  TokenPair,
  UnreadCount,
  UpdateRecommendationLetterRequest,
  WorkspaceCohortResponse,
  WorkspaceStudentDetail,
  WorkspaceStudentSummary,
  UUID,
} from './types'

export * from './client'
export * from './types'

const authApi = {
  register: (request: RegisterRequest) =>
    saveTokenResponse<TokenPair>(apiClient.post<TokenPair>('/api/auth/register', request)),
  login: (request: LoginRequest) =>
    saveTokenResponse<TokenPair>(apiClient.post<TokenPair>('/api/auth/login', request)),
  refresh: async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      window.location.assign('/login')
      throw new Error('No refresh token is available')
    }
    const request: RefreshRequest = { refreshToken }
    return saveTokenResponse<TokenPair>(apiClient.post<TokenPair>('/api/auth/refresh', request))
  },
  me: async () => (await apiClient.get<MeResponse>('/api/me')).data,
  logout: clearTokens,
}

const adminApi = {
  stats: async () => (await apiClient.get<AdminPlatformStats>('/api/admin/stats')).data,
  users: async () => (await apiClient.get<AdminUserResponse[]>('/api/admin/users')).data,
  createUser: async (request: AdminCreateUserRequest) =>
    (await apiClient.post<AdminUserResponse>('/api/admin/users', request)).data,
  assignRole: async (userId: UUID, request: AssignRoleRequest) =>
    (await apiClient.patch<AdminUserResponse>(`/api/admin/users/${userId}/role`, request)).data,
  cohorts: async () => (await apiClient.get<CohortResponse[]>('/api/admin/cohorts')).data,
  createCohort: async (request: CohortRequest) =>
    (await apiClient.post<CohortResponse>('/api/admin/cohorts', request)).data,
  updateCohort: async (id: UUID, request: CohortRequest) =>
    (await apiClient.put<CohortResponse>(`/api/admin/cohorts/${id}`, request)).data,
  deleteCohort: async (id: UUID) => apiClient.delete(`/api/admin/cohorts/${id}`),
  externalTutors: async (cohortId: UUID) =>
    (await apiClient.get<ExternalTutorAssignmentResponse[]>(`/api/admin/cohorts/${cohortId}/external-tutors`)).data,
  assignExternalTutor: async (cohortId: UUID, tutorId: UUID) =>
    (await apiClient.put<ExternalTutorAssignmentResponse>(`/api/admin/cohorts/${cohortId}/external-tutors/${tutorId}`)).data,
  removeExternalTutor: async (cohortId: UUID, tutorId: UUID) =>
    apiClient.delete(`/api/admin/cohorts/${cohortId}/external-tutors/${tutorId}`),
}

const workspaceApi = {
  cohorts: async () => (await apiClient.get<WorkspaceCohortResponse[]>('/api/workspaces/cohorts')).data,
  students: async (cohortId: UUID) =>
    (await apiClient.get<WorkspaceStudentSummary[]>(`/api/workspaces/cohorts/${cohortId}/students`)).data,
  student: async (studentProfileId: UUID) =>
    (await apiClient.get<WorkspaceStudentDetail>(`/api/workspaces/students/${studentProfileId}`)).data,
  externalMentors: async () =>
    (await apiClient.get<ExternalMentorSummary[]>('/api/workspaces/external-mentors')).data,
}

const assignmentApi = {
  list: async () => (await apiClient.get<AssignmentResponse[]>('/api/assignments')).data,
  get: async (id: UUID) => (await apiClient.get<AssignmentResponse>(`/api/assignments/${id}`)).data,
  create: async (request: CreateAssignmentRequest) =>
    (await apiClient.post<AssignmentResponse>('/api/assignments', request)).data,
}

const submissionApi = {
  upload: async (assignmentId: UUID, file: File) => {
    const data = new FormData()
    data.set('assignmentId', assignmentId)
    data.set('file', file)
    return (await apiClient.post<SubmissionResponse>('/api/submissions', data)).data
  },
  mine: async () => (await apiClient.get<SubmissionResponse[]>('/api/submissions/mine')).data,
  punctuality: async () => (await apiClient.get<PunctualityResponse>('/api/submissions/me/punctuality')).data,
  studentPunctuality: async (studentProfileId: UUID) =>
    (await apiClient.get<PunctualityResponse>('/api/submissions/students/punctuality', { params: { studentProfileId } })).data,
  analysis: async (submissionId: UUID) =>
    (await apiClient.get<SubmissionAnalysisResponse>(`/api/submissions/${submissionId}/analysis`)).data,
  review: async (submissionId: UUID) => {
    const { data } = await apiClient.get<SubmissionReviewResponse | null>(`/api/submissions/${submissionId}/review`)
    return data || null
  },
  updateReview: async (submissionId: UUID, request: SubmissionReviewRequest) =>
    (await apiClient.put<SubmissionReviewResponse>(`/api/submissions/${submissionId}/review`, request)).data,
  file: async (submissionId: UUID) =>
    (await apiClient.get<Blob>(`/api/submissions/${submissionId}/file`, { responseType: 'blob' })).data,
}

const externalTutorApi = {
  cohorts: async () => (await apiClient.get<ExternalTutorCohortResponse[]>('/api/external-tutor/cohorts')).data,
  submissions: async (cohortId: UUID) =>
    (await apiClient.get<ExternalTutorSubmissionResponse[]>(`/api/external-tutor/cohorts/${cohortId}/submissions`)).data,
}

const externalMentorApi = {
  submissions: async () => (await apiClient.get<ExternalMentorSubmissionResponse[]>('/api/external-mentor/submissions')).data,
}

const externalAccessApi = {
  active: async (submissionId: UUID) =>
    (await apiClient.get<GrantResponse[]>(`/api/submissions/${submissionId}/external-access-grants`)).data,
  grant: async (submissionId: UUID, request: GrantRequest) =>
    (await apiClient.post<GrantResponse>(`/api/submissions/${submissionId}/external-access-grants`, request)).data,
  revoke: async (submissionId: UUID, grantId: UUID) =>
    (await apiClient.delete<GrantResponse>(`/api/submissions/${submissionId}/external-access-grants/${grantId}`)).data,
}

const cvApi = {
  list: async () => (await apiClient.get<CvEntryResponse[]>('/api/cv')).data,
  get: async (id: UUID) => (await apiClient.get<CvEntryResponse>(`/api/cv/${id}`)).data,
  create: async (request: CvEntryRequest) => (await apiClient.post<CvEntryResponse>('/api/cv', request)).data,
  update: async (id: UUID, request: CvEntryRequest) =>
    (await apiClient.put<CvEntryResponse>(`/api/cv/${id}`, request)).data,
  remove: async (id: UUID) => apiClient.delete(`/api/cv/${id}`),
}

const recommendationApi = {
  authored: async () => (await apiClient.get<RecommendationLetterResponse[]>('/api/recommendation-letters/authored')).data,
  createDraft: async (request: CreateRecommendationLetterRequest) =>
    (await apiClient.post<RecommendationLetterResponse>('/api/recommendation-letters', request)).data,
  updateDraft: async (id: UUID, request: UpdateRecommendationLetterRequest) =>
    (await apiClient.put<RecommendationLetterResponse>(`/api/recommendation-letters/${id}`, request)).data,
  publish: async (id: UUID) =>
    (await apiClient.post<RecommendationLetterResponse>(`/api/recommendation-letters/${id}/publish`)).data,
  mine: async () => (await apiClient.get<RecommendationLetterResponse[]>('/api/recommendation-letters/mine')).data,
  get: async (id: UUID) =>
    (await apiClient.get<RecommendationLetterResponse>(`/api/recommendation-letters/${id}`)).data,
}

const messagingApi = {
  createThread: async (request: CreateMessageThreadRequest) =>
    (await apiClient.post<MessageThreadSummary>('/api/messages/threads', request)).data,
  threads: async () => (await apiClient.get<MessageThreadSummary[]>('/api/messages/threads')).data,
  readThread: async (id: UUID) => (await apiClient.get<ThreadMessages>(`/api/messages/threads/${id}`)).data,
  send: async (id: UUID, request: SendMessageRequest) =>
    (await apiClient.post<MessageView>(`/api/messages/threads/${id}/messages`, request)).data,
  unreadCount: async () => (await apiClient.get<UnreadCount>('/api/messages/unread-count')).data,
}

const hireRequestApi = {
  create: async (request: CreateHireRequest) =>
    (await apiClient.post<HireRequestResponse>('/api/hire-requests', request)).data,
  list: async () => (await apiClient.get<HireRequestResponse[]>('/api/hire-requests')).data,
  get: async (id: UUID) => (await apiClient.get<HireRequestResponse>(`/api/hire-requests/${id}`)).data,
}

const talentApi = {
  filters: async () => (await apiClient.get<TalentFilters>('/api/recruiters/students/filters')).data,
  search: async (params: TalentSearchParams) =>
    (await apiClient.get<StudentPage>('/api/recruiters/students', { params })).data,
  detail: async (studentProfileId: UUID) =>
    (await apiClient.get<StudentDetail>(`/api/recruiters/students/${studentProfileId}`)).data,
}

export const api = {
  auth: authApi,
  admin: adminApi,
  workspace: workspaceApi,
  assignments: assignmentApi,
  submissions: submissionApi,
  externalTutor: externalTutorApi,
  externalMentor: externalMentorApi,
  externalAccess: externalAccessApi,
  cv: cvApi,
  recommendationLetters: recommendationApi,
  messages: messagingApi,
  hireRequests: hireRequestApi,
  talent: talentApi,
}