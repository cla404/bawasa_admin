#!/usr/bin/env node

/**
 * Seed script for BAWASA database
 * 
 * Usage:
 *   node seed.js                    # Run seed for default years (2022-2025)
 *   node seed.js --dry-run          # Dry run (no data inserted)
 *   node seed.js --years 2024,2025  # Seed only specific years
 *   node seed.js --dry-run --years 2024,2025
 *   PORT=3001 node seed.js          # Use custom port
 */

// Try to detect the port from environment or try common ports
const PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT;
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || (PORT ? `http://localhost:${PORT}` : null);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 ? args[portIndex + 1] : null;
const yearsIndex = args.indexOf('--years');
const yearsArg = yearsIndex !== -1 ? args[yearsIndex + 1] : null;
const years = yearsArg 
  ? yearsArg.split(',').map(y => parseInt(y.trim()))
  : [2022, 2023, 2024, 2025];

// Determine the base URL
let finalBaseUrl = BASE_URL || (portArg ? `http://localhost:${portArg}` : null);

// If no URL specified, try common ports
if (!finalBaseUrl) {
  const commonPorts = ['3001', '3000'];
  console.log('⚠️  No port specified. Trying common ports...');
  finalBaseUrl = `http://localhost:${commonPorts[0]}`; // Default to 3001 since that's what Next.js uses when 3000 is busy
}

console.log('🌱 Running seed with options:');
console.log(`   Dry Run: ${dryRun}`);
console.log(`   Years: [${years.join(', ')}]`);
console.log(`   URL: ${finalBaseUrl}/api/seed`);
console.log('');

const payload = {
  dryRun,
  years
};

fetch(`${finalBaseUrl}/api/seed`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
})
  .then(async response => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    if (data.success) {
      console.log('✅ Seed completed successfully!');
      if (data.stats) {
        console.log(`   - Consumers processed: ${data.stats.consumersProcessed}`);
        console.log(`   - Meter readings created: ${data.stats.meterReadingsCreated}`);
        console.log(`   - Billings created: ${data.stats.billingsCreated}`);
        if (data.stats.errorCount > 0) {
          console.log(`   ⚠️  Errors: ${data.stats.errorCount}`);
        }
      }
    } else {
      console.log('❌ Seed failed:', data.message || data.error);
      if (data.message?.includes('No consumers found') && dryRun) {
        console.log('');
        console.log('💡 Tip: In dry-run mode, consumers must already exist in the database.');
        console.log('   Try running without --dry-run first to create the consumers,');
        console.log('   then use --dry-run to test future seeding operations.');
      }
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Error calling seed API:', error.message);
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.error('');
      console.error('💡 Make sure the Next.js dev server is running.');
      console.error('   Start it with: npm run dev');
      console.error('   If it\'s on a different port, specify it:');
      console.error('   PORT=3001 node seed.js');
      console.error('   or: node seed.js --port 3001');
    }
    process.exit(1);
  });

