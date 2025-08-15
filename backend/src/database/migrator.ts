import fs from 'fs';
import path from 'path';
import pool from '../config/database';

interface Migration {
  id: number;
  name: string;
  filename: string;
  sql: string;
}

class Migrator {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(query);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await pool.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  }

  async getMigrationFiles(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const id = parseInt(filename.split('_')[0] || '0');
      const name = filename.replace('.sql', '');

      return { id, name, filename, sql };
    });
  }

  async executeMigration(migration: Migration): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute migration SQL
      await client.query(migration.sql);
      
      // Record migration as executed
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Executed migration: ${migration.name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to execute migration ${migration.name}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get executed migrations and available migration files
      const [executedMigrations, migrationFiles] = await Promise.all([
        this.getExecutedMigrations(),
        this.getMigrationFiles()
      ]);

      // Filter out already executed migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedMigrations.includes(migration.name)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async rollbackLastMigration(): Promise<void> {
    const result = await pool.query(
      'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = result.rows[0].name;
    
    // Note: This is a basic implementation. In a production system,
    // you would want to have rollback SQL files for each migration
    await pool.query('DELETE FROM migrations WHERE name = $1', [lastMigration]);
    console.log(`🔄 Rolled back migration: ${lastMigration}`);
  }
}

export default Migrator;