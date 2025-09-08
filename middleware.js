import { auth } from "./lib/auth"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Permitir acceso directo a assets públicos y archivos estáticos (imágenes, íconos, etc.)
  // Esto evita redirecciones del middleware cuando el usuario no está autenticado en páginas públicas
  const isPublicAsset = pathname.startsWith("/assets") || /\.(png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json)$/i.test(pathname)
  if (isPublicAsset) {
    return
  }
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ["/login", "/register"]
  
  // Si la ruta es pública, permitir acceso
  if (publicRoutes.includes(pathname)) {
    return
  }
  
  // Si no hay sesión y no es una ruta pública, redirigir al login
  if (!req.auth && !publicRoutes.includes(pathname)) {
    const newUrl = new URL("/login", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}