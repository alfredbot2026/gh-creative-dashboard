/**
 * Multi-Turn Image Conversation Engine
 * 
 * Uses Gemini's chat API to maintain character consistency across
 * multiple image generations within a single conversation session.
 * 
 * Approach: Lock Grace's identity in Turn 1 with reference photos,
 * then generate scene variants in subsequent turns.
 */
import { GoogleGenAI } from '@google/genai'
import { getAnchor, saveAnchor } from './anchor-store'

const MODEL = 'gemini-3.1-flash-image-preview'

export class GraceImageSession {
  private chat: any = null
  private _initialized = false
  private _anchorImage: Buffer | null = null
  private ai: InstanceType<typeof GoogleGenAI>

  constructor(private apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  get isInitialized(): boolean {
    return this._initialized
  }

  getAnchor(): Buffer | null {
    return this._anchorImage
  }

  /**
   * Turn 1: Initialize session by locking Grace's identity.
   * Sends reference photo(s) + identity description.
   * Returns the anchor image (loaded from disk or freshly generated).
   */
  async initialize(referenceImages: Buffer[]): Promise<Buffer> {
    this.chat = this.ai.chats.create({
      model: MODEL,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })

    // Check for existing anchor image
    const existingAnchor = await getAnchor()

    // Build Turn 1 message parts
    const parts: any[] = []

    // Add reference images (1-2 max — more causes drift per our testing)
    for (const img of referenceImages.slice(0, 2)) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img.toString('base64'),
        },
      })
    }

    if (existingAnchor) {
      // We have an anchor — send it + refs to lock identity, ask for confirmation
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: existingAnchor.toString('base64'),
        },
      })

      parts.push({
        text: `These are reference photos and an anchor portrait of Grace, a Filipina woman in her early-to-mid 30s. She has a round, full face with soft prominent cheeks, light-medium warm skin tone, black long hair past her shoulders, and distinctive transparent peach/pink hexagonal glasses frames. She has a warm, natural smile.

Remember Grace's exact appearance from these photos. I will ask you to generate images of her in different scenes. Always preserve her exact face shape, skin tone, hair, and glasses from these reference photos.

Generate a portrait of Grace matching the anchor image exactly — head and shoulders, warm background. This confirms the identity lock.`,
      })

      // Even with existing anchor, we send Turn 1 with IMAGE output
      // to prime the conversation with Grace's identity
      try {
        const response = await this.chat.sendMessage({ message: parts })
        // We don't need the output — the anchor on disk is our reference
        // But this primes the chat history with Grace's identity
        this.extractImage(response) // just validate it returned an image
      } catch {
        // If image gen fails on the confirmation turn, that's OK
        // The identity is still locked from the reference images in chat history
      }

      this._anchorImage = existingAnchor
    } else {
      // No anchor yet — generate one
      parts.push({
        text: `These are reference photos of Grace, a Filipina woman in her early-to-mid 30s. She has a round, full face with soft prominent cheeks, light-medium warm skin tone, black long hair past her shoulders, and distinctive transparent peach/pink hexagonal glasses frames. She has a warm, natural smile.

Remember Grace's exact appearance from these reference photos. I will ask you to generate images of her in different scenes. Always preserve her exact face shape, skin tone, hair, and glasses from the reference photos.

First, generate a clean portrait of Grace — head and shoulders, neutral warm-toned background, soft natural lighting. This will be our anchor image for consistency.`,
      })

      const response = await this.chat.sendMessage({ message: parts })
      this._anchorImage = this.extractImage(response)

      // Save anchor for future sessions
      await saveAnchor(this._anchorImage)
    }

    this._initialized = true
    return this._anchorImage
  }

  /**
   * Turn 2+: Generate Grace in a new scene.
   * Uses the locked identity from Turn 1.
   */
  async generateScene(scenePrompt: string): Promise<Buffer> {
    if (!this._initialized || !this.chat) {
      throw new Error('Session not initialized — call initialize() first')
    }

    const messageParts: any[] = []

    // Re-send anchor image for reinforcement
    if (this._anchorImage) {
      messageParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: this._anchorImage.toString('base64'),
        },
      })
    }

    messageParts.push({
      text: `Using Grace from the reference photos and anchor portrait, generate her in this scene:

${scenePrompt}

Keep her exact face shape (round, full cheeks), skin tone, black long hair, and peach hexagonal glasses. Lifestyle photography style, warm natural lighting. No text overlays or UI elements.`,
    })

    const response = await this.chat.sendMessage({ message: messageParts })
    return this.extractImage(response)
  }

  private extractImage(response: any): Buffer {
    const candidates = response?.candidates || []
    for (const candidate of candidates) {
      for (const part of candidate?.content?.parts || []) {
        if (part?.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64')
        }
      }
    }
    throw new Error('Gemini returned no image in response')
  }
}
