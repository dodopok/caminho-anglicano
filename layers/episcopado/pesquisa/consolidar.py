#!/usr/bin/env python3
"""Mescla levas de pesquisa (JSON no formato de FORMATO.md, chaves em pt) na base YAML existente.

    python3 -I layers/episcopado/pesquisa/consolidar.py <arquivo.json|pasta>... [--write]
        [--base DIR]   base de partida (padrão: layers/episcopado/data)
        [--saida DIR]  onde gravar (padrão: a própria base); só arquivos novos ou alterados são gravados
        [--mapa ARQ]   nomes → ids (padrão: mapa.json ao lado deste script)

Sem --write, só relata o que mudaria. Nenhum arquivo da base é apagado. Rodar sem entradas não muda nada.
Requer PyYAML.
"""
import argparse, copy, datetime, json, re, sys, unicodedata
from collections import defaultdict
from pathlib import Path
import yaml

AQUI = Path(__file__).resolve().parent
_ap = argparse.ArgumentParser()
_ap.add_argument('entradas', nargs='*', type=Path)
_ap.add_argument('--base', type=Path, default=AQUI.parent / 'data')
_ap.add_argument('--saida', type=Path)
_ap.add_argument('--mapa', type=Path, default=AQUI / 'mapa.json')
_ap.add_argument('--write', action='store_true')
ARGS = _ap.parse_args()
BASE, MAPA, WRITE = ARGS.base, ARGS.mapa, ARGS.write
OUT = ARGS.saida or BASE
HOJE = datetime.date.today().isoformat()

ORDEM = {'diaconato': 'diaconate', 'presbiterato': 'presbyterate', 'episcopado': 'episcopate'}
STATUS = {'confirmado': 'confirmed', 'provavel': 'probable', 'contestado': 'contested'}
RANK = {'confirmed': 0, 'probable': 1, 'contested': 2}
CARGO = {'diocesano': 'diocesan', 'coadjutor': 'coadjutor', 'sufraganeo': 'suffragan', 'auxiliar': 'auxiliary',
         'missionario': 'missionary', 'primaz': 'primate'}
PAPEL = {'membro': 'member', 'clero': 'clergy', 'diacono': 'deacon', 'presbitero': 'priest', 'bispo': 'bishop',
         'bispo_diocesano': 'diocesan_bishop', 'bispo_coadjutor': 'coadjutor_bishop', 'bispo_sufraganeo': 'suffragan_bishop',
         'bispo_auxiliar': 'auxiliary_bishop', 'bispo_missionario': 'missionary_bishop', 'primaz': 'primate',
         'arcebispo': 'archbishop', 'fundador': 'founder'}
MOTIVO = {'saida': 'left', 'cisma': 'schism', 'transferencia': 'transfer', 'renuncia': 'resignation',
          'deposicao': 'deposition', 'aposentadoria': 'retirement', 'falecimento': 'death', 'fim_mandato': 'term_end'}
RELACAO = {'cisma_de': 'schism_from', 'sucessora_de': 'successor_of', 'fusao_com': 'merged_with', 'membro_de': 'member_of',
           'parte_de': 'part_of', 'em_comunhao_com': 'in_communion_with', 'ruptura_comunhao_com': 'broke_communion_with',
           'reconhecida_por': 'recognized_by'}
TIPO_FONTE = {'documento_oficial': 'official_document', 'ata': 'minutes', 'noticia': 'news', 'livro': 'book',
              'artigo': 'article', 'tese': 'thesis', 'site_institucional': 'institutional_site', 'rede_social': 'social_media',
              'wikidata': 'wikidata', 'wikipedia': 'wikipedia', 'blog': 'blog', 'testemunho_pessoal': 'personal_testimony',
              'video': 'social_media'}
TIPO_JUR = {'comunhao': 'communion', 'provincia': 'province', 'igreja_nacional': 'national_church', 'diocese': 'diocese',
            'distrito_missionario': 'missionary_district', 'rede': 'network', 'ordem_religiosa': 'religious_order'}
NIVEL = {'primaria': 'primary', 'secundaria': 'secondary', 'terciaria': 'tertiary'}
DATA_RE = re.compile(r'^\d{4}(-\d{2}(-\d{2})?)?$|^c\.\d{4}$|^\d{4}/\d{4}$')

def norm(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"\b(dom|d\.|rev\.?|revmo\.?|rvmo\.?|rt\.? rev\.?|the|most|right|reverend|bispo|bishop|arcebispo|archbishop|padre|pe\.|frei|mons\.?)\s+", '', s)
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s)).strip()

