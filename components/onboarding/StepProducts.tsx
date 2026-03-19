'use client'
import styles from './steps.module.css'

interface Props {
  data: any
  onChange: (partial: any) => void
}

export default function StepProducts({ data, onChange }: Props) {
  const products = data.products || []

  const addProduct = () => {
    onChange({
      products: [...products, {
        name: '', description: '', price: '',
        product_type: 'course', target_audience: '',
        usps: [''], offer_details: '',
      }],
    })
  }

  const updateProduct = (i: number, field: string, val: any) => {
    const updated = [...products]
    updated[i] = { ...updated[i], [field]: val }
    onChange({ products: updated })
  }

  const removeProduct = (i: number) => {
    onChange({ products: products.filter((_: any, idx: number) => idx !== i) })
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Your Products</h2>
      <p className={styles.subtitle}>Add your products so AI auto-fills details when creating content</p>

      {products.map((p: any, i: number) => (
        <div key={i} className={styles.productCard}>
          <div className={styles.productHeader}>
            <strong>Product {i + 1}</strong>
            <button className={styles.removeBtn} onClick={() => removeProduct(i)}>Remove</button>
          </div>
          <label className={styles.label}>
            Product Name *
            <input className={styles.input} value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)} placeholder="e.g. Papers to Profits Course" />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Price
              <input className={styles.input} value={p.price} onChange={e => updateProduct(i, 'price', e.target.value)} placeholder="e.g. ₱1,300" />
            </label>
            <label className={styles.label}>
              Type
              <select className={styles.input} value={p.product_type} onChange={e => updateProduct(i, 'product_type', e.target.value)}>
                <option value="course">Course</option>
                <option value="physical">Physical Product</option>
                <option value="digital">Digital Product</option>
                <option value="service">Service</option>
                <option value="kit">Kit / Bundle</option>
              </select>
            </label>
          </div>
          <label className={styles.label}>
            Description
            <textarea className={styles.textarea} rows={2} value={p.description} onChange={e => updateProduct(i, 'description', e.target.value)} placeholder="What does this product include?" />
          </label>
          <label className={styles.label}>
            Offer Details (for ads)
            <input className={styles.input} value={p.offer_details} onChange={e => updateProduct(i, 'offer_details', e.target.value)} placeholder="e.g. Lifetime access, 3 bonus templates, private FB group" />
          </label>
        </div>
      ))}

      <button className={styles.addProductBtn} onClick={addProduct}>
        + Add Product
      </button>

      {products.length === 0 && (
        <p className={styles.emptyHint}>No products yet. Add at least one to get the most out of content generation.</p>
      )}
    </div>
  )
}
