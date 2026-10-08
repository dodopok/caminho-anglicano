---
name: episcopado-ingerir
description: Alimenta a Rede do Episcopado Histórico (layers/episcopado) a partir de uma notícia, página web, PDF, post, vídeo, texto colado ou fato relatado pelo usuário (testemunho). Extrai ordenações, vínculos de clérigos com jurisdições, cismas e relações entre jurisdições, sempre com fonte e trecho literal; mescla na base YAML pelo consolidador (que casa nomes, deduplica fontes e marca divergências), valida e comita. Use quando o usuário passar link/texto/fato sobre clérigos ou jurisdições anglicanas/episcopais, ou pedir para "ingerir", "adicionar à rede", "registrar sagração/ordenação", "corrigir" um dado da rede.
---

# Ingerir fonte na Rede do Episcopado Histórico

A base vive em `layers/episcopado/data/` (YAML, um arquivo por entidade: `people/`, `jurisdictions/`, `sources/`),
validada pelos esquemas zod de `layers/episcopado/lib/schemas.ts` (modelo explicado em `docs/EPISCOPADO.md`).
Chaves e enums em inglês; nomes, biografias e trechos no idioma original; respostas ao usuário em pt-BR.

As ferramentas ficam em `layers/episcopado/pesquisa/`:
- `FORMATO.md`: o formato JSON de uma *leva* (chaves em pt) — leia antes de escrever uma;
- `consolidar.py` (`pnpm episcopado:consolidar`): mescla levas na base YAML existente;
- `mapa.json`: nomes → ids quando o casamento automático não basta;
- `INSTRUCOES.md`: instruções e técnicas de acesso para agentes de pesquisa;
- `entrada/`: onde gravar as levas (fora do git).

## Princípios (inegociáveis)

1. **Nada sem fonte.** Toda afirmação tem fonte e `quote` LITERAL, no idioma original. Memória não é fonte.
2. **Testemunho do usuário** ("eu estava lá", "foi o bispo X") é fonte `personal_testimony`: `level: primary` se
   presenciou, `secondary` se ouviu dizer; `url: null`; `published` = data da conversa; `quote` com as palavras
   dele. Corte do trecho o que for privado ou ambíguo (ex.: "começaram em sua casa" → "foi na casa de Douglas").
   Correção do usuário a um fato já registrado: edite o YAML direto, substituindo o valor errado (pela leva ele
   viraria só divergência, porque a base prevalece) e acrescente o testemunho como fonte; diga no commit.
3. **Status:** `confirmed` = fonte primária ou ≥2 secundárias independentes; `probable` = uma secundária/terciária
   ou só testemunho; `contested` = divergência real entre fontes (o consolidador decide; ver abaixo).
4. **Só ministério.** Ordenações, cargos, vínculos, fundações, cismas. Nunca cônjuge, filhos, profissão secular,
   formação acadêmica, saúde, endereço residencial — nem em notas nem em trechos. Decretos disciplinares de quem
   não é bispo (laicização de padre etc.) ficam de fora.
5. **Google Drive/Docs** nunca aparecem como link no site: cite pelo nome do documento (`url: null`). Documento
   pessoal ou privado não entra.
6. **Nada de fato futuro.** Convite para ordenação ainda por acontecer não entra; anote e registre depois que o
   usuário confirmar que aconteceu.
7. **Documentos genealógicos** (pôsteres de "linhagem apostólica") misturam lista de ocupantes de uma sé com linha
   de sagração: aproveite só frases explícitas "X sagrou Y". A parte apostólica antiga não entra.
8. **Neutralidade** em cismas, deposições e debates de validade: atribua cada posição à sua fonte.
9. **Notas são lidas no site**: nada de "a base", "na base", "NOVO", "já registrado" — descreva o fato.
10. Datas: `AAAA-MM-DD`, `AAAA-MM`, `AAAA`, `c.AAAA` ou `AAAA/AAAA`. Não complete o que a fonte não diz.

## Fluxo

### 1. Capturar a fonte
- Já existe? `pnpm episcopado:search --url <url>` (e `pnpm episcopado:search "<nome>"` para as pessoas).
- Abra com WebFetch ou `curl`. Instagram, Facebook, YouTube, WordPress e Blogger têm truques próprios
  (embed do Instagram, `plugins/post.php` do Facebook, só `oembed` no YouTube, `wp-json`, feed JSON): veja
  `layers/episcopado/pesquisa/INSTRUCOES.md`. PDF: baixe para o scratchpad (pasta própria) e use `pdftotext`;
  PDF-imagem: `pdftoppm` e leia por partes. Vídeo que não abre: peça ao usuário a fala transcrita e o minuto.
