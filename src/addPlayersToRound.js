const admin = require('firebase-admin');
const inquirer = require('inquirer').default;

const serviceAccount = require('../credentials/instaplay-dev-29e75-firebase-adminsdk-p3phf-a089fec062.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function getRound(tournamentId, roundNumber) {
    // Converte o ID do torneio em uma referência
    const tournamentRef = firestore.doc(tournamentId);

    console.log(`Procurando rodada com ID do torneio: ${tournamentId} e número da rodada: ${roundNumber}`);

    const snapshot = await firestore
        .collection('Rodadas')
        .where('tournament_id', '==', tournamentRef)  // Usando a referência
        .where('round_number', '==', roundNumber)      // Aqui, round_number deve ser um número
        .get();

    if (snapshot.empty) {
        console.log('Rodada não encontrada.');
        return null;
    }

    return snapshot.docs[0];  // Retorna o primeiro documento encontrado
}

async function getUsersNotInRound(round) {
    const playersInRound = round.data().players || [];
    const playerIdsInRound = playersInRound.map(player => player.userId); // Coleta os userId dos jogadores na rodada

    // Busca todos os usuários registrados
    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtra os usuários que não estão na rodada
    const usersNotInRound = users.filter(user => !playerIdsInRound.includes(user.id));

    return usersNotInRound;
}

async function addPlayerToRound(round, playerId, playerGenero, playerName) {
    const players = round.data().players || [];
    players.push({ userId: playerId, genero: playerGenero, display_name: playerName }); // Adiciona o jogador à rodada

    await firestore.collection('Rodadas').doc(round.id).update({ players });
    console.log(`Jogador com ID ${playerId} adicionado à rodada.`);
}

async function main() {
    const { tournamentId, roundNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tournamentId',
            message: 'Digite o ID do torneio:',
        },
        {
            type: 'input',
            name: 'roundNumber',
            message: 'Digite o número da rodada:',
        },
    ]);

    const round = await getRound(tournamentId, parseInt(roundNumber, 10));

    if (!round) {
        console.log('Nenhuma rodada encontrada com os critérios fornecidos.');
        return;
    }

    const usersNotInRound = await getUsersNotInRound(round);
    if (usersNotInRound.length === 0) {
        console.log('Todos os usuários já estão na rodada.');
        return;
    }

    // Exibe os usuários que não estão na rodada
    const { selectedUser } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedUser',
            message: 'Escolha um usuário para adicionar à rodada:',
            choices: usersNotInRound.map(user => ({
                name: `${user.display_name} (${user.genero})`, // Exibe display_name e genero
                value: user, // Armazena o objeto do usuário inteiro
            })),
        },
    ]);

    const playerToAdd = {
        display_name: selectedUser.display_name,
        genero: selectedUser.genero,
        userId: selectedUser.id, // Passa o ID do usuário
    };

    await addPlayerToRound(round, playerToAdd.userId, playerToAdd.genero, playerToAdd.display_name);
}

main().catch(console.error);
