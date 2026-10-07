# Rede do Episcopado Histórico — Plano de Arquitetura

> Status: **proposta** (nada implementado ainda). Nome de trabalho da layer: `episcopado`, rota `/episcopado`.

## 1. Objetivo

Um explorador interativo (busca central + grafo estilo Obsidian + fichas) que responde:

- **Quem é esta pessoa?** Ordenações (diaconato, presbiterato, episcopado), por quem, quando, onde, sob qual jurisdição, por onde passou.
- **De onde veio esta jurisdição?** Cismas, sucessões, fusões, filiações a comunhões (ex.: IARB ⊂ REC), quem liderou cada ruptura.
- **Qual a linha de sucessão de um bispo?** Subindo sagrante por sagrante até a sucessão histórica (Cantuária, Roma etc.).
- **Como X e Y estão ligados?** Caminho mais curto na rede.

Tudo **com fontes citáveis** e status explícito de cada afirmação.

### Decisões já tomadas

| Tema | Decisão |
|---|---|
| Armazenamento | Arquivos YAML no repositório, validados em CI; cada mudança é um PR |
| Ordens | Todas as ordens (diácono, presbítero, bispo) para todo clérigo cadastrado |
| Fronteira | Sucessão completa, remontando o mais longe possível |
| Fatos contestados | Mostrar todas as versões, cada uma com suas fontes; status `confirmed` / `probable` / `contested` |
| Bootstrap histórico | Importar ascendência via Wikidata (CC0) como `probable` |
| Lançamento | Beta escondido (noindex, fora do sitemap e da home) até ter massa crítica |
| Dados pessoais | Tudo que for público e tiver fonte (fotos só com licença compatível) |
| Ingestão | Skill do Claude Code que gera branch + PR com tabela de fatos e citações |

---

## 2. Modelo de dados

> Convenção do repositório: identificadores de código, nomes de arquivo, chaves dos YAML e valores de enum em **inglês**. Comentários, mensagens do validador, conteúdo (nomes, biografias, trechos citados), rotas e documentação em **pt-BR**.

A ideia central: **entidades** (pessoas, jurisdições, fontes) + **afirmações** (ordenações, vínculos, relações entre jurisdições, eventos). Toda afirmação carrega `sources` e `status` (`confirmed` | `probable` | `contested`). O grafo é *derivado* dos arquivos no build; ninguém edita o grafo diretamente. Fonte da verdade dos campos: `layers/episcopado/lib/schemas.ts`.

### 2.1 Entidades

**Pessoa** — `data/people/<id>.yaml` (históricos importados em `data/people/historical/`)

```yaml
# yaml-language-server: $schema=../../schemas/person.json
id: miguel-uchoa
name: Miguel Uchoa
full_name: Miguel Ângelo de Andrade Uchôa Cavalcanti
aliases: [Dom Miguel Uchôa]
birth: { date: "AAAA", place: "...", sources: [...] }
death: null
photo: { url: ..., license: CC-BY-SA-4.0, author: ..., source: ... }   # opcional
wikidata: Q116960395
biography: >
  Texto curto e neutro.
ordinations: [...]    # ver 2.2
affiliations: [...]   # ver 2.3
events: [...]         # deposição, renúncia, conversão etc.
```

**Jurisdição** — `data/jurisdictions/<id>.yaml`

```yaml
# yaml-language-server: $schema=../../schemas/jurisdiction.json
id: iab
acronym: IAB
name: Igreja Anglicana no Brasil
type: province         # communion | province | national_church | diocese | missionary_district | network | religious_order | other
tradition: anglican    # anglican | reformed_episcopal | continuing_anglican | charismatic_episcopal | ...
country: BR
founded: { date: "AAAA", sources: [...] }
locator_slug: iab      # liga com a tabela `jurisdictions` do Supabase → "ver igrejas"
relations: [...]       # ver 2.4
```

**Fonte** — `data/sources/<id>.yaml`

