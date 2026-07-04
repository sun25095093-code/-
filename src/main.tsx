import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dynamically generate PNG launcher icons from SVG so that mobile devices (iOS/Android) 
// can use the high-quality customized frog icon instead of default blank bookmarks
async function generatePngIcons() {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open('gaegul-cache-v2');
    
    const match192 = await cache.match('/icon-192.png');
    const match512 = await cache.match('/icon-512.png');
    const matchApple = await cache.match('/apple-touch-icon.png');
    
    if (match192 && match512 && matchApple) {
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/icon.svg';
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    
    const sizes = [
      { name: '/icon-192.png', size: 192 },
      { name: '/icon-512.png', size: 512 },
      { name: '/apple-touch-icon.png', size: 180 }
    ];
    
    const origin = window.location.origin;
    
    for (const item of sizes) {
      const canvas = document.createElement('canvas');
      canvas.width = item.size;
      canvas.height = item.size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, item.size, item.size);
        ctx.drawImage(img, 0, 0, item.size, item.size);
        
        await new Promise<void>((resolveBlob) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const response = new Response(blob, {
                headers: { 
                  'Content-Type': 'image/png',
                  'Cache-Control': 'public, max-age=31536000'
                }
              });
              cache.put(origin + item.name, response).then(() => {
                resolveBlob();
              });
            } else {
              resolveBlob();
            }
          }, 'image/png');
        });
      }
    }
  } catch (err) {
    console.warn('Error generating dynamic PNG icons:', err);
  }
}

// Trigger generation on startup
generatePngIcons();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
