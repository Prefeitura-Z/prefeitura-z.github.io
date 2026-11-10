"""
Prefeitura Z - publica os dados do servidor no site.

Lê, pelo painel Pterodactyl (Lura Hosting), os arquivos que o servidor grava em Zomboid/Lua:
  PrefeituraZDiscordStatus.json   (online, data, hora, clima)  - mod PrefeituraGerenciamento
  PrefeituraZPlayerDeaths.log     (1 linha por morte)          - mod PrefeituraGerenciamento
  PrefeituraZSiteRankings.json    (ranking)                    - mod PrefeituraGerenciamento
  PrefeituraZShopListings.json    (vitrine da loja)            - mod PrefeituraZComputer
e grava dados.json (resumo público) na pasta indicada.

NÃO vão para o site: login dos jogadores, nível de acesso, coordenadas e nome de quem matou.

Variáveis de ambiente (segredos do GitHub). Duas formas de acesso:
  SFTP (usada pela Lura, porque a API do painel fica atrás do Cloudflare):
    PTERO_SFTP_HOST  ex.: node.exemplo.com.br  (aceita sftp://host:porta)
    PTERO_SFTP_PORT  padrão 2022
    PTERO_SFTP_USER  ex.: usuario.b63cfc04
    PTERO_SFTP_PASS  senha do subusuário (só leitura de arquivos + SFTP)
  ou API do painel:
    PTERO_URL, PTERO_SERVER, PTERO_KEY
  PTERO_LUA_DIR  pasta Lua dentro do servidor (padrão: /.cache/Lua)
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone

MAX_MORTES = 40


def _decodificar(bruto):
    try:
        return bruto.decode("utf-8")
    except UnicodeDecodeError:
        return bruto.decode("latin-1")  # Kahlua grava em Latin-1


_sftp = None


def ler_arquivo_sftp(caminho):
    global _sftp
    if _sftp is None:
        import paramiko
        host = os.environ["PTERO_SFTP_HOST"].strip()
        porta = int(os.environ.get("PTERO_SFTP_PORT") or 2022)
        if host.startswith("sftp://"): host = host[7:]
        host = host.rstrip("/")
        if ":" in host: host, p = host.rsplit(":", 1); porta = int(p)
        t = paramiko.Transport((host, porta))
        t.connect(username=os.environ["PTERO_SFTP_USER"].strip(), password=os.environ["PTERO_SFTP_PASS"])
        _sftp = paramiko.SFTPClient.from_transport(t)
    try:
        st = _sftp.stat(caminho)
    except FileNotFoundError:
        return None, None
    with _sftp.open(caminho, "rb") as f:
        bruto = f.read()
    return _decodificar(bruto), datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat()


def ler_arquivo(caminho):
    """Retorna (texto, data_modificacao_iso) ou (None, None) se não existir."""
    if os.environ.get("PTERO_SFTP_HOST"):
        return ler_arquivo_sftp(caminho)
    base = os.environ["PTERO_URL"].rstrip("/")
    srv = os.environ["PTERO_SERVER"]
    h = {"Authorization": "Bearer " + os.environ["PTERO_KEY"], "Accept": "application/json",
         "User-Agent": "PrefeituraZ-Site"}
    pasta, nome = caminho.rsplit("/", 1)
    q = urllib.parse.quote(pasta or "/")
    req = urllib.request.Request(f"{base}/api/client/servers/{srv}/files/list?directory={q}", headers=h)
    with _abrir(req, 30) as r:
        lista = json.load(r)
    meta = next((i["attributes"] for i in lista.get("data", []) if i["attributes"]["name"] == nome), None)
    if not meta:
        return None, None
    req = urllib.request.Request(
        f"{base}/api/client/servers/{srv}/files/contents?file={urllib.parse.quote(caminho)}", headers=h)
    with _abrir(req, 60) as r:
        bruto = r.read()
    return _decodificar(bruto), meta.get("modified_at")


def causa_simples(c):
    c = (c or "").lower()
    if "queimad" in c: return "Fogo"
    if "zumbi" in c: return "Zumbi"
    if "jogador" in c: return "Outro sobrevivente"
    if "sangramento" in c: return "Sangramento"
    if "mordida" in c: return "Mordida"
    return "Desconhecida"


def montar(status_txt, status_em, rank_txt, rank_em, mortes_txt, loja_txt=None, loja_em=None):
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

    loja = None
    if loja_txt:
        try:
            l = json.loads(loja_txt)
            # Converte horários unix (segundos) em ISO para o site.
            iso = lambda t: datetime.fromtimestamp(t, timezone.utc).isoformat() if t else None
            for aba in l.get("abas", []):
                for it in aba.get("itens", []):
                    if "rotacaoAte" in it: it["rotacaoAte"] = iso(it["rotacaoAte"])
            loja = {"moeda": l.get("moeda") or "PRZcoins", "abas": l.get("abas", []), "em": loja_em}
        except ValueError as e: print("loja inválida:", e)

    return {"versao": 1, "loja": loja, "atualizadoEm": datetime.now(timezone.utc).isoformat(),
            "statusEm": status_em, "rankingEm": rank_em,
            "status": status, "ranking": ranking, "mortes": mortes}


def _abrir(req, timeout):
    try:
        return urllib.request.urlopen(req, timeout=timeout)
    except urllib.error.HTTPError as e:
        corpo = e.read()[:600].decode("utf-8", "replace")
        srv = e.headers.get("Server", "?")
        sys.exit(f"Painel respondeu HTTP {e.code} em {req.full_url.split('?')[0]} (server={srv}): {corpo}")


def main(saida):
    tem_sftp = os.environ.get("PTERO_SFTP_HOST") and os.environ.get("PTERO_SFTP_USER") and os.environ.get("PTERO_SFTP_PASS")
    tem_api = os.environ.get("PTERO_URL") and os.environ.get("PTERO_SERVER") and os.environ.get("PTERO_KEY")
    if not (tem_sftp or tem_api):
        print("Segredos de acesso ao servidor ainda não configurados. Nada a fazer.")
        with open(os.environ.get("GITHUB_OUTPUT", os.devnull), "a") as f: f.write("pular=1\n")
        return
    lua = os.environ.get("PTERO_LUA_DIR") or "/.cache/Lua"
    lua = "/" + lua.strip("/")
    # No painel a pasta aparece como /home/container/...; na API ela é relativa a /home/container.
    if lua.startswith("/home/container"): lua = lua[len("/home/container"):] or "/"
    st, st_em = ler_arquivo(lua + "/PrefeituraZDiscordStatus.json")
    rk, rk_em = ler_arquivo(lua + "/PrefeituraZSiteRankings.json")
    mo, _ = ler_arquivo(lua + "/PrefeituraZPlayerDeaths.log")
    lj, lj_em = ler_arquivo(lua + "/PrefeituraZShopListings.json")
    if st is None and rk is None and mo is None and lj is None:
        sys.exit(f"Nenhum arquivo encontrado em {lua}. Confira PTERO_LUA_DIR.")
    d = montar(st, st_em, rk, rk_em, mo, lj, lj_em)
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"ok: status={'sim' if d['status'] else 'não'} ranking={len(d['ranking'])} mortes={len(d['mortes'])} loja={'sim' if d['loja'] else 'não'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dados.json")
