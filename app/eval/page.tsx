'use client'

import { useState, useEffect } from 'react'
import { TestTube, Plus, CheckCircle, XCircle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import styles from './page.module.css'
import type { AutoScores } from '@/lib/eval/types'

export default function EvalPage() {
    const [text, setText] = useState('')
    const [platform, setPlatform] = useState('youtube')
    const [contentType, setContentType] = useState('youtube-script')
    const [isScoring, setIsScoring] = useState(false)
    const [result, setResult] = useState<{ passed: boolean; scores: AutoScores; feedback: string[] } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleScore = async () => {
        if (!text.trim()) return
        setIsScoring(true)
        setError(null)
        setResult(null)

        try {
            const res = await fetch('/api/eval/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, content_type: contentType, platform })
            })
            
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to score text')
            }
            
            const data = await res.json()
            setResult(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsScoring(false)
        }
    }

    return (
        <div className={styles.container}>
            <PageHeader 
                title="Eval Harness & Quality Gate" 
                subtitle="Manage gold standard dataset and test the brand voice scorer."
            />

            <div className={styles.grid}>
                {/* Scorer Tester */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <TestTube size={20} className={styles.icon} />
                        <h2>Test Scorer</h2>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Platform / Lane</label>
                        <select 
                            value={platform} 
                            onChange={(e) => {
                                setPlatform(e.target.value)
                                setContentType(e.target.value === 'youtube' ? 'youtube-script' : e.target.value === 'ads' ? 'ad-copy' : 'short-form-script')
                            }}
                            className={styles.select}
                        >
                            <option value="youtube">YouTube (Script)</option>
                            <option value="ads">Ads (Copy)</option>
                            <option value="short-form">Short-Form (Script)</option>
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Content to Score</label>
                        <textarea 
                            value={text} 
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste text here to evaluate..."
                            className={styles.textarea}
                            rows={8}
                        />
                    </div>

                    <button 
                        onClick={handleScore} 
                        disabled={isScoring || !text.trim()}
                        className={styles.button}
                    >
                        {isScoring ? 'Scoring...' : 'Score Content'}
                    </button>

                    {error && <div className={styles.error}>{error}</div>}

                    {result && (
                        <div className={styles.result}>
                            <div className={`${styles.badge} ${result.passed ? styles.passed : styles.failed}`}>
                                {result.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                <span>{result.passed ? 'PASSED GATE' : 'FAILED GATE'}</span>
                            </div>

                            <div className={styles.scoresGrid}>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Composite</span>
                                    <span className={styles.scoreValue}>{(result.scores.composite * 100).toFixed(0)}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Tone Match</span>
                                    <span className={styles.scoreValue}>{(result.scores.tone_match * 100).toFixed(0)}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Vocab Match</span>
                                    <span className={styles.scoreValue}>{(result.scores.vocabulary_match * 100).toFixed(0)}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Taglish Ratio</span>
                                    <span className={styles.scoreValue}>{(result.scores.taglish_ratio * 100).toFixed(0)}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Formality</span>
                                    <span className={styles.scoreValue}>{(result.scores.formality_match * 100).toFixed(0)}%</span>
                                </div>
                                <div className={styles.scoreItem}>
                                    <span className={styles.scoreLabel}>Clean Words</span>
                                    <span className={styles.scoreValue}>{(result.scores.banned_words_clean * 100).toFixed(0)}%</span>
                                </div>
                            </div>

                            {result.feedback && result.feedback.length > 0 && (
                                <div className={styles.feedback}>
                                    <h4>Feedback</h4>
                                    <ul>
                                        {result.feedback.map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Eval Dataset List Placeholder */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2>Eval Dataset</h2>
                        <button className={styles.iconButton}><Plus size={16} /> Add</button>
                    </div>
                    <p className={styles.emptyState}>
                        Run the seed script to populate the gold standard dataset.
                    </p>
                </div>
            </div>
        </div>
    )
}
