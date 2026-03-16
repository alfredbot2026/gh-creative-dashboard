/**
 * Knowledge Base Page
 * Browse, filter, and manage structured knowledge entries.
 * Review candidate entries from extractions and approve them.
 */
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { 
  BookOpen, 
  Tag, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart2,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Loader2
} from 'lucide-react'
import { 
  KNOWLEDGE_CATEGORIES, 
  CATEGORY_LABELS, 
  CONTENT_LANES, 
  REVIEW_STATUSES,
  type KnowledgeEntry,
  type KnowledgeCategory,
  type ContentLane,
  type ReviewStatus
} from '@/lib/knowledge/types'
import { updateReviewStatus, deleteKnowledgeEntry, bulkApproveEntries } from '@/app/actions/knowledge'
import AddEntryModal from '@/components/knowledge/AddEntryModal'
import styles from './page.module.css'

interface KBStats {
  total: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
  byLane: Record<string, number>
  avgEffectiveness: number
}

export default function KnowledgePage() {
  // Data state
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [stats, setStats] = useState<KBStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // UI state
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [laneFilter, setLaneFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /* Fetch filtered entries from API */
  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (laneFilter !== 'all') params.append('lane', laneFilter)
      if (statusFilter !== 'all') params.append('review_status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const res = await fetch(`/api/knowledge?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
      }
    } catch (err) {
      console.error('Failed to fetch entries:', err)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, laneFilter, statusFilter, searchQuery])

  /* Fetch KB stats */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge?stats=true')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchStats()
  }, [fetchEntries, fetchStats])

  /* Actions */
  const handleStatusChange = async (id: string, status: ReviewStatus) => {
    setActionLoading(id)
    try {
      await updateReviewStatus(id, status, 'rob')
      await fetchEntries()
      await fetchStats()
    } catch (err) {
      alert('Failed to update status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    setActionLoading(id)
    try {
      await deleteKnowledgeEntry(id)
      await fetchEntries()
      await fetchStats()
    } catch (err) {
      alert('Failed to delete entry')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    setLoading(true)
    try {
      await bulkApproveEntries(selectedIds, 'rob')
      setSelectedIds([])
      await fetchEntries()
      await fetchStats()
    } catch (err) {
      alert('Bulk approval failed')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return '#34c759' // Green
    if (score >= 50) return '#ffcc00' // Yellow
    return '#ff3b30' // Red
  }

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        subtitle="Structured research backing every generated content piece"
      >
        <button 
          className={styles.addBtn}
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          <span>Add Entry</span>
        </button>
      </PageHeader>

      {/* Stats Bar */}
      {stats && (
        <div className={styles.statsBar}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Entries</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Approved</span>
            <span className={styles.statValue}>{stats.byStatus['approved'] || 0}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Candidates</span>
            <span className={styles.statValue}>{stats.byStatus['candidate'] || 0}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Avg. Effectiveness</span>
            <span className={styles.statValue}>{stats.avgEffectiveness.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className={styles.filterRow}>
        <div className={styles.filtersLeft}>
          <div className={styles.selectWrapper}>
            <Filter size={14} className={styles.filterIcon} />
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className={styles.categorySelect}
            >
              <option value="all">All Categories</option>
              {KNOWLEDGE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div className={styles.pillGroup}>
            {['all', ...CONTENT_LANES].map(lane => (
              <button
                key={lane}
                onClick={() => setLaneFilter(lane)}
                className={`${styles.filterPill} ${laneFilter === lane ? styles.activePill : ''}`}
              >
                {lane === 'all' ? 'All Lanes' : lane}
              </button>
            ))}
          </div>

          <div className={styles.pillGroup}>
            {['all', ...REVIEW_STATUSES].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`${styles.filterPill} ${statusFilter === status ? styles.activePill : ''}`}
              >
                {status === 'all' ? 'All Status' : status}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search knowledge..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.selectedCount}>{selectedIds.length} entries selected</span>
          <div className={styles.bulkBtns}>
            <button className={styles.bulkApproveBtn} onClick={handleBulkApprove}>
              <CheckCircle2 size={16} />
              Approve Selected
            </button>
            <button className={styles.bulkCancelBtn} onClick={() => setSelectedIds([])}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Entries Grid */}
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={40} />
          <p>Loading knowledge base...</p>
        </div>
      ) : entries.length > 0 ? (
        <div className={styles.entriesGrid}>
          {entries.map(entry => {
            const isExpanded = expandedId === entry.id
            const isSelected = selectedIds.includes(entry.id)
            
            return (
              <article 
                key={entry.id} 
                className={`${styles.entryCard} ${isSelected ? styles.selectedCard : ''}`}
                onClick={() => toggleSelect(entry.id)}
              >
                <div className={styles.cardHeader} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.headerLeft}>
                    <span className={styles.categoryTag}>
                      {CATEGORY_LABELS[entry.category]}
                    </span>
                    <span className={styles.subcategoryTag}>{entry.subcategory}</span>
                  </div>
                  <div className={styles.headerRight}>
                    <StatusBadge status={entry.review_status} size="sm" />
                    <button className={styles.menuBtn}>
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.entryTitle}>{entry.title}</h3>
                  <div className={`${styles.entryContent} ${isExpanded ? styles.expanded : ''}`}>
                    {entry.content}
                  </div>
                  {entry.content.length > 200 && (
                    <button 
                      className={styles.expandBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(isExpanded ? null : entry.id)
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>

                <div className={styles.laneBadges}>
                  {entry.lanes.map(lane => (
                    <span key={lane} className={`${styles.laneBadge} ${styles[lane.replace('-', '')]}`}>
                      {lane}
                    </span>
                  ))}
                </div>

                <div className={styles.effectivenessSection}>
                  <div className={styles.effectivenessHeader}>
                    <span className={styles.effectivenessLabel}>Effectiveness</span>
                    <span className={styles.effectivenessValue}>{entry.effectiveness_score}%</span>
                  </div>
                  <div className={styles.effectivenessTrack}>
                    <div 
                      className={styles.effectivenessBar} 
                      style={{ 
                        width: `${entry.effectiveness_score}%`,
                        backgroundColor: getEffectivenessColor(entry.effectiveness_score)
                      }} 
                    />
                  </div>
                </div>

                <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.footerLeft}>
                    <span className={styles.sourceInfo}>
                      <BookOpen size={12} />
                      {entry.source}
                    </span>
                    <div className={styles.approvalStats}>
                      <span className={styles.thumbsUp}>
                        <ThumbsUp size={10} /> {entry.times_approved}
                      </span>
                      <span className={styles.thumbsDown}>
                        <ThumbsDown size={10} /> {entry.times_rejected}
                      </span>
                    </div>
                  </div>
                  <div className={styles.footerRight}>
                    {entry.review_status === 'candidate' && (
                      <button 
                        className={styles.approveBtn}
                        onClick={() => handleStatusChange(entry.id, 'approved')}
                        disabled={actionLoading === entry.id}
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    <button 
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(entry.id)}
                      disabled={actionLoading === entry.id}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <BookOpen size={48} />
          <h3>No knowledge entries found</h3>
          <p>Try adjusting your filters or search query, or add a manual entry.</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddEntryModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => {
            setShowAddModal(false)
            fetchEntries()
            fetchStats()
          }}
        />
      )}
    </>
  )
}
