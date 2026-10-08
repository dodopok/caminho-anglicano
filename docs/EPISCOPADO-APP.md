# Episcopado para iOS, iPadOS e macOS — Plano de design do app nativo

> Status: **proposta de design** (nada implementado). Companheiro nativo da layer `layers/episcopado` (Rede do Episcopado Histórico). Este documento define experiência, sistema visual, telas, integrações com o sistema e arquitetura técnica. Os mockups das telas estão no canvas "Episcopado para iOS" (claude.ai) publicado junto com este plano.

## 1. Resumo

**O que é.** Um app nativo em Swift/SwiftUI, com um único código para iPhone, iPad e Mac, que responde às quatro perguntas da rede (quem é esta pessoa; de onde veio esta jurisdição; qual a linha de sucessão deste bispo; como X e Y se ligam) com toda afirmação citável, a um toque da fonte.

**Para quem.** Clérigos, pesquisadores, jornalistas religiosos e fiéis curiosos. Dois usos dominam: *consulta rápida* ("quem sagrou fulano?") e *exploração longa* (seguir uma linha até Cantuária ou Roma, entender um cisma).

**Por que nativo, e não só o site.** Base inteira no aparelho (abre em menos de um segundo, funciona sem rede), grafo com 60 fps e gestos de verdade, busca integrada ao Spotlight e à Siri, widgets com efemérides, cartões de compartilhamento bonitos, Handoff com o site.

**Decisões principais.**

| Tema | Decisão |
|---|---|
| Plataformas | iOS 26, iPadOS 26 e macOS 26 (Liquid Glass) em um alvo SwiftUI; visionOS fica para depois |
| Base de dados | Snapshot compilado dos YAML, embarcado no app e atualizado em segundo plano; fichas, sucessão e busca calculadas no aparelho |
| Layout do grafo | Posições globais pré-calculadas no build (mesmo ForceAtlas2 do site); só a ego-rede é recalculada no aparelho |
| Identidade | Papel e tinta com acento granada, como no site; os controles usam o vidro do sistema, o conteúdo fica no papel |
| Tipografia | New York (serif do sistema) para títulos, SF Pro para interface, SF Mono para metadados; Dynamic Type em tudo |
| Navegação | Quatro abas (Início, Rede, Linhagens, Fontes) e a aba de busca do sistema; no iPad e no Mac viram barra lateral |
| Lançamento | Mesmo regime de beta da web (TestFlight fechado) até a base ter massa crítica |

## 2. Princípios

1. **Papel e tinta, agora com luz.** O conteúdo vive em papel (fundo creme, serifa, selos em mono); a interface flutua em vidro translúcido sobre ele. O vidro nunca compete com o texto: não há cor de marca em fundos grandes.
2. **Uma pergunta por tela.** Cada tela principal responde a uma das quatro perguntas. Nada de painéis com três propósitos.
3. **Toda afirmação tem fonte a um toque.** As chamadas de nota `[n]` são elementos de primeira classe, nunca escondidas em um "saiba mais". O status (confirmado, provável, contestado) é visível no próprio item.
4. **A rede é um lugar, não um gráfico.** Você entra, se desloca, foca, volta. Posições são estáveis entre sessões; um nó fica onde você o deixou.
5. **Nada se perde.** Trilha, filtros, nó selecionado e posição de rolagem são restaurados ao reabrir. Todo estado tem URL (as mesmas do site), então tudo é compartilhável e abre no site e no app.
6. **Sem truques de novato, sem muro para o especialista.** Primeiro uso guiado por "Comece por aqui" e exemplos reais; usuário avançado tem teclado completo, filtros, profundidade e máquina do tempo.
7. **Acessível por padrão.** Dynamic Type, VoiceOver com alternativa em lista para o grafo, Reduce Motion e Increase Contrast respeitados, alvos de toque de 44 pt.

## 3. Arquitetura de navegação

### 3.1 Abas

| Aba | Símbolo (SF Symbols) | Responde | Conteúdo |
|---|---|---|---|
| **Início** | `house` | "por onde começo?" | Continuar de onde parou, Nesta semana (efemérides), Comece por aqui (jurisdições no Brasil), Contestados, A base hoje |
| **Rede** | `point.3.connected.trianglepath.dotted` | "como isto se liga?" | O grafo em tela cheia, filtros em vidro, máquina do tempo, mini-ficha em folha |
| **Linhagens** | `arrow.triangle.branch` | "de onde vem?" | Linha de sucessão, Caminho entre X e Y, Árvore das jurisdições |
| **Fontes** | `books.vertical` | "em que se baseia?" | Bibliografia filtrável e ficha da fonte |
| **Buscar** (aba de busca do sistema) | `magnifyingglass` | "onde está…?" | Campo tipo Spotlight; vazio mostra sugestões, recentes e siglas |

No iPhone a barra de abas é o vidro flutuante do iOS 26, com a busca como botão circular separado à direita. No iPad e no Mac o mesmo `TabView` vira barra lateral (`.sidebarAdaptable`), com as jurisdições brasileiras listadas abaixo das seções, e a busca vira o campo da barra de ferramentas (⌘K).

### 3.2 Fichas são destinos, não abas