```yaml
# yaml-language-server: $schema=../../schemas/source.json
id: iab-poster-linhagem-uchoa
type: official_document  # official_document | minutes | news | book | article | thesis | institutional_site
                         # | social_media | wikidata | wikipedia | blog | personal_testimony | other
title: A Linhagem Apostólica de Miguel Ângelo A. Uchôa Cavalcanti
author: Rev. Gabriel Lopes
publisher: Igreja Anglicana no Brasil
url: null                # documentos recebidos em privado podem não ter URL
archive_url: null        # snapshot Wayback, gerado pela skill
published: "2026"
accessed: "2026-10-07"
language: pt
level: secondary         # primary | secondary | tertiary
```

`personal_testimony` cobre os "fatos que eu tenho": a fonte registra quem afirmou (`author`) e quando, e a afirmação nasce `probable` até ter fonte documental.

### 2.2 Ordenações (no arquivo da pessoa *ordenada*)

```yaml
ordinations:
  - order: presbyterate          # diaconate | presbyterate | episcopate
    date: "AAAA-MM-DD"           # EDTF simplificado: "2019", "2019-03", "c.1890", "1890/1895"
    place: "Catedral ..., Cidade"
    jurisdiction: iab
    ordained_by: <id-pessoa>     # diaconato/presbiterato
    status: confirmed
    sources:
      - { source: <id-fonte>, quote: "citação literal que sustenta o fato" }
  - order: episcopate
    date: "2012-12-08"
    jurisdiction: iab
    office: diocesan             # diocesan | coadjutor | suffragan | auxiliary | missionary | primate | other
    principal_consecrator: roger-ames
    co_consecrators: [kevin-allen, bill-atwood]
    mode: normal                 # normal | conditional | reordination
    status: contested
    discrepancies:               # versões alternativas, cada uma com suas fontes
      - field: date
        value: "2018-12-08"
        sources: [{ source: ..., quote: ... }]
    notes: >
      Notas neutras (ex.: debates sobre validade), sempre com fonte.
```

Campos desconhecidos ficam `null` e o validador os lista como **lacuna**. Assim "todas as ordens sempre" vira uma pauta de pesquisa mensurável em vez de bloquear o cadastro.

### 2.3 Vínculos pessoa ↔ jurisdição

```yaml
affiliations:
  - jurisdiction: iab
    role: bishop          # member | clergy | deacon | priest | bishop | diocesan_bishop | coadjutor_bishop
                          # | suffragan_bishop | auxiliary_bishop | missionary_bishop | primate | archbishop | founder | other
    diocese: <id-jurisdicao>   # opcional
    start: "AAAA"
    end: "AAAA"
    end_reason: left      # left | schism | transfer | resignation | deposition | retirement | death | term_end | other
    status: confirmed
    sources: [...]
```

### 2.4 Relações entre jurisdições (no arquivo da jurisdição de origem)

```yaml
relations:
  - type: schism_from     # schism_from | successor_of | merged_with | member_of | part_of
    target: iab           # | in_communion_with | broke_communion_with | recognized_by
    date: "AAAA"
    end: null
    led_by: [eric-rodrigues]
    status: confirmed
    sources: [...]
```

Exemplos citados que viram as primeiras afirmações (precisam de fonte antes de virar `confirmed`):

- IECB `schism_from` IEAB
- IAB `schism_from` IEAB
- REB `schism_from` IAB, com `led_by: [eric-rodrigues]`
- IARB `member_of` REC (com `date`/`end`)
- Eric Rodrigues: episcopado na IAB → vínculo IAB encerrado (`left`) → `founder` da REB

### 2.5 Por que as afirmações ficam dentro das entidades

PRs legíveis ("adicionar a sagração de X" mexe no arquivo de X), nenhuma aresta órfã, e o build inverte tudo (quem X sagrou, quais jurisdições saíram de Y).

### 2.6 Validação (`pnpm episcopado:validate`, e no CI via `pnpm test:run`)

