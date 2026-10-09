#!/usr/bin/env python3
"""Mantém em dia o resumo das fichas (biography de pessoas, description de jurisdições).

O consolidador só escreve o resumo de quem ainda não tem um; depois de novas levas ele fica para trás.
Este script prepara um dossiê com os fatos registrados de cada ficha, para alguém (pessoa ou agente)
reescrever o resumo, e aplica os resumos reescritos conferindo que cada citação já está na ficha.

    # dossiês das fichas alteradas desde um commit (ou das fichas indicadas), em lotes de 30
    python3 -I layers/episcopado/pesquisa/resumos.py dossie --desde origin/main --saida /tmp/resumos
    python3 -I layers/episcopado/pesquisa/resumos.py dossie --ids miguel-uchoa gac --saida /tmp/resumos

    # aplica um JSON [{ "id", "texto", "citacoes": ["c1a2b3", ...] }] (códigos de citação do dossiê)
    python3 -I layers/episcopado/pesquisa/resumos.py aplicar /tmp/resumos/resumos-01.json [--write]
"""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
import yaml

AQUI = Path(__file__).resolve().parent
DATA = AQUI.parent / 'data'

class Loader(yaml.SafeLoader):
    pass
Loader.yaml_implicit_resolvers = {k: [r for r in v if r[0] != 'tag:yaml.org,2002:timestamp']
                                  for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()}

class Dumper(yaml.SafeDumper):
    pass
Dumper.add_representer(str, lambda d, s: d.represent_scalar(
    'tag:yaml.org,2002:str', s, style='>' if len(s) > 100 and '\n' not in s else None))

ORDEM = {'diaconate': 'diaconato', 'presbyterate': 'presbiterato', 'episcopate': 'sagração episcopal'}
CAMPO = {'person': 'biography', 'jurisdiction': 'description'}
ORDEM_P = ['id', 'name', 'full_name', 'aliases', 'birth', 'death', 'wikidata', 'biography', 'sources', 'ordinations',
           'affiliations', 'events']
ORDEM_J = ['id', 'acronym', 'name', 'aliases', 'former_ids', 'type', 'acts_as_church', 'tradition', 'country', 'founded',
           'dissolved', 'locator_slug', 'wikidata', 'website', 'color', 'description', 'sources', 'relations']


def carregar(kind, id_):
    pasta = 'people' if kind == 'person' else 'jurisdictions'
    arq = DATA / pasta / f'{id_}.yaml'
    return arq, yaml.load(arq.read_text(), Loader=Loader)


def nomes():
    n = {}
    for pasta in ('people', 'jurisdictions'):
        for f in (DATA / pasta).glob('*.yaml'):
            d = yaml.load(f.read_text(), Loader=Loader)
            n[d['id']] = d.get('acronym') or d['name']
    return n


LIDERANCA = {'founder', 'primate', 'archbishop', 'diocesan_bishop', 'coadjutor_bishop', 'bishop', 'missionary_bishop'}


def entradas():
    """Para cada jurisdição: quem a liderou (vínculos de pessoas) e quem saiu dela ou a sucedeu (relações)."""
    idx = {}
    for f in (DATA / 'people').glob('*.yaml'):
        d = yaml.load(f.read_text(), Loader=Loader)
        for a in d.get('affiliations') or []:
            if a['role'] in LIDERANCA or (a['role'] == 'other' and re.search(r'primaz|arcebisp|bispo|fundador|presidente',
                                                                              a.get('role_description') or '', re.I)):
                for j in {a['jurisdiction'], a.get('diocese')} - {None}:
                    idx.setdefault(j, []).append(('pessoa', d['id'], a))
    for f in (DATA / 'jurisdictions').glob('*.yaml'):
        d = yaml.load(f.read_text(), Loader=Loader)
        for r in d.get('relations') or []:
            if r['type'] in ('schism_from', 'successor_of', 'merged_with', 'part_of'):
                idx.setdefault(r['target'], []).append(('jurisdicao', d['id'], r))
    return idx


def tamanho(n):
    """Tamanho sugerido do resumo conforme a quantidade de fatos da ficha."""
    if n <= 3:
        return 'uma frase (até ~250 caracteres)'
    if n <= 10:
        return '2 a 3 frases (até ~500 caracteres)'
    if n <= 30:
        return '4 a 6 frases (até ~900 caracteres)'
    if n <= 100:
        return '7 a 12 frases (até ~1.800 caracteres), cobrindo cada fase do ministério ou da história'
    return '10 a 16 frases (até ~2.600 caracteres), cobrindo cada fase do ministério ou da história'


