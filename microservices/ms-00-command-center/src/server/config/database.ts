// ============================================================
// MS-00: Conexion a PostgreSQL (MS-12)
// Patron identico a MS-08/MS-10/MS-11
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
});

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('[MS-00] PostgreSQL connection OK');
    return true;
  } catch (error) {
    console.error('[MS-00] PostgreSQL connection failed:', error);
    return false;
  }
}
