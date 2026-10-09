# Instruções para agentes de pesquisa (Rede do Episcopado Histórico)

Você pesquisa NA INTERNET para preencher lacunas sobre clérigos e jurisdições anglicanas/episcopais (e afins),
com foco no Brasil. Não altere nada do repositório: sua entrega é um JSON de pesquisa.

1. Siga `layers/episcopado/pesquisa/FORMATO.md` À RISCA (chaves em português, trecho literal em toda afirmação).
2. Antes de pesquisar, leia o que a base já tem sobre cada alvo: `layers/episcopado/data/people/<id>.yaml` e
   `jurisdictions/<id>.yaml` (`grep -ril "<sobrenome>" layers/episcopado/data` para achar). Registre só fatos novos
   ou fontes novas que confirmem/corrijam o que existe, usando o mesmo nome de exibição.
3. Prioridade por pessoa: sagração (data, local, sagrante principal, co-sagrantes, jurisdição), presbiterato e
   diaconato (data, ordenante), nascimento/falecimento, vínculos (igreja, diocese, cargo, início/fim, motivo),
   cismas e mudanças de igreja.
4. Grave o JSON CEDO no caminho indicado e atualize sempre: um arquivo parcial válido vale mais que nada. Use o
   prefixo de chave de fonte indicado no prompt.
5. Trabalhe até ~40 minutos e termine com um resumo curto (≤12 linhas): o que achou de novo, o que ficou sem.

## Técnicas de acesso que funcionam neste ambiente
- **Instagram (post)**: `curl -sL -A "Mozilla/5.0" "https://www.instagram.com/p/<código>/embed/captioned/"` traz a
  legenda inteira (classe `Caption`). Reels: troque `/reel/` por `/p/`. Alternativa:
  `curl -sL -A "facebookexternalhit/1.1" "https://www.instagram.com/p/<código>/"` e leia `og:description`.
  **Perfil**: `https://www.instagram.com/<usuario>/embed/` lista ~12 posts recentes. Sem data na legenda, procure
  `taken_at`/`datetime` no HTML do embed; se não houver, registre só o mês aproximado e diga de onde veio.
- **Facebook (post)**: `https://www.facebook.com/plugins/post.php?href=<url-codificada>` costuma devolver o texto.
  Vídeos do Facebook não abrem; tente `mbasic.facebook.com` e o Wayback.
- **YouTube**: página, legendas e serviços de transcrição estão BLOQUEADOS para este IP. Só funciona
  `https://www.youtube.com/oembed?url=<url>&format=json` (título e canal). Procure o mesmo evento em outras fontes
  (site da igreja, Instagram, notícia) ou peça ao mantenedor: "abra 'Mostrar transcrição', Ctrl+F por 'imponho',
  'sagr', '<nome>' e anote data, sagrante e co-sagrantes, com o minuto".
- **WordPress**: `/wp-json/wp/v2/posts?search=<termo>&per_page=50` e `/wp-json/wp/v2/pages` (o site da REB responde).
  **Blogger**: `/feeds/posts/default?alt=json&max-results=150&q=<termo>`.
- **Wayback**: `https://web.archive.org/web/<ano>*/<url>` e `http://archive.org/wayback/available?url=<url>`. Pode
  devolver 429: espace as requisições.
- **Cambridge (CMS e afins)**: `archivesearch.lib.cam.ac.uk` responde com cabeçalhos de navegador.
- archive.ph, Google Books, PDFs (`pdftotext`). Arquivos baixados: cada um numa pasta nova e vazia; Python com `-I`.
- Quando WebFetch falha, use `curl` (o proxy já está configurado).

## Links que você não conseguiu ler
Classifique cada um em `pistas` com instrução PRECISA para um humano: o link direto do post (nunca a página inteira
do Facebook/Instagram), ou o que buscar ("na página X, busque 'sagração' e veja os posts de mai/2019"); para vídeo,
o que procurar na transcrição e o minuto estimado. Descarte o que não tem valor para a rede (opinião, duplicata,
página sem ordenações nem cargos).

## Reescrever resumos de fichas (biography / description)
Você recebe um dossiê (`dossie-NN.md`) gerado por `resumos.py`: para cada ficha, o resumo atual e os fatos
registrados, cada citação com um código (`c1a2b3c`). Escreva um resumo NOVO para cada ficha e grave um JSON
`[{ "id": "<id>", "texto": "...", "citacoes": ["c1a2b3c", ...] }]` no caminho indicado no prompt.
- Tamanho: siga o "tamanho do resumo" de cada ficha no dossiê (calculado pelo número de fatos): uma frase para
  fichas com poucos fatos, um parágrafo de até ~1.800 caracteres para trajetórias longas (ex.: Robinson
  Cavalcanti), cobrindo cada fase. Um único parágrafo, sem quebras de linha.
- Pessoa: o essencial do ministério em ordem cronológica: ordenações (com quem ordenou/sagrou, se houver), cargos
  principais e mais altos, igrejas por onde passou, rupturas e mudanças de igreja, situação atual ou falecimento.
  Jurisdição: o que é, quando e de onde surgiu, a que pertence, quem a liderou (linhas "liderança" do dossiê),
  divisões e mudanças importantes.
- Só o que está no dossiê. As linhas "citado no resumo atual" também são fatos: não perca o que elas sustentam. Fato `contested` entra só se o texto deixar claro que há versões; `probable` pode entrar
  sem destaque. Não invente datas nem cargos; prefira a forma mais precisa que aparece.
- `citacoes`: os códigos dos trechos que sustentam cada fato citado no texto (normalmente 3 a 8).
- Neutro, pt-BR, sem adjetivos de valor, sem "a base", "NOVO", "segundo o dossiê".
- Vida pessoal: entram, com fonte e em tom neutro, naturalidade e nacionalidade, formação teológica e acadêmica,
  profissão secular que faz parte da vida pública, cônjuge ou parente que também é clérigo, cofundador ou explica um
  fato de ministério, e causa da morte ou orientação quando são fato público que marcou a história da igreja (ex.: o
  assassinato de Robinson Cavalcanti; Gene Robinson como bispo abertamente gay). Ficam de fora: saúde, endereço,
  filhos e parentes sem papel público, estado civil sem relevância, finanças, conflitos pessoais e disciplina de
  quem não é bispo.
- Se a ficha tiver só um ou dois fatos menores, mantenha um resumo curto; se não houver o que dizer, omita a ficha.
