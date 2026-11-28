import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ler = arquivo => readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, '');
const texturas = trecho => Array.from(trecho.matchAll(/"([^"]+)"/g), m => m[1]);
const retirarComentarios = texto => texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');

function blocos(texto, tipo) {
  const padrao = new RegExp('(?:^|[\\n}])\\s*' + tipo + '(?:[ \\t]+([\\w.]+))?\\s*\\{', 'g');
  const encontrados = [];
  for (const m of texto.matchAll(padrao)) {
    let i = m.index + m[0].length;
    let profundidade = 1;
    const inicio = i;
    while (profundidade && i < texto.length) {
      if (texto[i] === '{') profundidade++;
      if (texto[i] === '}') profundidade--;
      i++;
    }
    if (profundidade) throw new Error('Bloco sem fechamento: ' + m[0]);
    encontrados.push([m[1], texto.slice(inicio, i - 1)]);
  }
  return encontrados;
}

function arvore(diretorio, extensao) {
  if (!existsSync(diretorio)) return [];
  return readdirSync(diretorio, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith(extensao))
    .map(e => join(e.parentPath, e.name));
}

function camadas(mod, build) {
  const versoes = readdirSync(mod, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^42(?:\.\d+)?$/.test(e.name) && Number(e.name.split('.')[1] || 0) <= build)
    .sort((a, b) => Number(b.name.split('.')[1] || 0) - Number(a.name.split('.')[1] || 0));
  if (versoes.length) return [join(mod, 'common', 'media'), join(mod, versoes[0].name, 'media')];
  return [join(mod, 'common', 'media'), join(mod, 'media')];
}

function recursos(camadas, base, extensao) {
  const mapa = new Map();
  for (const camada of camadas) {
    const raiz = join(camada, base);
    for (const arquivo of arvore(raiz, extensao)) {
      mapa.set(arquivo.slice(raiz.length + 1).replaceAll('\\', '/').toLowerCase(), arquivo);
    }
  }
  return mapa;
}

function nomePintura(stem) {
  const nome = stem.replace(/^.*?_Shell_/i, '').replace(/^PRZ_BigChief_[^_]+_/i, 'Big Chief ')
    .replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return nome[0].toUpperCase() + nome.slice(1);
}

const [modsDir, buildTexto, planoPath, destino, modo] = process.argv.slice(2);
if (!modsDir || !/^42\.\d+$/.test(buildTexto) || !planoPath || !destino) {
  throw new Error('Uso: node tools/importar-skins-veiculos.mjs PASTA_MODS 42.22 plano.json PASTA_DESTINO [--fontes]');
}
const build = Number(buildTexto.split('.')[1]);
const plano = JSON.parse(ler(planoPath));
const skinsMedia = camadas(join(modsDir, 'PrefeituraZVehicleSkins'), build);
const lua = [...recursos(skinsMedia, 'lua', '.lua').values()].find(f => basename(f) === 'PrefeituraZVehicleSkins.lua');
if (!lua) throw new Error('PrefeituraZVehicleSkins.lua não encontrado.');

const registros = new Map();
for (const m of ler(lua).matchAll(/^register\(\s*\{([^{}]*)\}\s*,\s*\{([^{}]*)\}\s*\)/gm)) {
  for (const id of texturas(m[1])) registros.set(id, [...(registros.get(id) || []), ...texturas(m[2])]);
}
if (!registros.size) throw new Error('Nenhuma pintura encontrada no registro do mod.');
const extras = recursos(skinsMedia, 'textures', '.png');
const fontes = [];
for (const [mod, ids] of Object.entries(plano)) {
  const media = camadas(join(modsDir, mod), build);
  const modelos = new Map();
  for (const script of recursos(media, 'scripts', '.txt').values()) {
    const codigo = retirarComentarios(ler(script));
    for (const [modulo, bloco] of blocos(codigo, 'module')) {
      for (const [nome, carro] of blocos(bloco, 'vehicle')) {
        const id = modulo + '.' + nome;
        if (!ids.includes(id)) continue;
        if (modelos.has(id)) throw new Error('Mais de uma definição para ' + id);
        modelos.set(id, blocos(carro, 'skin').map(([, skin]) => {
          const m = skin.match(/\btexture\s*=\s*([^,\r\n}]+)/);
          if (!m) throw new Error(id + ': definição de pintura sem textura.');
          return m[1].trim().replace(/^"|"$/g, '').replace(/(?:\.png)?$/i, '.png');
        }));
      }
    }
  }
  const originais = recursos(media, 'textures', '.png');
  for (const id of ids) {
    if (!modelos.has(id)) throw new Error(id + ': definição do veículo ausente no mod ' + mod);
    const definicoes = [...new Set([...modelos.get(id), ...(registros.get(id) || [])])];
    if (!definicoes.length) throw new Error(id + ': nenhuma pintura declarada.');
    const pasta = join(destino, id);
    mkdirSync(pasta, { recursive: true });
    const skins = definicoes.map((definicao, index) => {
      const chave = definicao.toLowerCase();
      const arquivo = extras.get(chave) || originais.get(chave);
      if (!arquivo) throw new Error(id + ': textura ausente ' + definicao);
      const textura = basename(definicao, '.png');
      const codigo = 'P' + String(index + 1).padStart(2, '0');
      const imagem = codigo + (modo === '--fontes' ? '.jpg' : '.png');
      if (modo === '--fontes') fontes.push({ id, arquivo: resolve(arquivo), destino: resolve(pasta, imagem) });
      else copyFileSync(arquivo, join(pasta, imagem));
      return { nome: nomePintura(textura), codigo, textura, imagem, tipoImagem: modo === '--fontes' ? 'render' : 'textura' };
    });
    writeFileSync(join(pasta, 'catalogo.json'), JSON.stringify({ id, skins }, null, 2) + '\n');
    console.log(id + ': ' + skins.length + ' pinturas, ' + (registros.get(id)?.length || 0) + ' do Prefeitura Vehicle Skins');
  }
}
if (modo === '--fontes') writeFileSync(join(destino, 'fontes-render.json'), JSON.stringify(fontes));
