# Projeto de Gestão de Jogo com Firebase Firestore

Este projeto é uma aplicação Node.js que utiliza o Firebase Firestore para gerenciar dados da Database. A aplicação permite criar e gerenciar duplas, rodadas e realizar migrações de banco de dados.

## Estrutura do Projeto

- **RandomCreateDocuments.js**: Inicializa a conexão com o Firebase e fornece funcionalidade para criar documentos aleatórios.
- **migrationdb.js**: Realiza migrações de banco de dados no Firestore.
- **formduoinround.js**: Manipula a criação e registro de duplas em rodadas.
- **createfirstdocument.js**: Cria o primeiro documento em uma coleção, configurando a estrutura inicial do banco de dados.
- **addplayertoround.js**: Adiciona um jogador a uma rodada existente, atualizando as informações da rodada.

## Requisitos

- Node.js
- Firebase Admin SDK
- Inquirer
- Faker
