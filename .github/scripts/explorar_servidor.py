"""Lista pastas do servidor (somente leitura) para localizar ícones e imagens dos mods."""
import os, stat, sys
sys.path.insert(0, os.path.dirname(__file__))
import publicar_dados as P

P.ler_arquivo_sftp("/.cache/Lua/PrefeituraZDiscordStatus.json")  # abre a conexão
s = P._sftp

def ls(p, n=200):
    try:
        it = s.listdir_attr(p)
    except Exception as e:
        print(f"{p}: {e}"); return []
    print(f"== {p} ({len(it)})")
    for a in sorted(it, key=lambda a: a.filename)[:n]:
        print(("  d " if stat.S_ISDIR(a.st_mode) else "  - ") + a.filename + ("" if stat.S_ISDIR(a.st_mode) else f"  {a.st_size}"))
    return it

def walk(p, depth, filtro=None, maxn=400):
    out = []
    def rec(q, d):
        if len(out) > maxn: return
        try: it = s.listdir_attr(q)
        except Exception: return
        for a in it:
            full = q.rstrip("/") + "/" + a.filename
            if stat.S_ISDIR(a.st_mode):
                if d < depth: rec(full, d + 1)
            elif not filtro or filtro(full):
                out.append((full, a.st_size))
    rec(p, 0)
    for f, sz in out[:maxn]: print(f"  {f}  {sz}")

extra = [x for x in (os.environ.get("LISTAR") or "").split(";") if x.strip()]
if extra:
    for e in extra:
        caminho, _, prof = e.partition("@")
        print(f"\n### {caminho}")
        walk(caminho.strip(), int(prof or 2), None, 600)
    sys.exit(0)
ls("/")
ls("/media")
ws = "/steamapps/workshop/content/108600"
mods = ls(ws, 400)
alvo = [x.strip().lower() for x in (os.environ.get("BUSCA") or "przweapons,xslootbox,ki5,91ford,89dodge,85chevy,88chevy,70barracuda,90ford,90pierce").split(",")]
for a in mods:
    base = f"{ws}/{a.filename}/mods"
    try: nomes = s.listdir(base)
    except Exception: continue
    for m in nomes:
        if any(t in m.lower() for t in alvo):
            print(f"\n### {a.filename}/{m}")
            walk(f"{base}/{m}", 6, lambda f: f.lower().endswith((".png", ".txt", ".lua", ".info")) and "/translate/" not in f.lower(), 120)