def codigo(s):
    """Código estável de uma citação (fonte + trecho), para o resumo apontar sem copiar o trecho."""
    return 'c' + hashlib.md5(f"{s['source']}|{s.get('quote') or ''}".encode()).hexdigest()[:6]


def linhas_fatos(kind, d, N):
    out = []
    fmt_src = lambda c: '; '.join(f"{codigo(s)} [{s['source']}] \"{s.get('quote') or ''}\"" for s in c.get('sources', [])[:4])
    if kind == 'person':
        for campo in ('birth', 'death'):
            if d.get(campo):
                out.append(f"- {campo}: {d[campo].get('date')} | {fmt_src(d[campo])}")
        for o in d.get('ordinations') or []:
            quem = o.get('principal_consecrator') or o.get('ordained_by')
            out.append(f"- {ORDEM[o['order']]}{' (' + o['mode'] + ')' if o.get('mode') else ''}: {o.get('date') or 's/d'}"
                       f", {N.get(o.get('jurisdiction'), o.get('jurisdiction') or '?')}, por {N.get(quem, quem or '?')}"
                       f" [{o['status']}] | {fmt_src(o)}")
        for a in d.get('affiliations') or []:
            papel = a.get('role_description') or a['role']
            out.append(f"- vínculo: {papel} em {N.get(a['jurisdiction'], a['jurisdiction'])}"
                       f"{' / ' + N.get(a['diocese'], a['diocese']) if a.get('diocese') else ''}"
                       f" {a.get('start') or '?'}–{a.get('end') or ''}{' (' + a['end_reason'] + ')' if a.get('end_reason') else ''}"
                       f" [{a['status']}] | {fmt_src(a)}")
        for e in d.get('events') or []:
            out.append(f"- evento {e['type']} {e.get('date') or 's/d'}: {e.get('description', '')[:200]} | {fmt_src(e)}")
    else:
        for tipo, id_, c in sorted(ENTRADAS.get(d['id'], []), key=lambda x: str(x[2].get('start') or x[2].get('date') or '9999')):
            if tipo == 'pessoa':
                papel = c.get('role_description') or c['role']
                out.append(f"- liderança: {N.get(id_, id_)} como {papel} {c.get('start') or '?'}–{c.get('end') or ''}"
                           f" [{c['status']}] | {fmt_src(c)}")
            else:
                out.append(f"- {N.get(id_, id_)} {c['type']} esta jurisdição {c.get('date') or '?'} [{c['status']}] | {fmt_src(c)}")
        for campo in ('founded', 'dissolved'):
            if d.get(campo):
                out.append(f"- {campo}: {d[campo].get('date')} | {fmt_src(d[campo])}")
        for r in d.get('relations') or []:
            out.append(f"- {r['type']} {N.get(r['target'], r['target'])} {r.get('date') or '?'}–{r.get('end') or ''}"
                       f" [{r['status']}] | {fmt_src(r)}")
    return out


