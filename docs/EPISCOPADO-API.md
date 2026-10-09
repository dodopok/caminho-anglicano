# API da Rede do Episcopado Histórico

Endpoints HTTP (Nitro, `layers/episcopado/server/api/episcopado/`) que alimentam o explorador web e o app nativo ([`rede-episcopado-app`](https://github.com/dodopok/rede-episcopado-app), plano em `docs/EPISCOPADO-APP.md`). Todos são `GET`, respondem JSON e, em produção, ficam em cache (ISR) até o próximo deploy: a base só muda com um deploy.

Convenções: ids de nó têm prefixo `p:` (pessoa) ou `j:` (jurisdição); datas seguem o EDTF simplificado da base (`AAAA-MM-DD`, `AAAA-MM`, `AAAA`, `c.AAAA`, `AAAA/AAAA`); `status` é `confirmed`, `probable` ou `contested`. Os tipos de resposta são os de `layers/episcopado/lib/views.ts` e `lib/app.ts` (fonte da verdade).

## Base e versão

| Endpoint | Resposta |
|---|---|
| `GET /api/episcopado/manifest` | `Manifest`: `version` (hash do conteúdo dos YAML, mais o commit na Vercel), `generatedAt`, `counts` (`people`, `jurisdictions`, `sources`, `edges`, `bishops`, `contested`), `yearRange` |
| `GET /api/episcopado/snapshot` | A base inteira, como nos YAML: `{ version, generatedAt, people, jurisdictions, sources }` (~4 MB sem compressão). O app guarda e só baixa de novo quando `version` muda; o cabeçalho `X-Episcopado-Version` repete a versão |
| `GET /api/episcopado/graph` | `Graph` compacto: `nodes` e `edges` (ver `lib/graph.ts`). Alimenta o explorador e a busca local |
| `GET /api/episcopado/posicoes?escopo=brasil\|tudo` | Posições globais do grafo calculadas com ForceAtlas2 no servidor: `{ version, scope, nodes: { "p:id": [x, y] } }`. Só entram nós da abrangência com alguma ligação. Determinístico para a mesma base |

## Fichas

| Endpoint | Resposta |
|---|---|
| `GET /api/episcopado/pessoa/:id` | `PersonView` (ordenações, trajetória, eventos, quem sagrou/ordenou, linha de sucessão, notas). Id antigo: `{ redirect: "<id atual>" }` |
| `GET /api/episcopado/jurisdicao/:id` | `JurisdictionView` (origem e relações, membros, notas). Idem para ids antigos |
| `GET /api/episcopado/sucessao/:id` | `SuccessionView`: `person`, `steps` (sagrantes principais, da pessoa à mais antiga), `end` (`unknown_consecrator`, `no_episcopate`, `cycle` ou `null`), `origin` (`{ label, person }` quando a linha chega a Cantuária, Roma, Utrecht ou Escócia), `alt` (linha por co-sagrantes, se for mais longe) e `altOrigin` |
| `GET /api/episcopado/fonte/:id` | `SourceView`: a fonte e cada afirmação que ela sustenta, com o trecho citado |
| `GET /api/episcopado/fontes` | `SourceListItem[]`: bibliografia com quantas afirmações e fichas cada fonte sustenta |

## Busca, caminho e descoberta

| Endpoint | Parâmetros | Resposta |
|---|---|---|
| `GET /api/episcopado/busca` | `q` (texto), `limite` (1–50, padrão 12) | `{ q, people, jurisdictions, sources }`: nós do grafo com `score`, e fontes por título, autor ou publicador. Sem acento, por prefixo, por sigla e apelido |
| `GET /api/episcopado/caminho` | `de`, `para` (ids de nó), `modo=sagracoes` (padrão: só sagrações e ordenações) ou `tudo` | `PathResult` com `steps`: cada passo traz `id`, `label`, `kind`, `order`, `year` e `via` (`kind`, `status`, `year`, `reversed` = contra a seta). `steps: null` quando não há caminho; 404 se um nó não existe |
| `GET /api/episcopado/efemerides` | `dia=MM-DD` (padrão: hoje, UTC), `dias` (1–31, padrão 7) | `{ start, days, items: Ephemeris[] }`: ordenações e sagrações com dia e mês na janela, na ordem do calendário |
| `GET /api/episcopado/inicio` | | `HomeView`: `manifest`, `starters` (jurisdições brasileiras de nível igreja, com bispos, membros e grau), `thisWeek` (efemérides dos próximos 7 dias) e `contested` (8 afirmações contestadas mais recentes) |
| `GET /api/episcopado/contestados` | | `ContestedClaim[]`: toda afirmação contestada com `versions` (cada versão com campo, valor e número de fontes) e o total de fontes distintas |
| `GET /api/episcopado/lacunas` | | `Finding[]` do validador (`--gaps`): o que falta pesquisar, por entidade |

## Exemplos

```
/api/episcopado/caminho?de=p:miguel-uchoa&para=p:thomas-cranmer
/api/episcopado/caminho?de=p:eric-rodrigues&para=j:ieab&modo=tudo
/api/episcopado/efemerides?dia=12-08&dias=1
/api/episcopado/busca?q=uchoa&limite=5
/api/episcopado/posicoes?escopo=tudo
```

## Como o app usa

1. Abre com o snapshot embarcado e pede `manifest`; se `version` mudou, baixa `snapshot`, `graph` e `posicoes` em segundo plano.
2. Fichas, sucessão e caminho vêm dos endpoints prontos (ou, quando o `EpiscopadoKit` tiver o porte da lógica, são calculados no aparelho a partir do snapshot).
3. `inicio` monta a tela de início numa chamada; `efemerides` alimenta os widgets; `busca` alimenta o Spotlight e a Siri.

## Cache e limites

- `routeRules['/api/episcopado/**'] = { isr: true }`: cada URL (inclusive a query string) fica em cache na Vercel até o próximo deploy.
- `posicoes` roda o layout uma vez por instância do servidor (cerca de 2 s para o Brasil e 3 s para a rede inteira); o resultado fica em memória e no cache da borda.
- Nenhum endpoint escreve na base. Correções continuam entrando por PR (ver a skill `episcopado-ingerir`).
