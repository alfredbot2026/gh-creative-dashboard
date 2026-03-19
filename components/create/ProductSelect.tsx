'use client'

import { useState, useEffect } from 'react'
import type { ProductData } from '@/app/actions/products'
import styles from './ProductSelect.module.css'

interface ProductSelectProps {
  onSelect: (product: ProductData | null) => void
  selectedId?: string
}

export default function ProductSelect({ onSelect, selectedId }: ProductSelectProps) {
  const [products, setProducts] = useState<ProductData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (products.length === 0) return null

  return (
    <select
      className={styles.select}
      value={selectedId || ''}
      onChange={e => {
        const id = e.target.value
        if (!id) {
          onSelect(null)
        } else {
          const product = products.find(p => p.id === id)
          onSelect(product || null)
        }
      }}
    >
      <option value="">No product — enter manually</option>
      {products.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}{p.price ? ` — ${p.price}` : ''}
        </option>
      ))}
    </select>
  )
}