- Arquivar é opcional: `curl -sS -m 60 -o /dev/null -D - "https://web.archive.org/save/<url>"` (no máximo 2
  tentativas; sem snapshot, `archive_url` fica vazio e o validador lista como lacuna).

### 2. Escrever a leva
Grave `layers/episcopado/pesquisa/entrada/<assunto>.json` no formato de `FORMATO.md`, uma afirmação atômica por
fato. Cuidados que já custaram retrabalho:
- **Nomes:** use o nome de exibição da base (`pnpm episcopado:search`). Mesmo nome não é mesma pessoa (Geraldo
  Magela do Nascimento ≠ Geraldo Santos de Magela Neto): confira igreja, datas e cargos antes de juntar. Se o nome
  casar com a pessoa errada ou com várias, acrescente a forma exata em `mapa.json` → `pessoas` (ou `jurisdicoes`,
  `dioceses` com chave `"<id-igreja>|<nome da diocese>"`).
- **Data de quem?** Confira se a data é da ordenação da pessoa ou de uma ordenação que ela presidiu.
- **Segunda sagração** (condicional, reordenação) é afirmação separada com `"modo"`; sem isso ela é fundida com a
  primeira e vira divergência de data/sagrante.
- **Cronologia:** o sagrante tem de ter sido sagrado antes. Se não, falta uma sagração anterior (procure) ou a data
  está errada.
- **Papéis** usam as chaves com sublinhado (`bispo_diocesano`, `bispo_coadjutor`, `fundador`, `clero`, `membro`…);
  outro texto vira `role: other` com a descrição.
- **Eventos de morte:** o consolidador infere `death` quando a descrição começa falando de morte
  ("falec", "morreu", "assassin" nos primeiros 60 caracteres). Para outros eventos, não comece a descrição assim;
  em dúvida, passe `"tipo_evento"`.
- `envolvidos` só com pessoas reais (o primeiro é o sujeito); paróquias, comissões e capelanias não são pessoas.

### 3. Consolidar
```bash
pnpm episcopado:consolidar layers/episcopado/pesquisa/entrada/<assunto>.json          # simulação
pnpm episcopado:consolidar layers/episcopado/pesquisa/entrada/<assunto>.json --write  # grava
```
(caminhos relativos à raiz do repositório). O consolidador:
- parte da base YAML: casa nomes por nome, nome completo, siglas e `aliases`, depois `mapa.json`;
- deduplica fontes por URL (e, sem URL, pelo título); `accessed` = hoje;
- mescla afirmações equivalentes (ordenação: ordem + modo; vínculo: igreja + diocese + papel; relação: tipo +
  alvo); a afirmação que já está na base continua principal, e a versão nova diverge em `discrepancies`;
- só deixa `contested` o conflito real: não contestam a jurisdição anacrônica ou relacionada (parte de, sucessora),
  o mesmo lugar escrito diferente, datas aninhadas ("2005" × "2005-03-26"), ±1 ano em vínculos, nem uma fonte
  isolada e tardia contra ≥2 fontes, uma delas da época (regra do pôster);
- grava só arquivos novos ou alterados e nunca apaga nada. Sem entradas, não muda nada.

Leia o relatório da simulação antes de gravar:
- `+ pessoa ⚠ parecido com: …` → provável duplicata: mapeie o nome em `mapa.json` e rode de novo;
- afirmações que ficaram contestadas → confira se o conflito é real; se a fonte nova está errada, corrija a leva;
- AVISOS: nota de bastidor, possível dado pessoal, data futura, link do Drive retirado, nome ambíguo, fonte sem URL.

Ajustes pontuais (corrigir um valor, apagar um trecho privado, trocar o status) podem ser feitos direto no YAML;
o consolidador respeita o que encontra.

### 4. Validar
- `pnpm episcopado:validate --warnings`: zero erros; revise os avisos que você introduziu (trecho faltando,
  duplicata, sagrante sagrado depois, morte inesperada).
- `pnpm vitest run layers/episcopado` se mexeu em código.
- `pnpm episcopado:pauta` mostra onde as cadeias de sucessão se interrompem (útil para ver se a leva fechou uma).

### 5. Entregar
- Se já há uma branch de trabalho do episcopado nesta sessão, comite nela; senão, crie `episcopado/<slug>` a partir
  da `main`. Não comite `layers/episcopado/auto-imports.d.ts` (gerado) nem as levas de `entrada/`.
- Mensagem: `feat(episcopado): <resumo>` ou `fix(episcopado): <correção>`, citando as fontes no corpo.
- PR só quando o usuário pedir; o corpo segue: Fonte · Fatos (tabela fato/novo-ou-alterado/status/trecho) ·
  Divergências · Dúvidas para revisão humana · Lacunas novas.
- Ao usuário: o que entrou, o que ficou contestado e por quê, e o que ele pode confirmar (com link direto).
