/**
 * NotebookLM CLI wrapper
 * Executes `nlm` commands and parses JSON output.
 */
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const NLM_PATH = '/home/rob/.local/bin/nlm'

export interface NlmNotebook {
  id: string
  title: string
  source_count: number
  updated_at: string
}

export interface NlmQueryResult {
  answer: string
  conversation_id: string
  sources_used: string[]
}

/** List all notebooks */
export async function listNotebooks(): Promise<NlmNotebook[]> {
  const { stdout } = await execFileAsync(NLM_PATH, ['notebook', 'list', '--json'], {
    timeout: 30000,
  })
  return JSON.parse(stdout)
}

/** Query a notebook */
export async function queryNotebook(
  notebookId: string, 
  query: string,
  conversationId?: string
): Promise<NlmQueryResult> {
  const args = ['notebook', 'query', notebookId, query, '--json']
  if (conversationId) {
    args.push('--conversation-id', conversationId)
  }
  
  const { stdout } = await execFileAsync(NLM_PATH, args, {
    timeout: 120000, // 2 min timeout for complex queries
  })
  const result = JSON.parse(stdout)
  return result.value || result
}
