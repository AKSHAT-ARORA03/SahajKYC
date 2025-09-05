#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Creates all required PWA icons from a base 512x512 SVG
 * Since we don't have image manipulation libraries, we'll create a simple SVG-based solution
 */

const fs = require('fs');
const path = require('path');

// Simple SVG icon template for KYC app
const createSVGIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1E40AF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#gradient)"/>
  
  <!-- KYC Icon - Shield with checkmark -->
  <g transform="translate(${size*0.25}, ${size*0.2})">
    <!-- Shield background -->
    <path d="M${size*0.25} ${size*0.1} L${size*0.4} ${size*0.15} L${size*0.4} ${size*0.45} Q${size*0.4} ${size*0.55} ${size*0.25} ${size*0.6} Q${size*0.1} ${size*0.55} ${size*0.1} ${size*0.45} L${size*0.1} ${size*0.15} Z" 
          fill="white" opacity="0.9"/>
    
    <!-- Checkmark -->
    <path d="M${size*0.18} ${size*0.35} L${size*0.23} ${size*0.4} L${size*0.32} ${size*0.3}" 
          stroke="#1E40AF" stroke-width="${size*0.02}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  
  <!-- KYC Text -->
  <text x="${size/2}" y="${size*0.8}" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="${size*0.08}" font-weight="bold" fill="white">
    KYC
  </text>
</svg>`;

// Icon sizes required by PWA manifest
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('🎨 Generating PWA Icons for KYC App...\n');

// Create public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG icons for each size
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✅ Created ${filename}`);
});

// Also create a favicon.ico equivalent as SVG
const faviconSVG = createSVGIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✅ Created favicon.svg');

// Create a simple manifest.json with SVG icons
const manifest = {
  "name": "KYC Verification App",
  "short_name": "KYC App", 
  "description": "Secure KYC verification for rural and semi-urban India",
  "theme_color": "#1E40AF",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": iconSizes.map(size => ({
    "src": `/icon-${size}x${size}.svg`,
    "sizes": `${size}x${size}`,
    "type": "image/svg+xml",
    "purpose": "maskable any"
  }))
};

fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✅ Updated manifest.json with SVG icons');

// Create a simple robots.txt
const robots = `User-agent: *
Allow: /

# KYC App - Sitemap
Sitemap: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sitemap.xml`;

fs.writeFileSync(path.join(publicDir, 'robots.txt'), robots);
console.log('✅ Created robots.txt');

console.log('\n🎉 PWA Icons Generated Successfully!');
console.log('\n📱 Your app now has:');
console.log('✅ All required PWA icon sizes (SVG format)');
console.log('✅ Updated manifest.json');
console.log('✅ Favicon for browsers');
console.log('✅ Robots.txt for SEO');
console.log('\n🚀 No more 404 errors for PWA icons!');
