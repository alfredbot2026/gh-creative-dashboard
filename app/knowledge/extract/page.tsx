'use client'

import { useState, useEffect } from 'react'
import { Download, Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'
import type { KnowledgeCategory } from '@/lib/knowledge/types'

interface NlmNotebook {
  id: string
  title: string
  source_count: number
  updated_at: string
  suggestedPrompts: KnowledgeCategory[]
}

export default function ExtractKnowledgePage() {
  const [notebooks, setNotebooks] = useState<NlmNotebook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNotebook, setSelectedNotebook] = useState<NlmNotebook | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<KnowledgeCategory>>(new Set())
  const [extracting, setExtracting] = useState(false)
  const [results, setResults] = useState<{
    extractionVersion: string
    notebookId: string
    notebookTitle: string
    results: { category: string; entriesCreated: number; error?: string }[]
    totalCreated: number
  } | null>(null)

  useEffect(() => {
    fetchNotebooks()
  }, [])

  const fetchNotebooks = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/knowledge/extract')
      if (!res.ok) throw new Error('Failed to fetch notebooks')
      const data = await res.json()
      setNotebooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectNotebook = (nb: NlmNotebook) => {
    setSelectedNotebook(nb)
    setSelectedCategories(new Set(nb.suggestedPrompts))
    setResults(null)
  }

  const toggleCategory = (cat: KnowledgeCategory) => {
    const newSelected = new Set(selectedCategories)
    if (newSelected.has(cat)) {
      newSelected.delete(cat)
    } else {
      newSelected.add(cat)
    }
    setSelectedCategories(newSelected)
  }

  const handleExtract = async () => {
    if (!selectedNotebook || selectedCategories.size === 0) return

    try {
      setExtracting(true)
      setResults(null)
      setError(null)
      
      const res = await fetch('/api/knowledge/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notebookId: selectedNotebook.id,
          notebookTitle: selectedNotebook.title,
          categories: Array.from(selectedCategories),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')
      
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Download className={styles.headerIcon} />
          <div>
            <h1>Extract Knowledge</h1>
            <p>Pull structured knowledge from NotebookLM notebooks</p>
          </div>
        </div>
        <Link href="/knowledge" className={styles.backButton}>
          Back to Knowledge Base
        </Link>
      </div>

      <div className={styles.warningBanner}>
        <AlertTriangle className={styles.warningIcon} />
        <p>Extracted entries start as CANDIDATES. Review and approve them on the Knowledge Base page before they influence content generation.</p>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.layout}>
        <div className={styles.notebooksList}>
          <h2>Available Notebooks</h2>
          {loading ? (
            <p className={styles.loading}>Loading notebooks...</p>
          ) : notebooks.length === 0 ? (
            <p className={styles.empty}>No notebooks found.</p>
          ) : (
            <div className={styles.cards}>
              {notebooks.map(nb => (
                <div 
                  key={nb.id} 
                  className={`${styles.card} ${selectedNotebook?.id === nb.id ? styles.selectedCard : ''}`}
                  onClick={() => handleSelectNotebook(nb)}
                >
                  <div className={styles.cardHeader}>
                    <h3>{nb.title}</h3>
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{nb.source_count} sources</span>
                    <span>•</span>
                    <span>Updated {new Date(nb.updated_at).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.tags}>
                    {nb.suggestedPrompts.slice(0, 3).map(p => (
                      <span key={p} className={styles.tag}>{p.replace('_', ' ')}</span>
                    ))}
                    {nb.suggestedPrompts.length > 3 && (
                      <span className={styles.tag}>+{nb.suggestedPrompts.length - 3}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.configPanel}>
          {selectedNotebook ? (
            <div className={styles.configCard}>
              <h2>Extract from {selectedNotebook.title}</h2>
              
              <div className={styles.categories}>
                <p className={styles.categoriesLabel}>Select categories to extract:</p>
                {selectedNotebook.suggestedPrompts.map(cat => (
                  <label key={cat} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      disabled={extracting}
                    />
                    <span>{cat.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>

              <button 
                className={styles.extractButton}
                onClick={handleExtract}
                disabled={extracting || selectedCategories.size === 0}
              >
                {extracting ? (
                  <>
                    <Sparkles className={styles.spinIcon} />
                    Extracting... (this may take a few minutes)
                  </>
                ) : (
                  <>
                    <Download className={styles.btnIcon} />
                    Extract {selectedCategories.size} Categories
                  </>
                )}
              </button>

              {results && (
                <div className={styles.resultsPanel}>
                  <h3>Extraction Complete</h3>
                  <p className={styles.totalCreated}>Total created: {results.totalCreated} entries</p>
                  
                  <ul className={styles.resultList}>
                    {results.results.map((r, i) => (
                      <li key={i} className={styles.resultItem}>
                        {r.error ? (
                          <XCircle className={styles.resultIconError} />
                        ) : (
                          <CheckCircle className={styles.resultIconSuccess} />
                        )}
                        <span className={styles.resultCat}>{r.category.replace('_', ' ')}:</span>
                        {r.error ? (
                          <span className={styles.resultError}>{r.error}</span>
                        ) : (
                          <span>{r.entriesCreated} entries</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  
                  <Link href="/knowledge" className={styles.reviewButton}>
                    Review Candidates →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyConfig}>
              <p>Select a notebook to configure extraction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
