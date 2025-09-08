import { auth } from "./auth"

/**
 * Obtiene la sesión del usuario en rutas API usando Auth.js v5
 * @returns {Promise<Session|null>} La sesión del usuario o null
 */
export async function getApiSession() {
  try {
    // En Auth.js v5, simplemente llamamos auth() sin parámetros
    const session = await auth()
    
    console.log('Session from auth():', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      businessId: session?.user?.businessId
    })
    
    return session
  } catch (error) {
    console.error('Error getting API session:', error)
    return null
  }
}

/**
 * Verifica si el usuario está autenticado en una ruta API
 * @returns {Promise<{session: Session|null, isAuthenticated: boolean}>}
 */
export async function verifyApiAuth() {
  const session = await getApiSession()
  return {
    session,
    isAuthenticated: !!session?.user?.id
  }
}