- **Erros** (bloqueiam merge): schema zod; referências para ids inexistentes; ids duplicados (incluindo `former_ids`); afirmação sem fonte; ciclo de sagração; datas incoerentes (diaconato ≤ presbiterato ≤ episcopado, nada após o falecimento, sagrante já bispo e vivo na data).
- **Avisos**: referência sem trecho citado, possível duplicata (nomes normalizados iguais), fonte não usada.
- **Lacunas** (`--gaps`): ordenação sem data/sagrante/jurisdição, ordens anteriores faltando, bispo sem sagração cadastrada, jurisdição sem data de fundação, fonte sem snapshot arquivado.

JSON Schema gerado a partir do zod (`pnpm episcopado:schemas`) dá autocomplete e validação ao editar YAML no VS Code.

### 2.7 Artefatos de build

`buildGraph()` (`lib/graph.ts`) gera nós e arestas compactos para o explorador. Ainda a implementar: índice de busca (MiniSearch), dados por entidade para as fichas pré-renderizadas e relatório de lacunas publicado.

Com sucessão completa estimamos de alguns milhares a ~20 mil pessoas: viável como estático, desde que a visualização padrão seja **focada** (ego-rede), não "tudo de uma vez".

---

## 3. Experiência / Interface

### 3.1 Rotas

| Rota | Conteúdo |
|---|---|
| `/episcopado` | **Explorador.** Barra de busca central (estilo Spotlight; também `Ctrl/⌘+K` de qualquer página) e o grafo. Sem seleção, mostra a rede das jurisdições brasileiras e seus bispos atuais. |
| `/episcopado/pessoa/[id]` | **Ficha da pessoa:** linha do tempo de ordenações e vínculos, "sagrou/ordenou N", linha de sucessão resumida, mini-grafo, fontes numeradas [1][2] estilo Wikipedia, selos de status |
| `/episcopado/jurisdicao/[id]` | **Ficha da jurisdição:** origem (cisma de…), jurisdições filhas, comunhões, sucessão de primazes/bispos, link "ver igrejas no Localizador" |
| `/episcopado/sucessao/[id]` | **Linha de sucessão:** cadeia vertical de sagrantes principais até o ponto mais antigo conhecido; os co-sagrantes expandem como ramos |
| `/episcopado/arvore` | **Árvore das jurisdições:** linha do tempo horizontal com uma faixa por jurisdição; cismas aparecem como ramificações e filiações a comunhões como chaves |
| `/episcopado/caminho?de=X&para=Y` | **Como X e Y se ligam:** caminho mais curto (ex.: um bispo brasileiro → Arcebispo de Cantuária) |
| `/episcopado/fontes` | Bibliografia completa, filtrável |
| `/episcopado/lacunas` | (admin/beta) O que falta pesquisar, priorizado |

Todo estado relevante (nó selecionado, filtros, profundidade, ano) fica na URL, então qualquer visão é compartilhável.

### 3.2 O grafo (estilo Obsidian)

- **Biblioteca: Sigma.js + Graphology.** Renderiza em WebGL e aguenta dezenas de milhares de nós. O layout ForceAtlas2 roda em web worker, e o graphology já traz busca em largura e caminho mais curto. Cytoscape seria mais confortável para layouts hierárquicos, mas fica pesado na escala da sucessão completa.
- **Nós:**
  - pessoas são círculos, com tamanho proporcional a quantos ordenou/sagrou;
  - jurisdições são hexágonos/quadrados, na cor da jurisdição (a mesma do Localizador).
- **Arestas:**
  - sagração principal: sólida, com seta;
  - co-sagração: tracejada;
  - ordenação diaconal/presbiteral: fina;
  - cisma: vermelha;
  - `membro_de`: pontilhada;
  - vínculo pessoa–jurisdição: cinza;
  - `contested`: sinal de alerta na aresta.
