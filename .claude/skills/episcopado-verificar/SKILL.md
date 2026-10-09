---
name: episcopado-verificar
description: Confere uma pesquisa externa trazida pelo usuário (texto colado de outro chat/IA, lista de bispos em imagem, PDF, página de genealogia episcopal) antes de ela entrar na Rede do Episcopado Histórico — abre cada fonte citada, confere trechos, datas e identidades, e devolve um veredito por afirmação. Use quando o usuário disser "verifique", "não leve como verdade", "faz sentido?", "pode revisar" sobre material de terceiros.
---

# Verificar pesquisa externa

Material de terceiros é **pista**, nunca fonte. Só entra na base o que você confirmar numa fonte que abriu, com
trecho literal. Depois de verificar, ingira pela skill `episcopado-ingerir`.

## 1. Quebrar em afirmações
Liste cada afirmação atômica (quem, que ordem/cargo, quando, onde, por quem) e a fonte que o material diz ter usado.
Imagens: transcreva antes (nomes e datas exatamente como aparecem).

## 2. Conferir cada uma
- **Abra a fonte citada** (técnicas de acesso em `layers/episcopado/pesquisa/INSTRUCOES.md`). Não existe, não abre
  ou não diz aquilo → a afirmação fica sem fonte; procure outra.
- **Identidade:** mesmo nome não é mesma pessoa. Compare igreja, década, cargos e quem ordenou com o que a base tem
  (`pnpm episcopado:search "<nome>"`). Ex. já visto: Geraldo Magela do Nascimento (ICAB, 1982) ≠ Geraldo Santos de
  Magela Neto.
- **De quem é a data?** Uma data perto do nome pode ser de uma ordenação que a pessoa presidiu, não da dela
  (ex.: "08/01/2006" era Maia ordenando Bacalhão, não a sagração de Maia).
- **Página de linhagem** que só lista patriarcas ou "linhas" sem dizer quem sagrou quem não sustenta nada.
- **Cronologia:** sagrante sagrado antes do sagrado; igreja existente na data; datas compatíveis com a base.
- **Confronte com a base:** concorda (só acrescente a fonte), complementa (fato novo) ou diverge (vira divergência;
  se a fonte do material é tardia e isolada contra fontes da época, diga que não deve contestar).

## 3. Devolver o veredito
Ao usuário, em pt-BR, uma linha por afirmação:

| Afirmação | Veredito | Por quê / fonte |
|---|---|---|
| X sagrado em 1957 por Y | ✅ confirmada | trecho de <fonte primária> |
| Z = W da base | ❌ outra pessoa | igreja e década diferentes |
| data 08/01/2006 | ⚠️ data de outro fato | é a ordenação que X presidiu |
| … | ❓ sem fonte | a página citada não menciona |

Diga o que vai entrar e, se o usuário não pediu só a verificação, ingira as confirmadas e as divergências
legítimas pela skill `episcopado-ingerir`. O que só o usuário pode confirmar vai como pergunta curta com link direto.
