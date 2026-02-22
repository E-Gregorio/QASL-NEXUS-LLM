const INFLUX_URL = process.env.INFLUX_URL || 'http://localhost:8086';
const INFLUX_DB = process.env.INFLUX_DB || 'qa_metrics';

async function ensureDatabase() {
    try {
        await fetch(`${INFLUX_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `q=CREATE DATABASE ${INFLUX_DB}`
        });
    } catch {
        // Silently ignore - database may already exist
    }
}

export async function sendMetric(measurement, tags, fields) {
    // Asegurar que la base de datos existe antes de enviar
    await ensureDatabase();

    const tagString = Object.entries(tags)
        .map(([k, v]) => `${k}=${String(v).replace(/ /g, '\\ ')}`)
        .join(',');

    const fieldString = Object.entries(fields)
        .map(([k, v]) => typeof v === 'string' ? `${k}="${v}"` : `${k}=${v}`)
        .join(',');

    const line = `${measurement},${tagString} ${fieldString}`;

    try {
        const response = await fetch(`${INFLUX_URL}/write?db=${INFLUX_DB}`, {
            method: 'POST',
            body: line
        });

        if (!response.ok) {
            console.error(`  ⚠️ Error enviando métrica: ${response.status}`);
            return false;
        }
        return true;
    } catch (error) {
        console.error(`  ⚠️ InfluxDB no disponible: ${error.message}`);
        return false;
    }
}

export async function checkInfluxConnection() {
    try {
        const response = await fetch(`${INFLUX_URL}/ping`);
        return response.ok;
    } catch {
        return false;
    }
}

export async function sendE2EMetrics({ suite, passed, failed, skipped, duration }) {
    const total = passed + failed + skipped;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return sendMetric('e2e_tests',
        { suite: suite || 'default', type: 'e2e' },
        {
            passed: passed,
            failed: failed,
            skipped: skipped,
            total: total,
            pass_rate: passRate,
            duration: duration || 0
        }
    );
}

export async function sendAPIMetrics({ collection, passed, failed, total_requests, duration }) {
    // Pass rate basado en assertions (passed vs passed+failed)
    const totalAssertions = passed + failed;
    const passRate = totalAssertions > 0 ? (passed / totalAssertions) * 100 : 0;

    return sendMetric('api_tests',
        { collection: collection || 'default', type: 'api' },
        {
            passed: passed,
            failed: failed,
            total_requests: total_requests,
            pass_rate: passRate,
            duration: duration || 0
        }
    );
}

export async function sendZAPMetrics({ target, high, medium, low, informational }) {
    const total = high + medium + low + informational;

    return sendMetric('zap_security',
        { target: target || 'unknown', type: 'security' },
        {
            high: high,
            medium: medium,
            low: low,
            informational: informational,
            total_alerts: total
        }
    );
}

export default {
    sendMetric,
    checkInfluxConnection,
    sendE2EMetrics,
    sendAPIMetrics,
    sendZAPMetrics
};
