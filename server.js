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
  { name:"Corredores de Extermínio", description:"Corredores de Extermínio (28 Days Later): rápidos, agressivos e infectados pela Raiva. Evite espaços abertos.", weights:{mobility:3,combat:2,medical:1,food:1,communication:1,shelter:1} },
  { name:"Infectados de The Last of Us", description:"Infectados de The Last of Us: guiados pelo fungo Cordyceps, são perigosos em grupos e sensíveis a ruídos.", weights:{mobility:1,combat:2,medical:3,food:1,communication:2,shelter:2} },
  { name:"Enxames de Guerra Mundial Z", description:"Enxames de Guerra Mundial Z: extremamente velozes, se movem em massa e escalam obstáculos.", weights:{mobility:3,combat:1,medical:1,food:1,communication:2,shelter:3} },
  { name:"Zumbis clássicos", description:"Zumbis clássicos: lentos, persistentes e atraídos por barulho. O perigo cresce com a quantidade.", weights:{mobility:1,combat:2,medical:1,food:2,communication:1,shelter:3} }
];
const items = [
  {name:"Mochila de resgate",description:"Mochila de resgate com lanterna e corda.",tags:["mobility","shelter"]},{name:"Alimentos não perecíveis",description:"Caixa de alimentos não perecíveis para três dias.",tags:["food"]},{name:"Kit médico",description:"Kit médico parcialmente abastecido.",tags:["medical"]},{name:"Rádio portátil",description:"Rádio portátil com pilhas novas.",tags:["communication"]},{name:"Machado de camping",description:"Machado de camping em bom estado.",tags:["combat","shelter"]},{name:"Bicicleta de trilha",description:"Bicicleta de trilha com pneus reforçados.",tags:["mobility"]},{name:"Barraca impermeável",description:"Barraca impermeável para duas pessoas.",tags:["shelter"]},{name:"Filtro de água",description:"Filtro portátil de água com dois refis.",tags:["medical","food"]}
];
const tagNames = {mobility:"mobilidade",combat:"defesa",medical:"saúde",food:"recursos",communication:"coordenação",shelter:"abrigo"};
function roomCode() { let value; do { value=crypto.randomBytes(4).toString("hex").toUpperCase().slice(0,6); } while (rooms.has(value)); return value; }
function token() { return crypto.randomBytes(32).toString("base64url"); }
function view(room) { return { roomCode:room.code,zombie:room.zombie,players:room.players.map(({balance,inventory,withdrawn})=>({balance,inventory,withdrawn})),item:room.item,currentBid:room.currentBid,bidder:room.bidder,canGenerate:!room.item&&!room.winner,message:room.message,winner:room.winner }; }
function send(room) { io.to(room.code).emit("state",view(room)); }
function session(socket,data) { const room=rooms.get(data?.roomCode),player=socket.data.players?.get(data?.roomCode); return room&&Number.isInteger(player)?{room,player}:null; }
function onlyPlayer(socket,data,callback) { const found=session(socket,data); if(!found) return socket.emit("action-error","Sua sessão não tem permissão para esta sala."); callback(found.room,found.player); }
function finish(room) {
  if (!room.players.every((player)=>player.balance===0)) return;
  const points=room.players.map((player)=>player.inventory.reduce((sum,item)=>sum+item.tags.reduce((score,tag)=>score+(room.zombie.weights[tag]||0),0),0));
  const detail=room.players.map((player)=>player.inventory.map((item)=>item.name+" ("+item.tags.map((tag)=>tagNames[tag]).join(" e ")+")").join(", ")||"nenhum item");
  const winner=points[0]===points[1]?null:points[0]>points[1]?0:1;
  room.winner={title:winner===null?"Empate na sobrevivência":`Jogador ${winner+1} venceu`,explanation:winner===null?`Os dois jogadores terminaram com ${points[0]} pontos contra ${room.zombie.name}. Seus recursos ficaram equivalentes: Jogador 1: ${detail[0]}. Jogador 2: ${detail[1]}.`:`Contra ${room.zombie.name}, o Jogador ${winner+1} marcou ${points[winner]} pontos, contra ${points[1-winner]} do outro jogador. A avaliação considera os pontos fortes dos zumbis e a utilidade dos itens: Jogador 1: ${detail[0]}. Jogador 2: ${detail[1]}.`};
  room.message="Os dois saldos chegaram a zero. Confira o resultado da sobrevivência.";
}

