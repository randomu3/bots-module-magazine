#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import Migrator from '../database/migrator';
import { testConnection } from '../config/database';

// Load environment variables
dotenv.config();

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration process...');
    
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Run migrations
    const migrator = new Migrator();
    await migrator.runMigrations();
    
    console.log('✅ Migration process completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function rollbackMigration() {
  try {
    console.log('🔄 Rolling back last migration...');
    
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to database. Please check your configuration.');
      process.exit(1);
    }

    const migrator = new Migrator();
    await migrator.rollbackLastMigration();
    
    console.log('✅ Rollback completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const command = process.argv[2];

switch (command) {
  case 'up':
    runMigrations();
    break;
  case 'down':
    rollbackMigration();
    break;
  default:
    console.log('Usage: npm run migrate:up or npm run migrate:down');
    process.exit(1);
}