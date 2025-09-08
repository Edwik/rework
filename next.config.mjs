/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permitir imágenes locales
    unoptimized: false,
    // Configurar dominios permitidos si es necesario
    domains: [],
    // Formatos soportados
    formats: ['image/webp', 'image/avif'],
  },
};

export default nextConfig;