Pessoa, jurisdição e fonte são telas empilhadas (`NavigationStack`) dentro de qualquer aba. Da Rede, a ficha abre como **folha** sobre o grafo (o grafo continua visível e mantém o nó selecionado); no iPad abre na **coluna de inspeção** à direita. De qualquer ficha, "Ver na rede" troca para a aba Rede já com o nó em foco, e "Linha de sucessão" troca para Linhagens com a pessoa carregada.

### 3.3 Mapa de rotas (paridade com a web)

| Web | App | Observações |
|---|---|---|
| `/episcopado` | Aba Rede | `?no=`, `?ficha=`, `?prof=`, `?ano=`, `?tudo=`, `?clero=`, `?ocultar=` viram estado do explorador; mesmos nomes, para Universal Links |
| `/episcopado/pessoa/[id]` | `PersonScreen(id)` | `#secao` rola para a seção |
| `/episcopado/jurisdicao/[id]` | `JurisdictionScreen(id)` | |
| `/episcopado/fontes` | Aba Fontes | `?q=`, `?nivel=`, `?tipo=` viram filtros |
| `/episcopado/fonte/[id]` | `SourceScreen(id)` | |
| `/episcopado/sucessao/[id]` (planejada) | Linhagens → Sucessão | o app estreia a rota; o site a ganha depois |
| `/episcopado/caminho?de=X&para=Y` (planejada) | Linhagens → Caminho | idem |
| `/episcopado/arvore` (planejada) | Linhagens → Árvore | idem |
| `/episcopado/lacunas` (planejada) | Início → "O que falta pesquisar" (modo pesquisa) | |

`former_ids` redirecionam no app como no site (links antigos continuam abrindo a ficha certa).

### 3.4 Gestos e atalhos globais

- **Voltar**: deslizar da borda esquerda (padrão). No grafo, deslizar da borda também volta na trilha.
- **Fechar folha**: arrastar para baixo; Esc no iPad/Mac.
- **Teclado** (iPad com teclado e Mac): `⌘K` busca, `/` busca, `Esc` fecha o que estiver aberto (nota → folha → seleção), `⌘[` e `⌘]` percorrem a trilha, `1`/`2`/`3`/`0` mudam a vizinhança, `⌘+`/`⌘-`/`⌘0` zoom e enquadrar, `⌘⇧C` copia o link da vista.
- **Handoff**: qualquer ficha ou vista da rede continua no Mac ou no site e vice-versa (`NSUserActivity` com a URL web).

## 4. Sistema visual

### 4.1 Cor

Tokens semânticos (Asset Catalog, com variante escura e de alto contraste). O escuro não é o claro invertido: é "tinta" (preto quente), com a granada clareada para manter contraste 4,5:1 e o papel reduzido a texto.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `paper` | `#F3F0E8` | `#16140F` | fundo das telas |
| `paper2` | `#F8F6F0` | `#1A1813` | barras e faixas secundárias |
| `card` | `#FDFCF9` | `#1E1B15` | cartões, folhas, listas |
| `ink` | `#15130F` | `#EDE8DC` | títulos, texto principal |
| `body` | `#4F483D` | `#C9C1AF` | texto corrido |
| `muted` | `#6B6354` | `#948B7A` | metadados, legendas |
| `rule` | `#C9C1AF` | `#3B352C` | linhas e contornos |
| `line2` | `#ECE8DE` | `#26231C` | divisores suaves |
| `garnet` (tint) | `#8B2E1F` | `#D0705C` | acento, pessoas/bispos, chamadas de nota, seleção |
| `garnetSoft` | `#F6EEEB` | `#2A1A16` | fundo de seleção e de nota aberta |
| `teal` | `#1F4E5F` | `#6FA3B3` | jurisdições (igrejas e províncias) |
| `tealDiocese` | `#4D8494` | `#8FBFCB` | dioceses e distritos |
| `communion` | `#5B4A7A` | `#A796C9` | comunhões e redes |
| `gold` | `#B8862B` | `#D4A54A` | co-sagração |
| `confirmed` | `#2F5D3A` | `#7FB38A` | status confirmado |
| `contested` | `#8A1C12` | `#E07268` | status contestado, cismas |
| `presbyter` / `deacon` | `#475569` / `#94A3B8` | `#9FB0C4` / `#6B7A8C` | presbíteros e diáconos no grafo |

Regras: a cor de tint do app é `garnet`; os selos de status usam só contorno e texto (nunca fundo cheio); ligações no grafo seguem exatamente a tabela de `lib/style.ts` (sagração granada, co-sagração dourada, ordenação cinza-azulada, vínculo cinza, cisma vermelho, sucessão/fusão roxo, filiação petróleo).

### 4.2 Tipografia

| Papel | Fonte | Estilo base | Exemplo |
|---|---|---|---|
| Nome na ficha | New York (`.fontDesign(.serif)`) | `largeTitle` semibold, 34–40 pt | "Miguel Uchôa" |
| Títulos de seção | New York | `title2` semibold | "Ordenações" |
| Interface e texto | SF Pro | `body` 17, `subheadline` 15, `footnote` 13 | biografia, listas |
| Eyebrows | SF Pro | `caption2` semibold, caixa alta, tracking 0,08 em | "BISPO · IAB · PRIMAZ" |
| Metadados e datas | SF Mono (`.monospaced`) | `caption`, dígitos tabulares | "8 dez. 2012", "[12]" |

