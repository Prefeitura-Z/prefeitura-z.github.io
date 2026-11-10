"""Copia (somente leitura) arquivos de mods do servidor para um artefato do GitHub, para montar as imagens da loja."""
import os, stat, sys
sys.path.insert(0, os.path.dirname(__file__))
import publicar_dados as P

P.ler_arquivo_sftp("/.cache/Lua/PrefeituraZDiscordStatus.json")
s = P._sftp
saida = sys.argv[1]
EXT = tuple((os.environ.get("EXT") or ".png,.lua,.txt,.info").split(","))
MAX = 3_000_000
total = 0
for raiz in [x.strip() for x in os.environ["PASTAS"].split(";") if x.strip()]:
    def rec(q):
        global total
        for a in s.listdir_attr(q):
            full = q.rstrip("/") + "/" + a.filename
            if stat.S_ISDIR(a.st_mode):
                if "/translate" in full.lower() or "/models" in full.lower() or "/sound" in full.lower(): continue
                rec(full)
            elif full.lower().endswith(EXT) and a.st_size <= MAX:
                dst = os.path.join(saida, full.lstrip("/"))
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                try:
                    with s.open(full, "rb") as f, open(dst, "wb") as o: o.write(f.read())
                    total += a.st_size
                except Exception as e:
                    print("falhou", full, e)
    rec(raiz)
print("copiado", total, "bytes")
