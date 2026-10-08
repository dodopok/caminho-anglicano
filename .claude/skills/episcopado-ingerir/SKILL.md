---
name: episcopado-ingerir
description: Alimenta a Rede do Episcopado Histórico (layers/episcopado) a partir de uma notícia, página web, PDF, texto colado ou fato relatado pelo usuário. Extrai ordenações (diaconato, presbiterato, episcopado), vínculos de clérigos com jurisdições, cismas e filiações entre jurisdições, sempre com fonte e trecho literal; deduplica contra a base, valida e abre um PR. Use quando o usuário passar um link/texto/fato sobre clérigos ou jurisdições anglicanas/episcopais, ou pedir para "ingerir", "adicionar à rede", "registrar sagração/ordenação".
---

# Ingerir fonte na Rede do Episcopado Histórico

A base vive em `layers/episcopado/data/` (YAML, um arquivo por entidade: `people/`, `jurisdictions/`, `sources/`). Chaves e valores de enum são em inglês; o conteúdo (nomes, biografias, trechos) fica no idioma original. A referência dos campos é `layers/episcopado/lib/schemas.ts`, e o modelo está explicado em `docs/EPISCOPADO.md` (seção 2).

## Princípios (inegociáveis)

1. **Nada sem fonte.** Toda afirmação tem `sources: [{ source, quote }]`, e o `quote` é cópia LITERAL do texto da fonte, no idioma original. Nunca use memória própria como fonte.
2. **Fato do usuário** ("eu estava lá", "sei que…") vira fonte `type: personal_testimony`:
   - `author` = quem afirmou;
   - `accessed` = hoje;
   - `level: primary` se a pessoa presenciou, `secondary` se ouviu dizer.

   Afirmações só com testemunho entram como `probable`.
3. **Status:**
   - `confirmed` = fonte primária (documento/site oficial da jurisdição, ata, carta pastoral) ou ≥2 secundárias independentes.
   - `probable` = uma fonte secundária/terciária ou testemunho.
   - `contested` = fontes divergem.
4. **Nunca sobrescreva** um fato existente com outro conflitante. Adicione o valor novo em `discrepancies` (`field`, `value`, `sources`) e mude o status para `contested`. Se o fato novo *concorda*, só acrescente a fonte (e promova para `confirmed` se agora cumprir o critério).
5. **Documentos genealógicos** (pôsteres de "linhagem apostólica" etc.) misturam lista de ocupantes de uma sé com linha de sagração. Aproveite apenas as frases explícitas do tipo "X sagrou Y". Uma lista de bispos de uma diocese **não** é linha de sagração. A parte apostólica antiga (Pedro, Paulo…) não entra; a sucessão histórica vem da Wikidata e de fontes acadêmicas.
6. **Neutralidade.** Cismas, deposições e debates de validade são descritos sem tomar partido, atribuindo cada posição à sua fonte.
7. Datas: `AAAA-MM-DD`, `AAAA-MM`, `AAAA`, `c.AAAA` ou `AAAA/AAAA`. Não complete o que a fonte não diz.

## Fluxo

### 1. Capturar a fonte
- **URL:** abra com WebFetch (PDF: baixe para o scratchpad e leia; PDF que é imagem: renderize com `pdftoppm` e leia por partes). Antes, verifique se já existe: `pnpm episcopado:search --url <url>`.
- **Arquivar:** tente `curl -sS -m 60 -o /dev/null -D - "https://web.archive.org/save/<url>"` e pegue o snapshot do header `content-location`/`location`. Se falhar (429, timeout), deixe `archive_url: null`; o validador lista como lacuna. Não insista mais de 2 vezes.
- **Gravar:** crie `layers/episcopado/data/sources/<id>.yaml`, com id em slug curto (ex.: `anglican-ink-2018-uchoa-primaz`). A primeira linha é `# yaml-language-server: $schema=../../schemas/source.json`.

### 2. Extrair afirmações
Liste para você mesmo (não grave ainda) cada afirmação atômica:
- `ordinations` (na pessoa ordenada): `order` (`diaconate`/`presbyterate`/`episcopate`), `date`, `place`, `jurisdiction`, `ordained_by` **ou** `principal_consecrator` + `co_consecrators`, `office`.
- `affiliations` (na pessoa): `jurisdiction`, `role`, `diocese`, `start`/`end`, `end_reason`.
- `relations` (na jurisdição de origem): `schism_from`, `successor_of`, `merged_with`, `member_of`, `part_of`, `in_communion_with`, `broke_communion_with`, `recognized_by`, com `date`/`end` e `led_by`.
- `events` (na pessoa): deposição, renúncia, excomunhão, reconciliação, conversão.
- Dados biográficos: `birth`, `death`, `full_name`, `aliases`, `wikidata`.

### 3. Resolver entidades (evitar duplicatas)
Para cada pessoa/jurisdição citada, rode `pnpm episcopado:search "<nome>"`. Teste variações: sem "Dom"/"Rev.", só sobrenome, com e sem acento.
- **Achou com segurança:** use o id existente e acrescente o nome novo em `aliases` se for uma variação.
- **Ambíguo:** não chute. Crie com id desambiguado (`joao-silva-1950`) e liste no PR como dúvida.
- **Não existe:** crie o arquivo. Pessoas citadas só como ordenante também precisam de arquivo, mesmo mínimo (`id`, `name`).

Convenções de id:
- Pessoas: slug do nome usual (`miguel-uchoa`, `robinson-cavalcanti`).
- Jurisdições: sigla em minúsculas (`iab`, `ieab`).
- Dioceses: `ieab-diocese-recife`.

Para jurisdições brasileiras, preencha `locator_slug` com o slug do Localizador quando existir: `ieab`, `iab`, `reb`, `iarb`, `iceb`, `iecb`, `ieub`, `tac`.

### 4. Gravar
Edite os YAML mantendo as listas em ordem cronológica. Cada arquivo novo começa com `# yaml-language-server: $schema=../../schemas/<person|jurisdiction|source>.json`; em `people/historical/`, use `../../../schemas/...`.

### 5. Validar
- Rode `pnpm episcopado:validate --warnings` e corrija **todos os erros**.
- Revise os avisos que você mesmo introduziu: trecho faltando, duplicata, sagrante sagrado depois.
- Rode `pnpm vitest run layers/episcopado`.

### 6. Entregar
- Crie a branch `episcopado/<slug-da-fonte>` a partir da `main` atualizada.
- Faça o commit com a mensagem `feat(episcopado): <resumo> (fonte: <publicador>)`.
- Faça o push e abra o PR (ferramentas `mcp__github__*`) com este corpo:

```
## Fonte
<título> — <publicador>, <data>. <url> (arquivo: <snapshot ou "não arquivado">)

## Fatos
| Fato | Novo/Alterado | Status | Trecho |
|---|---|---|---|
| Miguel Uchoa sagrado bispo em 2012-12-08 por Roger Ames | novo | contested | "..." |

## Divergências com a base
- ...

## Dúvidas para revisão humana
- ...

## Lacunas novas
- (saída relevante de `pnpm episcopado:validate --gaps`)
```

Se o usuário pedir só para gravar, sem PR, pare no passo 5 e mostre o diff.
