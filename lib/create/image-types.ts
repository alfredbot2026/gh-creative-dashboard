export type ImageStyle = 'product_shot' | 'lifestyle' | 'promotional' | 'faceless_quote' | 'creator_featured'
export type AspectRatio = '1:1' | '4:5' | '16:9' | '9:16'

export interface ImageGenerationRequest {
  prompt: string
  style: ImageStyle
  aspect_ratio: AspectRatio
  reference_images?: string[]  // Supabase Storage paths
}

export interface ImageGenerationResponse {
  image_url: string           // Supabase Storage public URL
  storage_path: string        // Path in ad-creatives bucket
  prompt_used: string         // Final prompt with brand guide
  model: string
}
