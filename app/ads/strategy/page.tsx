'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import styles from './page.module.css'

type CellStatus = 'untested' | 'testing' | 'inconclusive' | 'winner' | 'fatigued' | 'loser' | 'over_tested'

type Cell = {
  angle: string
  persona: string
  format: string | null
  hook_family: string | null
  status: CellStatus
  test_count: number
  winner_count: number
  best_roas: number | null
  competitor_signal: number
  confidence: 'high' | 'medium' | 'low' | 'gap'
  top_ad_ids: string[]
}

type MapResponse = {
  cells: Cell[]
  summary: {
    total_cells: number
    tested_cells: number
    winning_cells: number
    fatiguing_cells: number
    untested_cells: number
    coverage_pct: number
  }
  gaps: Array<{ angle: string; persona: string; priority: 'high' | 'medium' | 'low'; reason: string; competitor_signal: number }>
  last_updated: string
}

type DetailResponse = {
  cell: Cell & { suggested_action: 'scale' | 'refresh' | 'explore' | 'test_format' | 'test_hook_family' }
  ads: Array<{
    id: string
    ad_name: string
    status: string
    format: string | null
    hook_preview: string
    hook_family: string | null
    roas: number | null
    cpa: number | null
    ctr: number | null
    spend: number | null
    mechanism: string | null
  }>
  hook_coverage: { tested: string[]; untested: string[] }
  format_coverage: { tested: string[]; untested: string[] }
  top_performer: null | { ad_name: string; roas: number | null }
  recommendations: string[]
}

const fmt = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase())

