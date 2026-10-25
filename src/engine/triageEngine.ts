export type Telemetry = {
  remHours: number
  deepHours: number
  hrvMs: number
  pitchJitter: number
  habitatDb: number
  checkInText: string
}

export type TriageResult = {
  sleepScore: number
  acousticScore: number
  sentimentScore: number
  cri: number
  degradationRate: number
  daysUntilCritical: number
  isCritical: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function calculateSleepRecovery(remHours: number, deepHours: number, hrvMs: number): number {
  const rem = clamp(remHours / 1.8, 0, 1)
  const deep = clamp(deepHours / 1.3, 0, 1)
  const hrv = clamp(hrvMs / 68, 0, 1)
  return Math.round((0.45 * rem + 0.35 * deep + 0.2 * hrv) * 100)
}

export function calculateAcousticStress(pitchJitter: number, habitatDb: number): number {
  const jitter = clamp(pitchJitter / 30, 0, 1)
  const noise = clamp((habitatDb - 30) / 50, 0, 1)
  return Math.round((0.65 * jitter + 0.35 * noise) * 100)
}

export function calculateSentiment(text: string): number {
  const normalized = text.toLowerCase()
  const positiveWords = ['calm', 'ready', 'optimistic', 'confident', 'steady', 'good', 'hopeful', 'focused', 'safe', 'grateful']
  const negativeWords = ['tired', 'miss', 'afraid', 'anxious', 'lonely', 'exhausted', 'overwhelmed', 'pain', 'sad', 'worried']
  const positive = positiveWords.reduce((count, word) => count + (normalized.match(new RegExp(`\\b${word}\\b`, 'g'))?.length ?? 0), 0)
  const negative = negativeWords.reduce((count, word) => count + (normalized.match(new RegExp(`\\b${word}\\b`, 'g'))?.length ?? 0), 0)
  return clamp(74 + positive * 6 - negative * 11, 0, 100)
}

export function calculateTriage(telemetry: Telemetry): TriageResult {
  const sleepScore = calculateSleepRecovery(telemetry.remHours, telemetry.deepHours, telemetry.hrvMs)
  const acousticScore = calculateAcousticStress(telemetry.pitchJitter, telemetry.habitatDb)
  const sentimentScore = calculateSentiment(telemetry.checkInText)
  const cri = Math.round(0.45 * sleepScore + 0.35 * (100 - acousticScore) + 0.2 * sentimentScore)
  const degradationRate = Number(Math.max(0.5, (100 - sleepScore) * 0.02 + acousticScore * 0.01 + (100 - sentimentScore) * 0.01).toFixed(2))
  const daysUntilCritical = cri <= 45 ? 0 : Math.ceil((cri - 45) / degradationRate)

  return {
    sleepScore,
    acousticScore,
    sentimentScore,
    cri,
    degradationRate,
    daysUntilCritical,
    isCritical: cri <= 45,
  }
}