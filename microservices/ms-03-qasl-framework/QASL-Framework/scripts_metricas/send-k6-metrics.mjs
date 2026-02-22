#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { sendMetric, checkInfluxConnection } from './influx-client.mjs';

const REPORTS_DIR = 'reports/k6';

async function main() {
    console.log('');
    console.log('  📊 K6 envía métricas directamente a InfluxDB');
    console.log('  ├── Métricas nativas: http_req_duration, http_reqs, vus, etc.');
    console.log('  └── Dashboard: http://localhost:3001');
}

main().catch(console.error);
