import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Live, Todo } from '../types'

const PANE = 'painel-da-thread'

const todos = atom({ plugin: 'painel-da-thread', key: 'todos' } as const, [] as Todo[], { shape: 'todos-1' })
const live = atom(
  { plugin: 'painel-da-thread', key: 'live' } as const,
  { phase: 'idle', startedAt: 0, tools: 0, lastTool: '', turns: 0 } as Live,
  { shape: 'live-1' },
)
// Bumped on agent changes so the drawings re-read $.agent.list().
const tick = atom({ plugin: 'painel-da-thread', key: 'tick' } as const, 0)
const isHidden = atom({ plugin: 'painel-da-thread', key: 'isHidden' } as const, false)

const ICON: Record<string, string> = {
  pending: '🔵', running: '🔵', waiting: '🟡', idle: '⚪', completed: '🟢', failed: '🔴', killed: '⚫',
}
const LABEL: Record<string, string> = {
  pending: 'na fila', running: 'rodando', waiting: 'esperando', idle: 'parado', completed: 'concluído', failed: 'falhou', killed: 'parado à força',
}

const bar = (done: number, total: number, width = 12) => {
  const n = total === 0 ? 0 : Math.round((done / total) * width)
  return '█'.repeat(n) + '░'.repeat(width - n)
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60}s` : `${s}s`
}

async function summary($: EngineInterface) {
  const list = await read($, todos)
  const l = await read($, live)
  const agents = await $.agent.list()
  const now = await $.clock.now()
  const done = list.filter((t: Todo) => t.status === 'completed').length
  const doing = list.find((t: Todo) => t.status === 'in_progress')
  const running = agents.filter((a: any) => a.status === 'running' || a.status === 'waiting').length
  return { list, l, agents, now, done, doing, running }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'painel', description: 'Abre o painel da thread (estado, tarefas, subagents)' })
    void $.ui.open({ id: PANE, title: 'Painel da thread' })
    return next(e)
  })

  on('command.run', { command: 'painel' }, async $ => {
    await update($, isHidden, () => false)
    await $.ui.open({ id: PANE, title: 'Painel da thread' })
    return { text: 'Painel aberto.' }
  })

  on('prompt.submit', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, live, l => ({ ...l, phase: 'working', startedAt: now, tools: 0, lastTool: '' }))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'TodoWrite') {
      const list = e.todos as Todo[] | undefined
      if (Array.isArray(list)) await update($, todos, () => list)
    }
    await update($, live, l => ({ ...l, tools: l.tools + 1, lastTool: e.tool }))
    if (e.tool === 'Agent') await update($, tick, n => n + 1)
    const ran = await next(e)
    if (e.tool === 'Agent') await update($, tick, n => n + 1)
    return ran
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    await update($, tick, n => n + 1)
    return r
  })

  on('turn.complete', async ($, e, next) => {
    await update($, live, l => ({ ...l, phase: 'idle', turns: l.turns + 1 }))
    await update($, tick, n => n + 1)
    return next(e)
  })

  // Compact band: one line on every surface, mainly for the phone.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    await read($, tick)
    const s = await summary($)
    if (s.l.phase === 'idle' && s.list.length === 0 && s.agents.length === 0) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const state = s.l.phase === 'working' ? '🔵 Trabalhando' : '🟢 Aguardando você'
    const prog = s.list.length ? ` · ${bar(s.done, s.list.length, 8)} ${s.done}/${s.list.length}` : ''
    const ag = s.agents.length ? ` · 🤖 ${s.running}/${s.agents.length}` : ''
    return (
      <Box flexDirection="row" gap={1}>
        <Text dimColor>{state}{prog}{ag}</Text>
        <Button key="hide" label="Ocultar" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })

  // Full pane: desktop and vscode.
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick)
    const s = await summary($)
    const working = s.l.phase === 'working'
    return (
      <Box flexDirection="column" gap={1} padding={1}>
        <Box flexDirection="column">
          <Text bold size="heading">{working ? '🔵 Trabalhando' : '🟢 Aguardando você'}</Text>
          <Text dimColor>
            {working
              ? `${fmt(s.now - s.l.startedAt)} neste turno · ${s.l.tools} ações · última: ${s.l.lastTool || '—'}`
              : `${s.l.turns} turnos concluídos`}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>Tarefas {s.list.length ? `${s.done}/${s.list.length}` : ''}</Text>
          {s.list.length === 0 && <Text dimColor>Nenhuma lista de tarefas ainda.</Text>}
          {s.list.length > 0 && <Text mono>{bar(s.done, s.list.length, 20)} faltam {s.list.length - s.done}</Text>}
          {s.list.map((t: Todo) => (
            <Text dimColor={t.status === 'completed'} bold={t.status === 'in_progress'}>
              {t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔵' : '⬜'}{' '}
              {t.status === 'in_progress' ? t.activeForm : t.content}
            </Text>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>Subagents {s.agents.length ? `(${s.running} ativos de ${s.agents.length})` : ''}</Text>
          {s.agents.length === 0 && <Text dimColor>Nenhum subagent invocado.</Text>}
          {s.agents.map((a: any) => (
            <Box flexDirection="column" borderStyle="round" paddingX={1}>
              <Text bold>{ICON[a.status] ?? '⚪'} {a.description || a.type}</Text>
              <Text dimColor>{a.type} · {LABEL[a.status] ?? a.status}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    )
  })
}