Tudo em Dynamic Type; nenhum tamanho fixo em pontos fora do grafo. Em tamanhos de acessibilidade, a grade de fatos rápidos vira lista e os chips quebram linha. Opcional: embarcar Newsreader (OFL) para continuidade com o site; a recomendação é New York, porque ganha tamanhos ópticos e Dynamic Type de graça.

### 4.3 Forma, material e profundidade

- **Controles**: vidro do sistema (Liquid Glass). Botões primários sobre o grafo em `.glassProminent`; nas fichas, o botão primário é tinta cheia (`ink` sobre `paper`), como no site.
- **Superfícies de conteúdo**: cantos contínuos de 12 pt em cartões e 16 pt em folhas. Os selos de status e as chamadas `[n]` ficam com 4 pt, para manter o ar editorial. O site usa 2 px; no iOS, cantos retos lutam contra o sistema, então a identidade passa pela cor e pelo tipo, não pelo canto.
- **Sombras**: quase nenhuma. Cartões se separam por `card` sobre `paper` e por um fio de `rule`. Só folhas e popovers têm sombra, a do sistema.
- **Papel**: um grão muito sutil (ruído a 3%) no fundo do grafo e das capas de sucessão, desligado em Reduce Transparency.

### 4.4 Ícones

SF Symbols em toda a interface. Três símbolos próprios, desenhados no template do SF Symbols para herdar pesos e Dynamic Type: **mitra** (bispo), **igreja** (jurisdição), **báculo** (sucessão). Ordem das pessoas: mitra (bispo), estola (presbítero), estola diaconal (diácono) como variantes do mesmo símbolo. Status: `checkmark.seal` (confirmado), `questionmark.diamond` (provável), `exclamationmark.triangle` (contestado).

### 4.5 Movimento e tato

| Momento | Movimento | Háptico |
|---|---|---|
| Tocar um nó | O nó desliza para o centro (mola `.snappy`, 450 ms); os vizinhos florescem a partir dele; o resto esmaece para 18% | `selection` |
| Abrir ficha a partir do nó | `navigationTransition(.zoom)` do nó para a folha | nenhum |
| Mudar vizinhança (1 → 2 → 3) | Anéis de vizinhos aparecem em ondas de 80 ms | `impact(.light)` |
| Máquina do tempo | Nós surgem/desaparecem com fade de 200 ms ao arrastar | tique a cada década |
| Chegar ao fim da sucessão | O último elo ganha o selo da origem (Cantuária, Roma, Utrecht) com um brilho curto | `notification(.success)` |
| Abrir nota `[n]` | Popover ancorado (iPad/Mac) ou folha com detent `.fraction(0.4)` (iPhone) | nenhum |

Com Reduce Motion, todas as transições viram crossfade; as ondas viram aparição simultânea; o grafo não anima o layout.

### 4.6 Acessibilidade

- **Grafo**: um botão "Listar vizinhança" abre a mesma informação em lista (os grupos da mini-ficha: sagrado por, sagrou, vínculos…). O VoiceOver lê o grafo como "Rede com N nós e M ligações; nó selecionado: Miguel Uchôa, bispo, 36 ligações" e oferece o rotor "Vizinhos".
- **Status** nunca só por cor: selo com glifo e texto.
- **Chamadas de nota** têm rótulo "Fonte 12, Novas Igrejas Anglicanas e Episcopais no Brasil".
- Contraste mínimo 4,5:1 em texto, 3:1 em ícones e linhas de grafo em foco.

## 5. Telas

Cada tela descreve objetivo, estrutura, interações, estados e o que muda em relação à web.

### 5.1 Início

**Objetivo.** Dar um ponto de partida que não assuste e trazer de volta quem já explorou.

**Estrutura (de cima para baixo).**
1. Título "Episcopado" em serifa, subtítulo "Rede do Episcopado Histórico · Caminho Anglicano", e uma linha com a base: "1 511 pessoas · 314 jurisdições · 1 440 fontes · atualizada em 7 out. 2026".
2. **Continuar** (só quando há trilha): a última vista da rede como cartão largo com miniatura do grafo e os três últimos nós visitados.
3. **Nesta semana**: carrossel horizontal de efemérides calculadas da base (sagrações e ordenações com dia e mês na semana corrente). Cada cartão: dia em mono, nome em serifa, "sagrado bispo · IECB · 2024". Toque abre a ficha.
4. **Comece por aqui**: grade 2 × N das jurisdições brasileiras de nível igreja (IEAB, IAB, IECB, REB, IARB, IATB, WAC-BR, IELB…), cada cartão com ponto de cor, sigla, nome, "desde 1890 · 36 bispos". Toque abre a ficha; toque longo oferece "Ver na rede".
5. **Contestados**: lista curta das afirmações com status contestado mais recentes (ex.: "Sagração de Márcio Meira: 10 jun. 2017 ou 11 jun. 2017 ou 2021 · 3 fontes"). Toque abre a seção da ficha.
6. **O que falta pesquisar** (modo pesquisa, ligado em Ajustes): as lacunas priorizadas (ordenação sem data, bispo sem sagração…).

