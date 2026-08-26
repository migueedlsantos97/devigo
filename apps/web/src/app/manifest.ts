import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Devigo',
    short_name: 'Devigo',
    description:
      'Quantitative +EV ticket construction: Shin de-vig, correlation-aware parlays, Kelly sizing and Monte Carlo variance.',
    start_url: '/panel',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
