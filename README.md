# Apocalipse Zumbi — Multiplayer

Este projeto usa um servidor Node.js com Socket.IO. O servidor é a fonte de verdade: ele guarda saldos, inventários, lances e a identidade de cada jogador.

## Executar localmente

1. Instale Node.js 20 ou superior, incluindo o npm.
2. Na pasta do projeto, execute `npm install`.
3. Execute `npm start`.
4. Abra `http://localhost:3000` em dois navegadores ou dispositivos na mesma rede.

## Publicar no Render

1. Crie um repositório privado no GitHub e envie esta pasta para ele.
2. No Render, crie um **Web Service** usando esse repositório.
3. Escolha Node.js, informe `npm install` como Build Command e `npm start` como Start Command.
4. Após publicar, compartilhe a URL do Render. O Jogador 1 cria a sala e envia o código para o Jogador 2.

## Proteção das partidas

- Cada vaga recebe um token aleatório de 256 bits; ele fica no navegador do jogador e permite reconectar à própria vaga.
- Todo lance, desistência, retirada de item e geração é conferido no servidor. Alterar o JavaScript no navegador não permite modificar a vaga do outro jogador.
- A sala aceita somente duas vagas. O Jogador 1 é o criador; apenas ele gera os próximos itens, como ação compartilhada da mesa.
- Os dados das salas ficam em memória. Para manter partidas depois de reinícios e escalar o jogo, o próximo passo é conectar Redis/PostgreSQL e uma autenticação com contas.
