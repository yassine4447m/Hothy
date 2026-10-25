import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateAcousticStress, calculateSentiment, calculateSleepRecovery, calculateTriage, type Telemetry } from '../src/engine/triageEngine.ts'

const baseline: Telemetry = {
  remHours: 1.8,
  deepHours: 1.3,
  hrvMs: 68,
  pitchJitter: 3,
  habitatDb: 38,
  checkInText: 'Feeling good, focused, and ready for the day.',
}

const deficit: Telemetry = {
  remHours: 0.6,
  deepHours: 0.5,
  hrvMs: 32,
  pitchJitter: 12,
  habitatDb: 55,
  checkInText: 'I feel tired and miss home, but I am ready, calm, optimistic, confident, and steady.',
}

test('optimal baseline calculates healthy recovery and no triage risk', () => {
  const result = calculateTriage(baseline)

  assert.equal(result.sleepScore, 100)
  assert.equal(result.acousticScore, 12)
  assert.equal(result.sentimentScore, 92)
  assert.equal(result.cri, 94)
  assert.equal(result.isCritical, false)
  assert.equal(result.daysUntilCritical, 98)
})

test('fragmented sleep scenario matches the five-day demo projection', () => {
  const result = calculateTriage(deficit)

  assert.equal(result.sleepScore, 38)
  assert.equal(result.acousticScore, 44)
  assert.equal(result.sentimentScore, 82)
  assert.equal(result.cri, 53)
  assert.equal(result.degradationRate, 1.86)
  assert.equal(result.daysUntilCritical, 5)
  assert.equal(result.isCritical, false)
})

test('severe combined deficits trigger immediate critical triage', () => {
  const result = calculateTriage({
    ...deficit,
    remHours: 0,
    deepHours: 0,
    hrvMs: 0,
    pitchJitter: 30,
    habitatDb: 80,
    checkInText: 'I am exhausted, afraid, overwhelmed, lonely, and sad.',
  })

  assert.equal(result.cri, 4)
  assert.equal(result.daysUntilCritical, 0)
  assert.equal(result.isCritical, true)
})

test('component scorers clamp edge telemetry and sentiment to valid bounds', () => {
  assert.equal(calculateSleepRecovery(-5, 100, 1000), 55)
  assert.equal(calculateAcousticStress(-10, 100), 35)
  assert.equal(calculateSentiment('exhausted afraid lonely overwhelmed pain sad worried'), 0)
  assert.equal(calculateSentiment('calm ready optimistic confident steady good hopeful focused safe grateful'), 100)
})