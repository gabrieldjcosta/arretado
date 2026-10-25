export type Todo = { content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm: string }
export type Live = { phase: 'idle' | 'working'; startedAt: number; tools: number; lastTool: string; turns: number }

declare module 'claude-code' {
  interface PluginState {
    'painel-da-thread': { todos: Todo[]; live: Live; tick: number; isHidden: boolean }
  }
}
