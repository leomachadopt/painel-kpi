import { KPI, Alert } from '@/lib/types'

export interface SummaryData {
  strengths: { name: string; value: string; change: number }[]
  criticalPoints: { name: string; value: string; change: number }[]
  actions: string[]
  fullText: string
}

export const formatKPIValue = (val: number, unit: string) => {
  if (unit === 'currency') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(val)
  }
  if (unit === 'percent') {
    return `${val.toFixed(1)}%`
  }
  if (unit === 'ratio') {
    return `${val.toFixed(2)}x`
  }
  if (unit === 'time') {
    return `${val} min`
  }
  return val.toLocaleString('pt-BR')
}

const ALERT_ACTION_MAP: Record<string, string> = {
  acceptance_rate:
    'Agendar treino de apresentação de planos e objeções com a equipa.',
  leads:
    'Rever campanhas digitais e programar ações de indicação de pacientes satisfeitos.',
  billing: 'Rever estratégia comercial e volume de primeiras consultas.',
  ticket: 'Analisar mix de tratamentos e tabela de preços.',
  occupancy: 'Otimizar agenda e confirmar presenças para reduzir ociosidade.',
  nps: 'Realizar pesquisa de satisfação detalhada e contactar detratores.',
  complaints: 'Gerir reclamações pendentes e treinar equipa em atendimento.',
  aligners: 'Focar em campanhas de alinhadores e formação clínica.',
}

export const generateSummary = (
  clinicName: string,
  monthName: string,
  year: number,
  kpis: KPI[],
  alerts: Alert[],
): SummaryData => {
  // Strengths: Top 3 Success KPIs (by growth/change descending)
  const strengths = kpis
    .filter((k) => k.status === 'success')
    .sort((a, b) => b.change - a.change)
    .slice(0, 3)
    .map((k) => ({
      name: k.name,
      value: formatKPIValue(k.value, k.unit),
      change: k.change,
    }))

  // Critical Points: Top 3 Danger KPIs (by change ascending - worst drops)
  const criticalPoints = kpis
    .filter((k) => k.status === 'danger')
    .sort((a, b) => a.change - b.change)
    .slice(0, 3)
    .map((k) => ({
      name: k.name,
      value: formatKPIValue(k.value, k.unit),
      change: k.change,
    }))

  // Actions: Map alerts to actions, take top 3
  const actions = alerts
    .slice(0, 3)
    .map(
      (alert) =>
        ALERT_ACTION_MAP[alert.id] ||
        `Analisar ${alert.rule} e traçar plano de correção.`,
    )

  // Construct Full Text for Clipboard
  let fullText = `📋 *Resumo de Performance - ${clinicName}*\n`
  fullText += `📅 ${monthName} ${year}\n\n`

  fullText += `✅ *Pontos Fortes*\n`
  if (strengths.length > 0) {
    strengths.forEach((s) => {
      const changeStr =
        s.change > 0 ? `+${s.change.toFixed(1)}%` : `${s.change.toFixed(1)}%`
      fullText += `• ${s.name}: ${s.value} (${changeStr} vs mês ant.)\n`
    })
  } else {
    fullText += `• Nenhum ponto forte destacado este mês.\n`
  }
  fullText += `\n`

  fullText += `⚠️ *Pontos Críticos*\n`
  if (criticalPoints.length > 0) {
    criticalPoints.forEach((c) => {
      const changeStr =
        c.change > 0 ? `+${c.change.toFixed(1)}%` : `${c.change.toFixed(1)}%`
      fullText += `• ${c.name}: ${c.value} (${changeStr} vs mês ant.)\n`
    })
  } else {
    fullText += `• Nenhum ponto crítico destacado este mês.\n`
  }
  fullText += `\n`

  fullText += `🚀 *Ações Recomendadas*\n`
  if (actions.length > 0) {
    actions.forEach((a) => {
      fullText += `• ${a}\n`
    })
  } else {
    fullText += `• Manter monitoramento dos indicadores.\n`
  }

  return { strengths, criticalPoints, actions, fullText }
}