export default function AdsStrategyPage() {
  const [data, setData] = useState<MapResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCell, setSelectedCell] = useState<{ angle: string; persona: string } | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [formatFilter, setFormatFilter] = useState('all')
  const [personaFilter, setPersonaFilter] = useState('all')
  const [hookFilter, setHookFilter] = useState('all')

  useEffect(() => {
    fetch('/api/ads/experiment-map')
      .then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load experiment map')
        setData(json)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load experiment map'))
      .finally(() => setLoading(false))
  }, [])

  const aggregateCells = useMemo(() => {
    const all = (data?.cells || []).filter(cell => cell.format === null && cell.hook_family === null)
    return all
      .filter(cell => (personaFilter === 'all' ? true : cell.persona === personaFilter))
      .sort((a, b) => b.test_count - a.test_count)
  }, [data, personaFilter])

  const angles = useMemo(() => Array.from(new Set(aggregateCells.map(cell => cell.angle))).slice(0, 5), [aggregateCells])
  const personas = useMemo(() => Array.from(new Set(aggregateCells.map(cell => cell.persona))).slice(0, 4), [aggregateCells])

  const currentCell = useMemo(() => {
    if (!selectedCell) return null
    return aggregateCells.find(cell => cell.angle === selectedCell.angle && cell.persona === selectedCell.persona) || null
  }, [aggregateCells, selectedCell])

  useEffect(() => {
    if (!selectedCell) return
    const params = new URLSearchParams({ angle: selectedCell.angle, persona: selectedCell.persona })
    fetch(`/api/ads/experiment-map/cell?${params.toString()}`)
      .then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load cell detail')
        setDetail(json)
      })
      .catch(() => setDetail(null))
  }, [selectedCell])

  const filterFormats = Array.from(new Set((data?.cells || []).map(c => c.format).filter(Boolean))) as string[]
  const filterPersonas = Array.from(new Set((data?.cells || []).map(c => c.persona)))
  const filterHooks = Array.from(new Set((data?.cells || []).map(c => c.hook_family).filter(Boolean))) as string[]

  if (loading) return <div className={styles.page}><div className={styles.empty}>Loading experiment map…</div></div>
  if (error) return <div className={styles.page}><div className={styles.empty}>{error}</div></div>
  if (!data) return <div className={styles.page}><div className={styles.empty}>No data available.</div></div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Experiment Map</h1>
        <p className={styles.subtitle}>What you&apos;ve tested, what&apos;s working, and what&apos;s next.</p>
      </header>

      <section className={styles.summaryBar}>
        <div><strong>{data.summary.tested_cells}</strong> / {data.summary.total_cells} cells tested</div>
        <div><strong>{data.summary.coverage_pct}%</strong> coverage</div>
        <div><strong>{data.summary.winning_cells}</strong> winning</div>
        <div><strong>{data.summary.fatiguing_cells}</strong> fatiguing</div>
      </section>

      <section className={styles.filters}>
        <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
          <option value="all">All Formats</option>
          {filterFormats.map(item => <option key={item} value={item}>{fmt(item)}</option>)}
        </select>
        <select value={personaFilter} onChange={e => setPersonaFilter(e.target.value)}>
          <option value="all">All Personas</option>
          {filterPersonas.map(item => <option key={item} value={item}>{fmt(item)}</option>)}
        </select>
        <select value={hookFilter} onChange={e => setHookFilter(e.target.value)}>
          <option value="all">All Hook Families</option>
          {filterHooks.map(item => <option key={item} value={item}>{fmt(item)}</option>)}
        </select>
      </section>

      <section className={styles.matrix}>
        <div className={styles.corner} />
        {personas.map(persona => <div className={styles.colHead} key={persona}>{fmt(persona)}</div>)}
        {angles.map(angle => (
          <Fragment key={angle}>
            <div className={styles.rowHead}>{fmt(angle)}</div>
            {personas.map(persona => {
              const cell = aggregateCells.find(item => item.angle === angle && item.persona === persona)
              if (!cell) return <button key={`${angle}-${persona}`} className={`${styles.cell} ${styles.untested}`} />
              if (formatFilter !== 'all' || hookFilter !== 'all') {
                const hasMatch = (data.cells || []).some(item =>
                  item.angle === angle && item.persona === persona
                  && (formatFilter === 'all' || item.format === formatFilter)
                  && (hookFilter === 'all' || item.hook_family === hookFilter)
                  && (item.format !== null || item.hook_family !== null)
                )
                if (!hasMatch) return <button key={`${angle}-${persona}`} className={`${styles.cell} ${styles.muted}`} />
              }
              const selected = selectedCell?.angle === angle && selectedCell?.persona === persona
              return (
                <button key={`${angle}-${persona}`} className={`${styles.cell} ${styles[cell.status]} ${selected ? styles.selected : ''}`} onClick={() => setSelectedCell({ angle, persona })}>
                  <span className={styles.cellCount}>{cell.test_count} tests</span>
                  <span className={styles.cellRoas}>{cell.best_roas ? `${cell.best_roas.toFixed(1)}x` : '—'}</span>
                  {cell.competitor_signal > 0 ? <span className={styles.dot} /> : null}
                </button>
              )
            })}
          </Fragment>
        ))}
      </section>

      {currentCell && detail ? (
        <section className={styles.drawer}>
          <h2>{fmt(currentCell.angle)} × {fmt(currentCell.persona)}</h2>
          <div className={styles.tabs}>
            <div>
              <h3>Ad History</h3>
              <ul>
                {detail.ads.slice(0, 6).map(ad => (
                  <li key={ad.id}>{ad.ad_name} — {ad.roas ? `${ad.roas.toFixed(1)}x` : 'no roas'} ({ad.status})</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Hook Coverage</h3>
              <p>✓ {detail.hook_coverage.tested.map(fmt).join(', ') || 'None tested'}</p>
              <p>○ {detail.hook_coverage.untested.map(fmt).slice(0, 5).join(', ') || 'No major gaps'}</p>
            </div>
            <div>
              <h3>Format Coverage</h3>
              <p>✓ {detail.format_coverage.tested.map(fmt).join(', ') || 'None tested'}</p>
              <p>○ {detail.format_coverage.untested.map(fmt).join(', ') || 'No gaps'}</p>
            </div>
            <div>
              <h3>What to Try</h3>
              <ul>{detail.recommendations.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
          <div className={styles.actions}>
            <button>{detail.cell.suggested_action === 'scale' ? 'Scale this winner →' : detail.cell.suggested_action === 'refresh' ? 'Refresh this →' : detail.cell.suggested_action === 'test_hook_family' ? 'Test new hook family →' : detail.cell.suggested_action === 'test_format' ? 'Test new format →' : 'Explore this gap →'}</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
