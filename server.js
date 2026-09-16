"use strict";
const crypto = require("crypto");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();
app.use(express.static(__dirname));

const zombies = [
  {name:"Corredores de Extermínio",description:"Corredores de Extermínio (28 Days Later): rápidos, agressivos e infectados pela Raiva. Evite espaços abertos.",weights:{mobility:3,combat:2,medical:1,food:1,communication:1,shelter:1}},
  {name:"Infectados de The Last of Us",description:"Infectados de The Last of Us: guiados pelo fungo Cordyceps, são perigosos em grupos e sensíveis a ruídos.",weights:{mobility:1,combat:2,medical:3,food:1,communication:2,shelter:2}},
  {name:"Enxames de Guerra Mundial Z",description:"Enxames de Guerra Mundial Z: extremamente velozes, se movem em massa e escalam obstáculos.",weights:{mobility:3,combat:1,medical:1,food:1,communication:2,shelter:3}},
  {name:"Zumbis clássicos",description:"Zumbis clássicos: lentos, persistentes e atraídos por barulho. O perigo cresce com a quantidade.",weights:{mobility:1,combat:2,medical:1,food:2,communication:1,shelter:3}},
  {name:"Infectados de REC",description:"Infectados de REC: agressivos, confinados e imprevisíveis. Corredores estreitos e pouca luz aumentam o risco.",weights:{mobility:2,combat:2,medical:2,food:1,communication:1,shelter:3}},
  {name:"Zumbis de Resident Evil",description:"Zumbis de Resident Evil: resultado de armas biológicas, resistentes e acompanhados por ameaças mutantes.",weights:{mobility:1,combat:3,medical:3,food:1,communication:2,shelter:2}},
  {name:"Caminhantes de The Walking Dead",description:"Caminhantes de The Walking Dead: lentos, numerosos e atraídos por ruído. A sobrevivência depende de recursos e abrigo.",weights:{mobility:1,combat:2,medical:1,food:3,communication:1,shelter:3}},
  {name:"Infectados de Left 4 Dead",description:"Infectados de Left 4 Dead: velozes e acompanhados por variantes especiais. Trabalhar com informação e defesa é vital.",weights:{mobility:3,combat:3,medical:2,food:1,communication:3,shelter:1}},
  {name:"Infectados de Invasão Zumbi",description:"Infectados de Invasão Zumbi (Train to Busan): muito rápidos, movem-se em hordas e são atraídos por sons.",weights:{mobility:3,combat:2,medical:1,food:1,communication:2,shelter:2}},
  {name:"Zumbis de Zumbilândia",description:"Zumbis de Zumbilândia: caóticos, imprevisíveis e atraídos por oportunidades fáceis. Regras de sobrevivência, mobilidade e defesa fazem diferença.",weights:{mobility:3,combat:3,medical:1,food:1,communication:2,shelter:1}}
];
const items = [
  {name:"Mochila de resgate",description:"Mochila de resgate com lanterna e corda.",tags:["mobility","shelter"]},
  {name:"Mochila tática",description:"Mochila tática com bolsos reforçados para transportar equipamentos.",tags:["mobility","combat"]},
  {name:"Mochila impermeável",description:"Mochila impermeável que protege suprimentos da chuva.",tags:["mobility","food"]},
  {name:"Alimentos não perecíveis",description:"Caixa de alimentos não perecíveis para três dias.",tags:["food"]},
  {name:"Latas de conserva",description:"Caixa de latas de conserva para uma semana.",tags:["food"]},
  {name:"Kit médico",description:"Kit médico parcialmente abastecido.",tags:["medical"]},
  {name:"Maleta de trauma",description:"Maleta de primeiros socorros para ferimentos graves.",tags:["medical"]},
  {name:"Rádio portátil",description:"Rádio portátil com pilhas novas.",tags:["communication"]},
  {name:"Walkie-talkies",description:"Par de walkie-talkies para comunicação em curta distância.",tags:["communication"]},
  {name:"Machado de camping",description:"Machado de camping em bom estado.",tags:["combat","shelter"]},
  {name:"Facão de sobrevivência",description:"Facão resistente para abrir caminho e defesa próxima.",tags:["combat"]},
  {name:"Pistola",description:"Pistola em bom estado, sem munição inclusa.",tags:["combat"]},
  {name:"Espingarda",description:"Espingarda de caça em bom estado, sem munição inclusa.",tags:["combat"]},
  {name:"Rifle de caça",description:"Rifle de caça com coronha reforçada, sem munição inclusa.",tags:["combat"]},
  {name:"Besta",description:"Besta silenciosa com poucas flechas reutilizáveis.",tags:["combat"]},
  {name:"Faca utilitária",description:"Faca utilitária compacta para tarefas e defesa.",tags:["combat","shelter"]},
  {name:"Explosivo improvisado",description:"Dispositivo explosivo encontrado pronto; perigoso e de uso único.",tags:["combat"]},
  {name:"Coquetéis incendiários",description:"Garrafas incendiárias encontradas prontas, úteis para afastar uma horda.",tags:["combat"]},
  {name:"Granadas de fumaça",description:"Granadas de fumaça para criar cobertura durante uma fuga.",tags:["mobility","communication"]},
  {name:"Bicicleta de trilha",description:"Bicicleta de trilha com pneus reforçados.",tags:["mobility"]},
  {name:"Motocicleta",description:"Motocicleta com pouco combustível e boa mobilidade.",tags:["mobility"]},
  {name:"Picape",description:"Picape robusta para transportar pessoas e carga.",tags:["mobility","shelter"]},
  {name:"Van",description:"Van com espaço para grupo e suprimentos.",tags:["mobility","shelter"]},
  {name:"Barco a motor",description:"Barco a motor com coletes salva-vidas.",tags:["mobility"]},
  {name:"Ambulância",description:"Ambulância com espaço protegido e alguns suprimentos médicos.",tags:["mobility","medical","shelter"]},
  {name:"Barraca impermeável",description:"Barraca impermeável para duas pessoas.",tags:["shelter"]},
  {name:"Chave de estação de metrô",description:"Chave de acesso a um abrigo em estação de metrô desativada.",tags:["shelter"]},
  {name:"Casa fortificada",description:"Escritura e chaves de uma casa com portas reforçadas.",tags:["shelter"]},
  {name:"Escola abandonada",description:"Mapa de uma escola abandonada com pátio cercado.",tags:["shelter","communication"]},
  {name:"Posto de bombeiros",description:"Chaves de um posto de bombeiros com garagem e estrutura resistente.",tags:["shelter","medical"]},
  {name:"Gerador portátil",description:"Gerador portátil com uma carga inicial de combustível.",tags:["communication","shelter"]},
  {name:"Painel solar",description:"Painel solar dobrável para manter equipamentos carregados.",tags:["communication","shelter"]},
  {name:"Caixa de ferramentas",description:"Caixa de ferramentas com chaves, alicates e parafusos.",tags:["shelter","mobility"]},
  {name:"Kit de construção",description:"Kit com martelo, pregos, cordas e lona para reforçar um abrigo.",tags:["shelter"]},
  {name:"Sacos de cimento",description:"Sacos de cimento para bloquear acessos e reforçar paredes.",tags:["shelter"]},
  {name:"Tábuas de madeira",description:"Tábuas de madeira para vedar janelas e improvisar barreiras.",tags:["shelter"]},
  {name:"Grades metálicas",description:"Grades metálicas para fechar entradas vulneráveis.",tags:["shelter","combat"]},
  {name:"Kit de reparo de armas",description:"Kit para limpar, ajustar e recuperar armas já encontradas.",tags:["combat"]},
  {name:"Caixa de munição",description:"Caixa lacrada de munição compatível com armas comuns.",tags:["combat"]},
  {name:"Mira telescópica",description:"Mira telescópica para ampliar a precisão de uma arma compatível.",tags:["combat","communication"]},
  {name:"Colete balístico",description:"Colete balístico que reduz o risco em confrontos.",tags:["combat","medical"]},
  {name:"Capacete reforçado",description:"Capacete reforçado para expedições perigosas.",tags:["combat","medical"]},
  {name:"Filtro de água",description:"Filtro portátil de água com dois refis.",tags:["medical","food"]},
  {name:"Caixa-d'água",description:"Caixa-d'água limpa com capacidade para guardar água potável.",tags:["food","shelter"]},
  {name:"Fogareiro a gás",description:"Fogareiro a gás com cartuchos para preparar alimentos.",tags:["food","shelter"]},
  {name:"Mapa detalhado da cidade",description:"Mapa com rotas de fuga, hospitais e pontes marcados.",tags:["mobility","communication"]},
  {name:"Drone de reconhecimento",description:"Drone com câmera e bateria para observar áreas antes de entrar.",tags:["communication","mobility"]},
  {name:"Lanternas recarregáveis",description:"Conjunto de lanternas recarregáveis para buscas noturnas.",tags:["communication","shelter"]},
  {name:"Kit de reparo automotivo",description:"Ferramentas e peças básicas para manter um veículo funcionando.",tags:["mobility"]},
  {name:"Galões de combustível",description:"Galões selados de combustível para veículos e geradores.",tags:["mobility","communication"]}
];

