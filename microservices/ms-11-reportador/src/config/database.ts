// ============================================================
// MS-11: Conexion a MS-12 (PostgreSQL)
// ============================================================

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'qasl_nexus',
  user: process.env.DB_USER || 'qasl_admin',
  password: process.env.DB_PASSWORD || 'qasl_nexus_2026',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('[MS-11] Conexion a MS-12 (PostgreSQL) establecida');
    return true;
  } catch (error) {
    console.error('[MS-11] No se pudo conectar a MS-12:', error);
    return false;
  }
}