io.on("connection",(socket)=>{
  socket.data.players=new Map();
  socket.on("create-room",()=>{
    const room={code:roomCode(),tokens:[token()],zombie:zombies[Math.floor(Math.random()*zombies.length)],players:[{balance:20,inventory:[],withdrawn:false},{balance:20,inventory:[],withdrawn:false}],item:null,currentBid:0,bidder:null,message:"Sala criada. Compartilhe o código e aguarde o Jogador 2.",winner:null};
    rooms.set(room.code,room); socket.data.players.set(room.code,0); socket.join(room.code);
    socket.emit("room-joined",{roomCode:room.code,token:room.tokens[0],player:0,state:view(room)});
  });
  socket.on("join-room",({roomCode:code,token:oldToken})=>{
    const room=rooms.get(code); if(!room) return socket.emit("room-error","Sala não encontrada.");
    let player=room.tokens.indexOf(oldToken);
    if(player===-1) { if(room.tokens.length>=2) return socket.emit("room-error","Esta sala já possui dois jogadores."); player=1; room.tokens[1]=token(); room.message="Os dois jogadores entraram. O Jogador 1 pode gerar o primeiro item."; }
    socket.data.players.set(code,player); socket.join(code); socket.emit("room-joined",{roomCode:code,token:room.tokens[player],player,state:view(room)}); send(room);
  });
  socket.on("generate-item",(data)=>onlyPlayer(socket,data,(room,player)=>{
    if(player!==0) return socket.emit("action-error","Somente quem criou a sala gera o próximo item.");
    if(room.item||room.winner) return socket.emit("action-error","Finalize o item atual antes de gerar outro.");
    room.item={...items[Math.floor(Math.random()*items.length)]}; room.currentBid=0; room.bidder=null; room.players.forEach((entry)=>entry.withdrawn=false); room.message="Item gerado. O Jogador 1 deve iniciar com um lance de R$ 1."; send(room);
  }));
  socket.on("place-bid",(data)=>onlyPlayer(socket,data,(room,player)=>{
    const amount=Number(data.amount),other=1-player;
    if(!room.item||room.winner||room.players[player].withdrawn||room.players[other].withdrawn||room.bidder===player) return socket.emit("action-error","Esse lance não é permitido agora.");
    if(!Number.isInteger(amount)||amount<Math.max(1,room.currentBid+1)||amount>room.players[player].balance) return socket.emit("action-error","O lance precisa ser inteiro, maior que o atual e caber no saldo.");
    room.currentBid=amount; room.bidder=player; room.message=`Jogador ${player+1} deu R$ ${amount}. O outro jogador pode cobrir ou desistir.`; send(room);
  }));
  socket.on("withdraw",(data)=>onlyPlayer(socket,data,(room,player)=>{
    const other=1-player;
    if(!room.item||room.winner||room.bidder===player||room.players[player].withdrawn||room.players[other].withdrawn) return socket.emit("action-error","Não é possível desistir agora.");
    room.players[player].withdrawn=true;
    if(room.bidder===null) { room.bidder=other; room.currentBid=1; room.message=`Jogador ${player+1} desistiu sem dar lance. Jogador ${other+1}, pegue o item por R$ 1.`; }
    else room.message=`Jogador ${player+1} desistiu. Jogador ${other+1}, pegue o item.`;
    send(room);
  }));
  socket.on("claim-item",(data)=>onlyPlayer(socket,data,(room,player)=>{
    const other=1-player;
    if(!room.item||room.winner||room.bidder!==player||!room.players[other].withdrawn) return socket.emit("action-error","Você ainda não pode pegar este item.");
    room.players[player].balance-=room.currentBid; room.players[player].inventory.push({...room.item,price:room.currentBid}); room.item=null; room.currentBid=0; room.bidder=null; room.players.forEach((entry)=>entry.withdrawn=false); room.message=`Item entregue ao Jogador ${player+1}.`; finish(room); send(room);
  }));
});
server.listen(process.env.PORT||3000,()=>console.log("Jogo disponível em http://localhost:"+(process.env.PORT||3000)));