const tagNames={mobility:"mobilidade",combat:"defesa",medical:"saúde",food:"recursos",communication:"coordenação",shelter:"abrigo"};
function roomCode() { let value; do { value=crypto.randomBytes(4).toString("hex").toUpperCase().slice(0,6); } while (rooms.has(value)); return value; }
function token() { return crypto.randomBytes(32).toString("base64url"); }
function view(room) { return {roomCode:room.code,zombie:room.zombie,players:room.players.map(({balance,inventory,withdrawn})=>({balance,inventory,withdrawn})),item:room.item,currentBid:room.currentBid,bidder:room.bidder,starter:room.starter,canGenerate:!room.item&&!room.winner,message:room.message,winner:room.winner}; }
function send(room) { io.to(room.code).emit("state",view(room)); }
function session(socket,data) { const room=rooms.get(data?.roomCode),player=socket.data.players?.get(data?.roomCode); return room&&Number.isInteger(player)?{room,player}:null; }
function onlyPlayer(socket,data,callback) { const found=session(socket,data); if(!found) return socket.emit("action-error","Sua sessão não tem permissão para esta sala."); callback(found.room,found.player); }
function itemAnalysis(item,zombie) {
  const strengths=item.tags.map((tag)=>`${tagNames[tag]} (${zombie.weights[tag]||0} ponto${(zombie.weights[tag]||0)===1?"":"s"})`).join(" e ");
  const bestTag=item.tags.reduce((best,tag)=>(zombie.weights[tag]||0)>(zombie.weights[best]||0)?tag:best,item.tags[0]);
  return `${item.name} é importante por oferecer ${strengths}; contra ${zombie.name}, sua maior contribuição é ${tagNames[bestTag]}.`;
}
function combinations(inventory) {
  const tags=new Set(inventory.flatMap((item)=>item.tags));
  const pairs=[];
  if(tags.has("mobility")&&tags.has("communication")) pairs.push("mobilidade e comunicação permitem escolher rotas e coordenar fugas");
  if(tags.has("combat")&&tags.has("medical")) pairs.push("defesa e saúde aumentam a chance de sobreviver a confrontos");
  if(tags.has("shelter")&&tags.has("food")) pairs.push("abrigo e recursos sustentam uma base por mais tempo");
  if(tags.has("shelter")&&tags.has("communication")) pairs.push("abrigo e comunicação mantêm uma base protegida e informada");
  if(tags.has("mobility")&&tags.has("food")) pairs.push("mobilidade e recursos permitem fugir sem ficar sem suprimentos");
  return pairs.length?pairs.join("; "):"os itens ajudam individualmente, mas ainda não formam uma combinação estratégica completa";
}
function finish(room) {
  if(!room.players.every((player)=>player.balance===0)) return;
  const points=room.players.map((player)=>player.inventory.reduce((sum,item)=>sum+item.tags.reduce((score,tag)=>score+(room.zombie.weights[tag]||0),0),0));
  const report=room.players.map((player)=>({items:player.inventory.map((item)=>itemAnalysis(item,room.zombie)).join(" ")||"Nenhum item foi adquirido.",synergy:combinations(player.inventory)}));
  const winner=points[0]===points[1]?null:points[0]>points[1]?0:1;
  const conclusion=winner===null?`Empate: os dois marcaram ${points[0]} pontos.`:`O Jogador ${winner+1} venceu com ${points[winner]} pontos contra ${points[1-winner]}.`;
  room.winner={title:winner===null?"Empate na sobrevivência":`Jogador ${winner+1} venceu`,explanation:`Contra ${room.zombie.name}, ${conclusion} Análise do Jogador 1: ${report[0].items} Em conjunto, ${report[0].synergy}. Análise do Jogador 2: ${report[1].items} Em conjunto, ${report[1].synergy}.`};
  room.message="Os dois saldos chegaram a zero. Confira o resultado da sobrevivência.";
}
io.on("connection",(socket)=>{
  socket.data.players=new Map();
  socket.on("create-room",()=>{const room={code:roomCode(),tokens:[token()],zombie:zombies[Math.floor(Math.random()*zombies.length)],players:[{balance:20,inventory:[],withdrawn:false},{balance:20,inventory:[],withdrawn:false}],item:null,usedItemNames:[],currentBid:0,bidder:null,starter:0,message:"Sala criada. Compartilhe o código e aguarde o Jogador 2.",winner:null};rooms.set(room.code,room);socket.data.players.set(room.code,0);socket.join(room.code);socket.emit("room-joined",{roomCode:room.code,token:room.tokens[0],player:0,state:view(room)});});
  socket.on("join-room",({roomCode:code,token:oldToken})=>{const room=rooms.get(code);if(!room)return socket.emit("room-error","Sala não encontrada.");let player=room.tokens.indexOf(oldToken);if(player===-1){if(room.tokens.length>=2)return socket.emit("room-error","Esta sala já possui dois jogadores.");player=1;room.tokens[1]=token();room.message="Os dois jogadores entraram. O Jogador 1 pode gerar o primeiro item.";}socket.data.players.set(code,player);socket.join(code);socket.emit("room-joined",{roomCode:code,token:room.tokens[player],player,state:view(room)});send(room);});
  socket.on("generate-item",(data)=>onlyPlayer(socket,data,(room,player)=>{if(player!==0)return socket.emit("action-error","Somente quem criou a sala gera o próximo item.");if(room.item||room.winner)return socket.emit("action-error","Finalize o item atual antes de gerar outro.");const availableItems=items.filter((item)=>!room.usedItemNames.includes(item.name));if(!availableItems.length)return socket.emit("action-error","Todos os itens desta sala já foram usados.");room.item={...availableItems[Math.floor(Math.random()*availableItems.length)]};room.usedItemNames.push(room.item.name);room.currentBid=0;room.bidder=null;room.players.forEach((entry)=>entry.withdrawn=false);room.message=`Item gerado. Jogador ${room.starter+1} deve iniciar com um lance de R$ 1.`;send(room);}));
  socket.on("place-bid",(data)=>onlyPlayer(socket,data,(room,player)=>{const amount=Number(data.amount),other=1-player;if(!room.item||room.winner||room.players[player].withdrawn||room.players[other].withdrawn||room.bidder===player)return socket.emit("action-error","Esse lance não é permitido agora.");if(room.bidder===null&&player!==room.starter)return socket.emit("action-error",`O Jogador ${room.starter+1} deve iniciar este leilão.`);if(!Number.isInteger(amount)||amount<Math.max(1,room.currentBid+1)||amount>room.players[player].balance)return socket.emit("action-error","O lance precisa ser inteiro, maior que o atual e caber no saldo.");room.currentBid=amount;room.bidder=player;room.message=`Jogador ${player+1} deu R$ ${amount}. O outro jogador pode cobrir ou desistir.`;send(room);}));
  socket.on("withdraw",(data)=>onlyPlayer(socket,data,(room,player)=>{const other=1-player;if(!room.item||room.winner||room.bidder===player||room.players[player].withdrawn||room.players[other].withdrawn)return socket.emit("action-error","Não é possível desistir agora.");room.players[player].withdrawn=true;if(room.bidder===null){room.bidder=other;room.currentBid=1;room.message=`Jogador ${player+1} desistiu sem dar lance. Jogador ${other+1}, pegue o item por R$ 1.`;}else room.message=`Jogador ${player+1} desistiu. Jogador ${other+1}, pegue o item.`;send(room);}));
  socket.on("claim-item",(data)=>onlyPlayer(socket,data,(room,player)=>{const other=1-player;if(!room.item||room.winner||room.bidder!==player||!room.players[other].withdrawn)return socket.emit("action-error","Você ainda não pode pegar este item.");if(room.currentBid<1||room.currentBid>room.players[player].balance)return socket.emit("action-error","O valor do item é inválido para o seu saldo.");room.players[player].balance-=room.currentBid;room.players[player].inventory.push({...room.item,price:room.currentBid});room.item=null;room.currentBid=0;room.bidder=null;room.starter=1-room.starter;room.players.forEach((entry)=>entry.withdrawn=false);room.message=`Item entregue ao Jogador ${player+1}.`;finish(room);send(room);}));
});
server.listen(process.env.PORT||3000,()=>console.log("Jogo disponível em http://localhost:"+(process.env.PORT||3000)));