def dossie(args):
    ids = []
    if args.ids:
        for i in args.ids:
            kind = 'person' if (DATA / 'people' / f'{i}.yaml').exists() else 'jurisdiction'
            ids.append((kind, i))
    if args.desde:
        arqs = subprocess.run(['git', 'diff', '--name-only', args.desde, '--', str(DATA)], capture_output=True, text=True,
                              cwd=AQUI).stdout.split()
        for a in arqs:
            p = Path(a)
            if p.parent.name in ('people', 'jurisdictions') and (AQUI.parent.parent.parent / a).exists():
                ids.append(('person' if p.parent.name == 'people' else 'jurisdiction', p.stem))
    if args.todas:
        ids += [('person', f.stem) for f in sorted((DATA / 'people').glob('*.yaml'))]
        ids += [('jurisdiction', f.stem) for f in sorted((DATA / 'jurisdictions').glob('*.yaml'))]
    N = nomes()
    fichas = []
    for kind, id_ in dict.fromkeys(ids):
        _, d = carregar(kind, id_)
        fatos = linhas_fatos(kind, d, N)
        if len(fatos) < args.minimo:
            continue
        fichas.append((kind, id_, d, fatos))
    saida = Path(args.saida)
    saida.mkdir(parents=True, exist_ok=True)
    # Lotes por volume de texto, não por número de fichas: uma ficha grande (Robinson) pesa como dezenas de pequenas.
    lotes, atual_, tam = [], [], 0
    for kind, id_, d, fatos in fichas:
        bloco = (f"## {id_} ({'pessoa' if kind == 'person' else 'jurisdição'}): {d['name']}\n"
                 f"Fatos: {len(fatos)} — tamanho do resumo: {tamanho(len(fatos))}\n"
                 f"Resumo atual: {d.get(CAMPO[kind]) or '(nenhum)'}\n" + '\n'.join(fatos) + '\n')
        if atual_ and (tam + len(bloco) > args.chars or len(atual_) >= args.lote):
            lotes.append(atual_); atual_, tam = [], 0
        atual_.append(bloco); tam += len(bloco)
    if atual_:
        lotes.append(atual_)
    for n, lote in enumerate(lotes, 1):
        (saida / f'dossie-{n:02d}.md').write_text('\n'.join(lote))
    print(f'{len(fichas)} ficha(s) em {len(lotes)} dossiê(s) em {saida}')


def aplicar(args):
    itens = json.loads(Path(args.arquivo).read_text())
    erros, gravar = [], []
    for it in itens:
        id_ = it['id']
        kind = 'person' if (DATA / 'people' / f'{id_}.yaml').exists() else 'jurisdiction'
        arq, d = carregar(kind, id_)
        texto = re.sub(r'\s+', ' ', it.get('texto') or '').strip()
        por_codigo = {}
        def junta(x):
            if isinstance(x, dict):
                if isinstance(x.get('source'), str):
                    por_codigo.setdefault(codigo(x), {k: v for k, v in x.items() if k in ('source', 'quote', 'page')})
                for v in x.values():
                    junta(v)
            elif isinstance(x, list):
                for v in x:
                    junta(v)
        junta({k: v for k, v in d.items() if k != 'sources'} | {'_': d.get('sources')})
        if kind == 'jurisdiction':
            junta([c for _, _, c in ENTRADAS.get(id_, [])])
        fontes = []
        for c in it.get('citacoes') or []:
            if c in por_codigo:
                if por_codigo[c] not in fontes:
                    fontes.append(por_codigo[c])
            else:
                erros.append(f'{id_}: código de citação desconhecido {c}')
        if not texto or not fontes:
            erros.append(f'{id_}: sem texto ou sem fontes válidas; mantido o resumo atual')
            continue
        if re.search(r'\b(na base|da base|a base|NOVO|já registrad)', texto):
            erros.append(f'{id_}: o texto fala da base/do processo')
            continue
        d[CAMPO[kind]] = texto
        d['sources'] = fontes
        ordem = ORDEM_P if kind == 'person' else ORDEM_J
        d = {k: d[k] for k in ordem if k in d} | {k: v for k, v in d.items() if k not in ordem}
        schema = 'person' if kind == 'person' else 'jurisdiction'
        gravar.append((arq, f'# yaml-language-server: $schema=../../schemas/{schema}.json\n'
                       + yaml.dump(d, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110)))
    for e in erros:
        print('  ! ' + e)
    print(f'{len(gravar)} resumo(s) prontos, {len(erros)} problema(s)')
    if args.write:
        for arq, txt in gravar:
            arq.write_text(txt)
        print('gravado')


ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest='cmd', required=True)
a = sub.add_parser('dossie')
a.add_argument('--ids', nargs='*')
a.add_argument('--desde')
a.add_argument('--saida', required=True)
a.add_argument('--todas', action='store_true', help='todas as fichas da base')
a.add_argument('--lote', type=int, default=60, help='máximo de fichas por dossiê')
a.add_argument('--chars', type=int, default=90000, help='tamanho máximo de um dossiê, em caracteres')
a.add_argument('--minimo', type=int, default=2, help='mínimo de fatos para valer um resumo')
b = sub.add_parser('aplicar')
b.add_argument('arquivo')
b.add_argument('--write', action='store_true')
args = ap.parse_args()
ENTRADAS = entradas()
dossie(args) if args.cmd == 'dossie' else aplicar(args)
