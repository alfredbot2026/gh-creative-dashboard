/**
 * Upload Page
 * Accepts markdown files for ad performance data.
 * Client component for file handling + server action for parsing.
 */
'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/ui/PageHeader'
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import styles from './page.module.css'

/* Type for parsed ad data */
interface ParsedAd {
    campaign_name: string
    ad_name?: string
    spend?: number
    impressions?: number
    clicks?: number
    conversions?: number
    roas?: number
    ctr?: number
    status?: string
    ai_analysis?: string
}

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<ParsedAd[]>([])
    const [status, setStatus] = useState<'idle' | 'parsed' | 'saving' | 'saved' | 'error'>('idle')
    const [error, setError] = useState<string | null>(null)

    /**
     * Parse markdown content to extract ad performance data.
     * Expects a table-like format or structured sections.
     */
    const parseMarkdown = useCallback((content: string): ParsedAd[] => {
        const ads: ParsedAd[] = []

        /* Try to parse markdown tables first */
        const lines = content.split('\n')
        let headers: string[] = []
        let isInTable = false

        for (const line of lines) {
            const trimmed = line.trim()

            /* Detect table header row */
            if (trimmed.includes('|') && !isInTable) {
                headers = trimmed
                    .split('|')
                    .map(h => h.trim().toLowerCase())
                    .filter(Boolean)
                isInTable = true
                continue
            }

            /* Skip separator row (---) */
            if (isInTable && trimmed.match(/^\|[\s\-|]+$/)) {
                continue
            }

            /* Parse data rows */
            if (isInTable && trimmed.includes('|')) {
                const values = trimmed
                    .split('|')
                    .map(v => v.trim())
                    .filter(Boolean)

                if (values.length >= 2) {
                    const ad: ParsedAd = { campaign_name: '' }

                    headers.forEach((header, i) => {
                        const val = values[i] || ''
                        if (header.includes('campaign')) ad.campaign_name = val
                        else if (header.includes('ad') && header.includes('name')) ad.ad_name = val
                        else if (header.includes('spend')) ad.spend = parseFloat(val.replace(/[^0-9.]/g, '')) || 0
                        else if (header.includes('impression')) ad.impressions = parseInt(val.replace(/[^0-9]/g, '')) || 0
                        else if (header.includes('click')) ad.clicks = parseInt(val.replace(/[^0-9]/g, '')) || 0
                        else if (header.includes('conversion')) ad.conversions = parseInt(val.replace(/[^0-9]/g, '')) || 0
                        else if (header.includes('roas')) ad.roas = parseFloat(val.replace(/[^0-9.]/g, '')) || 0
                        else if (header.includes('ctr')) ad.ctr = parseFloat(val.replace(/[^0-9.]/g, '')) / 100 || 0
                        else if (header.includes('status')) ad.status = val.toLowerCase()
                        else if (header.includes('analysis') || header.includes('recommendation')) ad.ai_analysis = val
                    })

                    if (ad.campaign_name) ads.push(ad)
                }
            }

            /* Reset table detection on empty line */
            if (!trimmed) isInTable = false
        }

        return ads
    }, [])

    /* Handle file drop or selection */
    const handleFile = (f: File) => {
        setFile(f)
        setError(null)
        setStatus('idle')

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            const parsed = parseMarkdown(content)
            setParsedData(parsed)
            setStatus(parsed.length > 0 ? 'parsed' : 'idle')
            if (parsed.length === 0) {
                setError('No ad data found in the file. Make sure it contains a table with campaign data.')
            }
        }
        reader.readAsText(f)
    }

    /* Save parsed data to Supabase */
    const handleSave = async () => {
        if (parsedData.length === 0) return

        setStatus('saving')
        setError(null)

        try {
            const supabase = createClient()
            const { error: insertError } = await supabase
                .from('ad_performance')
                .insert(parsedData.map(ad => ({
                    campaign_name: ad.campaign_name,
                    ad_name: ad.ad_name || null,
                    spend: ad.spend || null,
                    impressions: ad.impressions || null,
                    clicks: ad.clicks || null,
                    conversions: ad.conversions || null,
                    roas: ad.roas || null,
                    ctr: ad.ctr || null,
                    status: ad.status || null,
                    ai_analysis: ad.ai_analysis || null,
                })))

            if (insertError) throw insertError

            setStatus('saved')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save data')
            setStatus('error')
        }
    }

    return (
        <>
            <PageHeader
                title="Upload"
                subtitle="Import ad performance data from markdown files"
            />

            {/* Drop zone */}
            <div
                className={styles.dropZone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault()
                    const droppedFile = e.dataTransfer.files[0]
                    if (droppedFile) handleFile(droppedFile)
                }}
            >
                <UploadIcon size={40} className={styles.dropIcon} />
                <p className={styles.dropText}>
                    Drag & drop your markdown file here
                </p>
                <p className={styles.dropSubtext}>or</p>
                <label className={styles.fileButton}>
                    Browse Files
                    <input
                        type="file"
                        accept=".md,.markdown,.txt"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleFile(f)
                        }}
                        hidden
                    />
                </label>
            </div>

            {/* File info */}
            {file && (
                <div className={styles.fileInfo}>
                    <FileText size={16} />
                    <span>{file.name}</span>
                    <span className={styles.fileSize}>({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className={styles.errorMsg}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Parsed data preview */}
            {parsedData.length > 0 && status === 'parsed' && (
                <div className={styles.preview}>
                    <h2 className={styles.previewTitle}>
                        Preview — {parsedData.length} campaigns found
                    </h2>
                    <div className={styles.previewTable}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Spend</th>
                                    <th>ROAS</th>
                                    <th>CTR</th>
                                    <th>Conversions</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((ad, i) => (
                                    <tr key={i}>
                                        <td>{ad.campaign_name}</td>
                                        <td>${ad.spend?.toFixed(2) || '—'}</td>
                                        <td>{ad.roas ? `${ad.roas}x` : '—'}</td>
                                        <td>{ad.ctr ? `${(ad.ctr * 100).toFixed(2)}%` : '—'}</td>
                                        <td>{ad.conversions || '—'}</td>
                                        <td>{ad.status || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button className={styles.saveButton} onClick={handleSave}>
                        Save to Database
                    </button>
                </div>
            )}

            {/* Success state */}
            {status === 'saved' && (
                <div className={styles.successMsg}>
                    <CheckCircle size={16} />
                    Successfully imported {parsedData.length} campaigns!
                </div>
            )}

            {/* Saving state */}
            {status === 'saving' && (
                <div className={styles.savingMsg}>Saving...</div>
            )}
        </>
    )
}
