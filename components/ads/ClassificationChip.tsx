'use client'

import React, { useState, useRef, useEffect } from 'react'
import styles from './ClassificationChip.module.css'

interface ClassificationChipProps {
  id: string
  dimension: string
  value: string
  options: string[]
  confidence?: number
  isManual?: boolean
  onUpdate: (id: string, dimension: string, newValue: string) => Promise<void>
}

export const ClassificationChip: React.FC<ClassificationChipProps> = ({
  id,
  dimension,
  value,
  options,
  confidence = 0.8,
  isManual = false,
  onUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (newValue: string) => {
    if (newValue === value) {
      setIsOpen(false)
      return
    }
    setLoading(true)
    try {
      await onUpdate(id, dimension, newValue)
    } finally {
      setLoading(false)
      setIsOpen(false)
    }
  }

  const confidenceClass = confidence > 0.8 ? styles.high : confidence > 0.6 ? styles.medium : styles.low

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={`${styles.chip} ${isManual ? styles.manualChip : ''} ${loading ? styles.loading : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className={`${styles.confidence} ${confidenceClass}`} />
        <span className={styles.value}>{value || 'Unclassified'}</span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.map((option) => (
            <div
              key={option}
              className={`${styles.option} ${option === value ? styles.selectedOption : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
