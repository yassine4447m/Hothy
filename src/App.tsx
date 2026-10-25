import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, AudioLines, Battery, Check, ChevronDown,
  CircleHelp, Clock3, Cloud, Compass, Heart, HeartPulse, Leaf, LockKeyhole,
  MessageCircle, Mic, Moon, Play, Radio, Send, ShieldCheck, SlidersHorizontal,
  Sparkles, Sun, Volume2, X,
} from 'lucide-react'
import { calculateTriage, type Telemetry } from './engine/triageEngine'

type Portal = 'astronaut' | 'command'
type Scenario = 'baseline' | 'deficit'

const STRESSED_CHECK_IN = 'I feel tired and miss home, but I am ready, calm, optimistic, confident, and steady.'

const BASELINE: Telemetry = {
  remHours: 1.8,
  deepHours: 1.3,
  hrvMs: 68,
  pitchJitter: 3,
  habitatDb: 38,
  checkInText: 'Feeling good, focused, and ready for the day.',
}

const DEFICIT: Telemetry = {
  remHours: 0.6,
  deepHours: 0.5,
  hrvMs: 32,
  pitchJitter: 12,
  habitatDb: 55,
  checkInText: STRESSED_CHECK_IN,
}

type VoiceRecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type VoiceRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: VoiceRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => VoiceRecognition
  webkitSpeechRecognition?: new () => VoiceRecognition
}

function getSleepDuration(telemetry: Telemetry): number {
  return Number(Math.max(3.8, Math.min(7.5, 3.8 + ((telemetry.remHours + telemetry.deepHours - 1.1) / 2) * 3.7)).toFixed(1))
}

function getTriageMessage(result: ReturnType<typeof calculateTriage>, degraded: boolean): string {
  const vocalTension = result.acousticScore > 35 ? 'elevated' : 'steady'
  if (degraded) {
    return `Your sleep recovery was ${result.sleepScore}% and vocal tension is ${vocalTension}. To support your recovery, I have moved your EVA Airlock Calibration to Thursday, assigned Hydroponic Tending, and unlocked a pre-loaded video from your daughter in the Local Comfort Vault.`
  }
  return `Your sleep recovery was ${result.sleepScore}% and vocal tension is ${vocalTension}. Your readings are steady. Your EVA Airlock Calibration remains on schedule, and your Local Comfort Vault is ready whenever you need it.`
}

