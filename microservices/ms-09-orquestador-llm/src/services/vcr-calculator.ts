// ============================================================
// MS-09: VCR Calculator
// Calcula Value + Cost + Risk para decidir automatizacion
// Escribe resultados en MS-12 (vcr_score)
// ============================================================

import { VCRInput, VCRResult } from '../types';
import { DecisionEngine } from './decision-engine';
import { pool } from '../config/database';

const engine = new DecisionEngine();

const VCR_PROMPT = `Analiza la siguiente Historia de Usuario y calcula el score VCR.

REGLAS:
- Valor (1-3): 1=Bajo impacto, 2=Medio, 3=Critico para el negocio
- Costo (1-3): 1=Simple setup, 2=Setup medio, 3=Setup complejo
- Probabilidad (1-4): 1=Muy baja, 2=Baja, 3=Media, 4=Alta probabilidad de fallo
- Impacto (1-4): 1=Minimo, 2=Bajo, 3=Medio, 4=Bloquea el sistema
- Riesgo = Probabilidad x Impacto
- VCR Total = Valor + Costo + Riesgo
- Si VCR >= 9: AUTOMATIZAR
- Si VCR < 9: MANUAL

Responde SOLO en formato JSON:
{
  "vcr_valor": <numero>,
  "vcr_costo": <numero>,
  "vcr_probabilidad": <numero>,
  "vcr_impacto": <numero>,
  "justificacion": "<explicacion breve>"
}`;

export class VCRCalculator {

  /**
   * Calcula VCR para una User Story usando IA
   */
  async calculate(input: VCRInput): Promise<VCRResult> {
    const context = [
      `ID: ${input.us_id}`,
      `Nombre: ${input.nombre_hu}`,
      `Prioridad: ${input.prioridad}`,
      `Criterios de Aceptacion: ${input.criterios_aceptacion}`,
      `Reglas de Negocio: ${input.reglas_negocio}`,
    ].join('\n');

    const response = await engine.process({
      taskType: 'vcr_calculation',
      prompt: VCR_PROMPT,
      context,
      temperature: 0.1,
    });

    // Parsear respuesta JSON del LLM
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM no retorno JSON valido para VCR');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const riesgo = parsed.vcr_probabilidad * parsed.vcr_impacto;
    const total = parsed.vcr_valor + parsed.vcr_costo + riesgo;

    const result: VCRResult = {
      us_id: input.us_id,
      tc_id: input.tc_id,
      vcr_valor: parsed.vcr_valor,
      vcr_costo: parsed.vcr_costo,
      vcr_probabilidad: parsed.vcr_probabilidad,
      vcr_impacto: parsed.vcr_impacto,
      vcr_riesgo: riesgo,
      vcr_total: total,
      decision: total >= 9 ? 'AUTOMATIZAR' : 'MANUAL',
      justificacion: parsed.justificacion,
      calculado_por: response.provider,
    };

    return result;
  }

  /**
   * Calcula VCR y lo guarda en MS-12
   */
  async calculateAndSave(input: VCRInput): Promise<VCRResult> {
    const result = await this.calculate(input);

    await pool.query(
      `INSERT INTO vcr_score (us_id, tc_id, vcr_valor, vcr_costo, vcr_probabilidad, vcr_impacto, vcr_riesgo, vcr_total, decision, justificacion, calculado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (us_id, tc_id) DO UPDATE SET
         vcr_valor = EXCLUDED.vcr_valor,
         vcr_costo = EXCLUDED.vcr_costo,
         vcr_probabilidad = EXCLUDED.vcr_probabilidad,
         vcr_impacto = EXCLUDED.vcr_impacto,
         vcr_riesgo = EXCLUDED.vcr_riesgo,
         vcr_total = EXCLUDED.vcr_total,
         decision = EXCLUDED.decision,
         justificacion = EXCLUDED.justificacion,
         calculado_por = EXCLUDED.calculado_por`,
      [
        result.us_id, result.tc_id,
        result.vcr_valor, result.vcr_costo,
        result.vcr_probabilidad, result.vcr_impacto,
        result.vcr_riesgo, result.vcr_total,
        result.decision, result.justificacion,
        result.calculado_por,
      ]
    );

    console.log(`[VCR] ${result.us_id}: VCR=${result.vcr_total} → ${result.decision}`);
    return result;
  }
}
