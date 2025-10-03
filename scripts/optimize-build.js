#!/usr/bin/env node

/**
 * Build Optimization Script
 * Analyzes and optimizes the production build
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting build optimization...\n');

// 1. Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('✅ Previous builds cleaned\n');
} catch (error) {
  console.error('❌ Error cleaning builds:', error.message);
}

// 2. Run production build
console.log('🔨 Building production version...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build completed\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// 3. Analyze bundle size
console.log('📊 Analyzing bundle size...');
let assets = [];
let totalSize = 0;
let jsFiles = [];
let cssFiles = [];
let otherFiles = [];
try {
  const distPath = path.join(process.cwd(), 'dist');
  
  function analyzeDirectory(dir, basePath = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const relativePath = path.join(basePath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        analyzeDirectory(itemPath, relativePath);
      } else {
        assets.push({
          name: relativePath,
          size: stats.size,
          sizeKB: Math.round(stats.size / 1024 * 100) / 100,
          sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100
        });
      }
    });
  }
  
  analyzeDirectory(distPath);
  
  // Sort by size (largest first)
  assets.sort((a, b) => b.size - a.size);
  
  console.log('\n📦 Bundle Analysis:');
  console.log('==================');
  


  
  assets.forEach(asset => {
    totalSize += asset.size;
    
    if (asset.name.endsWith('.js')) {
      jsFiles.push(asset);
    } else if (asset.name.endsWith('.css')) {
      cssFiles.push(asset);
    } else {
      otherFiles.push(asset);
    }
  });
  
  console.log(`\n📊 Total bundle size: ${Math.round(totalSize / 1024 / 1024 * 100) / 100} MB`);
  
  console.log('\n🟨 JavaScript files:');
  jsFiles.forEach(file => {
    const sizeColor = file.sizeKB > 500 ? '🔴' : file.sizeKB > 200 ? '🟡' : '🟢';
    console.log(`  ${sizeColor} ${file.name}: ${file.sizeKB} KB`);
  });
  
  console.log('\n🟦 CSS files:');
  cssFiles.forEach(file => {
    const sizeColor = file.sizeKB > 100 ? '🔴' : file.sizeKB > 50 ? '🟡' : '🟢';
    console.log(`  ${sizeColor} ${file.name}: ${file.sizeKB} KB`);
  });
  
  console.log('\n🟪 Other files:');
  otherFiles.slice(0, 10).forEach(file => {
    console.log(`  📄 ${file.name}: ${file.sizeKB} KB`);
  });
  
  if (otherFiles.length > 10) {
    console.log(`  ... and ${otherFiles.length - 10} more files`);
  }
  
} catch (error) {
  console.error('❌ Error analyzing bundle:', error.message);
}

// 4. Check for optimization opportunities
console.log('\n🔍 Checking optimization opportunities...');

const recommendations = [];

// Check for large JavaScript files
const largeJsFiles = assets.filter(asset => 
  asset.name.endsWith('.js') && asset.sizeKB > 500
);

if (largeJsFiles.length > 0) {
  recommendations.push({
    type: 'warning',
    message: `Found ${largeJsFiles.length} large JavaScript file(s) (>500KB). Consider code splitting.`,
    files: largeJsFiles.map(f => f.name)
  });
}

// Check for missing gzip
const textFiles = assets.filter(asset => 
  asset.name.endsWith('.js') || 
  asset.name.endsWith('.css') || 
  asset.name.endsWith('.html')
);

if (textFiles.length > 0) {
  recommendations.push({
    type: 'info',
    message: 'Enable gzip compression on your server for better performance.',
    impact: 'Can reduce bundle size by 60-80%'
  });
}

// Check total bundle size
const totalSizeMB = totalSize / (1024 * 1024);
if (totalSizeMB > 5) {
  recommendations.push({
    type: 'warning',
    message: `Total bundle size is ${Math.round(totalSizeMB * 100) / 100}MB. Consider lazy loading and code splitting.`
  });
} else if (totalSizeMB > 2) {
  recommendations.push({
    type: 'info',
    message: `Bundle size is ${Math.round(totalSizeMB * 100) / 100}MB. This is acceptable but could be optimized.`
  });
}

// Display recommendations
if (recommendations.length > 0) {
  console.log('\n💡 Optimization Recommendations:');
  console.log('================================');
  
  recommendations.forEach((rec, index) => {
    const icon = rec.type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`\n${index + 1}. ${icon} ${rec.message}`);
    
    if (rec.files) {
      console.log('   Files:');
      rec.files.forEach(file => console.log(`   - ${file}`));
    }
    
    if (rec.impact) {
      console.log(`   Impact: ${rec.impact}`);
    }
  });
} else {
  console.log('✅ No optimization issues found!');
}

// 5. Generate build report
console.log('\n📝 Generating build report...');

const buildReport = {
  timestamp: new Date().toISOString(),
  totalSize: totalSize,
  totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
  fileCount: assets.length,
  jsFiles: jsFiles.length,
  cssFiles: cssFiles.length,
  largestFiles: assets.slice(0, 10).map(asset => ({
    name: asset.name,
    sizeKB: asset.sizeKB
  })),
  recommendations: recommendations
};

try {
  fs.writeFileSync('build-report.json', JSON.stringify(buildReport, null, 2));
  console.log('✅ Build report saved to build-report.json');
} catch (error) {
  console.error('❌ Error saving build report:', error.message);
}

// 6. Performance tips
console.log('\n🚀 Performance Tips:');
console.log('===================');
console.log('1. Enable gzip/brotli compression on your server');
console.log('2. Use a CDN for static assets');
console.log('3. Implement proper caching headers');
console.log('4. Consider using service workers for offline support');
console.log('5. Monitor Core Web Vitals in production');

console.log('\n✨ Build optimization completed!');
console.log(`📊 Final bundle size: ${Math.round(totalSize / (1024 * 1024) * 100) / 100} MB`);
console.log('🎉 Ready for deployment!\n');