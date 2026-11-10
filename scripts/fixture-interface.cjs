// Dados de homologação local. O catálogo e o roteiro vêm das regras reais da fase1.
const fs=require('node:fs'),path=require('node:path');
function apiLocal(dados){
  const estado=structuredClone(dados.estado),cat=dados.catalogo,q=new URLSearchParams(location.search);
  const npc=PZ.mundo.NPCS.find(n=>n.id===q.get('npc'));if(npc)PZ.mundo.SPAWN={x:npc.x-.5,y:npc.y+.5,dir:'SE'};
  if(q.has('novo'))estado.personagem=null;
  let sim=null,rotaAtual=null;
  const resposta=()=>structuredClone(estado);
  function iniciarRota(rota){sim=dados.simulacoes[rota];if(!sim)return {erro:'Rota desconhecida'};rotaAtual=rota;const inicio=Date.now()-Math.min(sim.duracao-1,Math.max(0,Number(q.get('momento'))||0))*1000;estado.expedicao={id:'qa-'+rota,rota,inicio,fim:inicio+sim.duracao*1000,log:sim.log,vidaMax:sim.final.vidaMax,capacidade:estado.estado.atributos.capacidade};return resposta();}
  if(q.get('expedicao'))iniciarRota(q.get('expedicao'));
  function fechar(recuo){
    if(!sim||!estado.expedicao)return {...resposta(),expedicao:null};
    if(!recuo&&Date.now()<estado.expedicao.fim)return {...resposta(),erro:'A expedição ainda está em andamento.'};
    const fim=sim.final;estado.expedicao=null;
    return {...resposta(),relatorio:{...fim,motivo:recuo?'recuo':fim.motivo,nomeRota:cat.rotas[rotaAtual].nome,fora:Math.ceil(sim.duracao),nivelAntes:estado.personagem.nivel,nivelDepois:estado.personagem.nivel,creditos:0,desgaste:{arma:0,protecao:0}}};
  }
  return {
    async eu(){return resposta();},async catalogo(){return structuredClone(cat);},
    async criar(p){estado.personagem={...p,nivel:1,xp:0,xpNoNivel:0,xpProximo:100,flags:{}};return resposta();},
    async interagir(npc,escolha){const abre=npc==='wolf'&&['comprar','vender','reparar','fabricar'].includes(escolha)?'loja:'+escolha:npc==='prefeito'&&escolha==='armazem'?'armazem':null;return {...resposta(),ok:true,abre};},
    async iniciar(rota){return iniciarRota(rota);},async concluir(){return fechar(false);},async recuar(){return fechar(true);},
    async equipar(){return {erro:'Prévia de arte: equipamentos só mudam na versão conectada.'};},
    async usar(){return {erro:'Prévia de arte: itens não são consumidos.'};},async loja(){return {erro:'Prévia de arte: não realiza compras, vendas ou fabricação.'};},
    async sair(){location.reload();},entrar(){}
  };
}
module.exports=async function(root){
  const codigo=fs.readFileSync(path.join(root,'worker','src','regras.js'),'utf8'),R=await import('data:text/javascript;base64,'+Buffer.from(codigo).toString('base64'));
  const xp=1500,origem='batedor',equipamento=['barra_portao','jaqueta_ronda','mochila_lona','ferramenta_recuperacao'].map((item,i)=>({id:'qa-equip-'+i,item,condicao:92,equipado:true}));
  const equipados=Object.fromEntries(equipamento.map(q=>[R.ITENS[q.item].tipo,q])),attrs=R.atributos({xp,origem,equipados,ferido:false});
  const flags={registrado:true,kit_recebido:true,contrato_visto:true,rota1_concluida:true,registro_entregue:true};
  const estado={papel:'jogador',permissoes:{gestao:false},personagem:{nome:'Teste de arte',origem,xp,...R.nivelDe(xp),aparencia:{corpo:'a',pele:'p3',cabelo:'curto',corCabelo:'c1',roupa:'jaqueta'},flags},estado:{creditos:150,itens:{sucata:12,tecido:8,pecas:3,peca_eletrica:1,suprimento:4,curativo:2,registro_rota:1},equipamento,ferido:false,feridoAte:0,atributos:attrs},expedicao:null};
  const simulacoes=Object.fromEntries(Object.keys(R.ROTAS).map(id=>[id,R.simular(id,attrs,271828,{flags})]));
  const dados={estado,catalogo:R.catalogo(),simulacoes};
  return '<script>window.PZ_DEMO=true;PZ.demoApi=()=>('+apiLocal.toString()+')('+JSON.stringify(dados).replace(/</g,'\\u003c')+');</script>';
};