**Estados.** Primeiro uso: sem "Continuar", um cartão "Como explorar" com três passos e o botão "Abrir a rede". Sem rede e sem atualização: nada muda (a base é local); um rótulo "base de 7 out." na linha de estatísticas.

**Novidade frente à web.** Efemérides, "Continuar", contestados em destaque.

### 5.2 Buscar

**Objetivo.** A busca ⌘K do site como aba de busca do sistema.

**Comportamento.** Campo com placeholder "Clérigo, sigla ou jurisdição (ex.: Uchôa, IEAB)". Resultados agrupados em Pessoas / Jurisdições / Fontes, com ponto de cor, nome e subtítulo (ordem ou tipo). Busca por prefixo, difusa e sem acentos; siglas e aliases ("Dom…") contam. Vazio mostra: recentes, "Comece por aqui" e as siglas mais buscadas. Toque abre a ficha; deslizar o resultado para a esquerda oferece "Ver na rede" e "Linha de sucessão". No iPad/Mac, Enter abre a ficha e ⇧Enter seleciona na rede, como no site.

**Sistema.** A mesma lista alimenta o Core Spotlight: buscar "Uchôa" na tela inicial do iPhone mostra "Miguel Uchôa · Bispo · Episcopado" e abre direto a ficha.

### 5.3 Rede

**Objetivo.** O explorador. Grafo em tela cheia, com os controles em vidro flutuando sobre ele.

**Estrutura.**
- **Topo**: chips em vidro, roláveis na horizontal: `Brasil ▾` (Brasil / Rede inteira), `Só bispos`, `Dioceses`, `Ordenações`, `Vínculos`, `Cismas e filiações`; um botão `Filtros` abre a folha completa (os mesmos interruptores com explicação de cada um e "Limpar filtros").
- **Centro**: o grafo. Pessoas são círculos (bispo granada, presbítero e diácono cinza-azulados; tamanho pelo grau); jurisdições são hexágonos arredondados (igreja petróleo, diocese petróleo-claro, comunhão roxo). Rótulos aparecem para os nós maiores e, no foco, para toda a vizinhança.
- **Direita, verticais em vidro**: `+`, `−`, enquadrar, legenda.
- **Rodapé, acima da barra de abas**: a **máquina do tempo** (ver 5.12) recolhida como uma linha com o ano; e a **trilha** como cápsulas (`IAB › Uchôa › Ames`), com "Recomeçar" à esquerda.

**Interações.**
- Toque no nó: seleciona; o nó vai ao centro, vizinhos florescem, mini-ficha sobe (5.4).
- Toque duplo: abre a ficha completa como folha.
- Toque longo: menu de contexto com "Abrir ficha", "Linha de sucessão", "Caminho até…", "Fixar como centro", "Compartilhar".
- Pinça e arrasto: zoom e pan com inércia. Toque duplo com dois dedos: enquadrar.
- Passar o mouse (iPad com trackpad, Mac): destaca vizinhos e mostra a dica (nome, ordem, ano), como no site.
- Vizinhança (1, 2, 3 passos, sem foco) vive na mini-ficha e em teclas.

**Estados.** Carregando a base pela primeira vez: esqueleto do grafo com três pontos pulsando e "Montando a rede…". Filtros que escondem tudo: cartão "Nada para mostrar com os filtros atuais · Limpar filtros". Nó da URL inexistente: faixa granada "O nó não existe na rede".

**Vista inicial.** Como no site: núcleo brasileiro, só bispos, dioceses visíveis. Primeira entrada mostra, sobre o grafo, um cartão em vidro "Como explorar" com três passos e os seis pontos de partida; ele some ao primeiro toque e volta pelo botão `?`.

### 5.4 Mini-ficha (painel do nó)

Folha com três detents (`.fraction(0.28)`, `.medium`, `.large`) sobre o grafo; no iPad e no Mac, coluna de inspeção à direita (380 pt).

**Conteúdo (pessoa).** Eyebrow colorido "BISPO · IAB", nome em serifa, subtítulo (nome completo, datas), botão em vidro proeminente "Abrir ficha", segmentado de vizinhança, contagem "36 nós · 58 ligações"; depois biografia (4 linhas, "ler mais"), ordenações compactas com selo D/P/B, trajetória (últimos quatro vínculos), "Sagrou ou ordenou 20" em chips, três fontes principais e "Ligações na rede" agrupadas (sagrado por, co-sagrantes, sagrou, vínculos…). Tocar qualquer nome seleciona o nó correspondente no grafo sem fechar a folha.

**Conteúdo (jurisdição).** Eyebrow "PROVÍNCIA · ANGLICANA · BRASIL", sigla e nome, fundação/extinção, origem e relações (cisma de, membro de…), bispos e primazes, fontes, ligações.

**Novidade.** Os detents substituem a alça arrastável do site; na posição mínima só o cabeçalho e o botão "Abrir ficha" ficam à vista, com o grafo inteiro livre.

### 5.5 Ficha da pessoa

**Objetivo.** A ficha completa, lida como um artigo bem editado.

