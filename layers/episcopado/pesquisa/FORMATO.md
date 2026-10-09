# Formato de uma leva de pesquisa (Rede do Episcopado Histórico)

Uma leva é UM arquivo JSON (UTF-8) com chaves em português. O consolidador (`consolidar.py`) traduz para o
YAML da base, casa nomes com quem já está registrado e mescla as afirmações. Grave em
`layers/episcopado/pesquisa/entrada/<frente>.json` (pasta fora do git) ou no caminho indicado no prompt.

```jsonc
{
  "frente": "nome da frente",
  "fontes": [
    { "chave": "prefixo-slug-curto-unico", "url": "https://...|null",
      "arquivo": "https://web.archive.org/web/<data>/<url>|null  (cópia arquivada da página que saiu do ar)", "titulo": "...", "autor": "...|null",
      "publicador": "site/instituição|null", "data_publicacao": "AAAA-MM-DD|AAAA-MM|AAAA|null",
      "tipo": "documento_oficial|ata|noticia|livro|artigo|tese|site_institucional|rede_social|wikidata|wikipedia|blog|testemunho_pessoal|outro",
      "nivel": "primaria|secundaria|terciaria", "idioma": "pt|en|es|...", "notas": "...|null" }
  ],
  "pessoas": [
    { "nome": "nome de exibição", "nome_completo": "...|null", "nomes_alternativos": ["Dom X", "Rev. X"],
      "nascimento": "data|null", "falecimento": "data|null", "wikidata": "Q...|null",
      "resumo": "1-3 frases neutras, só ministério", "fontes": [ { "chave": "...", "trecho": "citação LITERAL" } ] }
  ],
  "jurisdicoes": [
    { "sigla": "IAB", "nome": "...", "tipo": "comunhao|provincia|igreja_nacional|diocese|distrito_missionario|rede|ordem_religiosa|outro",
      "pais": "BR", "fundacao": "data|null", "extincao": "data|null", "site": "url|null", "wikidata": "Q...|null",
      "resumo": "...", "fontes": [ { "chave": "...", "trecho": "..." } ] }
  ],
  "afirmacoes": [
    // ORDENAÇÃO
    { "tipo": "ordenacao", "pessoa": "nome", "ordem": "diaconato|presbiterato|episcopado",
      "data": "AAAA-MM-DD|AAAA-MM|AAAA|c.AAAA|null", "local": "...|null", "jurisdicao": "sigla|null",
      "cargo": "diocesano|coadjutor|sufraganeo|auxiliar|missionario|primaz|null",   // só episcopado
      "ordenante": "nome|null",                                                      // diaconato/presbiterato
      "sagrante_principal": "nome|null", "co_sagrantes": ["nome"],                  // episcopado
      "modo": "condicional|reordenacao|null",
      "status": "confirmado|provavel|contestado", "fontes": [ { "chave": "...", "trecho": "...", "pagina": "12" } ],
      "notas": "..." },
    // VÍNCULO pessoa ↔ jurisdição
    { "tipo": "vinculo", "pessoa": "nome", "jurisdicao": "sigla",
      "papel": "membro|clero|diacono|presbitero|bispo|bispo_diocesano|bispo_coadjutor|bispo_sufraganeo|bispo_auxiliar|bispo_missionario|primaz|arcebispo|fundador|<outro texto>",
      "diocese": "nome da diocese|null  (\"Diocese X — Paróquia Y\": o que vem depois do travessão vira nota)",
      "inicio": "data|null", "fim": "data|null",
      "motivo_fim": "saida|cisma|transferencia|renuncia|deposicao|aposentadoria|falecimento|fim_mandato|null",
      "status": "...", "fontes": [...], "notas": "..." },
    // RELAÇÃO jurisdição ↔ jurisdição
    { "tipo": "relacao", "origem": "sigla",
      "relacao": "cisma_de|sucessora_de|fusao_com|membro_de|parte_de|em_comunhao_com|ruptura_comunhao_com|reconhecida_por",
      "alvo": "sigla", "data": "...", "fim": "...|null", "liderado_por": ["nome"], "status": "...", "fontes": [...], "notas": "..." },
    // EVENTO (deposição, renúncia, excomunhão, reconciliação, conversão, morte, outro)
    { "tipo": "evento", "descricao": "...", "envolvidos": ["nome (o primeiro é o sujeito)"], "data": "...",
      "tipo_evento": "deposition|resignation|excommunication|reconciliation|conversion|death|other|null",
      "status": "...", "fontes": [...] }
  ],
  "duvidas": [ "conflitos entre fontes, ambiguidades de identidade, o que não deu para confirmar" ],
  "pistas": [ { "url": "...", "por_que": "fonte promissora não explorada / exigiria acesso" } ]
}
```

## Regras inegociáveis
1. NUNCA invente. Toda afirmação precisa de ≥1 fonte que você realmente abriu, com `trecho` copiado LITERALMENTE
   (idioma original, curto, o suficiente para sustentar o fato). Afirmação sem fonte é descartada.
2. Memória não é fonte. O que você "sabe" sem fonte vai em `duvidas`.
3. `status`: confirmado = fonte primária ou ≥2 secundárias independentes; provavel = uma secundária/terciária;
   contestado = fontes divergem (registre as versões como afirmações separadas e explique em `duvidas`).
4. Datas parciais são ok ("2011", "2011-04"). Não complete o que a fonte não diz. Nada de datas futuras: um
   convite para ordenação ainda por acontecer vai em `pistas`, não em `afirmacoes`.
5. Prefira fontes primárias (sites e atas das igrejas, cartas pastorais, ACO, ACNA/GAFCON, arquivos da Episcopal
   Church) e imprensa (Anglican Ink, Church Times, Living Church, ENS, imprensa brasileira). Wikipédia é terciária:
   use, mas procure a fonte que ela cita.
6. Nomes: use o MESMO nome de exibição que a base já usa para a pessoa (procure em `data/people/`); variações vão em
   `nomes_alternativos`. Pessoa citada só por primeiro nome/apelido entra só com ordenação ou cargo concreto e nome
   reconhecível; senão, `duvidas`.
7. Neutralidade em cismas e disputas.
8. Notas e resumos são lidos no site: nada de "a base", "na base", "NOVO", "já registrado" — descreva o fato.
9. Só fatos de ministério: ordenações, cargos, vínculos, fundações, cismas. Nada de cônjuge, filhos, profissão
   secular, formação, saúde, endereço residencial. Decretos disciplinares de não-bispos ficam de fora.
10. Links do Google Drive/Docs nunca vão em `url`: cite pelo nome do documento (`titulo`), com `url: null`.
11. Testemunho do mantenedor: fonte `testemunho_pessoal`, `nivel: primaria`, `url: null`, `data_publicacao` = data da
    conversa, e `trecho` com as palavras dele. Vídeos (YouTube, lives): `tipo: rede_social`, `trecho` com a fala
    transcrita e o minuto em `pagina` ("1:10:29").
12. Segunda sagração (condicional ou reordenação) é uma afirmação separada com `modo`; sem `modo`, ela seria
    fundida com a primeira.
13. Valide o JSON antes de terminar: `python3 -c 'import json;json.load(open("<arquivo>"))'`.

Siglas que a base já usa (não invente outras para estas): IEAB, IAB, REB, IARB, ICEB, IECB, IEUB, TAC, TEC, ACNA,
REC, IACS, GAFCON, COA, ICCEC, ICAB. Para as demais, use a sigla usual ou o nome completo.
