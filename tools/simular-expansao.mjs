import { atributos, desgaste, ITENS, ORIGEM_BONUS, reparoPorPonto, rondaAte, ROTAS, simular, simularRonda, XP_NIVEIS } from '../worker/src/regras.js';

const ensaios = 400;
const origens = Object.keys(ORIGEM_BONUS);
const slots = ['arma','protecao','mochila','ferramenta'];
const equipamento = (itens, condicao) => Object.fromEntries(itens.map((item,i) => [slots[i], { item, condicao }]));
const comumAntigo = ['cano_rebite','colete_lona','mochila_reforcada','ferramenta_recuperacao'];
const bancadaAntiga = ['lanca_vergalhao','armadura_placas','mochila_cargueira','kit_desmonte'];
const comum = ['faca_cabos','colete_lona','bolsa_reles','ferramenta_recuperacao'];
const bancadaVigia = ['faca_cabos','colete_dieletrico','bolsa_reles','sonda_reles'];
const bancadaZelador = ['faca_cabos','capa_filtro','bolsa_reles','sonda_reles'];
const bancadaKnox = ['perfurador_knox','couraca_pressao','cargueira_knox','chave_industrial'];
const raroVigia = ['malho_isolado','colete_dieletrico','bolsa_reles','sonda_reles'];
const raroZelador = ['malho_isolado','capa_filtro','mochila_silencio','sonda_reles'];
const raroKnox = ['lamina_comporta','couraca_pressao','mochila_silencio','chave_industrial'];
const media = (lista, campo) => lista.reduce((s, x) => s + campo(x), 0) / lista.length;
const pct = (lista, f) => Math.round(media(lista, r => Number(f(r))) * 100);
const vendas = itens => Object.entries(itens).reduce((n,[k,q]) => n + (ITENS[k]?.venda || 0)*q, 0);
const arred = n => Math.round(n * 10) / 10;

const provas = [
  [18,'entreposto',comumAntigo,bancadaAntiga,['machadinha',...bancadaAntiga.slice(1)]],
  [30,'canil_mastim',comumAntigo,bancadaAntiga,['chave_linha',...bancadaAntiga.slice(1)]],
  [31,'reles_patio',comumAntigo,bancadaAntiga,['gancho_estiva',...bancadaAntiga.slice(1)]],
  [40,'vigia_comando',comum,bancadaVigia,raroVigia],
  [50,'zelador_clinica',comum,bancadaZelador,raroZelador],
  [60,'matriarca_knox',comum,bancadaKnox,raroKnox],
];

const linhas = [];
for (const [nivel,rota,...kits] of provas) {
  const checagem = ROTAS[rota], bandeiraChefe = checagem.pontos.at(-1).primeiraVez?.marca;
  const flags = bandeiraChefe ? { [bandeiraChefe]: true } : {};
  for (const [i,kit] of kits.entries()) {
    const sims = Array.from({ length:ensaios }, (_,s) => {
      const a = atributos({ xp:XP_NIVEIS[nivel-1],origem:origens[s%origens.length],equipados:equipamento(kit,90) });
      const f = simular(rota,a,s,{ flags }).final;
      const gasto = desgaste(f,a);
      return { ...f, gasto };
    });
    linhas.push({
      nivel, rota, kit:['comum','bancada','chefe'][i],
      segundos:Math.round(media(sims,x=>x.duracao)), sobrevive:pct(sims,r=>r.motivo!=='derrota'),
      conclui:pct(sims,r=>r.motivo==='concluida'), vida:arred(media(sims,x=>100*x.vidaFinal/x.vidaMax)),
      arma:arred(media(sims,r=>r.gasto.arma)), protecao:arred(media(sims,r=>r.gasto.protecao)),
      xp:Math.round(media(sims,x=>x.xp)), credito:Math.round(media(sims,x=>x.creditos+vendas(x.itens))),
    });
  }
}
console.table(linhas);

const niveis = [];
for (const origem of origens) {
  const a = atributos({ xp:XP_NIVEIS.at(-1),origem,equipados:equipamento(bancadaKnox,90) });
  const provas = Array.from({length:ensaios},(_,s)=>simular('matriarca_knox',a,s,{ flags:{matriarca_vencida:1} }).final);
  niveis.push({
    origem, conclui:pct(provas,r=>r.motivo==='concluida'), vida:arred(media(provas,r=>100*r.vidaFinal/r.vidaMax)),
    desgaste:arred(media(provas,r=>desgaste(r,a).arma)), capacidade:a.capacidade,
  });
}
console.table(niveis);

const kitsPorRota = [
  ['canil_mastim',30,['chave_linha',...bancadaAntiga.slice(1)]], ['ronda_rede',40,bancadaVigia], ['ronda_neblina',50,raroZelador], ['ronda_knox',60,bancadaKnox],
];
const rondas = [];
for (const [rota,nivel,kit] of kitsPorRota) {
  const resultados = Array.from({length:ensaios},(_,s)=>{
    const eq = equipamento(kit,90);
    const r = simularRonda(rota,{ xp:XP_NIVEIS[nivel-1],origem:origens[s%origens.length],equipados:eq,flags:{mastim_vencido:1},suprimentos:20 },s,{ ciclos:10,vidaMin:0.5 });
    const f = rondaAte(r,r.duracao);
    const custo = r.kits*ITENS.suprimento.compra + Object.entries(eq).reduce((n,[k,e])=>n+Math.ceil((f.gasto[k]||0)*reparoPorPonto(e.item)),0);
    return { duracao:r.duracao, voltas:f.feitos, saldo:f.creditos+vendas(f.itens)-custo, xp:f.xp, caiu:r.parada==='derrota' };
  });
  const creditoPorHora = Math.round(3600*media(resultados,r=>r.saldo)/media(resultados,r=>r.duracao));
  rondas.push({
    rota, voltas:arred(media(resultados,r=>r.voltas)), min:arred(media(resultados,r=>r.duracao)/60), derrotas:pct(resultados,r=>r.caiu),
    xp:Math.round(media(resultados,r=>r.xp)), liquido:Math.round(media(resultados,r=>r.saldo)), creditoPorHora,
    horasTicket:arred(1250000/creditoPorHora),
  });
}
console.table(rondas);
