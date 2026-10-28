/**
 * Esquema SQL da base achatada (SQLite), consultado pelo agente "Pergunte à Rede" e por
 * `pnpm episcopado:sql`. O mesmo texto vai ao system prompt: os comentários são a documentação
 * que o modelo lê. Toda afirmação tem `claim_id` (chave de citação) e `status`.
 */

export const SCHEMA_DDL = `-- Pessoas. brazil = 1 se a pessoa está ligada a uma jurisdição brasileira.
-- highest_order: ordem mais alta registrada ('diaconate' | 'presbyterate' | 'episcopate') ou NULL.
CREATE TABLE people (id TEXT PRIMARY KEY, name TEXT NOT NULL, full_name TEXT,
  birth_date TEXT, birth_year INT, birth_place TEXT, death_date TEXT, death_year INT, death_place TEXT,
  wikidata TEXT, biography TEXT, brazil INT NOT NULL, highest_order TEXT);
CREATE TABLE person_aliases (person TEXT NOT NULL, alias TEXT NOT NULL);

-- Jurisdições. type: communion | province | national_church | diocese | missionary_district | network |
-- religious_order | other. tradition: anglican | reformed_episcopal | continuing_anglican |
-- charismatic_episcopal | roman_catholic | independent_catholic | orthodox | other. country: ISO-2.
-- diocesan = 1 para jurisdições de nível diocesano (pertencem a uma igreja via part_of).
CREATE TABLE jurisdictions (id TEXT PRIMARY KEY, acronym TEXT, name TEXT NOT NULL, type TEXT NOT NULL,
  tradition TEXT, country TEXT, founded_date TEXT, founded_year INT, dissolved_date TEXT, dissolved_year INT,
  description TEXT, brazil INT NOT NULL, diocesan INT NOT NULL);
-- Hierarquia por part_of, em qualquer profundidade, incluindo a própria jurisdição (depth 0).
-- Para "tudo da IAB, com as dioceses": JOIN jurisdiction_ancestors ja ON ja.jurisdiction = x.jurisdiction
-- WHERE ja.ancestor = 'iab'.
CREATE TABLE jurisdiction_ancestors (jurisdiction TEXT NOT NULL, ancestor TEXT NOT NULL, depth INT NOT NULL);

-- Ordenações. order: 'diaconate' | 'presbyterate' | 'episcopate' (coluna "order": use aspas).
-- Diaconato/presbiterato usam ordained_by; episcopado usa principal_consecrator + co_consecrators.
-- jurisdiction = igreja em que se deu a ordenação (pode ser NULL: muitas sagrações não a registram).
-- office (episcopado): diocesan | coadjutor | suffragan | auxiliary | missionary | primate | other.
-- mode: normal | conditional | reordination. year = ano (datas parciais já convertidas).
CREATE TABLE ordinations (claim_id TEXT PRIMARY KEY, person TEXT NOT NULL, "order" TEXT NOT NULL,
  date TEXT, year INT, place TEXT, jurisdiction TEXT, principal_consecrator TEXT, ordained_by TEXT,
  office TEXT, mode TEXT, status TEXT NOT NULL, notes TEXT);
CREATE TABLE co_consecrators (claim_id TEXT NOT NULL, person TEXT NOT NULL);

-- Vínculos pessoa ↔ jurisdição (onde serviu, em que papel, quando). role: member | clergy | deacon |
-- priest | bishop | diocesan_bishop | coadjutor_bishop | suffragan_bishop | auxiliary_bishop |
-- missionary_bishop | primate | archbishop | founder | other (role_description explica 'other').
-- diocese = diocese dentro da jurisdição, quando registrada. end_reason: left | schism | transfer |
-- resignation | deposition | retirement | death | term_end | other. end NULL = sem fim registrado.
CREATE TABLE affiliations (claim_id TEXT PRIMARY KEY, person TEXT NOT NULL, jurisdiction TEXT NOT NULL,
  diocese TEXT, role TEXT NOT NULL, role_description TEXT, start_date TEXT, start_year INT,
  end_date TEXT, end_year INT, end_reason TEXT, status TEXT NOT NULL, notes TEXT);

-- Relações entre jurisdições: source_jurisdiction —type→ target. type: schism_from | successor_of |
-- merged_with | member_of | part_of | in_communion_with | broke_communion_with | recognized_by.
CREATE TABLE relations (claim_id TEXT PRIMARY KEY, source_jurisdiction TEXT NOT NULL, type TEXT NOT NULL,
  target TEXT NOT NULL, date TEXT, year INT, end_date TEXT, end_year INT, status TEXT NOT NULL, notes TEXT);
CREATE TABLE relation_leaders (claim_id TEXT NOT NULL, person TEXT NOT NULL);

-- Eventos da trajetória. type: deposition | resignation | excommunication | reconciliation | conversion |
-- death | other. person = sujeito do evento.
CREATE TABLE events (claim_id TEXT PRIMARY KEY, person TEXT NOT NULL, type TEXT NOT NULL, date TEXT,
  year INT, jurisdiction TEXT, description TEXT NOT NULL, status TEXT NOT NULL, notes TEXT);

-- Fontes. type: official_document | minutes | news | book | article | thesis | institutional_site |
-- social_media | wikidata | wikipedia | blog | personal_testimony | other. level: primary | secondary | tertiary.
CREATE TABLE sources (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, author TEXT,
  publisher TEXT, url TEXT, published TEXT, level TEXT NOT NULL, language TEXT);
-- Que fonte sustenta cada afirmação, com o trecho literal. claim_id também pode ser 'p:<id>' (biografia),
-- 'p:<id>/birth', 'p:<id>/death', 'j:<id>' (descrição), 'j:<id>/founded', 'j:<id>/dissolved'.
CREATE TABLE claim_sources (claim_id TEXT NOT NULL, source TEXT NOT NULL, quote TEXT, page TEXT);
-- Versões divergentes de um campo de uma afirmação (status 'contested' costuma tê-las).
CREATE TABLE discrepancies (claim_id TEXT NOT NULL, field TEXT NOT NULL, value TEXT, source TEXT NOT NULL,
  notes TEXT);

-- Busca no TEXTO LIVRE (FTS5): notas, descrições, biografias, papéis "other" e os trechos citados das fontes.
-- Muitos fatos só existem aqui (quem ficou ou saiu num cisma, signatários de cartas, excluídos por decreto).
-- sujeito = 'p:<id>' ou 'j:<id>'; campo = de onde veio o texto (notes, description, biography, role, quote).
-- Busca sem acento nem caixa; prefixo com * (permanec*), AND/OR/NOT, "frase exata"; ORDER BY rank = relevância.
-- snippet() não funciona dentro de GROUP BY: busque num WITH x AS MATERIALIZED (...) e agrupe fora.
-- Ex.: SELECT t.sujeito, t.claim_id, snippet(textos, 3, '«', '»', '…', 12) AS trecho FROM textos t
--      WHERE textos MATCH 'permanec* AND ieab' ORDER BY rank LIMIT 30
CREATE VIRTUAL TABLE textos USING fts5(claim_id UNINDEXED, sujeito UNINDEXED, campo UNINDEXED, texto,
  tokenize='unicode61 remove_diacritics 2');`

