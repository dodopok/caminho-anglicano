// What `pnpm portal:shots` photographs, each at every width (1440 and 390 by
// default). Edit freely, or point the script at another list with
// `--routes path/to/list.mjs` (a module whose default export has this shape).
//
//   name       file name (without .png); a filter argument matches on it
//   path       the portal address, as an operator would open it
//   scenario   mock scenario per tab (mocks/index.mjs SCENARIOS); unset tabs are `normal`
//   click      optional: the accessible name of a button to press before the photo
//   widths     optional: only these widths for this entry

export default [
  { name: 'visao-geral', path: '/portal-do-ordo' },
  { name: 'pessoas', path: '/portal-do-ordo?aba=pessoas' },
  { name: 'pratica', path: '/portal-do-ordo?aba=pratica' },
  { name: 'negocio', path: '/portal-do-ordo?aba=negocio' },
  { name: 'operacao', path: '/portal-do-ordo?aba=operacao' },
  { name: 'operacao-regras', path: '/portal-do-ordo?aba=operacao&vista=regras', widths: [1440] },

  { name: 'audio-visao-geral', path: '/portal-do-ordo?aba=audio' },
  { name: 'audio-cobertura', path: '/portal-do-ordo?aba=audio&secao=cobertura' },
  { name: 'audio-nova-geracao', path: '/portal-do-ordo?aba=audio&secao=nova-geracao' },
  { name: 'audio-cobertura-livro', path: '/portal-do-ordo?aba=audio&secao=cobertura&livro=loc_2015&biblia=naa' },
  { name: 'audio-execucoes', path: '/portal-do-ordo?aba=audio&secao=execucoes&execucao=1842' },
  { name: 'audio-nova-geracao-confirmar', path: '/portal-do-ordo?aba=audio&secao=nova-geracao&livro=loc_2015&biblia=naa', click: 'Conferir custo', widths: [1440] },
  { name: 'audio-clips', path: '/portal-do-ordo?aba=audio&secao=clips', widths: [1440] },
  { name: 'audio-manutencao', path: '/portal-do-ordo?aba=audio&secao=manutencao', widths: [1440] },
  { name: 'audio-provedor-fora', path: '/portal-do-ordo?aba=audio', scenario: { audio: 'provedor-fora' } },

  { name: 'uso-resumo', path: '/portal-do-ordo?aba=uso' },
  { name: 'uso-recurso-oficio', path: '/portal-do-ordo?aba=uso&secao=recursos&recurso=office' },
  { name: 'uso-publico', path: '/portal-do-ordo?aba=uso&secao=publico', widths: [1440] },
  { name: 'uso-funis', path: '/portal-do-ordo?aba=uso&secao=funis', widths: [1440] },
  { name: 'uso-conteudo', path: '/portal-do-ordo?aba=uso&secao=conteudo', widths: [1440] },
  { name: 'uso-antes-do-resumo', path: '/portal-do-ordo?aba=uso&periodo=7d', scenario: { usage: 'antes-do-resumo' }, widths: [1440] },
  { name: 'uso-dias-faltando', path: '/portal-do-ordo?aba=uso', scenario: { usage: 'dias-faltando' }, widths: [1440] },

  { name: 'livros-galeria', path: '/portal-do-ordo?aba=livros' },
  { name: 'livros-detalhe', path: '/portal-do-ordo?aba=livros&livro=loc_2015' },
  { name: 'livros-ranking', path: '/portal-do-ordo?aba=livros&vista=ranking' },
  { name: 'livros-pre-lancamento', path: '/portal-do-ordo?aba=livros&livro=loc_2027' },
  { name: 'livros-sem-api', path: '/portal-do-ordo?aba=livros', scenario: { books: 'sem-api' } },
  { name: 'livros-sem-api-detalhe', path: '/portal-do-ordo?aba=livros&livro=loc_2015', scenario: { books: 'sem-api' }, widths: [1440] },

  { name: 'login', path: '/portal-do-ordo/login?mock=sem-sessao' }
]
