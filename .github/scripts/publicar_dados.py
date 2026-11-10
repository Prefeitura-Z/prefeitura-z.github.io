"""
Prefeitura Z - publica os dados do servidor no site.

Lê, pelo painel Pterodactyl (Lura Hosting), os arquivos que o servidor grava em Zomboid/Lua:
  PrefeituraZDiscordStatus.json   (online, data, hora, clima)  - mod PrefeituraGerenciamento
  PrefeituraZPlayerDeaths.log     (1 linha por morte)          - mod PrefeituraGerenciamento
  PrefeituraZSiteRankings.json    (ranking)                    - mod PrefeituraZSite
e grava dados.json (resumo público) na pasta indicada.

NÃO vão para o site: login dos jogadores, nível de acesso, coordenadas e nome de quem matou.

Variáveis de ambiente (segredos do GitHub):
  PTERO_URL     ex.: https://painel.lurahosting.com.br
  PTERO_SERVER  ex.: b63cfc04
  PTERO_KEY     chave de API do painel (de preferência de um subusuário só com leitura de arquivos)
  PTERO_LUA_DIR pasta Lua dentro do servidor (padrão: /.cache/Lua)
"""
import json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

MAX_MORTES = 40


def ler_arquivo(caminho):
    """Retorna (texto, data_modificacao_iso) ou (None, None) se não existir."""
    base = os.environ["PTERO_URL"].rstrip("/")
    srv = os.environ["PTERO_SERVER"]
    h = {"Authorization": "Bearer " + os.environ["PTERO_KEY"], "Accept": "application/json",
         "User-Agent": "PrefeituraZ-Site"}
    pasta, nome = caminho.rsplit("/", 1)
    q = urllib.parse.quote(pasta or "/")
    req = urllib.request.Request(f"{base}/api/client/servers/{srv}/files/list?directory={q}", headers=h)
    with urllib.request.urlopen(req, timeout=30) as r:
        lista = json.load(r)
    meta = next((i["attributes"] for i in lista.get("data", []) if i["attributes"]["name"] == nome), None)
    if not meta:
        return None, None
    req = urllib.request.Request(
        f"{base}/api/client/servers/{srv}/files/contents?file={urllib.parse.quote(caminho)}", headers=h)
    with urllib.request.urlopen(req, timeout=60) as r:
        bruto = r.read()
    try:
        texto = bruto.decode("utf-8")
    except UnicodeDecodeError:
        texto = bruto.decode("latin-1")  # Kahlua grava em Latin-1
    return texto, meta.get("modified_at")


def causa_simples(c):
    c = (c or "").lower()
    if "queimad" in c: return "Fogo"
    if "zumbi" in c: return "Zumbi"
    if "jogador" in c: return "Outro sobrevivente"
    if "sangramento" in c: return "Sangramento"
    if "mordida" in c: return "Mordida"
    return "Desconhecida"


def montar(status_txt, status_em, rank_txt, rank_em, mortes_txt):
    status = None
    if status_txt:
        try: status = json.loads(status_txt)
        except ValueError as e: print("status inválido:", e)

    nomes, ranking = {}, []
    if rank_txt:
        try:
            for j in json.loads(rank_txt).get("jogadores", []):
                if j.get("u"): nomes[str(j["u"]).lower()] = j.get("nome") or "Sobrevivente"
                ranking.append({k: (j.get(k) if k == "nome" else int(j.get(k) or 0))
                                for k in ("nome", "pve", "npcs", "horas", "pvp", "sequencia", "mortes")})
        except ValueError as e: print("ranking inválido:", e)

    mortes = []
    if mortes_txt:
        linhas = [l for l in mortes_txt.splitlines() if l.strip()][-MAX_MORTES:]
        for l in reversed(linhas):
            c = l.split("|")
            if len(c) < 2 or not c[0].strip().isdigit(): continue
            quando = datetime.fromtimestamp(int(c[0]) / 1000, timezone.utc).isoformat()
            horas = int(c[7]) if len(c) >= 8 and c[7].strip().isdigit() else None
            mortes.append({"quando": quando, "nome": nomes.get(c[1].lower(), "Sobrevivente"),
                           "causa": causa_simples(c[3] if len(c) >= 4 else ""), "horas": horas})

    return {"versao": 1, "atualizadoEm": datetime.now(timezone.utc).isoformat(),
            "statusEm": status_em, "rankingEm": rank_em,
            "status": status, "ranking": ranking, "mortes": mortes}


def main(saida):
    if not (os.environ.get("PTERO_URL") and os.environ.get("PTERO_SERVER") and os.environ.get("PTERO_KEY")):
        print("Segredos PTERO_URL / PTERO_SERVER / PTERO_KEY ainda não configurados. Nada a fazer.")
        with open(os.environ.get("GITHUB_OUTPUT", os.devnull), "a") as f: f.write("pular=1\n")
        return
    lua = os.environ.get("PTERO_LUA_DIR") or "/.cache/Lua"
    lua = "/" + lua.strip("/")
    st, st_em = ler_arquivo(lua + "/PrefeituraZDiscordStatus.json")
    rk, rk_em = ler_arquivo(lua + "/PrefeituraZSiteRankings.json")
    mo, _ = ler_arquivo(lua + "/PrefeituraZPlayerDeaths.log")
    if st is None and rk is None and mo is None:
        sys.exit(f"Nenhum arquivo encontrado em {lua}. Confira PTERO_LUA_DIR.")
    d = montar(st, st_em, rk, rk_em, mo)
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"ok: status={'sim' if d['status'] else 'não'} ranking={len(d['ranking'])} mortes={len(d['mortes'])}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dados.json")
