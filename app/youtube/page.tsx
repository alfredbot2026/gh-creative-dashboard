/**
 * YouTube Intelligence Page
 * Tabs: My Channel | Watchlist | Hot This Week | Discover
 * Features: channel analytics, competitor discovery, video analysis, viral detection
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import PageHeader from '@/components/ui/PageHeader'
import ChannelAnalytics from '@/components/youtube/ChannelAnalytics'
import {
    Search, Plus, Trash2, Eye, Flame, ExternalLink,
    Loader2, Users, TrendingUp, Sparkles, Youtube,
    Save, BarChart3, Bot
} from 'lucide-react'
import styles from './page.module.css'

/**
 * Simple markdown-to-HTML converter.
 * Handles: headers, bold, italic, bullet lists, and line breaks.
 * No external deps needed.
 */
function renderMarkdown(md: string): string {
    const html = md
        // Headers (## → h3, ### → h4)
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        // Bold + Italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Bullet lists (- item → <li>)
        .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
        // Numbered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>')

    return DOMPurify.sanitize(html)
}

/* -- Type definitions -- */
interface Channel {
    channel_id: string
    title: string
    handle: string
    thumbnail_url: string
    description?: string
    subscriber_count: number
    view_count?: number
    video_count?: number
}

interface Competitor {
    id: string
    channel_id: string
    channel_title: string
    handle?: string
    subscriber_count?: number
    avg_views?: number
    thumbnail_url?: string
    is_own_channel?: boolean
    added_at: string
}

interface Video {
    video_id: string
    title: string
    published_at: string
    thumbnail_url: string
    view_count: number
    like_count: number
    comment_count: number
    duration: string
    is_viral: boolean
    viral_multiplier: string
    url: string
    channel_title?: string
}

/* Analysis is now returned as markdown string from Gemini */

/* Format subscriber/view count (e.g. 124000 → "124K") */
function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