**Estrutura.**
1. **Cabeçalho**: eyebrow "BISPO · IAB · PRIMAZ", nome em New York 40 pt, nome completo, datas de vida com `[n]`, "Também:" aliases; linha de ações em vidro: `Ver na rede`, `Linha de sucessão`, `Compartilhar`, `…` (Wikidata, links externos, Sugerir correção).
2. **Fatos rápidos**: grade de pares rótulo/valor (Sagração · 8 dez. 2012; Sagrante principal · Roger Ames; Função atual · Primaz · IAB; Sagrou ou ordenou · 20 pessoas; Fontes · 129 notas · 1 contestada). Valores são links.
3. **Barra de seções** fixa no topo ao rolar (cápsulas em vidro): Resumo · Ordenações · Sucessão · Sagrou · Trajetória · Eventos · Fontes, com contagens. Toque rola para a seção; a cápsula ativa acompanha a rolagem.
4. **Resumo**: biografia em 17 pt com chamadas `[n]`.
5. **Ordenações**: linha do tempo vertical com marcadores D/P/B; cada item traz data, sagrante/ordenante (link), co-sagrantes, jurisdição, local, selo de status, notas de pesquisa (dobrável) e **versões divergentes** quando contestado (cada versão com suas fontes).
6. **Linha de sucessão** (prévia): cartão com os três primeiros elos e "28 passos até William Barlow, 1536 · ver linha completa".
7. **Sagrou e ordenou**: grupos (sagrante principal, co-sagrou, ordenou presbíteros, ordenou diáconos), cada linha com nome, data, jurisdição, status.
8. **Trajetória**: linha do tempo de vínculos (função, jurisdição › diocese, período, motivo do fim).
9. **Eventos**: deposição, renúncia, conversão…
10. **Fontes**: notas numeradas; cada uma com título, tipo, nível, trecho citado e "abrir ↗ / arquivo ↗".
11. **Como ler esta ficha**: o que significam os selos.

**Interações.** Tocar `[n]` abre o cartão da fonte (5.11). Tocar um nome abre a ficha daquela pessoa empilhada (voltar restaura a rolagem). Deslizar a seção Sucessão para a esquerda abre a linha completa. Toque longo no nome copia o link.

**Compartilhar.** `ShareLink` com link e **cartão** gerado por `ImageRenderer`: nome, "sagrado em 8 dez. 2012 por Roger Ames", "28 passos até William Barlow (1536)", marca Caminho Anglicano.

### 5.6 Ficha da jurisdição

Mesma anatomia. Fatos rápidos: fundação, extinção, origem (cisma de IEAB, 2005), bispos e primazes, deu origem a N, fontes. Seções: Resumo · Origem e relações (cartões "De onde veio", "Deu origem a", "Comunhões e reconhecimento", "Reconhecida por") · Bispos (linha do tempo com ponto petróleo para vínculos atuais) · Clero e membros · Fontes.

**Novidades.**
- **Árvore local**: um mini-diagrama de três níveis (de onde veio → esta → o que saiu dela) com toque para a árvore completa (5.9).
- **Igrejas no mapa**: quando há `locator_slug`, um `Map` com as igrejas do Localizador (Supabase) e "Ver N igrejas"; abre o Localizador no site, ou o app do Localizador se existir.
- **Bispos como grade de retratos** quando houver fotos licenciadas; sem foto, iniciais em serifa sobre `garnetSoft`.

### 5.7 Linha de sucessão

**Objetivo.** A tela-assinatura do app: subir sagrante por sagrante até a origem, com o tempo correndo na margem.

**Estrutura.** Tela cheia, modo "tinta" (escuro) por padrão para destacar a cadeia (segue o tema do sistema se o usuário preferir). Cabeçalho: "Linha de sucessão", nome, "28 passos · até 1536". À esquerda, uma **régua de anos** fixa; no centro, a cadeia vertical: cada elo é um cartão com número do passo, nome em serifa, "sagrado em 9 dez. 2007" e selo de status; os conectores dizem "sagrado por". A régua avança com a rolagem, então o leitor sente o salto de 1942 para 1901 ou de 1559 para 1536.

**Fim da linha.** O último elo ganha o selo da origem: **Cantuária** (quando chega a Parker, Barlow ou Cranmer), **Roma** (Rebiba), **Utrecht**, **Escócia** (Seabury) ou "A linha para aqui: sagrante ainda não registrado" com botão "O que falta" (lacuna). Chegar a uma origem dá o háptico de sucesso.

**Linha alternativa.** Quando a principal para e outro caminho vai mais longe no tempo (por co-sagrantes), um cartão "Por outros sagrantes chega a Thomas Cranmer (1533) em 25 passos" abre a cadeia alternativa com os elos de co-sagração marcados `CO`.

**Ferramentas.** `Compactar` (mostra os 3 primeiros, "+ 22 passos", os 3 últimos), `Comparar com…` (duas linhas lado a lado, elos comuns destacados em dourado), `Compartilhar cartão` (imagem alta com toda a cadeia), `Ver na rede` (o caminho é destacado no grafo).

### 5.8 Caminho entre X e Y

**Objetivo.** "Como X e Y se ligam?" com resposta visual.

**Estrutura.** Dois seletores (`De`, `Para`) com busca embutida e botão de trocar; sugestões: "até Cantuária (Matthew Parker)", "até Roma (Scipione Rebiba)", "até a IEAB". Resultado: "25 passos" e a cadeia como lista vertical compacta com o tipo de cada elo (sagração, co-sagração, vínculo, cisma) e ano. Botão "Ver na rede" destaca o caminho no grafo com os nós intermediários acesos. Opção "Só sagrações" vs. "Qualquer ligação" (o segundo inclui vínculos e relações entre jurisdições).