- **Interação:**
  - hover destaca os vizinhos e esmaece o resto, como no Obsidian;
  - clique abre o painel lateral com o resumo e um link pra ficha;
  - duplo clique expande os vizinhos;
  - um seletor de profundidade (1–3) controla o foco.
- **Filtros:** tipo de nó, ordens, jurisdição, status, "incluir históricos (pré-Brasil)", e um **controle de ano** pra ver a rede como era em 1990, 2005, 2020…
- **Mobile:** fichas e listas são a experiência principal; o grafo fica como visão opcional em tela cheia.

### 3.3 Busca

MiniSearch no cliente, com:

- busca por prefixo e fuzzy;
- normalização de acentos;
- busca por siglas (IAB, IEAB) e por aliases ("Dom …").

Os resultados vêm agrupados em Pessoas / Jurisdições / Fontes. Enter abre o nó no grafo, e Shift+Enter abre a ficha.

---

## 4. Alimentação da base

### 4.1 Skill `episcopado-ingerir` (`.claude/skills/episcopado-ingerir/SKILL.md`)

**Entrada:** URL, texto colado, PDF ou um fato seu ("Fulano foi sagrado por Beltrano em 2012, eu estava lá").

**Fluxo:**

1. **Captura.** Baixa o conteúdo e arquiva no Wayback Machine (`web.archive.org/save`). Cria/atualiza o YAML da fonte. Fato pessoal vira fonte `personal_testimony`.
2. **Extração.** Gera uma lista estruturada de afirmações (ordenações, vínculos, relações), cada uma com o **trecho literal** que a sustenta.
3. **Resolução de entidades.** `pnpm episcopado:search "nome"` (busca fuzzy em nomes e aliases) evita duplicatas. Se houver ambiguidade, a skill lista no PR em vez de chutar.
4. **Mesclagem.** Fato novo é adicionado. Fato igual ganha mais uma fonte. Fato **conflitante** com um já registrado nunca sobrescreve: vira uma entrada em `discrepancies` e o status passa a `contested`.
5. **Validação.** Roda `pnpm episcopado:validate` e corrige até passar.
6. **Entrega.** Cria a branch `episcopado/<slug>`, faz o commit e abre um PR com:

   | Fato | Novo/Alterado | Status | Fonte | Trecho |
   |---|---|---|---|---|

   Mais a lista de dúvidas abertas e de lacunas novas.

### 4.2 Skill `episcopado-pesquisar` (fase posterior)

Recebe uma pessoa ou jurisdição, lê o relatório de lacunas, busca fontes públicas pro que falta e entrega pelo mesmo fluxo de PR.

### 4.3 Wikidata: o que a sondagem mostrou (out/2026)

A ideia original era subir a sucessão histórica com um importador da Wikidata. A sondagem mostrou que, para a linha anglicana, isso quase não funciona:

- **Cobertura:** nenhum dos 78 bispos da base que têm QID tem sagrante (P1598) na Wikidata. A TEC do século XIX (White, Provoost, Hopkins, Tuttle, Dudley…) também não tem. Seabury tem os três sagrantes escoceses, mas sem papel e sem continuação.
- **O que existe:**
  - a linha **católica**, bem coberta: sobe ~20–26 passos até Scipione Rebiba;
  - os **arcebispos de Cantuária recentes**, até Randall Davidson ou Vernon-Harcourt;
  - Cranmer, que sobe 6 passos.

  Matthew Parker não tem sagrante, então não há ponte da Reforma até os anglicanos modernos.
- **Modelagem:**
  - Nos católicos, o sagrante vem em `P1598` com o papel no qualificador `P3831`: `Q18442817` é o sagrante principal e `Q18442822` o co-sagrante.
  - Nos anglicanos ingleses, o sagrante aparece como qualificador de um evento `P793 = Q125375` (sagração).
  - Data e lugar quase nunca estão no `P1598`; ficam no evento (`P585` e `P276`).
  - Nunca case itens pelo nome. Exemplo: "Gilbert Sheldon" (Q119207) é um bispo católico do século XX, e o arcebispo é Q584403.
