import sharp from 'sharp';
import fs from 'fs';

async function convert() {
  const svgBuffer = fs.readFileSync('public/icon.svg');
  
  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
    
  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
    
  // 180x180 (Apple touch icon)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
    
  console.log('PNG Icons successfully generated in public/ !');
}

convert().catch(console.error);