function App() {
  const [portal, setPortal] = useState<Portal>('astronaut')
  const [scenario, setScenario] = useState<Scenario>('baseline')
  const [telemetry, setTelemetry] = useState<Telemetry>(BASELINE)
  const [comfortOpen, setComfortOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(true)
  const result = useMemo(() => calculateTriage(telemetry), [telemetry])
  const degraded = result.sleepScore < 55 || result.acousticScore > 45 || result.sentimentScore < 45

  function applyScenario(nextScenario: Scenario) {
    setScenario(nextScenario)
    setTelemetry(nextScenario === 'baseline' ? BASELINE : DEFICIT)
  }

  function updateTelemetry<K extends keyof Telemetry>(key: K, value: Telemetry[K]) {
    setTelemetry((current) => ({ ...current, [key]: value }))
  }

  function submitCheckIn(event: FormEvent<HTMLFormElement>, message: string) {
    event.preventDefault()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 0.92
      utterance.pitch = 0.95
      window.speechSynthesis.speak(utterance)
    }
    setComfortOpen(true)
  }

  const changePortal = (nextPortal: Portal) => setPortal(nextPortal)

  return (
    <main className={`app-shell ${portal === 'command' ? 'portal-command' : 'portal-astronaut'}`}>
      <header className="topbar">
        <a className="brand" href="#home" aria-label="HOTHY home">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">hothy<span>®</span></span>
          <span className="brand-divider" />
          <span className="brand-subtitle">MISSION WELLBEING</span>
        </a>
        <nav className="portal-switch" aria-label="Select workspace">
          <button className={portal === 'astronaut' ? 'active' : ''} onClick={() => changePortal('astronaut')}>
            <Heart size={15} /> <span>Portal A</span><small>Astronaut</small>
          </button>
          <button className={portal === 'command' ? 'active' : ''} onClick={() => changePortal('command')}>
            <Activity size={15} /> <span>Portal B</span><small>Mission control</small>
          </button>
        </nav>
        <div className="topbar-right">
          <div className="mission-clock"><span className="online-dot" /> MARS HABITAT <span className="clock-separator">/</span> SOL 184</div>
          <button className="avatar-button" title="Cmdr. Vance profile">EV</button>
        </div>
      </header>

      <div className="demo-bar">
        <div className="demo-copy"><span className="demo-pulse" /> LIVE DEMO <span className="demo-separator">·</span> SCENARIO</div>
        <div className="scenario-toggle" role="group" aria-label="Select health scenario">
          <button className={scenario === 'baseline' ? 'selected' : ''} onClick={() => applyScenario('baseline')}><Sun size={14} /> Optimal baseline</button>
          <button className={scenario === 'deficit' ? 'selected' : ''} onClick={() => applyScenario('deficit')}><Moon size={14} /> Fragmented sleep</button>
        </div>
        <button className="demo-help" title="Scenario controls update both portals"><CircleHelp size={16} /></button>
      </div>

      {portal === 'astronaut' ? (
        <AstronautPortal
          telemetry={telemetry}
          result={result}
          degraded={degraded}
          advancedOpen={advancedOpen}
          onAdvanced={() => setAdvancedOpen((open) => !open)}
          onUpdate={updateTelemetry}
          onSubmit={(event) => submitCheckIn(event, getTriageMessage(result, degraded))}
          onOpenVault={() => setComfortOpen(true)}
          triageMessage={getTriageMessage(result, degraded)}
        />
      ) : (
        <CommandPortal result={result} telemetry={telemetry} degraded={degraded} syncOpen={syncOpen} onSyncToggle={() => setSyncOpen((open) => !open)} />
      )}

      {comfortOpen && <ComfortModal isPlaying={isPlaying} onPlay={() => setIsPlaying((playing) => !playing)} onClose={() => setComfortOpen(false)} />}
      <footer className="app-footer">
        <span><LockKeyhole size={12} /> LOCAL-FIRST CARE <span className="footer-divider">/</span> ENCRYPTED ON-DEVICE</span>
        <span>HOTHY EDGE TRIAGE ENGINE <span className="footer-divider">·</span> V2.0.4</span>
      </footer>
    </main>
  )
}

type AstronautProps = {
  telemetry: Telemetry
  result: ReturnType<typeof calculateTriage>
  degraded: boolean
  advancedOpen: boolean
  onAdvanced: () => void
  onUpdate: <K extends keyof Telemetry>(key: K, value: Telemetry[K]) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOpenVault: () => void
  triageMessage: string
}

