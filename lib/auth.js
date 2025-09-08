import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          },
          include: {
            business: true
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          business: user.business
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Si es un nuevo login, guardar la información del usuario
      if (user) {
        token.role = user.role
        token.businessId = user.businessId
        token.business = user.business
      }
      
      // Si es una actualización de sesión, refrescar los datos del usuario desde la base de datos
      if (trigger === "update" && token.sub) {
        try {
          const updatedUser = await prisma.user.findUnique({
            where: { id: token.sub },
            include: { business: true }
          })
          
          if (updatedUser) {
            token.role = updatedUser.role
            token.businessId = updatedUser.businessId
            token.business = updatedUser.business
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT callback:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.businessId = token.businessId
        session.user.business = token.business
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    signUp: "/register"
  }
})