Caminho mais curto por busca em largura, no aparelho, sobre o grafo compacto (menos de 50 ms para 4 mil arestas).

### 5.9 Árvore das jurisdições

**Objetivo.** Ver os cismas e filiações no tempo.

**Estrutura.** Linha do tempo horizontal (1890 → hoje) com uma faixa por jurisdição, na cor do tipo; cismas aparecem como ramos saindo da faixa de origem no ano do cisma; filiações a comunhões como chaves tracejadas. No iPhone, a árvore começa filtrada em "Brasil" e com a IEAB no centro; rolagem e pinça nos dois eixos. No iPad em paisagem é a tela mais bonita do app: toda a árvore brasileira cabe em uma tela.

Toque numa faixa abre a mini-ficha; toque num ramo mostra a relação com fontes.

### 5.10 Fontes e ficha da fonte

**Fontes.** Lista com campo de busca na base da tela (padrão do iOS 26), chips de nível (Todas · Primárias · Secundárias · Terciárias) e menu de tipo. Cada linha: selos de tipo e nível, data, idioma em mono, título, autor · publicador, e à direita "N afirmações · M fichas". Deslizar para a esquerda: "Abrir ↗", "Arquivo ↗". Cabeçalho com "1 440 fontes · 612 primárias · 58 ainda sem uso".

**Ficha da fonte.** Cabeçalho com tipo, nível (com explicação ao tocar), título, autor · publicador, botões "Abrir fonte ↗" e "Arquivo (snapshot) ↗", fatos rápidos (publicação, consultada em, sustenta N afirmações em M fichas). Depois, "O que esta fonte sustenta", agrupado por ficha: cada item com a afirmação, o trecho citado em serifa itálica e a página; toque leva à seção da ficha. Versões divergentes marcadas em vermelho.

### 5.11 Citações, status e discrepâncias

- **Chamada `[n]`**: botão em granada, 44 pt de área de toque. Toque abre o **cartão da fonte**: popover ancorado no iPad/Mac; folha com detent de 40% no iPhone. Conteúdo: "Nota [12]", selos de tipo e nível, título, autor · publicador · data, o **trecho citado** em serifa itálica, página, botões "Abrir fonte ↗", "Arquivo ↗", "Ver tudo que ela sustenta". Só um cartão aberto por vez; Esc ou tocar fora fecha.
- **Selo de status**: contorno fino, glifo e texto em mono caixa alta: `✓ CONFIRMADO` verde, `~ PROVÁVEL` granada, `! CONTESTADO` vermelho. Tocar o selo mostra a definição (as mesmas de `STATUS_DESCRIPTION`).
- **Versões divergentes**: dentro do item contestado, uma lista "Outras versões": "data · 11 jun. 2017 [41]" e "data · 2021 [43]", cada uma com suas chamadas de nota. Nunca há "versão oficial": todas aparecem em pé de igualdade, como no site.

### 5.12 Máquina do tempo

**Objetivo.** O controle de ano do site elevado a gesto-assinatura.

**Estrutura.** Recolhida: uma linha fina acima da barra de abas com "até hoje" e um ícone de relógio. Toque expande em uma **régua horizontal** com as décadas marcadas, de 1533 (ou do primeiro ano visível com os filtros atuais) até hoje; o ano corrente em mono grande no centro. Arrastar move o ano; a cada década um tique háptico; os nós e ligações posteriores ao ano somem com fade. Soltar mantém o ano; "hoje" é o fim do curso. O ano fica na URL (`?ano=`) e na trilha.

**Extra.** Botão de "tocar" (▶) percorre 1890 → hoje em 20 segundos, com a rede crescendo. Ótimo para mostrar a história dos cismas a alguém.

### 5.13 Lacunas e sugerir correção

**Lacunas** (modo pesquisa, desligado por padrão): lista priorizada das lacunas do validador (`--gaps`): bispo sem sagração registrada, ordenação sem data ou sagrante, jurisdição sem fundação, fonte sem snapshot. Cada item abre a ficha na seção certa. Filtro por jurisdição.

**Sugerir correção**: em qualquer afirmação, o menu `…` tem "Sugerir correção". Formulário curto: o que está errado, qual é o fato correto, fonte (URL ou descrição), trecho. Envia para `POST /api/episcopado/sugestao`, que cria uma issue no repositório com o template que a skill `episcopado-ingerir` já consome. O app mostra "Enviada · acompanhar no GitHub" e lembra as sugestões enviadas.

## 6. Integração com o sistema