function AstronautPortal({ telemetry, result, degraded, advancedOpen, onAdvanced, onUpdate, onSubmit, onOpenVault, triageMessage }: AstronautProps) {
  const [isListening, setIsListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const recognitionRef = useRef<VoiceRecognition | null>(null)
  const sleepHours = getSleepDuration(telemetry)

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    const speechWindow = window as SpeechRecognitionWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceNotice('Voice input is unavailable here. Type your check-in instead.')
      return
    }
    setVoiceNotice('')
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) onUpdate('checkInText', `${telemetry.checkInText} ${transcript}`.trim())
    }
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = () => {
      setVoiceNotice('Voice capture ended. Your written check-in is still here.')
      setIsListening(false)
      recognitionRef.current = null
    }
    recognitionRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  return (
    <div className="astronaut-content page-enter">
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL MISSION COMPANION</div>
          <h1>Good morning,<br /><span>Commander Vance.</span></h1>
          <p className="welcome-note">One small step at a time. How are you feeling today?</p>
        </div>
        <div className="sol-card">
          <div className="sol-icon"><Compass size={19} /></div>
          <div><span className="micro-label">MISSION DAY</span><strong>SOL 184</strong><small>17:42 LOCAL TIME</small></div>
          <div className="sol-weather"><span>−63°</span><small>OUTSIDE</small></div>
        </div>
      </section>

      <div className="astronaut-grid">
        <section className="left-column">
          <div className="section-heading"><div><span className="section-kicker">YOUR DAY, IN BALANCE</span><h2>Today’s rhythm</h2></div><span className="freshness"><span className="online-dot" /> UPDATED JUST NOW</span></div>
          <div className="metric-strip">
            <div className="metric-cell"><div className="metric-icon sleep"><Moon size={17} /></div><div><span className="metric-label">SLEEP</span><strong>{sleepHours.toFixed(1)}<small> hrs</small></strong><span className={`metric-trend ${degraded ? 'warn' : ''}`}>{degraded ? <><ArrowDownRight size={13} /> BELOW TARGET</> : <><Check size={13} /> ON TARGET</>}</span></div></div>
            <div className="metric-cell"><div className="metric-icon hrv"><HeartPulse size={17} /></div><div><span className="metric-label">HEART VARIABILITY</span><strong>{telemetry.hrvMs}<small> ms</small></strong><span className={`metric-trend ${degraded ? 'warn' : ''}`}>{degraded ? <><ArrowDownRight size={13} /> NEEDS RECOVERY</> : <><ArrowUpRight size={13} /> STEADY</>}</span></div></div>
            <div className="metric-cell"><div className="metric-icon readiness"><Sparkles size={17} /></div><div><span className="metric-label">READINESS</span><strong>{result.cri}<small>%</small></strong><span className={`metric-trend ${degraded ? 'warn' : ''}`}>{degraded ? 'GENTLE PACE' : 'MISSION READY'}</span></div></div>
          </div>

          <section className={`task-panel ${degraded ? 'restorative' : ''}`}>
            <div className="task-topline"><span className="section-kicker">YOUR NEXT ACTIVITY</span><span className={`task-status ${degraded ? 'mint' : 'amber'}`}><span /> {degraded ? 'RESTORATIVE' : 'SCHEDULED'}</span></div>
            <div className="task-content">
              <div className={`task-art ${degraded ? 'greenhouse-art' : 'airlock-art'}`}><div className="art-orbit" /><div className="art-sun" />{degraded ? <Leaf size={30} /> : <Compass size={30} />}<span>{degraded ? '10B' : '04'}</span></div>
              <div className="task-details"><div className="task-meta">{degraded ? 'HABITAT · HYDROPONICS' : 'EXTERIOR · AIRLOCK 02'}</div><h3>{degraded ? 'Hydroponic tending' : 'EVA airlock calibration'}</h3><p>{degraded ? 'A grounding hour with the garden. Your hands know what to do.' : 'Suit seal inspection and pressure sensor recalibration.'}</p><div className="task-time"><Clock3 size={14} /> {degraded ? '10:30 AM – 11:15 AM' : '09:00 AM – 10:30 AM'} <span>·</span> {degraded ? 'LOW INTENSITY' : 'HIGH INTENSITY'}</div></div>
              <button className="task-arrow" aria-label="View activity"><ChevronDown size={18} /></button>
            </div>
            {degraded && <div className="task-note"><ShieldCheck size={15} /> EVA calibration moved to Thursday. Recovery comes first.</div>}
          </section>

          <form className="checkin-panel" onSubmit={onSubmit}>
            <div className="checkin-heading"><div className="checkin-mark"><MessageCircle size={18} /></div><div><span className="section-kicker">PRIVATE CHECK-IN</span><h2>What’s on your mind?</h2></div><span className="private-label"><LockKeyhole size={12} /> JUST FOR YOU</span></div>
            <textarea aria-label="Daily check-in" value={telemetry.checkInText} onChange={(event) => onUpdate('checkInText', event.target.value)} placeholder="Write a note, or share what’s on your mind…" rows={3} />
            <div className="checkin-actions"><div className="input-tools"><button type="button" onClick={toggleVoiceInput} title={isListening ? 'Stop voice note' : 'Start voice note'} aria-label={isListening ? 'Stop voice note' : 'Start voice note'} className={isListening ? 'listening' : ''}><Mic size={16} /></button><span>{isListening ? 'LISTENING…' : 'VOICE NOTE'}</span>{voiceNotice && <span className="voice-notice">{voiceNotice}</span>}</div><button className="submit-checkin" type="submit">Share check-in <Send size={15} /></button></div>
          </form>
        </section>

        <aside className="right-column">
          <section className="care-card">
            <div className="care-heading"><div><span className="section-kicker">A NOTE FROM HOTHY</span><div className="care-title"><span className="care-spark"><Sparkles size={16} /></span><h2>Your wellbeing</h2></div></div><span className="care-online"><i /> HERE WITH YOU</span></div>
            <div className={`care-insight ${degraded ? 'concern' : ''}`}><div className="insight-symbol">{degraded ? <Heart size={18} /> : <Sun size={18} />}</div><div><strong>{degraded ? 'A softer day is a strong choice.' : 'You’re finding your rhythm.'}</strong><p>{degraded ? 'Your body is asking for a little more care. I’ve adjusted your plan so you can restore without falling behind.' : 'Your sleep and recovery are holding steady. Keep listening to what your body needs.'}</p></div></div>
            <button className="vault-link" onClick={onOpenVault}><div className="vault-thumb"><Heart size={16} /></div><div><strong>Local Comfort Vault</strong><span>A little piece of home, always close</span></div><ChevronDown size={16} className="vault-chevron" /></button>
            <div className="care-foot"><span><LockKeyhole size={12} /> STORED ON THIS DEVICE</span><span>NO SIGNAL NEEDED</span></div>
          </section>

          <section className="telemetry-card">
            <button className="telemetry-toggle" onClick={onAdvanced} aria-expanded={advancedOpen}><div><span className="section-kicker">LIVE TELEMETRY</span><strong><Activity size={15} /> Personal signals</strong></div><SlidersHorizontal size={16} /></button>
            <div className="signal-list"><Signal label="REM sleep" value={`${telemetry.remHours.toFixed(1)} h`} percent={Math.round(telemetry.remHours / 1.8 * 100)} tone="amber" /><Signal label="Deep sleep" value={`${telemetry.deepHours.toFixed(1)} h`} percent={Math.round(telemetry.deepHours / 1.3 * 100)} tone="mint" /><Signal label="Vocal ease" value={`${100 - result.acousticScore}%`} percent={100 - result.acousticScore} tone={degraded ? 'coral' : 'cyan'} /></div>
            {advancedOpen && <div className="slider-controls"><RangeControl label="Sleep duration" value={sleepHours} min={3.8} max={7.5} step={0.1} suffix="h" onChange={(value) => { const recovery = (value - 3.8) / 3.7; onUpdate('remHours', Number((0.6 + 1.2 * recovery).toFixed(2))); onUpdate('deepHours', Number((0.5 + 0.8 * recovery).toFixed(2))) }} /><RangeControl label="HRV" value={telemetry.hrvMs} min={20} max={90} step={1} suffix="ms" onChange={(value) => onUpdate('hrvMs', value)} /><RangeControl label="Vocal jitter" value={telemetry.pitchJitter} min={0} max={20} step={1} suffix="%" onChange={(value) => onUpdate('pitchJitter', value)} /><RangeControl label="Habitat noise" value={telemetry.habitatDb} min={30} max={80} step={1} suffix="dB" onChange={(value) => onUpdate('habitatDb', value)} /></div>}
            <div className="telemetry-foot"><span><Radio size={12} /> EDGE COMPUTED</span><span>LAST SAMPLE · 2 MIN AGO</span></div>
          </section>

          {degraded && <button className="speech-replay" onClick={() => { if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(triageMessage)) }}><Volume2 size={15} /> Hear your triage summary</button>}
        </aside>
      </div>
    </div>
  )
}