/** Índices: fora do texto do prompt (não ajudam o modelo a escrever SQL). */
export const SCHEMA_INDEXES = `CREATE INDEX i_alias ON person_aliases(person);
CREATE INDEX i_anc ON jurisdiction_ancestors(jurisdiction); CREATE INDEX i_anc2 ON jurisdiction_ancestors(ancestor);
CREATE INDEX i_ord_person ON ordinations(person); CREATE INDEX i_ord_cons ON ordinations(principal_consecrator);
CREATE INDEX i_ord_by ON ordinations(ordained_by); CREATE INDEX i_ord_jur ON ordinations(jurisdiction);
CREATE INDEX i_co_claim ON co_consecrators(claim_id); CREATE INDEX i_co_person ON co_consecrators(person);
CREATE INDEX i_aff_person ON affiliations(person); CREATE INDEX i_aff_jur ON affiliations(jurisdiction);
CREATE INDEX i_rel_src ON relations(source_jurisdiction); CREATE INDEX i_rel_tgt ON relations(target);
CREATE INDEX i_rl_claim ON relation_leaders(claim_id); CREATE INDEX i_ev_person ON events(person);
CREATE INDEX i_cs_claim ON claim_sources(claim_id); CREATE INDEX i_cs_source ON claim_sources(source);
CREATE INDEX i_disc_claim ON discrepancies(claim_id);`

export const TABLES = [
  'people',
  'person_aliases',
  'jurisdictions',
  'jurisdiction_ancestors',
  'ordinations',
  'co_consecrators',
  'affiliations',
  'relations',
  'relation_leaders',
  'events',
  'sources',
  'claim_sources',
  'discrepancies',
  'textos'
] as const
