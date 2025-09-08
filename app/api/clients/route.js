import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/clients - Obtener clientes con paginación
 * Query params:
 * - page: número de página (default: 1)
 * - limit: límite por página (default: 20)
 * - businessId: filtrar por negocio (opcional, solo para admin)
 * - search: buscar por nombre, email o teléfono
 */
export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const businessId = searchParams.get('businessId');
    const search = searchParams.get('search');
    
    const skip = (page - 1) * limit;

    // Construir filtros
    let where = {
      archived: false
    };

    // Si el usuario no es admin, solo puede ver clientes de su negocio
    if (session.user.role !== 'ADMIN') {
      if (!session.user.businessId) {
        return NextResponse.json(
          { error: 'Usuario sin negocio asignado' },
          { status: 403 }
        );
      }
      where.businessId = session.user.businessId;
    } else if (businessId) {
      // Si es admin y especifica un businessId, filtrar por ese negocio
      where.businessId = businessId;
    }

    // Agregar búsqueda si se proporciona
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener clientes con información del negocio
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.client.count({ where })
    ]);

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients - Crear nuevo cliente
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email, phone, address, document, documentType, notes, businessId } = body;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Determinar el businessId
    let targetBusinessId;
    if (session.user.role === 'ADMIN') {
      // Admin puede especificar businessId o usar el suyo
      targetBusinessId = businessId || session.user.businessId;
    } else {
      // Usuario normal solo puede crear en su negocio
      targetBusinessId = session.user.businessId;
    }

    if (!targetBusinessId) {
      return NextResponse.json(
        { error: 'Negocio no especificado' },
        { status: 400 }
      );
    }

    // Verificar que el negocio existe
    const business = await prisma.business.findUnique({
      where: { id: targetBusinessId }
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    // Verificar email único si se proporciona
    if (email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          email,
          businessId: targetBusinessId,
          archived: false
        }
      });

      if (existingClient) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email en el negocio' },
          { status: 409 }
        );
      }
    }

    // Crear cliente
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        document: document?.trim() || null,
        documentType: documentType?.trim() || null,
        notes: notes?.trim() || null,
        businessId: targetBusinessId
      },
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(client, { status: 201 });

  } catch (error) {
    console.error('Error al crear cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}