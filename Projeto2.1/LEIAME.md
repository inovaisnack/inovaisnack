# Cantina - sistema de pedidos

## Como rodar

1. Instale o Node.js e o MySQL.
2. No MySQL, execute o arquivo `banco.sql` (cria o banco, as tabelas e alguns produtos).
3. Abra `server.js` e troque `SUA_SENHA` pela senha do seu MySQL.
4. No terminal, dentro da pasta do projeto:
   npm install
   npm start
5. Abra no navegador:
   - Pedidos: http://localhost:3000
   - Cozinha: http://localhost:3000/cozinha.html

## Usando em outros computadores da rede

Descubra o IP do computador que roda o servidor (ex.: 192.168.0.10) e acesse
http://192.168.0.10:3000 nos outros aparelhos.

## Estrutura

- banco.sql -> tabelas do MySQL
- server.js -> servidor Node/Express e rotas da API
- public/index.html -> tela de quem faz o pedido
- public/cozinha.html -> tela de quem prepara
- public/style.css -> estilos das duas telas
