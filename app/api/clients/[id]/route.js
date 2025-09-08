import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * GET /api/clients/[id] - Obtener cliente por ID
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Construir filtros de acceso
    let where = {
      id,
      archived: false
    };

    // Si no es admin, solo puede ver clientes de su negocio
    if (session.user.role !== 'ADMIN') {
      if (!session.user.businessId) {
        return NextResponse.json(
          { error: 'Usuario sin negocio asignado' },
          { status: 403 }
        );
      }
      where.businessId = session.user.businessId;
    }

    const client = await prisma.client.findFirst({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(client);

  } catch (error) {
    console.error('Error al obtener cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients/[id] - Actualizar cliente
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, email, phone, address, document, documentType, notes } = body;

    // Validaciones básicas
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Construir filtros de acceso
    let where = {
      id,
      archived: false
    };

    // Si no es admin, solo puede editar clientes de su negocio
    if (session.user.role !== 'ADMIN') {
      if (!session.user.businessId) {
        return NextResponse.json(
          { error: 'Usuario sin negocio asignado' },
          { status: 403 }
        );
      }
      where.businessId = session.user.businessId;
    }

    // Verificar que el cliente existe y el usuario tiene acceso
    const existingClient = await prisma.client.findFirst({ where });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Verificar email único si se proporciona y es diferente al actual
    if (email && email !== existingClient.email) {
      const emailExists = await prisma.client.findFirst({
        where: {
          email,
          businessId: existingClient.businessId,
          archived: false,
          id: { not: id }
        }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email en el negocio' },
          { status: 409 }
        );
      }
    }

    // Actualizar cliente
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        document: document?.trim() || null,
        documentType: documentType?.trim() || null,
        notes: notes?.trim() || null,
        updatedAt: new Date()
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

    return NextResponse.json(updatedClient);

  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id] - Archivar cliente (soft delete)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Construir filtros de acceso
    let where = {
      id,
      archived: false
    };

    // Si no es admin, solo puede eliminar clientes de su negocio
    if (session.user.role !== 'ADMIN') {
      if (!session.user.businessId) {
        return NextResponse.json(
          { error: 'Usuario sin negocio asignado' },
          { status: 403 }
        );
      }
      where.businessId = session.user.businessId;
    }

    // Verificar que el cliente existe y el usuario tiene acceso
    const existingClient = await prisma.client.findFirst({ where });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Archivar cliente (soft delete)
    await prisma.client.update({
      where: { id },
      data: {
        archived: true,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(
      { message: 'Cliente archivado correctamente' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error al archivar cliente:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}