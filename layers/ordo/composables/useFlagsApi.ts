import { useOrdoApi } from './useOrdoApi'
import type {
  AdminUserMatch,
  FlagChangeResponse,
  FlagChangesResponse,
  FlagCheckResponse,
  FlagCreateInput,
  FlagDetail,
  FlagsListResponse,
  FlagUndoResponse,
  FlagUpdateInput,
  FlagUsersResponse
} from '../types/flags'

/**
 * The Feature flags tab's endpoints (estevao-api; contract in
 * notes/painel-flags-livros/API-flags.md). Until the API in use has them,
 * `GET /feature_flags` answers 404 and the tab says "em breve" (useReport).
 */
const ADMIN = '/api/v1/admin'
const FLAGS = `${ADMIN}/feature_flags`
const one = (key: string) => `${FLAGS}/${encodeURIComponent(key)}`

export const useFlagsApi = () => {
  const { request } = useOrdoApi()

  return {
    list: () => request<FlagsListResponse>(FLAGS),
    detail: (key: string, { page = 1, perPage = 50 } = {}) => request<FlagDetail>(`${one(key)}?page=${page}&per_page=${perPage}`),
    create: (input: FlagCreateInput) => request<FlagDetail>(FLAGS, { method: 'POST', body: input }),
    update: (key: string, input: FlagUpdateInput) => request<FlagDetail>(one(key), { method: 'PATCH', body: input }),
    remove: (key: string) => request<FlagChangeResponse>(one(key), { method: 'DELETE' }),
    addUsers: (key: string, userIds: number[], enabled = true) =>
      request<FlagUsersResponse>(`${one(key)}/users`, { method: 'POST', body: { user_ids: userIds, enabled } }),
    removeUser: (key: string, userId: number) => request<FlagChangeResponse>(`${one(key)}/users/${userId}`, { method: 'DELETE' }),
    check: (key: string, userId: number) => request<FlagCheckResponse>(`${one(key)}/check?user_id=${userId}`),
    changes: ({ flagKey, page = 1, perPage = 50 }: { flagKey?: string; page?: number; perPage?: number } = {}) => {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
      if (flagKey) params.set('flag_key', flagKey)
      return request<FlagChangesResponse>(`${ADMIN}/feature_flag_changes?${params.toString()}`)
    },
    undo: (changeId: number) => request<FlagUndoResponse>(`${ADMIN}/feature_flag_changes/${changeId}/undo`, { method: 'POST' }),
    searchUsers: (query: string) => request<{ users: AdminUserMatch[] }>(`${ADMIN}/users?q=${encodeURIComponent(query.trim())}`)
  }
}

export type FlagsApi = ReturnType<typeof useFlagsApi>
