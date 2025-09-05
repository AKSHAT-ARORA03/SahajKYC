#!/usr/bin/env node

/**
 * SAHAJ KYC Installation & Setup Script
 * Comprehensive setup for production-ready KYC system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}▶${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

class SahajKYCSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.config = {};
  }

  async run() {
    try {
      log.title('🚀 SAHAJ KYC Installation & Setup');
      
      await this.checkPrerequisites();
      await this.collectConfiguration();
      await this.setupEnvironment();
      await this.installDependencies();
      await this.setupDatabase();
      await this.setupCache();
      await this.generateKeys();
      await this.createDirectories();
      await this.setupCloudinary();
      await this.finalizeSetup();
      
      log.success('Installation completed successfully! 🎉');
      this.displayNextSteps();
      
    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkPrerequisites() {
    log.step('Checking prerequisites...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const requiredNodeVersion = '18.0.0';
    if (!this.versionSatisfied(nodeVersion.slice(1), requiredNodeVersion)) {
      throw new Error(`Node.js ${requiredNodeVersion}+ required. Current: ${nodeVersion}`);
    }
    log.success(`Node.js ${nodeVersion} ✓`);

    // Check npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      log.success(`npm ${npmVersion} ✓`);
    } catch (error) {
      throw new Error('npm is not installed');
    }

    // Check git
    try {
      execSync('git --version', { encoding: 'utf8' });
      log.success('Git ✓');
    } catch (error) {
      log.warn('Git not found (optional)');
    }

    log.success('Prerequisites check completed');
  }

  versionSatisfied(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);
    
    for (let i = 0; i < requiredParts.length; i++) {
      if (currentParts[i] > requiredParts[i]) return true;
      if (currentParts[i] < requiredParts[i]) return false;
    }
    return true;
  }

  async collectConfiguration() {
    log.step('Collecting configuration...');
    
    log.info('Please provide the following configuration:');
    
    // Environment
    this.config.environment = await question('Environment (development/staging/production) [development]: ') || 'development';
    
    // MongoDB
    log.info('\n📊 MongoDB Atlas Configuration:');
    this.config.mongoUri = await question('MongoDB URI: ');
    if (!this.config.mongoUri) {
      throw new Error('MongoDB URI is required');
    }

    // Redis (Upstash)
    log.info('\n🔄 Redis Configuration (Upstash):');
    this.config.redisUrl = await question('Redis URL: ');
    this.config.redisToken = await question('Redis Token: ');

    // Clerk Authentication
    log.info('\n🔐 Clerk Authentication:');
    this.config.clerkPublishableKey = await question('Clerk Publishable Key: ');
    this.config.clerkSecretKey = await question('Clerk Secret Key: ');

    // Cloudinary
    log.info('\n☁️ Cloudinary Configuration:');
    this.config.cloudinaryName = await question('Cloudinary Cloud Name: ');
    this.config.cloudinaryApiKey = await question('Cloudinary API Key: ');
    this.config.cloudinaryApiSecret = await question('Cloudinary API Secret: ');

    // Setu DigiLocker (optional)
    log.info('\n🏛️ Setu DigiLocker (optional):');
    const useDigilocker = await question('Setup DigiLocker integration? (y/N): ');
    if (useDigilocker.toLowerCase() === 'y') {
      this.config.setuApiKey = await question('Setu API Key: ');
      this.config.setuClientId = await question('Setu Client ID: ');
      this.config.setuClientSecret = await question('Setu Client Secret: ');
    }

    // App Configuration
    log.info('\n🌐 Application Configuration:');
    this.config.appUrl = await question('Application URL [http://localhost:3000]: ') || 'http://localhost:3000';
    this.config.appName = await question('Application Name [SAHAJ KYC]: ') || 'SAHAJ KYC';
    
    log.success('Configuration collected');
  }

  async setupEnvironment() {
    log.step('Setting up environment variables...');
    
    const envContent = this.generateEnvContent();
    const envPath = path.join(this.projectRoot, '.env.local');
    
    // Backup existing .env.local if it exists
    if (fs.existsSync(envPath)) {
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
      log.warn(`Existing .env.local backed up to ${path.basename(backupPath)}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    log.success('Environment file created');
  }

  generateEnvContent() {
    return `# SAHAJ KYC Environment Configuration
# Generated on: ${new Date().toISOString()}

# Application Configuration
NODE_ENV=${this.config.environment}
NEXT_PUBLIC_APP_URL=${this.config.appUrl}
NEXT_PUBLIC_APP_NAME="${this.config.appName}"
API_VERSION=v1

# Database Configuration
MONGODB_URI=${this.config.mongoUri}

# Redis Configuration (Upstash)
${this.config.redisUrl ? `UPSTASH_REDIS_REST_URL=${this.config.redisUrl}` : '# UPSTASH_REDIS_REST_URL=your-redis-url'}
${this.config.redisToken ? `UPSTASH_REDIS_REST_TOKEN=${this.config.redisToken}` : '# UPSTASH_REDIS_REST_TOKEN=your-redis-token'}

# Clerk Authentication
${this.config.clerkPublishableKey ? `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${this.config.clerkPublishableKey}` : '# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...'}
${this.config.clerkSecretKey ? `CLERK_SECRET_KEY=${this.config.clerkSecretKey}` : '# CLERK_SECRET_KEY=sk_test_...'}
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Cloudinary Configuration
${this.config.cloudinaryName ? `CLOUDINARY_CLOUD_NAME=${this.config.cloudinaryName}` : '# CLOUDINARY_CLOUD_NAME=your-cloud-name'}
${this.config.cloudinaryApiKey ? `CLOUDINARY_API_KEY=${this.config.cloudinaryApiKey}` : '# CLOUDINARY_API_KEY=your-api-key'}
${this.config.cloudinaryApiSecret ? `CLOUDINARY_API_SECRET=${this.config.cloudinaryApiSecret}` : '# CLOUDINARY_API_SECRET=your-api-secret'}
${this.config.cloudinaryName ? `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${this.config.cloudinaryName}` : '# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name'}

# Setu DigiLocker Integration
${this.config.setuApiKey ? `SETU_API_KEY=${this.config.setuApiKey}` : '# SETU_API_KEY=your-setu-api-key'}
${this.config.setuClientId ? `SETU_CLIENT_ID=${this.config.setuClientId}` : '# SETU_CLIENT_ID=your-setu-client-id'}
${this.config.setuClientSecret ? `SETU_CLIENT_SECRET=${this.config.setuClientSecret}` : '# SETU_CLIENT_SECRET=your-setu-client-secret'}
SETU_BASE_URL=https://dg-sandbox.setu.co
# SETU_WEBHOOK_SECRET=your-webhook-secret

# Security Configuration (Generated Keys Below)
ENCRYPTION_KEY=PLACEHOLDER_ENCRYPTION_KEY
HMAC_SECRET=PLACEHOLDER_HMAC_SECRET
JWT_SECRET=PLACEHOLDER_JWT_SECRET
SESSION_SECRET=PLACEHOLDER_SESSION_SECRET

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf

# OCR Configuration
TESSERACT_LANG=eng+hin+ben+tam+tel+guj+kan+mal+ori+pan+asm+mar

# Face Recognition Configuration
FACE_API_MIN_CONFIDENCE=0.7
FACE_MATCH_THRESHOLD=0.6

# KYC Configuration
KYC_APPROVAL_THRESHOLD=70
KYC_AUTO_APPROVAL_THRESHOLD=90
KYC_EXPIRY_DAYS=30
MAX_KYC_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Multi-language Support
NEXT_PUBLIC_DEFAULT_LOCALE=hi
NEXT_PUBLIC_SUPPORTED_LOCALES=hi,en,bn,ta,te,ml,kn,gu,mr,or,pa,as

# Offline Support
OFFLINE_SYNC_INTERVAL=300000
MAX_OFFLINE_QUEUE_SIZE=1000
OFFLINE_DATA_TTL=86400

# Performance Optimization
DATABASE_CONNECTION_POOL_SIZE=10
REDIS_CONNECTION_POOL_SIZE=5
IMAGE_OPTIMIZATION_QUALITY=80

# Compliance & Audit
AUDIT_LOG_RETENTION_DAYS=2555
DATA_RETENTION_DAYS=2555
PII_ENCRYPTION_ALGORITHM=aes-256-gcm

# Development Features
ENABLE_MOCK_VERIFICATION=true
ENABLE_DEBUG_LOGS=${this.config.environment === 'development'}
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true

# Production Security
SECURE_COOKIES=${this.config.environment === 'production'}
ENABLE_HTTPS_ONLY=${this.config.environment === 'production'}
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true

# Regional Configuration for India
TIMEZONE=Asia/Kolkata
CURRENCY=INR
COUNTRY_CODE=IN
DEFAULT_STATE=Maharashtra
`;
  }

  async installDependencies() {
    log.step('Installing dependencies...');
    
    try {
      log.info('Installing npm packages...');
      execSync('npm install', { 
        stdio: 'inherit',
        cwd: this.projectRoot 
      });
      log.success('Dependencies installed');
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  async setupDatabase() {
    log.step('Setting up MongoDB connection...');
    
    try {
      // Test MongoDB connection
      log.info('Testing MongoDB connection...');
      
      const testScript = `
        const mongoose = require('mongoose');
        mongoose.connect('${this.config.mongoUri}', {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }).then(() => {
          console.log('MongoDB connection successful');
          process.exit(0);
        }).catch((error) => {
          console.error('MongoDB connection failed:', error.message);
          process.exit(1);
        });
      `;
      
      fs.writeFileSync(path.join(this.projectRoot, 'test-db.js'), testScript);
      execSync('node test-db.js', { stdio: 'inherit' });
      fs.unlinkSync(path.join(this.projectRoot, 'test-db.js'));
      
      log.success('MongoDB connection verified');
    } catch (error) {
      log.warn('MongoDB connection test failed - please verify your connection string');
    }
  }

  async setupCache() {
    if (!this.config.redisUrl || !this.config.redisToken) {
      log.warn('Redis configuration not provided - caching will be limited');
      return;
    }

    log.step('Setting up Redis cache...');
    
    try {
      const testScript = `
        const { Redis } = require('@upstash/redis');
        const redis = new Redis({
          url: '${this.config.redisUrl}',
          token: '${this.config.redisToken}',
        });
        redis.ping().then(() => {
          console.log('Redis connection successful');
          process.exit(0);
        }).catch((error) => {
          console.error('Redis connection failed:', error.message);
          process.exit(1);
        });
      `;
      
      fs.writeFileSync(path.join(this.projectRoot, 'test-redis.js'), testScript);
      execSync('node test-redis.js', { stdio: 'inherit' });
      fs.unlinkSync(path.join(this.projectRoot, 'test-redis.js'));
      
      log.success('Redis connection verified');
    } catch (error) {
      log.warn('Redis connection test failed - please verify your configuration');
    }
  }

  async generateKeys() {
    log.step('Generating security keys...');
    
    const crypto = require('crypto');
    
    const keys = {
      ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
      HMAC_SECRET: crypto.randomBytes(64).toString('hex'),
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      SESSION_SECRET: crypto.randomBytes(32).toString('hex')
    };
    
    // Update .env.local with generated keys
    const envPath = path.join(this.projectRoot, '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    Object.entries(keys).forEach(([key, value]) => {
      envContent = envContent.replace(`PLACEHOLDER_${key}`, value);
    });
    
    fs.writeFileSync(envPath, envContent);
    log.success('Security keys generated and configured');
  }

  async createDirectories() {
    log.step('Creating required directories...');
    
    const directories = [
      'uploads',
      'temp',
      'logs',
      'backups',
      'public/documents',
      'scripts'
    ];
    
    directories.forEach(dir => {
      const fullPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        log.success(`Created ${dir}/`);
      }
    });
    
    // Create .gitkeep files
    const gitkeepDirs = ['uploads', 'temp', 'logs', 'backups'];
    gitkeepDirs.forEach(dir => {
      const gitkeepPath = path.join(this.projectRoot, dir, '.gitkeep');
      fs.writeFileSync(gitkeepPath, '');
    });
    
    log.success('Directory structure created');
  }

  async setupCloudinary() {
    if (!this.config.cloudinaryName) {
      log.warn('Cloudinary not configured - file uploads will use local storage');
      return;
    }

    log.step('Configuring Cloudinary...');
    
    // Create Cloudinary configuration
    const cloudinaryConfig = `
// Cloudinary Configuration for SAHAJ KYC
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Upload presets for different document types
const uploadPresets = {
  documents: {
    folder: 'sahaj-kyc/documents',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'webp', 'pdf'],
    max_file_size: 10000000, // 10MB
    quality: 'auto',
    fetch_format: 'auto'
  },
  profile: {
    folder: 'sahaj-kyc/profiles',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'webp'],
    max_file_size: 5000000, // 5MB
    quality: 'auto:good',
    transformation: [
      { width: 400, height: 400, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
};

module.exports = { cloudinary, uploadPresets };
`;
    
    fs.writeFileSync(
      path.join(this.projectRoot, 'lib', 'cloudinary-config.js'),
      cloudinaryConfig
    );
    
    log.success('Cloudinary configuration created');
  }

  async finalizeSetup() {
    log.step('Finalizing setup...');
    
    // Create package.json scripts if they don't exist
    const packagePath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const additionalScripts = {
      'db:seed': 'node scripts/seed-database.js',
      'db:migrate': 'node scripts/migrate-database.js',
      'cache:clear': 'node scripts/clear-cache.js',
      'sync:offline': 'node scripts/sync-offline-data.js',
      'type-check': 'tsc --noEmit'
    };
    
    packageJson.scripts = { ...packageJson.scripts, ...additionalScripts };
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    // Create basic utility scripts
    await this.createUtilityScripts();
    
    log.success('Setup finalized');
  }

  async createUtilityScripts() {
    const scriptsDir = path.join(this.projectRoot, 'scripts');
    
    // Database seeding script
    const seedScript = `#!/usr/bin/env node
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Add your seeding logic here
    console.log('Database seeding completed');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
`;
    
    fs.writeFileSync(path.join(scriptsDir, 'seed-database.js'), seedScript);
    
    // Cache clearing script
    const clearCacheScript = `#!/usr/bin/env node
const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

async function clearCache() {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      console.log('Redis not configured');
      return;
    }
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    await redis.flushall();
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Cache clear failed:', error);
  }
}

clearCache();
`;
    
    fs.writeFileSync(path.join(scriptsDir, 'clear-cache.js'), clearCacheScript);
  }

  displayNextSteps() {
    log.title('🎯 Next Steps');
    
    console.log(`${colors.green}1.${colors.reset} Review your configuration in ${colors.cyan}.env.local${colors.reset}`);
    console.log(`${colors.green}2.${colors.reset} Start the development server: ${colors.cyan}npm run dev${colors.reset}`);
    console.log(`${colors.green}3.${colors.reset} Open ${colors.cyan}${this.config.appUrl}${colors.reset} in your browser`);
    console.log(`${colors.green}4.${colors.reset} Set up your first admin user through Clerk Dashboard`);
    console.log(`${colors.green}5.${colors.reset} Configure additional services as needed:`);
    console.log(`   • SMS provider for OTP (Twilio)`);
    console.log(`   • Email service (Resend)`);
    console.log(`   • Monitoring (Sentry)`);
    console.log(`   • Analytics (Google Analytics)`);
    
    console.log(`\n${colors.cyan}📚 Documentation:${colors.reset}`);
    console.log(`   • API Documentation: ${this.config.appUrl}/api/docs`);
    console.log(`   • Admin Dashboard: ${this.config.appUrl}/admin`);
    console.log(`   • Health Check: ${this.config.appUrl}/api/health`);
    
    console.log(`\n${colors.yellow}⚠️  Remember to:${colors.reset}`);
    console.log(`   • Keep your .env.local secure and never commit it`);
    console.log(`   • Set up SSL certificates for production`);
    console.log(`   • Configure firewall rules`);
    console.log(`   • Set up monitoring and logging`);
    console.log(`   • Review security settings before going live`);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const setup = new SahajKYCSetup();
  setup.run().catch(console.error);
}

module.exports = SahajKYCSetup;
