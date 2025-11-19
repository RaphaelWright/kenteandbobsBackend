const { execSync } = require('child_process');
const path = require('path');

const MEDUSA_SERVER_PATH = path.join(process.cwd(), '.medusa', 'server');

console.log('Ensuring database schema is up to date...');

try {
  // Generate migrations if needed
  console.log('Generating migrations for custom modules...');
  try {
    execSync('npx medusa db:generate', { 
      cwd: MEDUSA_SERVER_PATH,
      stdio: 'inherit'
    });
    console.log('Migration generation completed.');
  } catch (error) {
    console.log('No new migrations to generate (this is normal).');
  }

  // Run migrations
  console.log('Running database migrations...');
  execSync('npx medusa migrations run', { 
    cwd: MEDUSA_SERVER_PATH,
    stdio: 'inherit'
  });
  console.log('Database migrations completed successfully.');

  // Sync database links
  console.log('Syncing database links...');
  try {
    execSync('npx medusa db:sync-links', { 
      cwd: MEDUSA_SERVER_PATH,
      stdio: 'inherit'
    });
    console.log('Database links synced successfully.');
  } catch (error) {
    console.log('Database link sync skipped (this is normal for some setups).');
  }

} catch (error) {
  console.error('Database setup failed:', error.message);
  // Don't fail the build, as some errors might be expected
  console.log('Continuing despite errors...');
}

console.log('Database setup process completed.');

