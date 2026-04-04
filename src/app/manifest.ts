import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BuzzMaps Toronto',
    short_name: 'BuzzMaps',
    description: "Toronto's places, as told by Reddit",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ff6b35',
    icons: [
      {
        src: 'https://via.placeholder.com/192/ff6b35/ffffff?text=BM',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://via.placeholder.com/512/ff6b35/ffffff?text=BM',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
