'use client'

import { useState, useEffect } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { Plus, BarChart3, X, Loader2, Youtube, Instagram } from 'lucide-react'
import { getPerformanceEntries, addPerformanceEntry } from '@/app/actions/performance'
import type { ShortFormPerformance, ShortFormPerformanceInsert } from '@/lib/create/performance-types'
import styles from './page.module.css'

export default function ShortFormPerformancePage() {
  const [entries, setEntries] = useState<ShortFormPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState<ShortFormPerformanceInsert>({
    platform: 'instagram-reels',
    post_url: '',
    posted_at: new Date().toISOString().slice(0, 16),
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    follows_gained: 0,
    reach: 0,
    notes: '',
    content_item_id: null
  })

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const data = await getPerformanceEntries()
      setEntries(data)
    } catch (err) {
      console.error('Failed to fetch entries', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const numFields = ['views', 'likes', 'comments', 'shares', 'saves', 'follows_gained', 'reach']
    
    setFormData(prev => ({
      ...prev,
      [name]: numFields.includes(name) ? parseInt(value) || 0 : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Ensure posted_at is valid ISO if provided
      const submitData = { ...formData }
      if (submitData.posted_at) {
        submitData.posted_at = new Date(submitData.posted_at).toISOString()
      } else {
        submitData.posted_at = null
      }

      await addPerformanceEntry(submitData)
      await fetchEntries()
      setIsModalOpen(false)
      // Reset form
      setFormData({
        platform: 'instagram-reels',
        post_url: '',
        posted_at: new Date().toISOString().slice(0, 16),
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        follows_gained: 0,
        reach: 0,
        notes: '',
        content_item_id: null
      })
    } catch (err) {
      console.error('Failed to add entry', err)
      alert('Failed to save entry')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate summary stats
  const totalPosts = entries.length
  const totalViews = entries.reduce((sum, e) => sum + e.views, 0)
  const avgEngagement = totalPosts > 0 
    ? entries.reduce((sum, e) => sum + e.engagement_rate, 0) / totalPosts 
    : 0
  const bestPost = [...entries].sort((a, b) => b.views - a.views)[0]

  return (
    <>
      <PageHeader 
        title="Short-form Performance" 
        subtitle="Track views, engagement, and reach for your short-form content"
      />

      <div className={styles.container}>
        {/* Summary Cards */}
        <div className={styles.summaryCards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><BarChart3 size={16} /> Total Posts</h3>
            <p className={styles.cardValue}>{totalPosts}</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><BarChart3 size={16} /> Total Views</h3>
            <p className={styles.cardValue}>{totalViews.toLocaleString()}</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><BarChart3 size={16} /> Avg Engagement</h3>
            <p className={styles.cardValue}>{(avgEngagement * 100).toFixed(2)}%</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}><BarChart3 size={16} /> Best Post Views</h3>
            <p className={styles.cardValue}>{bestPost ? bestPost.views.toLocaleString() : 0}</p>
          </div>
        </div>

        {/* Table Section */}
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <h3>Recent Performance</h3>
            <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> Add Entry
            </button>
          </div>
          
          <div className={styles.tableWrapper}>
            {loading ? (
              <div className={styles.emptyState}>
                <Loader2 size={32} className={styles.spinner} />
                <p>Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className={styles.emptyState}>
                <BarChart3 size={48} />
                <p>No performance data yet.</p>
                <button className={styles.addButton} onClick={() => setIsModalOpen(true)}>
                  Add Your First Entry
                </button>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Views</th>
                    <th>Engagement</th>
                    <th>Shares</th>
                    <th>Saves</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td>{entry.posted_at ? new Date(entry.posted_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={styles.platformBadge}>
                          {entry.platform === 'youtube-shorts' && <Youtube size={12} />}
                          {entry.platform === 'instagram-reels' && <Instagram size={12} />}
                          {entry.platform}
                        </span>
                      </td>
                      <td>{entry.views.toLocaleString()}</td>
                      <td>{(entry.engagement_rate * 100).toFixed(1)}%</td>
                      <td>{entry.shares.toLocaleString()}</td>
                      <td>{entry.saves.toLocaleString()}</td>
                      <td>{entry.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Log Performance</h2>
              <button className={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Platform</label>
                    <select 
                      name="platform" 
                      className={styles.input}
                      value={formData.platform}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="instagram-reels">Instagram Reels</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube-shorts">YouTube Shorts</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Posted Date</label>
                    <input 
                      type="datetime-local" 
                      name="posted_at" 
                      className={styles.input}
                      value={formData.posted_at || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Post URL</label>
                  <input 
                    type="url" 
                    name="post_url" 
                    className={styles.input}
                    value={formData.post_url || ''}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label>Views</label>
                    <input 
                      type="number" 
                      name="views" 
                      className={styles.input}
                      value={formData.views}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Likes</label>
                    <input 
                      type="number" 
                      name="likes" 
                      className={styles.input}
                      value={formData.likes}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Comments</label>
                    <input 
                      type="number" 
                      name="comments" 
                      className={styles.input}
                      value={formData.comments}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Shares</label>
                    <input 
                      type="number" 
                      name="shares" 
                      className={styles.input}
                      value={formData.shares}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Saves</label>
                    <input 
                      type="number" 
                      name="saves" 
                      className={styles.input}
                      value={formData.saves}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Follows Gained</label>
                    <input 
                      type="number" 
                      name="follows_gained" 
                      className={styles.input}
                      value={formData.follows_gained}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Reach</label>
                  <input 
                    type="number" 
                    name="reach" 
                    className={styles.input}
                    value={formData.reach}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Notes</label>
                  <textarea 
                    name="notes" 
                    className={styles.input}
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Any specific context or observations..."
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className={styles.spinner} /> : null}
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