- **Estratégia:** busca nível a nível com `wbgetentities` (50 itens por chamada), lendo `P1598` tanto como declaração quanto como qualificador. Um protótipo validado está no scratchpad da sessão, e vira `scripts/import-wikidata.ts` quando for útil.
- **Decisão:** a sucessão histórica vem **principalmente por curadoria**. Fontes:
  - as listas numeradas de bispos da TEC, que trazem os sagrantes de cada bispo;
  - Perry (1895), Spirit of Missions e Living Church, no Internet Archive;
  - Lambeth e Crockford's.

  A Wikidata entra como complemento para a linha de Cantuária recente e, se quisermos, para pontes com Roma.

### 4.4 Fontes recomendadas

- **Primárias:** atas, cartas pastorais e notas oficiais das jurisdições; registros de Lambeth Palace; Crockford's.
- **Secundárias:** imprensa religiosa, livros de história do anglicanismo no Brasil.
- **Terciárias:** Wikipedia/Wikidata.
- Catholic-Hierarchy só como **referência citada**: os termos dele não permitem raspagem em massa.

---

## 5. Integração com o restante do site

- `locator_slug` liga cada jurisdição à tabela `jurisdictions` do Supabase. Assim, a ficha da jurisdição mostra "N igrejas no Localizador" e a página `/igrejas/[jurisdictionSlug]` ganha "Ver história e episcopado".
- O campo `pastors` das igrejas é texto livre hoje. Uma evolução futura é vincular a ids de pessoa.
- Beta: uma flag `runtimeConfig.public.episcopadoPublico` controla `noindex`, a exclusão do sitemap e o link na home.

---

## 6. Estrutura da layer

```
layers/episcopado/
  nuxt.config.ts
  data/{people,people/historical,jurisdictions,sources}/*.yaml
  lib/                  # schemas zod, datas EDTF, carga, validação, grafo (sem auto-import do Nuxt)
  schemas/              # JSON Schema gerado a partir do zod
  scripts/              # validate, search, schemas, import-wikidata (futuro)
  composables/          # useEpiscopadoGrafo, useEpiscopadoBusca
  components/episcopado/ # GrafoSigma, PainelNo, BarraBusca, LinhaTempo, ArvoreJurisdicoes, FonteRef...
  pages/episcopado/...
.claude/skills/episcopado-ingerir/SKILL.md
```

**Dependências novas:**

- `sigma`, `graphology`, `graphology-layout-forceatlas2`, `graphology-shortest-path`;
- `minisearch`, `yaml`;
- `elkjs` ou `d3-hierarchy` (só se a árvore de jurisdições precisar).

---

## 7. Fases

| Fase | Entrega | Critério de pronto |
|---|---|---|
| **0. Fundação** | Schemas, validador, build do grafo, CI, ~15–30 entidades-semente (jurisdições brasileiras + casos citados), com fontes | `pnpm episcopado:validate` verde no CI; relatório de lacunas gerado |
| **1. Alimentação + fichas** | Skill `episcopado-ingerir`; páginas de pessoa, jurisdição e fontes; busca ⌘K; beta noindex | Você consegue colar um link e receber um PR correto; fichas navegáveis |
| **2. Rede** | Explorador Sigma com foco, filtros, controle de ano e estado na URL | Buscar "Eric Rodrigues" mostra a vizinhança e permite navegar pela rede |
| **3. Genealogias** | Linha de sucessão, árvore das jurisdições, "caminho entre X e Y"; importador Wikidata | Algum bispo brasileiro com linha até Cantuária visível |
| **4. Abertura** | Sugestão de correção pública (vira issue/PR), imagens OG por ficha, sitemap, link na home | Massa crítica atingida e você decide abrir |

A Fase 1 coloca a ingestão antes do grafo de propósito: o gargalo do projeto é **dado com fonte**, não visualização.
