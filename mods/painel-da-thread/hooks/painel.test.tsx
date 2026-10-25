import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'painel-da-thread',
  component: 'Pane',
  requestId: 'painel-da-thread',
  props: { title: 'Painel da thread', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('o painel mostra tarefas e subagents em todas as telas', async ($, on) => {
  on('command.register', () => ({ value: { command: 'painel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('agent.list', () => ({ value: [{ id: 'a1', description: 'Pesquisar', type: 'Explore', status: 'running' }] }))
  on('clock.now', () => ({ value: 1000 }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'A', status: 'completed', activeForm: 'Fazendo A' },
      { content: 'B', status: 'in_progress', activeForm: 'Fazendo B' },
    ],
  })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Tarefas 1\/2/ }))?.text).toBeTruthy()
    expect((await ui.find({ type: 'Text', text: /Pesquisar/ }))?.text).toBeTruthy()
    await ui.unmount()
  }
})
