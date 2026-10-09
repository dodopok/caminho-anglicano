#!/usr/bin/env python3
"""Funde fichas duplicadas de pessoa: junta tudo na ficha que fica e troca as referências na base.

    python3 -I layers/episcopado/pesquisa/fundir.py <id-que-fica> <id-que-sai>... [--nome "Nome de exibição"] [--write]

A ficha que sai vira alias (nome e nome completo) da que fica, e o mapa.json passa a apontar para ela.
"""
import argparse, json, re
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

ORDEM_P = ['id', 'name', 'full_name', 'aliases', 'birth', 'death', 'wikidata', 'biography', 'sources', 'ordinations',
           'affiliations', 'events']

ap = argparse.ArgumentParser()
ap.add_argument('fica')
ap.add_argument('saem', nargs='+')
ap.add_argument('--nome')
ap.add_argument('--write', action='store_true')
args = ap.parse_args()

ler = lambda i: yaml.load((DATA / 'people' / f'{i}.yaml').read_text(), Loader=Loader)
alvo = ler(args.fica)
aliases = set(alvo.get('aliases') or [])
for sai in args.saem:
    d = ler(sai)
    aliases |= {d['name'], *(d.get('aliases') or []), *([d['full_name']] if d.get('full_name') else [])}
    for campo in ('birth', 'death', 'wikidata', 'full_name'):
        if d.get(campo) and not alvo.get(campo):
            alvo[campo] = d[campo]
    if d.get('biography') and not alvo.get('biography'):
        alvo['biography'], alvo['sources'] = d['biography'], d.get('sources', [])
    for lista in ('ordinations', 'affiliations', 'events'):
        alvo.setdefault(lista, []).extend(d.get(lista) or [])
if args.nome and args.nome != alvo['name']:
    aliases.add(alvo['name'])
    alvo['name'] = args.nome
alvo['aliases'] = sorted(a for a in aliases if a and a != alvo['name'])
alvo['ordinations'] = sorted(alvo.get('ordinations') or [], key=lambda o: ['diaconate', 'presbyterate', 'episcopate'].index(o['order']))
alvo['affiliations'] = sorted(alvo.get('affiliations') or [], key=lambda v: v.get('start') or '9999')
alvo = {k: v for k, v in alvo.items() if v not in (None, [], '')}
alvo = {k: alvo[k] for k in ORDEM_P if k in alvo} | {k: v for k, v in alvo.items() if k not in ORDEM_P}

# Referências em outras fichas (sagrantes, ordenantes, envolvidos, liderança de relações)
padrao = re.compile(r'(?<![\w-])(' + '|'.join(map(re.escape, args.saem)) + r')(?![\w-])')
trocas = {}
for f in list((DATA / 'people').glob('*.yaml')) + list((DATA / 'jurisdictions').glob('*.yaml')):
    if f.stem in args.saem:
        continue
    t = f.read_text()
    if padrao.search(t):
        trocas[f] = padrao.sub(args.fica, t)

print(f'{args.fica} recebe {", ".join(args.saem)}; {len(trocas)} ficha(s) com referências trocadas')
if args.write:
    for f, t in trocas.items():
        f.write_text(t)
    (DATA / 'people' / f'{args.fica}.yaml').write_text(
        '# yaml-language-server: $schema=../../schemas/person.json\n'
        + yaml.dump(alvo, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110))
    for sai in args.saem:
        (DATA / 'people' / f'{sai}.yaml').unlink()
    mapa = json.loads((AQUI / 'mapa.json').read_text())
    for n in alvo['aliases'] + [alvo['name']]:
        mapa['pessoas'][n] = args.fica
    mapa['pessoas'] = {k: (args.fica if v in args.saem else v) for k, v in mapa['pessoas'].items()}
    (AQUI / 'mapa.json').write_text(json.dumps(mapa, ensure_ascii=False, indent=1))
    print('gravado')