def slug(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', norm(s))).strip('-')

def data(v, avisos, ctx):
    if v in (None, '', 'null'):
        return None
    v = str(v).strip()
    if DATA_RE.match(v):
        return v
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', v)
    if m:
        return f'{m[1]}-{int(m[2]):02d}-{int(m[3]):02d}'
    m = re.match(r'^c\.?\s*(\d{4})', v)
    if m:
        return f'c.{m[1]}'
    avisos.append(f'data descartada "{v}" em {ctx}')
    return None

mapa = json.loads(MAPA.read_text()) if MAPA.exists() else {}
mapa_p = {norm(k): v for k, v in mapa.get('pessoas', {}).items()}
mapa_j = {norm(k): v for k, v in mapa.get('jurisdicoes', {}).items()}
# Dioceses homônimas: chave "<id-jurisdicao>|<nome da diocese>"
mapa_d = {(k.split('|')[0], norm(k.split('|')[1])): v for k, v in mapa.get('dioceses', {}).items()}
info_j = mapa.get('jurisdicoes_info', {})
nomes_p = mapa.get('nomes_pessoas', {})
ignorar = {norm(x) for x in mapa.get('ignorar', [])}

avisos = []

class Loader(yaml.SafeLoader):
    pass
# Datas ficam como texto (o validador e o site também as leem assim).
Loader.yaml_implicit_resolvers = {k: [r for r in v if r[0] != 'tag:yaml.org,2002:timestamp']
                                  for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()}

def carregar(pasta):
    out = {}
    for f in sorted((BASE / pasta).glob('*.yaml')):
        obj = yaml.load(f.read_text(), Loader=Loader)
        out[obj['id']] = obj
    return out

orig = {'people': carregar('people'), 'jurisdictions': carregar('jurisdictions'), 'sources': carregar('sources')}
pessoas = {k: copy.deepcopy(v) | {'aliases': set(v.get('aliases') or [])} for k, v in orig['people'].items()}
jurisdicoes = {k: copy.deepcopy(v) | {'aliases': set(v.get('aliases') or [])} for k, v in orig['jurisdictions'].items()}
fontes = copy.deepcopy(orig['sources'])
url_para_fonte = {f['url'].rstrip('/'): k for k, f in fontes.items() if f.get('url')}
titulo_para_fonte = {norm(f.get('title')): k for k, f in fontes.items() if not f.get('url') and f.get('title')}

# Nomes, nomes completos, siglas e variantes já registrados casam com a entidade existente.
idx_p, idx_j = defaultdict(set), defaultdict(set)
for p in pessoas.values():
    for n in [p['name'], p.get('full_name'), *p['aliases']]:
        if n:
            idx_p[norm(n)].add(p['id'])
for j in jurisdicoes.values():
    for n in [j['name'], j.get('acronym'), *j['aliases']]:
        if n:
            idx_j[norm(n)].add(j['id'])
ambiguos = set()

def casar(nome, mapa_, idx):
    n = norm(nome)
    if n in mapa_:
        return mapa_[n]
    if len(idx.get(n, ())) == 1:
        return next(iter(idx[n]))
    if len(idx.get(n, ())) > 1 and n not in ambiguos:
        ambiguos.add(n)
        avisos.append(f'nome ambíguo "{nome}" casa com {sorted(idx[n])}; mapeie em mapa.json')
    return slug(nome)

def pid(nome):
    return casar(nome, mapa_p, idx_p)

def jid(nome):
    return casar(nome, mapa_j, idx_j)

def pessoa(id_, nome=None):
    p = pessoas.setdefault(id_, {'id': id_, 'name': nomes_p.get(id_) or nome or id_, 'aliases': set()})
    if nome and nome != p['name']:
        p['aliases'].add(nome)
    return p

def jurisdicao(id_, nome=None):
    j = jurisdicoes.setdefault(id_, {'id': id_, 'name': nome or id_, 'aliases': set()})
    if nome and nome != j['name'] and nome != j.get('acronym'):
        j['aliases'].add(nome)
    return j

def refs(lista, chaves):
    out = []
    for r in lista or []:
        fid = chaves.get(r.get('chave'))
        if not fid:
            avisos.append(f'fonte desconhecida {r.get("chave")}')
            continue
        ref = {'source': fid}
        if r.get('trecho'):
            ref['quote'] = r['trecho'].strip()
        if r.get('pagina'):
            ref['page'] = str(r['pagina'])
        out.append(ref)
    return out

def mesclar_refs(a, b):
    vistos = {(r['source'], r.get('quote')) for r in a}
    return a + [r for r in b if (r['source'], r.get('quote')) not in vistos]

def nivel_fontes(rs):
    return min((0 if fontes[r['source']]['level'] == 'primary' else 1) for r in rs) if rs else 2

LUGAR_SINONIMOS = {'bartholomew': 'bartolomeu', 'paul': 'paulo', 'trinity': 'trindade', 'redeemer': 'redentor', 'crucified': 'crucificado', 'saint': 'sao', 'santissima': 'trindade'}
LUGAR_IGNORA = {'se', 'diocesana', 'diocesano', 'sede', 'catedral', 'paroquia', 'chapel', 'capela', 'de', 'da', 'do', 'dos', 'das', 'e', 'em', 'no', 'na', 'bairro', 'rua', 'av', 'avenida', 'anglicana', 'anglicano', 'episcopal', 'igreja', 'church'}

TEMPLOS = {'paroquia', 'catedral', 'igreja', 'capela', 'chapel', 'church', 'cathedral', 'templo', 'santuario', 'auditorio', 'pro-catedral'}

def palavras_lugar(a):
    return {LUGAR_SINONIMOS.get(w, w) for w in norm(a).split() if len(w) > 2 and w not in LUGAR_IGNORA}

def mesmo_lugar(a, b):
    """Um local contém o outro, ignorando conectivos, siglas de estado e palavras genéricas."""
    ta = {LUGAR_SINONIMOS.get(w, w) for w in norm(a).split() if len(w) > 2 and w not in LUGAR_IGNORA}
    tb = {LUGAR_SINONIMOS.get(w, w) for w in norm(b).split() if len(w) > 2 and w not in LUGAR_IGNORA}
    return bool(ta and tb) and (ta <= tb or tb <= ta)

def ancestrais(jid_, vistos=None):
    """Jurisdições de que esta é parte (part_of), em qualquer profundidade."""
    vistos = vistos or set()
    for r in (jurisdicoes.get(jid_) or {}).get('relations', []):
        if r.get('type') == 'part_of' and r['target'] not in vistos:
            vistos.add(r['target'])
            ancestrais(r['target'], vistos)
    return vistos

tocadas = {}  # id(afirmação) → afirmação: só estas passam por revisar()
da_base = {id(c) for e in [*pessoas.values(), *jurisdicoes.values()]
           for lista in ('ordinations', 'affiliations', 'events', 'relations') for c in e.get(lista) or []}

def mesclar_afirmacao(lista, nova, chave, campos, compativel=lambda a, b: True):
    """Junta afirmações equivalentes; divergências viram discrepancies."""
    _mesclar(lista, nova, chave, campos, compativel)
    for c in lista:
        if c is nova or chave(c) == chave(nova) and compativel(c, nova):
            tocadas[id(c)] = c

def local_vinculo(v):
    """Paróquia/comunidade do vínculo, guardada nas notas como 'Local: X.'."""
    m = re.match(r'Local: (.+?)\.(?:\s|$)', v.get('notes') or '')
    return norm(m[1]) if m else None

def mesmo_local(a, b):
    """Vínculos em paróquias diferentes (pároco em X e depois em Y) são vínculos distintos."""
    la, lb = local_vinculo(a), local_vinculo(b)
    return not (la and lb) or la == lb or mesmo_lugar(la, lb)

def _mesclar(lista, nova, chave, campos, compativel):
    for atual in lista:
        if chave(atual) != chave(nova) or not compativel(atual, nova):
            continue
        # a "principal" é a de melhor status/fonte; a que já está na base continua principal (a revisão humana já passou por ela)
        if id(atual) not in da_base and \
                (RANK[nova['status']], nivel_fontes(nova['sources'])) < (RANK[atual['status']], nivel_fontes(atual['sources'])):
            atual, nova_ = nova, atual
            lista[lista.index(nova_)] = atual
        else:
            nova_ = nova
        for campo in campos:
            va, vn = atual.get(campo), nova_.get(campo)
            if vn in (None, [], '') or va == vn:
                continue
            if va in (None, [], ''):
                atual[campo] = vn
                continue
            if campo in ('date', 'start', 'end') and isinstance(va, str) and isinstance(vn, str) and (va.startswith(vn) or vn.startswith(va)):
                atual[campo] = max(va, vn, key=len)  # mesma data, precisões diferentes
                continue
            if campo == 'place' and isinstance(va, str) and isinstance(vn, str) and mesmo_lugar(va, vn):
                atual[campo] = max(va, vn, key=len)  # mesmo lugar, um mais preciso ("Porto Alegre" ⊂ "Catedral …, Porto Alegre")
                continue
            if campo == 'jurisdiction' and isinstance(va, str) and isinstance(vn, str) and (vn in ancestrais(va) or va in ancestrais(vn)):
                # Diocese × igreja a que ela pertence: é a mesma jurisdição em escalas diferentes; fica a igreja.
                atual[campo] = vn if vn in ancestrais(va) else va
                continue
            if campo == 'co_consecrators':
                atual[campo] = sorted(set(va) | set(vn))
                continue
            existente = next((x for x in atual.setdefault('discrepancies', []) if x['field'] == campo and x['value'] == vn), None)
            if existente:
                existente['sources'] = mesclar_refs(existente['sources'], nova_['sources'])
            else:
                atual['discrepancies'].append({'field': campo, 'value': vn, 'sources': nova_['sources']})
        # Divergências já acumuladas pela versão que deixou de ser a principal não podem se perder.
        for d in nova_.get('discrepancies', []):
            ja = {(x['field'], json.dumps(x['value'])) for x in atual.setdefault('discrepancies', [])}
            if (d['field'], json.dumps(d['value'])) not in ja and d.get('value') != atual.get(d['field']):
                atual['discrepancies'].append(d)
        atual['sources'] = mesclar_refs(atual['sources'], nova_['sources'])
        if nova_.get('notes') and nova_['notes'] not in (atual.get('notes') or ''):
            atual['notes'] = ' '.join(x for x in [atual.get('notes'), nova_['notes']] if x)
        return
    lista.append(nova)

arquivos = sorted({f for e in ARGS.entradas for f in (sorted(e.glob('*.json')) if e.is_dir() else [e])})
siglas_jur = {norm(n) for j in jurisdicoes.values() for n in [j['name'], j.get('acronym'), *j['aliases']] if n}
META = re.compile(r'(?i:\b(?:na|da|a) base\b|\bj[aá] registrad)|\bNOVO\b')
PRIVADO = re.compile(r'\b(espos[ao]|marido|filh[oa]s? d[aeo]|(?:seus|suas|sua|seu) filh[oa]s?|casad[oa]|profiss[aã]o|trabalha como|doen[cç]a|c[aâ]ncer|'
                     r'internad[oa]|endere[cç]o|mora em|residente)\b', re.I)
for _arq in arquivos:
    try:
        _d = json.loads(_arq.read_text())
    except Exception:
        continue
    for _j in _d.get('jurisdicoes', []):
        siglas_jur.update(norm(x) for x in (_j.get('sigla'), _j.get('nome')) if x)
    for _a in _d.get('afirmacoes', []):
        siglas_jur.update(norm(x) for x in (_a.get('jurisdicao'), _a.get('origem'), _a.get('alvo')) if x)
for arq in arquivos:
    try:
        d = json.loads(arq.read_text())
    except Exception as e:
        avisos.append(f'{arq.name}: JSON inválido ({e})')
        continue
    # Conferências que a revisão humana faria: notas de bastidor, dados pessoais, fatos futuros.
    for txt in re.findall(r'"(?:notas|resumo|descricao|trecho)"\s*:\s*"((?:[^"\\]|\\.)*)"', arq.read_text()):
        if META.search(txt):
            avisos.append(f'{arq.name}: nota fala da base/do processo ("{META.search(txt)[0]}"): {txt[:90]}')
        if PRIVADO.search(txt):
            avisos.append(f'{arq.name}: possível dado pessoal ("{PRIVADO.search(txt)[0]}"), confira: {txt[:90]}')
    for dt in re.findall(r'"(?:data|inicio|fundacao)"\s*:\s*"(\d{4}(?:-\d{2}(?:-\d{2})?)?)"', arq.read_text()):
        if dt > HOJE[:len(dt)]:
            avisos.append(f'{arq.name}: data futura {dt}; não registre o que ainda não aconteceu')
    chaves = {}
    for f in d.get('fontes', []):
        url = (f.get('url') or '').rstrip('/') or None
        if url and re.search(r'(drive|docs)\.google\.com', url):
            avisos.append(f'{arq.name}: fonte {f["chave"]} com link do Google Drive/Docs; o link foi retirado (cite pelo nome do documento)')
            url = None
        if url and url in url_para_fonte:
            chaves[f['chave']] = url_para_fonte[url]
            continue
        if not url and norm(f.get('titulo')) in titulo_para_fonte:
            chaves[f['chave']] = titulo_para_fonte[norm(f.get('titulo'))]
            continue
        fid = slug(f['chave'])[:80].strip('-')
        base, i = fid, 2
        while fid in fontes:
            fid, i = f'{base}-{i}', i + 1
        tipo = TIPO_FONTE.get(f.get('tipo'), 'other')
        if tipo in ('other', 'blog', 'news', 'article', 'institutional_site', 'social_media', 'wikipedia', 'wikidata', 'thesis') and not url:
            tipo = 'book' if f.get('tipo') == 'livro' else 'official_document' if tipo == 'official_document' else tipo
        fontes[fid] = {k: v for k, v in {
            'id': fid, 'type': tipo, 'title': f.get('titulo') or fid, 'author': f.get('autor'),
            'publisher': f.get('publicador'), 'url': url, 'archive_url': f.get('arquivo') if str(f.get('arquivo') or '').startswith('http') else None,
            'published': data(f.get('data_publicacao'), avisos, fid), 'accessed': HOJE,
            'language': f.get('idioma'), 'level': NIVEL.get(f.get('nivel'), 'secondary'), 'notes': f.get('notas')}.items()
            if v is not None or k in ('url',)}
        if not url and tipo not in ('personal_testimony', 'book', 'minutes', 'official_document'):
            fontes[fid]['type'] = 'other'
            avisos.append(f'fonte {fid} sem url; tipo virou "other" e precisa de url')
        chaves[f['chave']] = fid
        if url:
            url_para_fonte[url] = fid
        elif f.get('titulo'):
            titulo_para_fonte[norm(f['titulo'])] = fid

    for p in d.get('pessoas', []):
        if norm(p['nome']) in ignorar:
            continue
        x = pessoa(pid(p['nome']), p['nome'])
        for alt in [p.get('nome_completo')] + (p.get('nomes_alternativos') or []):
            if alt:
                x['aliases'].add(alt)
        if p.get('nome_completo') and not x.get('full_name'):
            x['full_name'] = p['nome_completo']
        if p.get('wikidata') and re.match(r'^Q\d+$', p['wikidata']):
            x.setdefault('wikidata', p['wikidata'])
        rs = refs(p.get('fontes'), chaves)
        for campo, chave in (('birth', 'nascimento'), ('death', 'falecimento')):
            dt = data(p.get(chave), avisos, x['id'])
            if dt and rs:
                x.setdefault('_' + campo, []).append((dt, rs))
        if p.get('resumo') and rs and not x.get('biography'):
            x['biography'] = p['resumo']
            x['sources'] = rs

    for j in d.get('jurisdicoes', []):
        nome = j.get('sigla') or j['nome']
        x = jurisdicao(jid(nome), j['nome'])
        if j.get('sigla'):
            x.setdefault('acronym', j['sigla'])
        x['name'] = j['nome'] if x['name'] in (x['id'], x.get('acronym')) else x['name']
        if j['nome'] != x['name']:
            x['aliases'].add(j['nome'])
        rs = refs(j.get('fontes'), chaves)
        if j.get('tipo') and not x.get('type'):
            x['type'] = TIPO_JUR.get(j['tipo'], 'other')
        if j.get('pais') and len(j['pais']) == 2 and not x.get('country'):
            x['country'] = j['pais'].upper()
        if j.get('site') and str(j['site']).startswith('http') and not x.get('website'):
            x['website'] = j['site']
        if j.get('wikidata') and re.match(r'^Q\d+$', j['wikidata']) and not x.get('wikidata'):
            x['wikidata'] = j['wikidata']
        dt = data(j.get('fundacao'), avisos, x['id'])
        if dt and rs:
            x.setdefault('_founded', []).append((dt, rs))
        dt = data(j.get('extincao'), avisos, x['id'])
        if dt and rs and not x.get('dissolved'):
            x['dissolved'] = {'date': dt, 'sources': rs}
        if j.get('resumo') and rs and not x.get('description'):
            x['description'] = j['resumo']
            x['sources'] = rs

    for a in d.get('afirmacoes', []):
        rs = refs(a.get('fontes'), chaves)
        if not rs:
            avisos.append(f'{arq.name}: afirmação sem fonte descartada: {json.dumps(a, ensure_ascii=False)[:120]}')
            continue
        status = STATUS.get(a.get('status'), 'probable')
        tipo = a.get('tipo')
        ctx = f'{arq.name}:{tipo}'
        if tipo == 'ordenacao':
            if norm(a['pessoa']) in ignorar:
                continue
            x = pessoa(pid(a['pessoa']), a['pessoa'])
            ordem = ORDEM.get(a.get('ordem'))
            if not ordem:
                avisos.append(f'{ctx}: ordem inválida {a.get("ordem")}')
                continue
            jur = a.get('jurisdicao')
            o = {'order': ordem, 'date': data(a.get('data'), avisos, x['id']), 'place': a.get('local'),
                 'jurisdiction': jid(jur) if jur else None}
            if jur:
                jurisdicao(o['jurisdiction'], jur)
            def ref_pessoa(nome):
                if not nome or norm(nome) in ignorar:
                    return None
                i = pid(nome)
                pessoa(i, nome)
                return i
            if ordem == 'episcopate':
                o['principal_consecrator'] = ref_pessoa(a.get('sagrante_principal'))
                o['co_consecrators'] = sorted({c for c in (ref_pessoa(n) for n in a.get('co_sagrantes') or []) if c and c != o['principal_consecrator']})
                o['office'] = CARGO.get(a.get('cargo')) if a.get('cargo') else None
            else:
                o['ordained_by'] = ref_pessoa(a.get('ordenante'))
            if a.get('modo') in ('condicional', 'reordenacao'):
                o['mode'] = {'condicional': 'conditional', 'reordenacao': 'reordination'}[a['modo']]
            o.update({'status': status, 'sources': rs})
            if a.get('notas'):
                o['notes'] = a['notas']
            mesclar_afirmacao(x.setdefault('ordinations', []), o, lambda z: (z['order'], z.get('mode') or 'normal'),
                              ['date', 'place', 'jurisdiction', 'principal_consecrator', 'co_consecrators', 'ordained_by', 'office'])
        elif tipo == 'vinculo':
            if norm(a['pessoa']) in ignorar:
                continue
            x = pessoa(pid(a['pessoa']), a['pessoa'])
            j_id = jid(a['jurisdicao'])
            jurisdicao(j_id, a['jurisdicao'])
            papel = PAPEL.get(a.get('papel'), 'other')
            v = {'jurisdiction': j_id, 'role': papel}
            if papel == 'other':
                v['role_description'] = a.get('papel')
            detalhe = None
            if a.get('diocese'):
                nome_dio = a['diocese']
                if ' — ' in nome_dio:
                    nome_dio, detalhe = nome_dio.split(' — ', 1)
                # "Diocese X (Paróquia Y)": o parêntese é paróquia/cargo, não outra diocese.
                mp = re.match(r'^(.*?)\s*\((.+)\)\s*$', nome_dio)
                if mp and not mapa_d.get((j_id, norm(nome_dio))) and norm(nome_dio) not in mapa_j:
                    nome_dio, detalhe = mp.group(1), mp.group(2)
                eh_diocese = mapa_d.get((j_id, norm(nome_dio))) or re.search(r'\b(diocese|diocesis|distrito|district|arquidiocese|archdiocese|prelazia|sinodo|synod|arcediagado|convocation|deanery|provincia|regiao missionaria|jurisdicao)\b', norm(nome_dio))
                if not eh_diocese or re.match(r'^(par[oó]quia|igreja|comunidade|catedral|capela|miss[aã]o|reitor|pastor|p[aá]roco)\b', norm(nome_dio)):
                    # Paróquia/comunidade não é diocese: vira nota do vínculo.
                    detalhe = ', '.join(x for x in [nome_dio, detalhe] if x)
                    dio = None
                else:
                    dio = mapa_d.get((j_id, norm(nome_dio))) or jid(nome_dio)
                    # Homônima: o nome casou com a diocese de outra igreja ("Diocese do Recife" da IEAB num vínculo da IECB).
                    donas = {jur for (jur, _), v_ in mapa_d.items() if v_ == dio}
                    if donas and j_id not in donas and not mapa_d.get((j_id, norm(nome_dio))):
                        detalhe = ', '.join(x for x in [nome_dio, detalhe] if x)
                        dio = None
                if dio and dio != j_id:
                    dj = jurisdicao(dio, nome_dio)
                    dj.setdefault('type', 'diocese')
                    dj.setdefault('relations', [])
                    mesclar_afirmacao(dj['relations'], {'type': 'part_of', 'target': j_id, 'status': status, 'sources': rs},
                                      lambda z: (z['type'], z['target']), [])
                    v['diocese'] = dio
            v.update({'start': data(a.get('inicio'), avisos, x['id']), 'end': data(a.get('fim'), avisos, x['id']),
                      'end_reason': MOTIVO.get(a.get('motivo_fim')) if a.get('motivo_fim') else None,
                      'status': status, 'sources': rs})
            notas_v = ' '.join(x for x in [f'Local: {detalhe}.' if detalhe else None, a.get('notas')] if x)
            if notas_v:
                v['notes'] = notas_v
            mesclar_afirmacao(x.setdefault('affiliations', []), v,
                              lambda z: (z['jurisdiction'], z.get('diocese'), z['role'], z.get('role_description')), ['start', 'end', 'end_reason'],
                              mesmo_local)
        elif tipo == 'relacao':
            o_id = jid(a['origem'])
            t_id = jid(a['alvo'])
            origem = jurisdicao(o_id, a['origem'])
            jurisdicao(t_id, a['alvo'])
            rel = RELACAO.get(a.get('relacao'))
            if not rel or o_id == t_id:
                avisos.append(f'{ctx}: relação inválida {a.get("relacao")} {o_id}->{t_id}')
                continue
            r = {'type': rel, 'target': t_id, 'date': data(a.get('data'), avisos, o_id), 'end': data(a.get('fim'), avisos, o_id),
                 'led_by': sorted({pid(n) for n in a.get('liderado_por') or [] if norm(n) not in ignorar}),
                 'status': status, 'sources': rs}
            for n in a.get('liderado_por') or []:
                if norm(n) not in ignorar:
                    pessoa(pid(n), n)
            if a.get('notas'):
                r['notes'] = a['notas']
            mesclar_afirmacao(origem.setdefault('relations', []), r, lambda z: (z['type'], z['target']), ['date', 'end', 'led_by'])
        elif tipo == 'evento':
            desc = a.get('descricao', '')
            dl = norm(desc)
            et = a.get('tipo_evento') or ('deposition' if 'depos' in dl else 'resignation' if 'renunc' in dl or 'resign' in dl
                  else 'excommunication' if 'excomung' in dl else 'death' if any(k in dl[:60] for k in ('assassin', 'falec', 'morte', 'morreu', 'died'))
                  else 'conversion' if 'convers' in dl else 'other')
            # Siglas (DMCB, IAOB...) e jurisdições conhecidas citadas no evento não são pessoas.
            alvos = [n for n in a.get('envolvidos') or []
                     if norm(n) in mapa_p or (norm(n) not in mapa_j and norm(n) not in siglas_jur and not re.fullmatch(r'[A-Z0-9][A-Z0-9-]+', n.strip()))]
            for k, n in enumerate(alvos):
                if norm(n) in ignorar or norm(n) in mapa_j:
                    continue
                x = pessoa(pid(n), n)
                # Num evento de morte, quem morreu é o primeiro envolvido; os demais só aparecem na notícia.
                ev = {'type': 'other' if et in ('death', 'deposition') and k > 0 else et, 'date': data(a.get('data'), avisos, x['id']), 'description': desc, 'status': status, 'sources': rs}
                mesclar_afirmacao(x.setdefault('events', []), ev, lambda z: (z['type'], None if z['type'] == 'death' else z['description']), ['date'])
        else:
            avisos.append(f'{ctx}: tipo desconhecido')

# Info curada de jurisdições (tipo, tradição, locator_slug, cor, nome oficial). Só vale para as que ainda não
# estão na base: as existentes se editam direto no YAML.
for jid_, inf in info_j.items():
    if jid_ in orig['jurisdictions'] or jid_ not in jurisdicoes:
        continue
    j = jurisdicao(jid_)
    for k, v in inf.items():
        if k == 'name' and j['name'] != v:
            j['aliases'].add(j['name'])
        j[k] = v

# Nascimento/falecimento: datas compatíveis ("1925" e "1925-05-23") se juntam na mais precisa;
# a versão com mais fontes vira a principal e as demais ficam como divergência.
def resolver_datas(cands, preferida=None):
    grupos = []
    for dt, rs in cands:
        for g in grupos:
            if g['date'].startswith(dt) or dt.startswith(g['date']):
                g['date'] = max(g['date'], dt, key=len)
                g['sources'] = mesclar_refs(g['sources'], rs)
                break
        else:
            grupos.append({'date': dt, 'sources': list(rs)})
    def peso(g):
        # As fontes de uma ficha costumam valer para nascimento e falecimento juntos; conta primeiro
        # as que citam o ano no trecho, depois o total. Empate mantém a ordem de chegada.
        ano = re.search(r'\d{4}', g['date']).group()
        citam = {r['source'] for r in g['sources'] if ano in (r.get('quote') or '')}
        return (-len(citam), -len({r['source'] for r in g['sources']}))
    grupos.sort(key=peso)
    # Decisão do mantenedor entre versões igualmente sustentadas (mapa.json: "datas_preferidas").
    if preferida:
        grupos.sort(key=lambda g: g['date'] != preferida)
    principal, resto = grupos[0], grupos[1:]
    if resto:
        principal['discrepancies'] = [{'field': 'date', 'value': g['date'], 'sources': g['sources']} for g in resto]
    return principal

def versoes(fato):
    """Data registrada e suas divergências, como candidatos de resolver_datas."""
    if not fato or not fato.get('date'):
        return []
    return [(fato['date'], fato.get('sources', []))] + [(d['value'], d.get('sources', [])) for d in fato.get('discrepancies', [])]

def compativel(dt, cands):
    return any(dt.startswith(c) or c.startswith(dt) for c, _ in cands)

for j in jurisdicoes.values():
    cands = j.pop('_founded', [])
    if cands:
        j['founded'] = resolver_datas(versoes(j.get('founded')) + cands)

for p in pessoas.values():
    for campo in ('birth', 'death'):
        atuais = versoes(p.get(campo))
        cands = p.pop('_' + campo, [])
        if campo == 'death':
            # Eventos de morte também contam como versões da data de falecimento
            cands += [(e['date'], e['sources']) for e in p.get('events', []) if e['type'] == 'death' and e.get('date')
                      and not compativel(e['date'], atuais + cands)]
        if cands:
            p[campo] = resolver_datas(atuais + cands, mapa.get('datas_preferidas', {}).get(f"{p['id']}.{campo}"))


# --- Revisão das divergências: só o que é conflito de fato deixa a afirmação "contestada".
CARGO_ESPECIFICO = ['coadjutor', 'suffragan', 'auxiliary', 'missionary', 'primate', 'diocesan', 'other']

def relacionadas(a, b):
    """Mesma jurisdição em escala ou fase diferente: parte de / sucessora de / membro de, em qualquer direção."""
    def fecho(x):
        vistos, fila = {x}, [x]
        while fila:
            y = fila.pop()
            for r in (jurisdicoes.get(y) or {}).get('relations', []):
                if r.get('type') in ('part_of', 'successor_of', 'member_of') and r['target'] not in vistos:
                    vistos.add(r['target']); fila.append(r['target'])
        return vistos
    return b in fecho(a) or a in fecho(b)

def anacronica(jid_, data_):
    """A jurisdição ainda não existia (ou já não existia) na data: a atribuição foi inferida errado pela fonte/agente."""
    j, a = jurisdicoes.get(jid_) or {}, ano(data_)
    if not a:
        return False
    def anos(fato):
        fato = fato or {}
        return [x for x in [ano(fato.get('date'))] + [ano(d.get('value')) for d in fato.get('discrepancies', [])] if x]
    fund, fim = anos(j.get('founded')), anos(j.get('dissolved'))
    return bool(fund and min(fund) > a or fim and max(fim) < a)

def da_epoca(fid, data_):
    """Fonte primária (não testemunho tardio) ou publicada até 5 anos depois do fato."""
    f, a = fontes.get(fid) or {}, ano(data_)
    if f.get('level') == 'primary' and f.get('type') != 'personal_testimony':
        return True
    pub = ano(f.get('published'))
    return bool(a and pub and 0 <= pub - a <= 5)

def isolada(d, c):
    """Uma única fonte posterior contra várias fontes, ao menos uma da época: a divergência aparece, mas não contesta."""
    contra = {s['source'] for s in d.get('sources', [])}
    if len(contra) != 1:
        return False
    data_ = c.get('date') or c.get('start')
    (fonte,) = contra
    a_favor = {s['source'] for s in c.get('sources', [])} - contra
    return not da_epoca(fonte, data_) and len(a_favor) >= 2 and any(da_epoca(x, data_) for x in a_favor)

def dentro(intervalo, v):
    """'2002/2003' contém '2002-10'."""
    m = re.fullmatch(r'(\d{4})/(\d{4})', intervalo or '')
    return bool(m and ano(v) and int(m[1]) <= ano(v) <= int(m[2]))

def ano(v):
    m = re.search(r'\d{4}', v or '')
    return int(m.group()) if m else None

def menor(campo, va, vn, tipo):
    """Divergência real, mas pequena: não torna a afirmação contestada."""
    if campo == 'place' and isinstance(va, str) and isinstance(vn, str) and palavras_lugar(va) & palavras_lugar(vn):
        # Mesma cidade, uma versão sem o templo: só precisão diferente. Dois templos diferentes continuam em conflito.
        templo = lambda x: bool(set(norm(x).split()) & TEMPLOS)
        if not (templo(va) and templo(vn)):
            return True
    if campo in ('date', 'start', 'end') and any(str(x or '').startswith('c.') for x in (va, vn)):
        return True  # data aproximada
    if tipo in ('vinculo', 'relacao') and campo in ('start', 'end', 'date') and ano(va) and ano(vn):
        return abs(ano(va) - ano(vn)) <= 1
    if campo == 'end_reason' and {va, vn} <= {'resignation', 'retirement', 'term_end'}:
        return True
    return False

def revisar(c, tipo):
    novas, substantiva = [], False
    for d in c.get('discrepancies', []):
        campo, vn, va = d['field'], d.get('value'), c.get(d['field'])
        if campo == 'place' and isinstance(va, str) and isinstance(vn, str) and mesmo_lugar(va, vn):
            continue
        if campo == 'jurisdiction' and isinstance(va, str) and isinstance(vn, str) and relacionadas(va, vn):
            continue
        if campo == 'jurisdiction' and isinstance(vn, str) and anacronica(vn, c.get('date') or c.get('start')):
            continue
        if campo == 'office' and va and vn:
            if CARGO_ESPECIFICO.index(vn) < CARGO_ESPECIFICO.index(va):
                c['office'] = vn  # fica o cargo mais específico (coadjutor > diocesano)
            continue
        if campo == 'end_reason' and {va, vn} <= {'left', 'schism', 'deposition'}:
            # Saiu (ou cisma) e foi deposto/excluído pela igreja que deixou: as duas coisas valem; fica a mais específica.
            c['end_reason'] = 'deposition' if 'deposition' in (va, vn) else 'schism'
            continue
        if campo in ('date', 'start', 'end') and isinstance(va, str) and isinstance(vn, str) and (va.startswith(vn) or vn.startswith(va) or dentro(va, vn) or dentro(vn, va)):
            continue
        if campo in ('led_by', 'co_consecrators') and isinstance(va, list) and isinstance(vn, list) and (set(va) <= set(vn) or set(vn) <= set(va)):
            c[campo] = sorted(set(va) | set(vn))  # uma fonte cita só parte dos nomes
            continue
        novas.append(d)
        substantiva = substantiva or not (menor(campo, va, vn, tipo) or isolada(d, c))
    if novas:
        c['discrepancies'] = novas
    else:
        c.pop('discrepancies', None)
    if substantiva:
        c['status'] = 'contested'

# Só as afirmações tocadas nesta leva: o que já está na base (inclusive status ajustado à mão) fica como está.
contestadas = []
for p in pessoas.values():
    for lista, tipo in (('ordinations', 'ordenacao'), ('affiliations', 'vinculo'), ('events', 'evento')):
        for c in p.get(lista, []):
            if id(c) in tocadas:
                revisar(c, tipo)
                if c['status'] == 'contested':
                    contestadas.append(f"{p['id']} [{lista}] {c.get('order') or c.get('jurisdiction') or c.get('type')} {c.get('date') or c.get('start') or ''}")
for j in jurisdicoes.values():
    for r in j.get('relations', []):
        if id(r) in tocadas:
            revisar(r, 'relacao')
            if r['status'] == 'contested':
                contestadas.append(f"{j['id']} [relations] {r['type']} → {r['target']}")

def limpar(obj):
    if isinstance(obj, dict):
        return {k: limpar(v) for k, v in obj.items() if v not in (None, [], '', set()) or k in ('date', 'jurisdiction') and v is None}
    if isinstance(obj, (list, set)):
        return [limpar(v) for v in (sorted(obj) if isinstance(obj, set) else obj)]
    return obj

ORDEM_P = ['id', 'name', 'full_name', 'aliases', 'birth', 'death', 'wikidata', 'biography', 'sources', 'ordinations', 'affiliations', 'events']
ORDEM_J = ['id', 'acronym', 'name', 'aliases', 'former_ids', 'type', 'acts_as_church', 'tradition', 'country', 'founded', 'dissolved', 'locator_slug', 'wikidata', 'website', 'color', 'description', 'sources', 'relations']
ORDEM_O = ['order', 'date', 'place', 'jurisdiction', 'office', 'ordained_by', 'principal_consecrator', 'co_consecrators', 'mode', 'status', 'sources', 'discrepancies', 'notes']

def ordenar(d, ordem):
    return {k: d[k] for k in ordem if k in d} | {k: v for k, v in d.items() if k not in ordem}

class Dumper(yaml.SafeDumper):
    pass
def str_rep(dumper, s):
    style = '>' if len(s) > 100 and '\n' not in s else None
    return dumper.represent_scalar('tag:yaml.org,2002:str', s, style=style)
Dumper.add_representer(str, str_rep)

def assinatura(obj):
    return json.dumps(limpar(dict(obj) | {'aliases': sorted(obj.get('aliases') or [])}), sort_keys=True, ensure_ascii=False)

SCHEMA = {'people': 'person', 'jurisdictions': 'jurisdiction', 'sources': 'source'}

def texto(pasta, obj):
    return f"# yaml-language-server: $schema=../../schemas/{SCHEMA[pasta]}.json\n" + \
        yaml.dump(obj, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110)

def normalizar_pessoa(p):
    # Fusões podem deixar o sagrante principal também entre os co-sagrantes.
    for o in p.get('ordinations', []):
        if o.get('co_consecrators') and o.get('principal_consecrator'):
            o['co_consecrators'] = [c for c in o['co_consecrators'] if c != o['principal_consecrator']]
    p['aliases'] = sorted(a for a in p['aliases'] if a and norm(a) != norm(p['name']))
    for o in p.get('ordinations', []):
        o.setdefault('jurisdiction', None)
    p['ordinations'] = sorted(p.get('ordinations', []), key=lambda o: ['diaconate', 'presbyterate', 'episcopate'].index(o['order']))
    p['ordinations'] = [ordenar(limpar(o) | {'date': o.get('date'), 'jurisdiction': o.get('jurisdiction')}, ORDEM_O) for o in p['ordinations']]
    p['affiliations'] = sorted(p.get('affiliations', []), key=lambda v: v.get('start') or '9999')
    return ordenar(limpar(p), ORDEM_P)

def normalizar_jurisdicao(j):
    j['aliases'] = sorted(a for a in j['aliases'] if a and a not in (j['name'], j.get('acronym')))
    j.setdefault('type', 'other')
    return ordenar(limpar(j), ORDEM_J)

# Só o que é novo ou mudou nesta leva é normalizado e gravado.
mudou = {}
for pasta, estado, normalizar in (('people', pessoas, normalizar_pessoa), ('jurisdictions', jurisdicoes, normalizar_jurisdicao),
                                  ('sources', fontes, limpar)):
    for k, obj in estado.items():
        if k not in orig[pasta] or assinatura(obj) != assinatura(orig[pasta][k]):
            txt = texto(pasta, normalizar(obj))
            atual = BASE / pasta / f'{k}.yaml'
            if not (atual.exists() and atual.read_text() == txt):
                mudou[(pasta, k)] = txt

novos = lambda pasta: sorted(k for (p_, k) in mudou if p_ == pasta and k not in orig[pasta])
alterados = lambda pasta: sorted(k for (p_, k) in mudou if p_ == pasta and k in orig[pasta])

def parecidos(id_):
    """Pessoas já registradas com o mesmo primeiro e último nome: possível duplicata ou homônimo."""
    t = norm(pessoas[id_]['name']).split()
    if len(t) < 2:
        return []
    return sorted(k for k, p in pessoas.items() if k != id_ and k in orig['people']
                  and any((u := norm(n).split()) and u[0] == t[0] and u[-1] == t[-1]
                          for n in [p['name'], p.get('full_name'), *p['aliases']] if n))

print(f'{len(arquivos)} arquivo(s) sobre a base de {len(orig["people"])} pessoas, {len(orig["jurisdictions"])} jurisdições, '
      f'{len(orig["sources"])} fontes')
for pasta, rotulo in (('people', 'Pessoas'), ('jurisdictions', 'Jurisdições'), ('sources', 'Fontes')):
    n, a = novos(pasta), alterados(pasta)
    print(f'\n{rotulo}: {len(n)} nova(s), {len(a)} alterada(s)')
    for k in n:
        nome = (pessoas.get(k) or jurisdicoes.get(k) or {}).get('name') or fontes.get(k, {}).get('title', '')
        sus = parecidos(k) if pasta == 'people' else []
        print(f'  + {k}  ({nome})' + (f'  ⚠ parecido com: {", ".join(sus)}' if sus else ''))
    if pasta != 'sources':
        for k in a:
            print(f'  ~ {k}')
if contestadas:
    print(f'\nAfirmações tocadas que ficaram contestadas ({len(contestadas)}):')
    for c in contestadas:
        print('  ' + c)
if avisos:
    print(f'\nAVISOS ({len(avisos)}):')
    for a in avisos:
        print('  ' + a)

if WRITE:
    for (pasta, k), txt in mudou.items():
        (OUT / pasta).mkdir(parents=True, exist_ok=True)
        (OUT / pasta / f'{k}.yaml').write_text(txt)
    print(f'\n{len(mudou)} arquivo(s) gravado(s) em {OUT}')
else:
    print('\n(simulação; use --write para gravar)')
