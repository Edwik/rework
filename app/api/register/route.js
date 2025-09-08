import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function POST(request) {
  try {
    const { name, email, password, businessName, businessDescription } = await request.json()

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 400 }
      )
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear el negocio primero
    let business
    try {
      // Generar un identificador único temporal para whatsapp para evitar conflictos
      const uniqueWhatsappId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      business = await prisma.business.create({
        data: {
          name: businessName,
          description: businessDescription,
          // Agregar campos opcionales para evitar conflictos de restricciones únicas
          phone: null,
          email: null,
          website: null,
          whatsapp: uniqueWhatsappId, // Usar ID único temporal
          address: null
        }
      })
    } catch (businessError) {
      console.error('Error creando negocio:', businessError)
      if (businessError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ya existe un negocio con esos datos. Por favor, verifica la información.' },
          { status: 400 }
        )
      }
      throw businessError
    }

    // Crear el usuario admin del negocio
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        businessId: business.id
      },
      include: {
        business: true
      }
    })

    // Remover la contraseña de la respuesta
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: "Usuario y negocio creados exitosamente",
      user: userWithoutPassword
    })
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}