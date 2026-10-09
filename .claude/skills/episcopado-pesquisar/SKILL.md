---
name: episcopado-pesquisar
description: Pesquisa em lote para a Rede do Episcopado Histórico — escolhe lacunas (cadeias de sucessão interrompidas, bispos sem sagrante, clero de uma igreja, uma jurisdição), despacha agentes de pesquisa em paralelo, consolida as levas na base e devolve ao usuário só o que precisa de olho humano (links diretos, o que procurar). Use quando o usuário pedir "quais lacunas temos", "pesquise sobre X", "despache agentes", "suba as linhas de sucessão", "o que falta conferir à mão".
---

# Pesquisa em lote na Rede do Episcopado Histórico

Complementa a skill `episcopado-ingerir` (princípios, formato e consolidação valem igual; leia-a se ainda não leu).

## 1. Escolher as frentes
- `pnpm episcopado:pauta` — onde a cadeia de sagrantes principais de cada bispo ligado ao Brasil para (quantos
  bispos dependem de cada quebra). Rebiba e Barlow são raízes históricas; o resto é pauta.
- `pnpm episcopado:pauta --bispos` — o que falta em cada bispo (sagração sem data, sem sagrante, sem presbiterato…).
- `pnpm episcopado:pauta --contestadas` — conflitos abertos e as fontes de cada lado.
- `pnpm episcopado:validate --gaps` — todas as lacunas (longa; filtre com `grep`).

Agrupe por frente coerente (uma igreja, uma linha de sucessão, um bispo-chave, o clero de uma diocese) e priorize
pelo número de bispos que a quebra afeta. Mostre a pauta ao usuário em poucas linhas se ele pediu "quais lacunas".

## 2. Despachar agentes
Um agente `general-purpose` por frente, em paralelo e em segundo plano. O prompt de cada um leva:
- o alvo e o que se sabe (ids da base, o que já está registrado, pistas do usuário);
- "Siga `layers/episcopado/pesquisa/INSTRUCOES.md` e `FORMATO.md`";
- o caminho de saída `layers/episcopado/pesquisa/entrada/lac-<frente>.json` e o prefixo de chave `<frente>-`;
- "não altere o repositório; termine com resumo ≤12 linhas".

Enquanto os agentes trabalham, não repita a pesquisa deles.

## 3. Consolidar cada leva
Quando um agente termina:
1. Leia o resumo e as `duvidas` da leva. Abra 2–3 trechos ao acaso e confira que são literais (agentes às vezes
   parafraseiam) e que os fatos são do alvo certo (homônimos!).
2. `pnpm episcopado:consolidar <leva> ` (simulação). Trate pessoas "parecidas" (mapeie em `mapa.json`), conflitos
   novos e AVISOS (dado pessoal, nota de bastidor, data futura, Drive). Corrija a leva, não o resultado.
3. `--write`, `pnpm episcopado:validate`, commit por leva (`feat(episcopado): <frente> …`).
4. Rode `pnpm episcopado:pauta` de novo e diga ao usuário quais quebras fecharam.

## 4. Pendências manuais
O que nenhum agente consegue ler (vídeo do YouTube, Facebook fechado, livro físico) vira uma lista curta para o
usuário, só com o que é de fato inacessível, mais importante primeiro. Cada item tem de ser rápido de resolver:
- link DIRETO do post/vídeo — nunca "olhe a página X" sem dizer o quê;
- se só houver página/perfil: o termo de busca e o período ("busque 'sagração' nos posts de mai/2019");
- vídeo: "abra 'Mostrar transcrição', Ctrl+F por 'imponho' / 'sagr' / '<nome>'; anote data, sagrante,
  co-sagrantes e o minuto";
- o que a resposta vai destravar (quantos bispos, qual cadeia).

Grave a lista no scratchpad (ou como artifact, se for longa) e envie ao usuário. O que ele responder entra pela
skill `episcopado-ingerir` como testemunho, com o trecho que ele transcreveu.