function Signal({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: string }) {
  return <div className="signal-row"><div className="signal-label"><span>{label}</span><strong>{value}</strong></div><div className="signal-track"><span className={`signal-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div></div>
}

function RangeControl({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range-control"><span>{label}</span><div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output>{value}{suffix}</output></div></label>
}

type CommandProps = {
  result: ReturnType<typeof calculateTriage>
  telemetry: Telemetry
  degraded: boolean
  syncOpen: boolean
  onSyncToggle: () => void
}

function CommandPortal({ result, telemetry, degraded, syncOpen, onSyncToggle }: CommandProps) {
  const payload = useMemo(() => JSON.stringify({ v: 2, crew: 'EV', sol: 184, cri: result.cri, sleep: result.sleepScore, acoustic: result.acousticScore, sentiment: result.sentimentScore, risk: result.isCritical ? 'critical' : degraded ? 'elevated' : 'nominal', daysToThreshold: result.daysUntilCritical, vitals: { hrv: telemetry.hrvMs, rem: telemetry.remHours, deep: telemetry.deepHours }, action: degraded ? 'hydroponic_tending' : 'nominal_schedule' }), [result, degraded, telemetry])
  return (
    <div className="command-content page-enter">
      <div className="command-title-row"><div><div className="eyebrow"><span className="eyebrow-line" /> EARTH–MARS MISSION OPERATIONS</div><h1>Crew health <span>overview.</span></h1><p>Habitat A · Mars transit · Local-first triage active</p></div><div className="command-live"><span className="online-dot" /> EDGE NODE ONLINE <span className="command-live-divider">/</span> 48M 12S LATENCY</div></div>
      <div className="command-summary">
        <div className="summary-label"><span>CREW READINESS INDEX</span><small>DETERMINISTIC · ON-DEVICE</small></div>
        <div className="cri-display"><strong className={result.cri <= 45 ? 'critical-text' : degraded ? 'elevated-text' : ''}>{result.cri}</strong><span>/ 100</span><div className="cri-meter"><i style={{ width: `${result.cri}%` }} /></div></div>
            <div className={`burnout-alert ${result.cri <= 45 ? 'critical' : degraded ? 'elevated critical' : 'nominal'}`}><div className="burnout-symbol">{result.cri <= 45 ? <Activity size={18} /> : degraded ? <Clock3 size={18} /> : <ShieldCheck size={18} />}</div><div><span>{result.cri <= 45 ? 'TRIAGE REQUIRED' : degraded ? 'PROJECTED THRESHOLD' : 'BURNOUT RISK'}</span><strong>{result.cri <= 45 ? 'CRITICAL NOW' : degraded ? `${result.daysUntilCritical} DAYS UNTIL CRITICAL BURNOUT` : `NOMINAL · ${result.daysUntilCritical} DAYS`}</strong><small>{degraded ? `Estimated decline ${result.degradationRate} pts / day` : 'No acute risk detected'}</small></div></div>
        <div className="summary-sol"><span>SOL</span><strong>184</strong><small>MISSION ELAPSED</small></div>
      </div>

      <div className="command-metrics">
        <MetricPanel label="SLEEP RECOVERY" code="S_SCORE" value={result.sleepScore} unit="%" icon={<Moon size={16} />} tone={result.sleepScore < 50 ? 'red' : 'cyan'} baseline="100%" sub={`${telemetry.remHours.toFixed(1)}h REM+deep restorative`} />
        <MetricPanel label="ACOUSTIC STRESS" code="A_SCORE" value={result.acousticScore} unit="%" icon={<AudioLines size={16} />} tone={result.acousticScore > 55 ? 'red' : 'mint'} baseline="0%" sub={`${telemetry.pitchJitter}% pitch jitter · ${telemetry.habitatDb} dB`} />
        <MetricPanel label="LINGUISTIC SENTIMENT" code="L_SCORE" value={result.sentimentScore} unit="%" icon={<MessageCircle size={16} />} tone={result.sentimentScore < 45 ? 'red' : 'mint'} baseline="74%" sub="Daily check-in · local analysis" />
        <MetricPanel label="HEART VARIABILITY" code="HRV" value={telemetry.hrvMs} unit="ms" icon={<HeartPulse size={16} />} tone={telemetry.hrvMs < 40 ? 'red' : 'cyan'} baseline="68ms" sub="Wearable telemetry · 2m ago" />
      </div>

      <div className="command-lower-grid">
        <section className="ops-panel pairing-panel">
          <div className="panel-heading"><div><span className="section-kicker">CREW SAFETY</span><h2>Crew pairing matrix</h2></div><span className="panel-tag">EVA SECTOR 4</span></div>
          <div className={`pairing-warning ${degraded ? 'warning-on' : ''}`}><div className="pairing-icon">{degraded ? <ShieldCheck size={18} /> : <Check size={18} />}</div><div><span>{degraded ? 'PAIRING RESTRICTION ACTIVE' : 'NO ACTIVE RESTRICTIONS'}</span><strong>{degraded ? 'DO NOT PAIR: Vance + Chen on EVA Sector 4' : 'All crew pairings cleared for EVA'}</strong><small>{degraded ? 'Stress-pattern conflict · Review at next Earth sync' : 'Last reviewed 06:00 Habitat Local'}</small></div><span className="matrix-state">{degraded ? 'FLAGGED' : 'CLEAR'}</span></div>
          <div className="pairing-crew"><div className="crew-chip"><span className="crew-avatar amber-avatar">EV</span><span><strong>Vance</strong><small>COMMANDER · {result.cri}% CRI</small></span></div><span className="pairing-x">×</span><div className="crew-chip"><span className="crew-avatar cyan-avatar">LC</span><span><strong>Chen</strong><small>FLIGHT ENGINEER · 81% CRI</small></span></div></div>
        </section>

        <section className="ops-panel mission-panel">
          <div className="panel-heading"><div><span className="section-kicker">AUTONOMOUS RESPONSE</span><h2>Mission adjustments</h2></div><span className={`status-pill ${degraded ? 'amber-pill' : ''}`}><span /> {degraded ? 'ADAPTED' : 'NOMINAL'}</span></div>
          <div className="adjustment-row"><div className="adjustment-icon moved"><Clock3 size={16} /></div><div><span> EVA AIRLOCK CALIBRATION</span><strong>{degraded ? 'Moved to Thursday' : 'Scheduled · Today 09:00'}</strong></div><span className={`adjustment-state ${degraded ? 'delayed' : ''}`}>{degraded ? 'DEFERRED' : 'READY'}</span></div>
          <div className="adjustment-row"><div className="adjustment-icon assigned"><Leaf size={16} /></div><div><span> RESTORATIVE ACTIVITY</span><strong>{degraded ? 'Hydroponic Tending · 10B' : 'Available · Hydroponics'}</strong></div><span className="adjustment-state mint-state">{degraded ? 'ASSIGNED' : 'OPTIONAL'}</span></div>
          <div className="adjustment-row"><div className="adjustment-icon comfort"><Heart size={16} /></div><div><span> LOCAL COMFORT VAULT</span><strong>{degraded ? 'Family video unlocked' : 'Encrypted · On-device'}</strong></div><span className="adjustment-state">{degraded ? 'READY' : 'STANDBY'}</span></div>
        </section>
      </div>

      <section className="sync-panel">
        <button className="sync-heading" onClick={onSyncToggle} aria-expanded={syncOpen}><div className="sync-icon"><Cloud size={18} /></div><div className="sync-heading-copy"><span className="section-kicker">STORE-AND-FORWARD</span><strong>Earth HQ sync <span className="sync-pending"><i /> QUEUED FOR WINDOW</span></strong><small>Predictive telemetry packet prepared locally · Next uplink in 00:18:42</small></div><div className="compression-stat"><span>RAW AUDIO + BIOMETRICS</span><strong>450<span>MB</span> <ArrowDownRight size={16} /> <b>1.8<span>KB</span></b></strong></div><ChevronDown size={16} className={`sync-chevron ${syncOpen ? 'open' : ''}`} /></button>
        {syncOpen && <div className="sync-body"><div className="payload-label"><span><span className="online-dot" /> LIVE COMPRESSED JSON SUMMARY</span><span>LOSSLESS FEATURES · PREDICTIVE ONLY</span></div><pre className="payload-code">{JSON.stringify(JSON.parse(payload), null, 2)}</pre><div className="sync-bottom"><span><LockKeyhole size={12} /> AES-256 ENCRYPTED · TRANSMISSION DEFERRED FOR LATENCY WINDOW</span><span>99.9996% SIZE REDUCTION</span></div></div>}
      </section>
      <div className="command-note"><Battery size={14} /> ON-DEVICE DECISIONING CONTINUES DURING COMMUNICATION BLACKOUT <span>·</span> <span className="command-note-right">LAST HQ CONTACT 18H 12M AGO</span></div>
    </div>
  )
}

function MetricPanel({ label, code, value, unit, icon, tone, baseline, sub }: { label: string; code: string; value: number; unit: string; icon: ReactNode; tone: string; baseline: string; sub: string }) {
  return <section className="metric-panel"><div className="metric-panel-head"><span>{icon}{label}</span><small>{code}</small></div><div className="metric-panel-value"><strong className={tone === 'red' ? 'critical-text' : ''}>{value}</strong><span>{unit}</span></div><div className="metric-panel-bar"><i className={tone} style={{ width: `${value}%` }} /></div><div className="metric-panel-foot"><span>{sub}</span><small>REF {baseline}</small></div></section>
}

function ComfortModal({ isPlaying, onPlay, onClose }: { isPlaying: boolean; onPlay: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="comfort-modal" role="dialog" aria-modal="true" aria-labelledby="vault-title"><button className="modal-close" onClick={onClose} aria-label="Close comfort vault"><X size={18} /></button><div className="modal-eyebrow"><LockKeyhole size={13} /> LOCAL COMFORT VAULT <span>· OFFLINE</span></div><div className="family-video"><img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85" alt="A parent and child sharing a quiet moment together" /><div className="film-vignette" /><div className={`film-caption ${isPlaying ? 'caption-active' : ''}`}><span>{isPlaying ? 'PLAYING FROM YOUR COMFORT VAULT' : 'A MESSAGE FROM HOME'}</span><strong>{isPlaying ? '“We’re so proud of you, Dad.”' : 'A little piece of home.'}</strong><small>ELLA · 00:42 · SAVED BEFORE LAUNCH</small></div><button className={`play-button ${isPlaying ? 'playing' : ''}`} onClick={onPlay} aria-label={isPlaying ? 'Pause family video' : 'Play family video'}>{isPlaying ? <span className="pause-symbol">Ⅱ</span> : <Play size={22} fill="currentColor" />}</button><div className="video-progress"><i style={{ width: isPlaying ? '62%' : '12%' }} /></div></div><div className="modal-message"><div className="message-heart"><Heart size={19} fill="currentColor" /></div><div><h2 id="vault-title">You’re never far from home.</h2><p>This video was saved securely before launch and is always here, even without a signal.</p></div></div><div className="vault-security"><ShieldCheck size={14} /> ENCRYPTED ON THIS DEVICE <span>·</span> NEVER TRANSMITTED</div></section></div>
}

export default App