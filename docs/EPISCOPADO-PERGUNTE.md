# Pergunte à Rede

> Status: **implementado** (beta escondido, como o resto de `/episcopado`). Página: `/episcopado/pergunte`. API: `POST /api/episcopado/pergunta` (contrato em [`EPISCOPADO-API.md`](./EPISCOPADO-API.md#pergunte-à-rede)). Os números deste documento foram medidos na base real (1.645 pessoas, 401 jurisdições, 2.656 fontes) em 28/10/2026.

Um agente responde perguntas em linguagem natural sobre a Rede do Episcopado Histórico, **só com a base**: texto com notas de rodapé (fonte + trecho literal), tabelas com CSV, gráficos, linhas do tempo, linhas de sucessão e caminhos entre dois nós. Exemplos: "quantas sagrações a IEAB registra por década?", "quais igrejas saíram da IEAB por cisma, e quem liderou cada uma?", "como Márcio Meira se liga a Cantuária?", "agora só as de depois de 2010".

## 1. Como funciona

```
navegador / app ── POST /api/episcopado/pergunta { pergunta, historico?, contexto? } ──► função Nitro (SSE)
  1. valida (zod); cache exato e limites no Supabase (sem ele: limites em memória); semáforo de 8 perguntas por instância
  2. base em memória (useEpiscopado) + /tmp/episcopado-<versão>.sqlite (gravado uma vez por instância)
  3. Claude + 5 ferramentas só de leitura (Tool Runner do @anthropic-ai/sdk, streaming, thread: false)
       buscar · sql · ficha · sucessao · caminho
       - consulta SQL roda num processo filho descartável (só-leitura, 2 s, SIGKILL)
       - ferramenta com `mostrar` → o servidor monta o bloco com os dados que ELE calculou → evento `bloco`
       - texto do modelo → eventos `texto` em streaming
  4. fim: cada [c:<claim_id>] vira nota [n] se a afirmação existe e foi devolvida por uma ferramenta
     nesta pergunta; o resto é apagado e contado → evento `resposta` + log
```

O modelo **nunca digita dados**: tabelas, gráficos, linhas do tempo, sucessões e caminhos vêm prontos do servidor; o texto só mantém as citações conferidas, e links internos para fichas inexistentes perdem o link. Perguntas de "validade" de ordens recebem os fatos e as versões de cada lado, sem veredito. Quando a base não tem a resposta, o agente diz isso ("A base não registra…") e a pergunta entra no log como lacuna (`pnpm episcopado:pauta --perguntas`).

### Peças

| Onde | O quê |
|---|---|
| `lib/sql/schema.ts` | DDL comentado das 13 tabelas (o mesmo texto vai ao prompt) |
| `lib/sql/build.ts`, `file.ts` | Achata a base: `claim_id` estável por afirmação (`p:<id>/ordinations/<i>`…), colunas `*_year`, `brazil`, `diocesan`, hierarquia `jurisdiction_ancestors` |
| `lib/sql/guard.ts`, `child.ts`, `runner.ts` | Guarda (um SELECT/WITH, embrulhado em `LIMIT 501`), processo filho `node -e` só-leitura, truncagem dentro do filho, timeout com SIGKILL |
| `lib/pergunta/briefs.ts` | Fichas enxutas para o modelo (≤ ~13 KB; as completas chegam a 1,4 MB) |
| `lib/pergunta/agent.ts` | O agente: ferramentas, loop, eventos, uso e custo |
| `lib/pergunta/citacoes.ts`, `claims.ts` | Verificação das citações e notas (até 2 fontes por afirmação, primárias primeiro) |
| `lib/pergunta/blocos.ts`, `contrato.ts` | Blocos e o contrato público (gera `schemas/pergunta-resposta.json`) |
| `lib/pergunta/prompt.ts` | System prompt: regras, semântica da base, esquema, exemplos, siglas das jurisdições |
| `lib/pergunta/historico.ts`, `markdown.ts` | Conversa sem estado (resumo devolvido pelo servidor) e markdown mínimo renderizado sem HTML cru |
| `server/api/episcopado/pergunta.post.ts`, `pergunta/aquecer.get.ts`, `server/utils/episcopadoPergunta.ts` | Endpoint SSE, aquecimento, limites/cache/log no Supabase |
| `pages/episcopado/pergunte.vue`, `components/episcopado/EpiscopadoResposta.vue`, `EpiscopadoBloco*.vue`, `composables/useEpiscopadoPergunta.ts` | Interface; botão "Perguntar" nas fichas (`?p=p:<id>`) |
| `supabase/migrations/episcopado_perguntas.sql` | Tabela de log/cache/lacunas e a função de reserva com os limites |
| `scripts/sql.ts`, `pergunta.ts`, `perguntas-eval.ts` | `pnpm episcopado:sql`, `episcopado:pergunta`, `episcopado:perguntas-eval` |

## 2. Números medidos

### Qualidade, velocidade e custo (eval de 41 perguntas)

`pnpm episcopado:perguntas-eval` roda 41 perguntas com gabarito tirado da própria base por SQL fixo: 20 numéricas, 10 de nomes (inclusive sucessão e caminho), 5 fora do escopo ou de segurança (juízo de validade, pedido do system prompt), 2 "a base não tem" e 4 continuações de conversa. Também reprova valores em inglês no texto e uma afirmação falsa conhecida (Robinson Cavalcanti como co-sagrante de Miguel Uchôa).

Rodada final (prompt atual):

| Modelo | Acerto | Mediana | p90 | Rodadas | Citações removidas | US$/pergunta (cache quente) |
|---|---|---|---|---|---|---|
| **Claude Sonnet 5.5, effort medium (padrão)** | **41/41** | **4,8 s** | **7,3 s** | 2,4 | 3% | 0,015 |
| Claude Haiku 5.5, effort medium | 38/41 | 5,6 s | 10,6 s | 2,9 | 2% | 0,0013 |

Rodada anterior, com quatro configurações e o prompt de então (acerto recorrigido com o corretor atual, menos a verificação de inglês):

| Configuração | Mediana | p90 | US$/mil (cache quente) |
|---|---|---|---|
| Sonnet 5.5 medium | 5,0 s | 7,2 s | 15 |
| Sonnet 5.5 medium, `thinking: between_tools` | 6,8 s | 13,0 s | 19 |
| Opus 5.5 low | 7,6 s | 12,6 s | 32 |
| Haiku 5.5 medium | 5,2 s | 9,3 s | 1 |

Na revisão manual das respostas, o Haiku inventou uma ligação direta num caminho (pergunta 30) duas vezes e deixa valores em inglês no texto; Sonnet e Opus não tiveram erro factual nas respostas lidas. Desligar o thinking (`between_tools`) não barateou nem acelerou. **Decisão: Sonnet 5.5 effort medium**; Haiku fica como opção de configuração se o custo um dia pesar.

### Custo real por pergunta

O system prompt mais as definições das ferramentas formam um prefixo de **~12,8 mil tokens**, em cache de prompt (5 min). Uma pergunta típica (2–3 rodadas) usa ~1,8 mil tokens de entrada fora do prefixo e ~600 de saída.

| Situação | Sonnet 5.5 | Haiku 5.5 |
|---|---|---|
| Cache quente (perguntas seguidas, < 5 min) | ≈ US$ 0,015 | ≈ US$ 0,0013 |
| Cache frio (tráfego esparso: paga a escrita do prefixo) | ≈ US$ 0,045 | ≈ US$ 0,003 |
| Mil perguntas, tráfego esparso | ≈ US$ 45 | ≈ US$ 3 |
| Pior caso diário (teto de 400 perguntas, frias) | ≈ US$ 18/dia | ≈ US$ 1,2/dia |

Perguntas de exemplo (chips da página) saem do cache exato no Supabase: sem custo de IA depois da primeira. O eval completo custa ≈ US$ 0,70 por configuração no Sonnet.

### Servidor

| Medida | Valor |
|---|---|
| Banco SQLite | 13 tabelas, ~10,9 MB, ~0,26 s para gravar; 24 mil linhas de trechos citados |
| Processo filho | sobe em ~30 ms; consulta típica 1–40 ms; consulta infinita morta em < 0,4 s (teste) |
| Instância fria (build de produção, localmente) | 4,1 s até o aquecimento responder (carga dos YAML + SQLite); depois, 5 ms |
| Pergunta completa na função empacotada | 5,3 s ("Quem sagrou Robinson Cavalcanti?") |
| Vercel | ≈ US$ 0,14 por mil perguntas (2 GB × ~20 s; desprezível perto da IA) |

## 3. Decisões (e por quê)

O plano passou por três revisões de arquitetura antes da implementação; a implementação corrigiu mais alguns pontos. O que ficou:

1. **SQL para a metade analítica, funções do grafo para o resto.** Contar, agrupar, filtrar e cruzar é SQL; sucessão e caminho são `successionView`/`shortestPath`, já testados. Os dois se encontram no `claim_id`.
2. **Processo filho, não `worker_threads`.** Medido: `worker.terminate()` não interrompe uma chamada nativa do SQLite e uma consulta infinita trava a função. `node -e` com o código em string fica fora do bundle do Nitro e morre com SIGKILL.
3. **A guarda do SQL não é a proteção contra consultas lentas.** O SQLite aceita CTE recursivo sem a palavra `RECURSIVE`; a proteção é o timeout. A guarda impede escrita, PRAGMA/ATTACH e múltiplos statements, e o embrulho usa quebras de linha (um `-- comentário` final engoliria o `LIMIT`).
4. **Sem ferramenta "responder".** Os blocos nascem nas ferramentas de leitura (`mostrar`) e o texto final é a saída normal do modelo, em streaming. Não há rodada de correção de citações: citação inválida é removida e contada (3% no eval; religar uma rodada condicional só se passar de 5%).
5. **Fichas enxutas.** `personView` de Robinson Cavalcanti tem 874 KB e `jurisdictionView` da Diocese do Recife 1,4 MB: como resultado de ferramenta seriam centenas de milhares de tokens.
6. **A ferramenta diz como ler o que devolve.** Na sucessão, cada linha é "X foi sagrado em DATA por Y" (antes o modelo trocava datas de passo); ao mostrar um bloco, o resultado lembra o modelo de não repetir os itens no texto.
7. **Ferramentas estritas.** `strict: true` em todas; campos opcionais como `.nullable()` (o `.optional()` do Zod sai de `required` e quebra o modo estrito) e sem `.int()`/`min`/`max` (o modo estrito recusa esses limites).
8. **`thread: false` no Tool Runner.** O SDK 1.3 abre por padrão um thread no servidor da API; aqui cada rodada manda o histórico, com uso por rodada interpretável.
9. **Conversa sem estado.** O cliente devolve, por turno, a pergunta e o `resumo` que o servidor gerou (texto com `[c:id]` e as consultas dos blocos). Nada de resultados de ferramenta crus.
10. **Limites e log no Supabase**, numa função SQL que reserva a pergunta com trava (o `rateLimit` em memória do projeto não vale entre instâncias). **Sem depender dele:** com o Supabase não configurado, fora do ar ou suspenso (erro, ou mais de 2,5 s sem resposta), a pergunta segue com limites em memória (`lib/pergunta/limites.ts`: os mesmos 20 por hora por IP e 400 por dia, contados por instância), sem cache nem log. Depois de uma falha, o Supabase fica 5 minutos de fora antes de ser tentado de novo, para nenhuma pergunta pagar o timeout. O teto do dia vira 400 × instâncias vivas, o que é aceitável como modo de emergência.

## 4. Operação

**Variáveis de ambiente (Vercel):**

| Variável | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Obrigatória; sem ela o endpoint responde 503 e a página avisa. Lida também em runtime |
| `EPISCOPADO_PERGUNTA_MODEL` | Padrão `claude-sonnet-5-5` (`claude-haiku-5-5`, `claude-opus-5-5` funcionam) |
| `EPISCOPADO_PERGUNTA_EFFORT` | Padrão `medium` (`low`, `high`) |
| `EPISCOPADO_PERGUNTA_THINKING` | `between_tools` desliga o thinking do Sonnet (o eval não mostrou ganho) |
| `EPISCOPADO_IP_SALT` | Sal do hash do IP no log |
| `NUXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Já existentes; ligam limites entre instâncias, cache e log (opcionais: sem eles, limites em memória) |

**Antes de abrir:** definir `ANTHROPIC_API_KEY`; aplicar `supabase/migrations/episcopado_perguntas.sql` quando o Supabase estiver disponível (sem ela, vale o modo em memória); abrir `/episcopado/pergunte` num preview e fazer uma pergunta (confirma Node 22 com `node:sqlite`, `/tmp` gravável e o streaming SSE no deploy real; o build de produção já foi testado localmente).

**Limites:** 20 perguntas por hora por IP, 400 por dia no total, 8 simultâneas por instância, 60 s por pergunta, 8 rodadas de ferramentas, pergunta de até 1000 caracteres, histórico de até 6 turnos. Constantes em `server/utils/episcopadoPergunta.ts`.

**Ferramentas de linha de comando:**

```
pnpm episcopado:sql "SELECT count(*) FROM people"        # mesmo esquema e guarda do agente
pnpm episcopado:sql --esquema                            # DDL comentado
pnpm episcopado:pergunta "Quem sagrou Robinson Cavalcanti?"   # o agente no terminal (precisa da chave)
pnpm episcopado:pergunta --prompt                        # imprime o system prompt
pnpm episcopado:perguntas-eval --configs sonnet,haiku    # eval (gasta API); --casos 4,21; --recorrigir <dir>
pnpm episcopado:pauta --perguntas                        # perguntas que a base não soube responder (Supabase)
```

**Quando mudar o prompt, as ferramentas ou o modelo:** rodar o eval e conferir à mão algumas respostas de sucessão e caminho (o corretor é por palavras-chave).

## 5. Limites conhecidos e próximos passos

- **Deploy real:** o build de produção foi rodado e testado localmente (Node 22, `node:sqlite`, processo filho, streaming); falta o primeiro preview na Vercel. O projeto não fixa `engines.node`: se a Vercel passar o projeto para Node 24, `node:sqlite` continua lá (plano B: `sql.js` no mesmo filho).
- **Cold start de ~4 s**, quase tudo `yaml.parse` dos 4.700 arquivos. Um snapshot JSON pré-parseado no build (PR separado) cortaria para ~1 s em toda a layer, não só aqui.
- **App iOS:** o contrato está publicado (`schemas/pergunta-resposta.json`); o consumo fica no repositório do app.
- **Semântica ambígua:** "sagrações da IAB" tem três leituras (realizadas na jurisdição, bispos da igreja, feitas por bispos da igreja); o prompt ensina as três e o agente diz qual usou. A base é incompleta (110 das 419 sagrações não registram a jurisdição) e as respostas dizem o que foi contado.
- **O eval é heurístico** (números e nomes no texto). Respostas de sucessão e caminho merecem leitura humana a cada mudança.
- **Mais tarde, se os dados pedirem:** rodada condicional de correção de citações (> 5% removidas), cache de prompt de 1 h (≥ 2 perguntas/hora sustentadas), Turnstile contra abuso, bloco de grafo recortado e mapa.