/* Format ISO date to readable string */
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function YouTubePage() {
    const [activeTab, setActiveTab] = useState<'channel' | 'coach' | 'watchlist' | 'discover' | 'hot'>('channel')

    // Discovery state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Channel[]>([])
    const [searching, setSearching] = useState(false)

    // Watchlist state
    const [competitors, setCompetitors] = useState<Competitor[]>([])
    const [loadingWatchlist, setLoadingWatchlist] = useState(true)
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)
    const [videos, setVideos] = useState<Video[]>([])
    const [loadingVideos, setLoadingVideos] = useState(false)

    // Hot This Week state
    const [hotVideos, setHotVideos] = useState<Video[]>([])
    const [loadingHot, setLoadingHot] = useState(false)

    // Analysis state
    const [analyzingVideo, setAnalyzingVideo] = useState<string | null>(null)
    const [analysisMarkdown, setAnalysisMarkdown] = useState<string | null>(null)
    const [analysisVideoTitle, setAnalysisVideoTitle] = useState('')
    const [analysisVideoUrl, setAnalysisVideoUrl] = useState('')
    const [savingAnalysis, setSavingAnalysis] = useState(false)
    const [analysisSaved, setAnalysisSaved] = useState(false)

    // AI Coach State
    const [isAuditing, setIsAuditing] = useState(false)
    const [isAutopsying, setIsAutopsying] = useState(false)
    const [autopsyUrl, setAutopsyUrl] = useState('')
    const [isRatingScript, setIsRatingScript] = useState(false)
    const [scriptText, setScriptText] = useState('')
    const [isSimulating, setIsSimulating] = useState(false)
    const [thumbTitle, setThumbTitle] = useState('')
    const [thumbImage, setThumbImage] = useState<string | null>(null)

    // Adding state
    const [addingChannel, setAddingChannel] = useState<string | null>(null)

    /* Fetch watchlist */
    const fetchWatchlist = useCallback(async () => {
        setLoadingWatchlist(true)
        const res = await fetch('/api/youtube/competitors')
        const data = await res.json()
        setCompetitors(data.competitors || [])
        setLoadingWatchlist(false)
    }, [])

    useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

    /* Run Channel Audit */
    const handleRunAudit = async () => {
        setIsAuditing(true)
        try {
            const res = await fetch('/api/youtube/coach/audit', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to run audit')
            setAnalysisVideoTitle('Channel Audit (Last 90 Days)')
            setAnalysisVideoUrl('') // No URL for channel audit
            setAnalysisMarkdown(data.audit)
            setAnalysisSaved(true) // Auto-saved in backend
        } catch (e: unknown) {
            alert((e as Error).message)
        } finally {
            setIsAuditing(false)
        }
    }

    /* Run Video Autopsy */
    const handleRunAutopsy = async () => {
        if (!autopsyUrl.trim()) return
        setIsAutopsying(true)
        try {
            const res = await fetch('/api/youtube/coach/autopsy', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: autopsyUrl }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to run autopsy')
            setAnalysisVideoTitle('Video Autopsy Result')
            setAnalysisVideoUrl(autopsyUrl) // Make sure Watch Video works
            setAnalysisMarkdown(data.analysis)
            setAnalysisSaved(true) // Backend auto-saves
            setAutopsyUrl('') // Clear input
        } catch (e: unknown) {
            alert((e as Error).message)
        } finally {
            setIsAutopsying(false)
        }
    }

    /* Rate Script */
    const handleRateScript = async () => {
        if (!scriptText.trim()) return
        setIsRatingScript(true)
        try {
            const res = await fetch('/api/youtube/coach/script', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: scriptText }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to rate script')
            setAnalysisVideoTitle('Script Rater Result')
            setAnalysisVideoUrl('') // No URL
            setAnalysisMarkdown(data.analysis)
            setAnalysisSaved(true) // Backend auto-saves
            setScriptText('') // Clear input
        } catch (e: unknown) {
            alert((e as Error).message)
        } finally {
            setIsRatingScript(false)
        }
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            setThumbImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    /* Simulate Thumbnail */
    const handleSimulateThumbnail = async () => {
        if (!thumbTitle.trim() || !thumbImage) return
        setIsSimulating(true)
        try {
            const res = await fetch('/api/youtube/coach/thumbnail', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json', limit: '10mb' } as HeadersInit,
                body: JSON.stringify({ title: thumbTitle, imageBase64: thumbImage }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to simulate thumbnail')
            setAnalysisVideoTitle('Thumbnail Simulator Result')
            setAnalysisVideoUrl('') // No URL
            setAnalysisMarkdown(data.analysis)
            setAnalysisSaved(true) // Backend auto-saves
            setThumbTitle('') // Clear input
            setThumbImage(null)
        } catch (e: unknown) {
            alert((e as Error).message)
        } finally {
            setIsSimulating(false)
        }
    }

    /* Search for competitor channels */
    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true)
        setSearchResults([])
        try {
            const res = await fetch('/api/youtube/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery }),
            })
            const data = await res.json()
            setSearchResults(data.channels || [])
        } catch {
            alert('Search failed. Check your YOUTUBE_API_KEY.')
        } finally {
            setSearching(false)
        }
    }

    /* Add channel to watchlist */
    const handleAddCompetitor = async (channel: Channel, isOwn = false) => {
        setAddingChannel(channel.channel_id)
        try {
            await fetch('/api/youtube/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: channel.channel_id,
                    channel_title: channel.title,
                    handle: channel.handle,
                    subscriber_count: channel.subscriber_count,
                    thumbnail_url: channel.thumbnail_url,
                    is_own_channel: isOwn,
                }),
            })
            await fetchWatchlist()
        } finally {
            setAddingChannel(null)
        }
    }

    /* Remove competitor */
    const handleRemoveCompetitor = async (id: string) => {
        await fetch(`/api/youtube/competitors?id=${id}`, { method: 'DELETE' })
        if (selectedCompetitor?.id === id) {
            setSelectedCompetitor(null)
            setVideos([])
        }
        await fetchWatchlist()
    }

    /* Fetch videos for a competitor */
    const handleSelectCompetitor = async (competitor: Competitor) => {
        setSelectedCompetitor(competitor)
        setLoadingVideos(true)
        setVideos([])
        setAnalysisMarkdown(null)
        try {
            const res = await fetch(`/api/youtube/competitors/${competitor.id}/videos`)
            const data = await res.json()
            setVideos(data.videos || [])
        } finally {
            setLoadingVideos(false)
        }
    }

    /* Fetch hot videos across ALL tracked channels */
    const fetchHotVideos = useCallback(async () => {
        if (competitors.length === 0) return
        setLoadingHot(true)
        setHotVideos([])

        // Fetch videos from all competitors in parallel
        const allResults = await Promise.allSettled(
            competitors.map(async (comp) => {
                const res = await fetch(`/api/youtube/competitors/${comp.id}/videos`)
                const data = await res.json()
                // Tag each video with the channel name
                return (data.videos || []).map((v: Video) => ({
                    ...v,
                    channel_title: comp.channel_title,
                }))
            })
        )

        // Collect all videos, filter viral, sort by views
        const allVideos: Video[] = allResults
            .filter((r): r is PromiseFulfilledResult<Video[]> => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .filter(v => v.is_viral)
            .sort((a, b) => b.view_count - a.view_count)

        setHotVideos(allVideos)
        setLoadingHot(false)
    }, [competitors])

    /* Load hot videos when tab switches */
    useEffect(() => {
        if (activeTab === 'hot' && hotVideos.length === 0) fetchHotVideos()
    }, [activeTab, hotVideos.length, fetchHotVideos])

    /* Analyze a video with Gemini — returns markdown */
    const handleAnalyzeVideo = async (videoUrl: string, videoTitle: string, type: string = 'competitive') => {
        setAnalyzingVideo(videoUrl)
        setAnalysisMarkdown(null)
        setAnalysisVideoTitle(videoTitle)
        setAnalysisVideoUrl(videoUrl)
        setAnalysisSaved(false)
        try {
            const res = await fetch('/api/youtube/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl, analysisType: type, videoTitle }),
            })
            const data = await res.json()
            if (data.error) {
                alert(`Analysis error: ${data.error}`)
                setAnalyzingVideo(null)
            } else {
                setAnalysisMarkdown(data.analysis)
                setAnalyzingVideo(null)
            }
        } catch {
            alert('Analysis failed. Try again.')
            setAnalyzingVideo(null)
        }
    }

    /* Save analysis to Supabase youtube_videos table */
    const handleSaveAnalysis = async () => {
        if (!analysisMarkdown || !analysisVideoUrl) return
        setSavingAnalysis(true)
        try {
            // Extract video ID from URL
            const match = analysisVideoUrl.match(/[?&]v=([^&]+)/)
            const videoId = match?.[1] || ''
            await fetch('/api/youtube/analyze', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoId,
                    videoTitle: analysisVideoTitle,
                    videoUrl: analysisVideoUrl,
                    analysis: analysisMarkdown,
                }),
            })
            setAnalysisSaved(true)
        } catch {
            alert('Failed to save analysis.')
        } finally {
            setSavingAnalysis(false)
        }
    }

    /* Check if a channel is already in watchlist */
    const isInWatchlist = (channelId: string) =>
        competitors.some(c => c.channel_id === channelId)

    return (
        <>
            <PageHeader
                title="YouTube Intelligence"
                subtitle="Discover competitors, analyze videos, generate content"
                action={
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${activeTab === 'channel' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('channel')}
                        >
                            <BarChart3 size={16} /> My Channel
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'coach' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('coach')}
                        >
                            <Bot size={16} /> AI Coach
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'watchlist' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('watchlist')}
                        >
                            <Eye size={16} /> Watchlist
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'hot' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('hot')}
                        >
                            <Flame size={16} /> Hot
                        </button>
                        <button
                            className={`${styles.tab} ${activeTab === 'discover' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('discover')}
                        >
                            <Search size={16} /> Discover
                        </button>
                    </div>
                }
            />

            {/* ========== MY CHANNEL TAB ========== */}
            {activeTab === 'channel' && <ChannelAnalytics />}

            {/* ========== AI COACH TAB ========== */}
            {activeTab === 'coach' && (
                <div className={styles.coachSection}>
                    <div className={styles.coachGrid}>
                        <div className={styles.coachCard}>
                            <h3><BarChart3 size={20} /> Channel Auditor</h3>
                            <p>Get data-driven strategies based on your last 90 days. We analyze your performance to map out working formats and quick wins.</p>
                            <button 
                                className={styles.coachActionButton}
                                onClick={handleRunAudit}
                                disabled={isAuditing}
                            >
                                {isAuditing ? <Loader2 size={16} className={styles.spinner} /> : null}
                                {isAuditing ? 'Analyzing...' : 'Run Channel Audit'}
                            </button>
                        </div>
                        
                        <div className={styles.coachCard}>
                            <h3><Youtube size={20} /> Video Autopsy</h3>
                            <p>Find out exactly where a specific video&apos;s hook failed or succeeded. Paste a link to get format feedback.</p>
                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                <input 
                                    type="text"
                                    placeholder="Paste YouTube URL..."
                                    value={autopsyUrl}
                                    onChange={(e) => setAutopsyUrl(e.target.value)}
                                    className={styles.searchInput}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                                <button 
                                    className={styles.coachActionButton}
                                    onClick={handleRunAutopsy}
                                    disabled={isAutopsying || !autopsyUrl.trim()}
                                >
                                    {isAutopsying ? <Loader2 size={16} className={styles.spinner} /> : 'Autopsy'}
                                </button>
                            </div>
                        </div>
                        
                        <div className={styles.coachCard}>
                            <h3><Sparkles size={20} /> Script Rater</h3>
                            <p>Predict CTR and get script rewrites before filming. Our AI will score your hook 1-10.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                                <textarea 
                                    placeholder="Paste your hook or script here..."
                                    value={scriptText}
                                    onChange={(e) => setScriptText(e.target.value)}
                                    className={styles.searchInput}
                                    style={{ flex: 1, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                                />
                                <button 
                                    className={styles.coachActionButton}
                                    onClick={handleRateScript}
                                    disabled={isRatingScript || !scriptText.trim()}
                                >
                                    {isRatingScript ? <Loader2 size={16} className={styles.spinner} /> : 'Rate Script'}
                                </button>
                            </div>
                        </div>

                        <div className={styles.coachCard}>
                            <h3><Eye size={20} /> Thumbnail Simulator</h3>
                            <p>Upload thumbnails and titles to simulate feed performance and predict the winner.</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                                <input 
                                    type="text"
                                    placeholder="Enter your video title..."
                                    value={thumbTitle}
                                    onChange={(e) => setThumbTitle(e.target.value)}
                                    className={styles.searchInput}
                                    style={{ marginBottom: 0 }}
                                />
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        style={{ fontSize: '0.75rem', flex: 1 }}
                                    />
                                    {thumbImage && <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>✓ Loaded</span>}
                                </div>
                                <button 
                                    className={styles.coachActionButton}
                                    onClick={handleSimulateThumbnail}
                                    disabled={isSimulating || !thumbTitle.trim() || !thumbImage}
                                >
                                    {isSimulating ? <Loader2 size={16} className={styles.spinner} /> : 'Simulate Feed'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== DISCOVER TAB ========== */}
            {activeTab === 'discover' && (
                <div className={styles.discoverSection}>
                    <div className={styles.searchBar}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Search competitors... e.g. 'Philippines print on demand'"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button className={styles.searchButton} onClick={handleSearch} disabled={searching}>
                            {searching ? <Loader2 size={16} className={styles.spinner} /> : <Search size={16} />}
                            {searching ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className={styles.resultsGrid}>
                            {searchResults.map(channel => (
                                <div key={channel.channel_id} className={styles.channelCard}>
                                    <img src={channel.thumbnail_url} alt={channel.title} className={styles.channelThumb} />
                                    <div className={styles.channelInfo}>
                                        <h3 className={styles.channelName}>{channel.title}</h3>
                                        {channel.handle && <span className={styles.channelHandle}>{channel.handle}</span>}
                                        <div className={styles.channelStats}>
                                            <span><Users size={12} /> {formatCount(channel.subscriber_count)} subs</span>
                                            {channel.video_count && <span>{channel.video_count} videos</span>}
                                        </div>
                                        {channel.description && <p className={styles.channelDesc}>{channel.description}</p>}
                                    </div>
                                    <div className={styles.channelActions}>
                                        {isInWatchlist(channel.channel_id) ? (
                                            <span className={styles.addedBadge}>✓ Tracked</span>
                                        ) : (
                                            <>
                                                <button className={styles.addButton} onClick={() => handleAddCompetitor(channel)} disabled={addingChannel === channel.channel_id}>
                                                    {addingChannel === channel.channel_id ? <Loader2 size={14} className={styles.spinner} /> : <Plus size={14} />}
                                                    Track
                                                </button>
                                                <button className={styles.ownButton} onClick={() => handleAddCompetitor(channel, true)} disabled={addingChannel === channel.channel_id}>
                                                    <Youtube size={14} /> My Channel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {searchResults.length === 0 && !searching && searchQuery && (
                        <div className={styles.emptyState}>
                            <Search size={32} />
                            <p>No channels found. Try different keywords.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ========== HOT THIS WEEK TAB ========== */}
            {activeTab === 'hot' && (
                <div className={styles.hotSection}>
                    <div className={styles.hotHeader}>
                        <h3 className={styles.hotTitle}>
                            <Flame size={20} /> Viral Videos Across Your Watchlist
                        </h3>
                        <button className={styles.refreshButton} onClick={fetchHotVideos} disabled={loadingHot}>
                            {loadingHot ? <Loader2 size={14} className={styles.spinner} /> : <TrendingUp size={14} />}
                            Refresh
                        </button>
                    </div>

                    {loadingHot ? (
                        <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /></div>
                    ) : hotVideos.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Flame size={40} />
                            <p>No viral videos detected yet.</p>
                            <p className={styles.emptyHint}>Track some channels first, then check back for hot content.</p>
                        </div>
                    ) : (
                        <div className={styles.hotGrid}>
                            {hotVideos.map(video => (
                                <div key={video.video_id} className={styles.hotCard}>
                                    <div className={styles.hotCardLeft}>
                                        <img src={video.thumbnail_url} alt={video.title} className={styles.hotThumb} />
                                        <div className={styles.viralBadge}>
                                            <Flame size={10} /> {video.viral_multiplier}x
                                        </div>
                                    </div>
                                    <div className={styles.hotCardContent}>
                                        <span className={styles.hotChannel}>{video.channel_title}</span>
                                        <h4 className={styles.hotVideoTitle}>{video.title}</h4>
                                        <div className={styles.hotStats}>
                                            <span><Eye size={12} /> {formatCount(video.view_count)}</span>
                                            <span>👍 {formatCount(video.like_count)}</span>
                                            <span>{formatDate(video.published_at)}</span>
                                        </div>
                                        <div className={styles.hotActions}>
                                            <button
                                                className={styles.analyzeButton}
                                                onClick={() => handleAnalyzeVideo(video.url, video.title)}
                                                disabled={analyzingVideo === video.url}
                                            >
                                                {analyzingVideo === video.url
                                                    ? <Loader2 size={12} className={styles.spinner} />
                                                    : <Sparkles size={12} />}
                                                Analyze Why It&apos;s Viral
                                            </button>
                                            <a href={video.url} target="_blank" rel="noopener noreferrer" className={styles.watchLink}>
                                                <ExternalLink size={12} /> Watch
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========== WATCHLIST TAB ========== */}
            {activeTab === 'watchlist' && (
                <div className={styles.watchlistLayout}>
                    {/* Competitor sidebar */}
                    <div className={styles.competitorList}>
                        <h3 className={styles.listTitle}>Tracked Channels</h3>
                        {loadingWatchlist ? (
                            <div className={styles.loading}><Loader2 size={20} className={styles.spinner} /></div>
                        ) : competitors.length === 0 ? (
                            <div className={styles.emptyList}>
                                <p>No channels tracked yet.</p>
                                <button className={styles.discoverLink} onClick={() => setActiveTab('discover')}>
                                    <Search size={14} /> Discover Competitors
                                </button>
                            </div>
                        ) : (
                            competitors.map(comp => (
                                <div
                                    key={comp.id}
                                    className={`${styles.competitorItem} ${selectedCompetitor?.id === comp.id ? styles.selectedCompetitor : ''}`}
                                    onClick={() => handleSelectCompetitor(comp)}
                                >
                                    {comp.thumbnail_url && <img src={comp.thumbnail_url} alt="" className={styles.compThumb} />}
                                    <div className={styles.compInfo}>
                                        <span className={styles.compName}>
                                            {comp.is_own_channel && <Youtube size={12} className={styles.ownIcon} />}
                                            {comp.channel_title}
                                        </span>
                                        <span className={styles.compSubs}>
                                            {comp.subscriber_count ? formatCount(comp.subscriber_count) : '—'} subs
                                            {comp.avg_views ? ` · ~${formatCount(comp.avg_views)} avg` : ''}
                                        </span>
                                    </div>
                                    <button
                                        className={styles.removeButton}
                                        onClick={e => { e.stopPropagation(); handleRemoveCompetitor(comp.id) }}
                                        title="Remove"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Videos panel */}
                    <div className={styles.videosPanel}>
                        {!selectedCompetitor ? (
                            <div className={styles.emptyPanel}>
                                <TrendingUp size={40} />
                                <p>Select a channel to see their videos</p>
                            </div>
                        ) : loadingVideos ? (
                            <div className={styles.loading}><Loader2 size={24} className={styles.spinner} /></div>
                        ) : (
                            <>
                                <h3 className={styles.panelTitle}>
                                    {selectedCompetitor.channel_title}
                                    <span className={styles.videoCount}>{videos.length} recent videos</span>
                                </h3>
                                <div className={styles.videosGrid}>
                                    {videos.map(video => (
                                        <div key={video.video_id} className={`${styles.videoCard} ${video.is_viral ? styles.viralCard : ''}`}>
                                            {video.is_viral && (
                                                <div className={styles.viralBadge}>
                                                    <Flame size={12} /> {video.viral_multiplier}x avg
                                                </div>
                                            )}
                                            <img src={video.thumbnail_url} alt={video.title} className={styles.videoThumb} />
                                            <div className={styles.videoInfo}>
                                                <h4 className={styles.videoTitle}>{video.title}</h4>
                                                <div className={styles.videoStats}>
                                                    <span><Eye size={12} /> {formatCount(video.view_count)}</span>
                                                    <span>👍 {formatCount(video.like_count)}</span>
                                                    <span>💬 {formatCount(video.comment_count)}</span>
                                                </div>
                                                <div className={styles.videoActions}>
                                                    <button
                                                        className={styles.analyzeButton}
                                                        onClick={() => handleAnalyzeVideo(video.url, video.title)}
                                                        disabled={analyzingVideo === video.url}
                                                    >
                                                        {analyzingVideo === video.url
                                                            ? <Loader2 size={12} className={styles.spinner} />
                                                            : <Sparkles size={12} />}
                                                        {analyzingVideo === video.url ? 'Analyzing...' : 'Analyze'}
                                                    </button>
                                                    <a href={video.url} target="_blank" rel="noopener noreferrer" className={styles.watchLink}>
                                                        <ExternalLink size={12} /> Watch
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ========== ANALYZING OVERLAY ========== */}
            {analyzingVideo && (
                <div className={styles.analysisOverlay}>
                    <div className={styles.analyzingCard}>
                        <Loader2 size={32} className={styles.spinner} />
                        <h3>Analyzing Video...</h3>
                        <p className={styles.analyzingTitle}>{analysisVideoTitle}</p>
                        <div className={styles.analyzingSteps}>
                            <span className={styles.analyzingStepActive}>🎬 Processing video frames</span>
                            <span>📝 Extracting insights</span>
                            <span>💡 Generating recommendations</span>
                        </div>
                        <p className={styles.analyzingHint}>This may take 30-60 seconds for longer videos</p>
                    </div>
                </div>
            )}

            {/* ========== ANALYSIS RESULT MODAL ========== */}
            {analysisMarkdown && (
                <div className={styles.analysisOverlay} onClick={() => setAnalysisMarkdown(null)}>
                    <div className={styles.analysisModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.analysisHeader}>
                            <div>
                                <h3>{analysisVideoTitle || 'Video Analysis'}</h3>
                                <span className={styles.analysisBadge}><Sparkles size={12} /> AI Analysis</span>
                            </div>
                            <div className={styles.analysisActions}>
                                {analysisVideoUrl ? (
                                    <>
                                        <button
                                            className={styles.saveButton}
                                            onClick={handleSaveAnalysis}
                                            disabled={savingAnalysis || analysisSaved}
                                        >
                                            {savingAnalysis ? <Loader2 size={14} className={styles.spinner} />
                                                : analysisSaved ? <>✓ Saved</>
                                                    : <><Save size={14} /> Save Insight</>}
                                        </button>
                                        <a
                                            href={analysisVideoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.watchLink}
                                        >
                                            <ExternalLink size={12} /> Watch Video
                                        </a>
                                    </>
                                ) : null}
                                <button onClick={() => setAnalysisMarkdown(null)} className={styles.closeAnalysis}>✕</button>
                            </div>
                        </div>
                        <div className={styles.analysisBody}>
                            <div
                                className={styles.markdownContent}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(analysisMarkdown) }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