| Recurso | O que faz |
|---|---|
| **Core Spotlight** | Indexa pessoas, jurisdições e fontes (título, aliases, sigla, ordem). Resultado abre a ficha. |
| **App Intents / Siri / Atalhos** | "Linha de sucessão de {pessoa}", "Abrir a ficha de {entidade}", "Caminho entre {X} e {Y}", "Quem sagrou {pessoa}?" (responde em voz: "Roger Ames, em 8 de dezembro de 2012"). Aparecem no Spotlight e nos Atalhos. |
| **Widgets** | *Nesta semana* (pequeno e médio): efemérides; *Linha de sucessão* (médio): a cadeia de um bispo fixado; *A base* (pequeno): contagens e última atualização; Tela bloqueada: próxima efeméride. Fundo papel ou tinta conforme o tema. |
| **Compartilhar** | `ShareLink` com a URL web; cartões de imagem para ficha, sucessão e caminho (`ImageRenderer`, 3× para redes sociais, com a marca). |
| **Universal Links e Handoff** | `caminhoanglicano.com.br/episcopado/...` abre no app quando instalado; vista aberta no app continua no Mac ou no site. |
| **Área de transferência** | Toque longo em nomes e datas copia; "Copiar como citação" gera "Miguel Uchôa, Rede do Episcopado Histórico, acesso em 8 out. 2026, URL". |
| **Teclado e trackpad** | Atalhos (3.4), hover no grafo, menus de contexto nativos no Mac. |
| **Notificações** (opcional, por entidade) | "Seguir" uma pessoa ou jurisdição; quando a base muda nela (o snapshot traz um `changes.json` derivado do histórico do git), o app notifica "Nova afirmação sobre Eric Rodrigues · 1 fonte". Sem servidor de push: verificação em segundo plano. |

## 7. Paridade com a web e novidades

### 7.1 Tudo do site, no app

Explorador com foco, vizinhança 1–3, filtros, abrangência Brasil/Rede inteira, controle de ano, trilha, "Recomeçar", legenda, zoom; busca ⌘K com aliases e siglas; mini-ficha; fichas de pessoa, jurisdição e fonte com todas as seções; bibliografia filtrável; notas `[n]` com cartão; selos de status; versões divergentes; notas de pesquisa; redirecionamento de ids antigos; estado na URL; páginas "não encontrado" com busca.

### 7.2 O que o app acrescenta

1. Linha de sucessão imersiva com régua de anos, selo de origem e comparação.
2. Caminho entre X e Y (rota planejada no site, estreia no app).
3. Árvore das jurisdições no tempo.
4. Máquina do tempo com hápticos e modo "tocar".
5. Efemérides "Nesta semana" (tela e widgets).
6. Cartões de compartilhamento.
7. Spotlight, Siri, Atalhos.
8. Base inteira offline, abertura instantânea.
9. Igrejas no mapa na ficha da jurisdição (integração com o Localizador).
10. Seguir entidades e ser avisado de mudanças.
11. Sugerir correção com fonte, direto do item.
12. Coleções pessoais ("Minha pesquisa") com iCloud: salvar fichas, caminhos e vistas da rede.

Tudo isso vale também para o site: os itens 1, 2, 3 e 5 podem ser portados depois com as mesmas funções de `lib/views.ts` e `lib/graph.ts`.

## 8. Arquitetura técnica

### 8.1 Visão geral

```
EpiscopadoApp (SwiftUI, iOS/iPadOS/macOS 26)
├── EpiscopadoKit (Swift Package, sem UI)
│   ├── Models        Codable gerados do JSON Schema (schemas/*.json)
│   ├── Snapshot      carga e verificação de versão do snapshot
│   ├── Index         BaseIndex (pessoas, jurisdições, fontes, former_ids)
│   ├── Views         personView, jurisdictionView, sourceView (porte de lib/views.ts)
│   ├── Succession    linha principal, oldestReachableLine, origens
│   ├── Graph         nós, arestas, foco por BFS, filtro de ano, rollup de dioceses
│   ├── Layout        ego-layout (ForceAtlas simplificado) sobre posições globais pré-calculadas
│   ├── Search        prefixo + difusa, sem acentos, aliases e siglas (porte de lib/search.ts)
│   └── Paths         caminho mais curto (BFS) e caminhos por tipo de aresta
├── EpiscopadoUI      componentes (selos, chamadas de nota, linha do tempo, chips)
├── Features          Início, Buscar, Rede, MiniFicha, Fichas, Linhagens, Fontes, Lacunas
├── Widgets           WidgetKit (Nesta semana, Sucessão, A base, Tela bloqueada)
├── Intents           App Intents (Siri, Atalhos, Spotlight)
└── Tests             Swift Testing com os mesmos fixtures de lib/*.test.ts
```

### 8.2 Pipeline de dados

1. `pnpm episcopado:bundle` (novo script, ao lado de `validate`) lê os YAML, valida, gera:
   - `snapshot.json` (pessoas, jurisdições, fontes, já com ids resolvidos e os grafos de vista), comprimido (gzip, cerca de 3 MB para a base atual);
   - `positions.json`: posições globais do ForceAtlas2 (as mesmas do site) para os dois modos (Brasil / Rede inteira, com e sem dioceses);
   - `changes.json`: por entidade, data da última mudança e número de afirmações alteradas (do `git log`);
   - `manifest.json`: versão (SHA do commit), data, contagens.
2. Publicados como arquivos estáticos em `/episcopado/snapshot/<sha>/…` e apontados por `/api/episcopado/manifest`.
3. O app embarca o snapshot mais recente no build e, a cada abertura (e via `BGAppRefreshTask`), compara o manifesto; baixa em segundo plano e troca atomicamente.

