#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building TypeScript files...');

try {
  // Use Node.js to run TypeScript compiler directly
  execSync('node node_modules/typescript/bin/tsc', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}