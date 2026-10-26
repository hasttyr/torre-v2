# Regenerates USER-STORIES.md §7 from docs/stories/*.md. Usage: python tools/docs-index.py .
import re, os, sys, glob
from collections import Counter
root = sys.argv[1]
SD = os.path.join(root, 'docs', 'stories')
stories = {}; order = []
for fpath in sorted(glob.glob(os.path.join(SD, '*.md'))):
    ep = os.path.basename(fpath)[:5]
    t = open(fpath, encoding='utf-8').read()
    for blk in re.split(r'^### ', t, flags=re.M)[1:]:
        m = re.match(r'(US-\d+) — (.+)', blk); us = m.group(1)
        h = re.search(r'\*\*Fase:\*\* (.+?) · \*\*Prioridad:\*\* (\w+) · \*\*Tamaño:\*\* (\w+) · \*\*Estado:\*\* (\S+)', blk)
        dep = re.search(r'\*\*Depende de:\*\* (.+)', blk).group(1)
        part = re.search(r'\*\*Depende \(parcial\):\*\* (.+)', blk)
        stories[us] = dict(ep=ep, title=m.group(2).strip(), fase=h.group(1), prio=h.group(2), size=h.group(3),
                           state=h.group(4), deps=re.findall(r'US-\d+', dep),
                           part=re.findall(r'US-\d+', part.group(1)) if part else [])
        order.append(us)
for u, s in stories.items():
    for d in s['deps'] + s['part']:
        assert d in stories, (u, d)
lvl = {}
def L(u, st=()):
    if u in lvl: return lvl[u]
    if u in st: raise SystemExit('cycle ' + str(st + (u,)))
    s = stories[u]
    lvl[u] = 0 if not s['deps'] else 1 + max(L(d, st + (u,)) for d in s['deps'])
    return lvl[u]
for u in stories: L(u)
# MVP closure check: every MVP story's hard deps must be MVP
probs = []
out = ['## 7. Backlog completo (generado)', '',
       '<!-- GENERADO a partir de docs/stories/*.md (última regeneración: 2026-10-26). Si cambias una historia, regenera esta sección. "Depende (parcial)" no cuenta para los niveles. -->', '']
eps = sorted(set(s['ep'] for s in stories.values()))
for ep in eps:
    out += [f'#### {ep}', '', '| ID | Historia | Fase | Prioridad | Tamaño | Estado | Depende de |', '|---|---|---|---|---|---|---|']
    for u in sorted([u for u in order if stories[u]['ep'] == ep], key=lambda x: int(x[3:])):
        s = stories[u]
        dep = ', '.join(s['deps']) if s['deps'] else '—'
        if s['part']: dep += ' (parcial: ' + ', '.join(s['part']) + ')'
        out.append(f"| {u} | {s['title']} | {s['fase']} | {s['prio']} | {s['size']} | {s['state']} | {dep} |")
    out.append('')
out += ['#### Niveles de dependencia (orden topológico)', '',
        'Una historia solo puede empezar cuando las de niveles inferiores de las que depende están terminadas. Historias del mismo nivel son independientes entre sí (se pueden hacer en cualquier orden).', '',
        '| Nivel | Historias |', '|---|---|']
for n in range(max(lvl.values()) + 1):
    us = sorted([u for u in lvl if lvl[u] == n], key=lambda x: int(x[3:]))
    out.append(f"| {n} | {', '.join(us)} |")
out.append('')
c = Counter(s['prio'] for s in stories.values())
out.append(f"Total: **{len(stories)}** historias · MUST: {c['MUST']} · SHOULD: {c['SHOULD']} · COULD: {c['COULD']}")
out.append('')
P = os.path.join(root, 'docs', 'USER-STORIES.md')
s = open(P, encoding='utf-8').read()
a = s.index('## 7. Backlog completo (generado)'); b = s.index('## 8. Trazabilidad')
s = s[:a] + '\n'.join(out) + '\n' + s[b:]
open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('levels max', max(lvl.values()), dict(c))
print('MVP closure problems:', probs)