Fonte da verdade continua sendo os YAML e os schemas zod; os tipos Swift são gerados dos JSON Schema já existentes em `layers/episcopado/schemas`, então uma mudança de campo quebra o build do app em vez de quebrar em produção.

### 8.3 Grafo

- **Renderização**: `Canvas` dentro de `TimelineView` para a base atual (até ~3 mil nós visíveis e ~4 mil arestas, 60 fps em iPhone 13 ou superior). Caminho de crescimento: `MTKView` com instancing quando a base passar de ~10 mil nós visíveis; a API do componente não muda.
- **Camadas**: arestas (com halo vermelho das contestadas por baixo), nós, rótulos (texto do `Canvas`, só para nós acima do limiar ou em foco), overlay de seleção (pulso).
- **Hit testing**: grade espacial por célula de 64 pt; toque resolve em O(1).
- **Layout**: posições globais vêm do snapshot; ao selecionar, roda-se um ForceAtlas simplificado só sobre a vizinhança (≤ 300 nós, ≤ 200 iterações, em `Task.detached`), animando da posição global para a local com `withAnimation(.snappy)`, exatamente como o site faz.
- **Estado**: `@Observable ExplorerState` com `selected`, `depth`, `year`, `filters`, `trail`, codificável para restauração e para URL.

### 8.4 Persistência e sincronização

- **Snapshot**: arquivo no `Application Support`, lido com `JSONDecoder` em `Task.detached`; o índice fica em memória (cerca de 25 MB para a base atual).
- **Estado do usuário**: SwiftData (trilha, coleções, seguidos, sugestões enviadas, preferências), sincronizado por CloudKit entre iPhone, iPad e Mac.
- **Nunca** há escrita na base a partir do app; correções passam pelo fluxo de PR.

### 8.5 Testes e qualidade

- Fixtures de `lib/*.test.ts` convertidos em JSON e reutilizados em Swift Testing: a ficha, a sucessão, a busca e o grafo precisam dar o mesmo resultado nas duas plataformas (teste de paridade no CI, rodando o script TS e o pacote Swift sobre o mesmo snapshot).
- Snapshot tests das telas principais (claro/escuro, Dynamic Type XL, iPhone SE e iPad).
- Teste de desempenho do grafo (tempo de frame com a rede inteira).
- Sem analytics de terceiros; só contagem opcional de abertura via TelemetryDeck ou nada.

### 8.6 Dependências

Nenhuma obrigatória além do SDK. Candidatas: `swift-collections` (OrderedSet, Deque para BFS), `GRDB` só se o snapshot migrar para SQLite (não é necessário na escala atual).

## 9. Fases

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0. Fundação** | `episcopado:bundle`, `EpiscopadoKit` com modelos, índice, vistas, busca, sucessão, caminhos; testes de paridade | A mesma ficha e a mesma linha de sucessão saem do TS e do Swift para toda a base |
| **1. Leitura** | Início, Buscar, fichas de pessoa/jurisdição/fonte, Fontes, cartões de nota, Universal Links, Spotlight | TestFlight fechado; um clérigo encontra a própria ficha e abre cada fonte sem ajuda |
| **2. Rede** | Grafo com foco, vizinhança, filtros, abrangência, máquina do tempo, trilha, mini-ficha com detents, iPad em três colunas | Buscar "Eric Rodrigues" e navegar pela rede é tão fluido quanto no site, e mais rápido |
| **3. Linhagens** | Sucessão imersiva, caminho entre X e Y, árvore das jurisdições, cartões de compartilhamento | Algum bispo brasileiro com linha até Cantuária compartilhado como imagem |
| **4. Sistema** | Widgets, App Intents, Handoff, teclado completo, Mac | "Siri, qual a linha de sucessão de Miguel Uchôa?" responde |
| **5. Contribuição** | Lacunas, sugerir correção, seguir entidades, coleções com iCloud | Uma sugestão feita no app vira PR pela skill sem retrabalho |

A Fase 1 vem antes do grafo de propósito, como na web: o app já é útil como leitor da base, e a Fase 2 chega sobre uma fundação testada.

## 10. Riscos e decisões em aberto

| Risco / decisão | Posição |
|---|---|
| iOS 26 como mínimo deixa aparelhos antigos de fora | Aceitar: o beta é fechado; Liquid Glass e `navigationTransition(.zoom)` fazem diferença na experiência. Alternativa: iOS 18 com controles `.bordered` em material fino |
| Fotos de bispos | Só com licença compatível (campo `photo` já existe no schema); sem foto, iniciais em serifa |
| Tamanho do snapshot ao chegar a 20 mil pessoas | Migrar para SQLite (GRDB) com índices por entidade; a API do `EpiscopadoKit` não muda |
| Grafo com dezenas de milhares de nós | Caminho Metal previsto; enquanto isso a vista padrão é focada (como no site) |
| Duplicar lógica em TS e Swift | Mitigado pelos testes de paridade com fixtures compartilhados; a alternativa (WebView ou servidor para tudo) perde o que justifica o app |
| Mesma marca que o site? | Sim: "Episcopado" como nome curto, "Rede do Episcopado Histórico · Caminho Anglicano" como subtítulo; ícone do app é a mitra em granada sobre papel |
| Público antes da massa crítica | Mesmo regime da web: TestFlight fechado, noindex no site, abertura decidida na Fase 4 da web |
