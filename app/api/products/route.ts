import { NextResponse } from 'next/server'
import { listProducts } from '@/app/actions/products'

export async function GET() {
  try {
    const products = await listProducts()
    return NextResponse.json(products)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
