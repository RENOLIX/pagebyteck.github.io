import { createAuthClient } from 'better-auth/react'

// accounts are created by the admin panel, so the client only signs in
export const authClient = createAuthClient({ baseURL: window.location.origin })

export const { useSession, signIn, signOut, changePassword } = authClient
