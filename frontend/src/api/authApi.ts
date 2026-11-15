import { httpClient } from './httpClient'
import type { AuthResponse } from '../types'

export const authApi = {
  async login(username: string, password: string) {
    return (await httpClient.post<AuthResponse>('/auth/login', { username, password })).data
  },
  async register(username: string, password: string) {
    return (await httpClient.post<AuthResponse>('/auth/register', { username, password })).data
  },
}
