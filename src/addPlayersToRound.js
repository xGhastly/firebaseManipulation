const admin = require('firebase-admin');
const inquirer = require('inquirer').default;

const serviceAccount = require('../credentials/instaplay-dev-29e75-firebase-adminsdk-p3phf-a089fec062.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function getRound(tournamentId, roundNumber) {

    const tournamentRef = firestore.doc(tournamentId);

    console.log(`Procurando rodada com ID do torneio: ${tournamentId} e número da rodada: ${roundNumber}`);

    const snapshot = await firestore
        .collection('Rodadas')
        .where('tournament_id', '==', tournamentRef)
        .where('round_number', '==', roundNumber)
        .get();

    if (snapshot.empty) {
        console.log('Rodada não encontrada.');
        return null;
    }

    return snapshot.docs[0];
}

async function getUsersNotInRound(round) {
    const playersInRound = round.data().players || [];
    const playerIdsInRound = playersInRound.map(player => player.userId);

    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const usersNotInRound = users.filter(user => !playerIdsInRound.includes(user.id));

    return usersNotInRound;
}

async function addPlayerToRound(round, playerId, playerGenero, playerName) {
    const players = round.data().players || [];
    players.push({ userId: playerId, genero: playerGenero, display_name: playerName });

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

    const { selectedUser } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedUser',
            message: 'Escolha um usuário para adicionar à rodada:',
            choices: usersNotInRound.map(user => ({
                name: `${user.display_name} (${user.genero})`,
                value: user,
            })),
        },
    ]);

    const playerToAdd = {
        display_name: selectedUser.display_name,
        genero: selectedUser.genero,
        userId: selectedUser.id,
    };

    await addPlayerToRound(round, playerToAdd.userId, playerToAdd.genero, playerToAdd.display_name);
}

main().catch(console.error);
