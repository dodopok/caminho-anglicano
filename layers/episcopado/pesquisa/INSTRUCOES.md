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
