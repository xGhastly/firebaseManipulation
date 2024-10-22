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
        .where('tournament_id', '==', tournamentRef)  // Usando a referência
        .where('round_number', '==', roundNumber)      // Aqui, round_number deve ser um número
        .get();

    if (snapshot.empty) {
        console.log(`Rodada não encontrada. Tournament ID: ${tournamentId}, Round Number: ${roundNumber}`);
        return null;
    }

    return snapshot.docs[0];  // Retorna o primeiro documento encontrado
}

async function getUsersWithoutDuo(round) {
    const playersInRound = round.data().players || [];

    // Busca todos os usuários registrados
    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtra os usuários que não estão na rodada e não têm duplas
    const usersWithoutDuo = users.filter(user => {
        // Verifica se o usuário não é nem user1 nem user2 de nenhuma dupla
        const isUserInRound = playersInRound.some(player =>
            player.user1_id === user.id || player.user2_id === user.id
        );
        return !isUserInRound; // Retorna apenas usuários que não estão na rodada
    });

    return usersWithoutDuo;
}

async function createDuoInRound(round, user1, user2) {
    const players = round.data().players || [];

    // Filtra os jogadores para remover os que estão sendo unidos em dupla
    const updatedPlayers = players.filter(player =>
        player.userId !== user1.id && player.userId !== user2.id
    );

    // Cria o novo objeto de dupla
    const duo = {
        user1_display_name: user1.display_name,
        user1_genero: user1.genero,
        user1_id: user1.id,
        user2_display_name: user2.display_name,
        user2_genero: user2.genero,
        user2_id: user2.id,
    };

    // Adiciona a nova dupla à lista de jogadores
    updatedPlayers.push(duo);

    // Atualiza a rodada com a nova lista de jogadores
    await firestore.collection('Rodadas').doc(round.id).update({ players: updatedPlayers });
    console.log(`Dupla adicionada à rodada: ${user1.display_name} e ${user2.display_name}`);
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

    const usersWithoutDuo = await getUsersWithoutDuo(round);
    if (usersWithoutDuo.length < 2) {
        console.log('Não há usuários disponíveis para formar uma dupla.');
        return;
    }

    // Exibe os usuários que não têm dupla
    const { selectedUser1 } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedUser1',
            message: 'Escolha o primeiro usuário:',
            choices: usersWithoutDuo.map(user => ({
                name: `${user.display_name} (${user.genero})`,
                value: user,
            })),
        },
    ]);

    const usersRemaining = usersWithoutDuo.filter(user => user.id !== selectedUser1.id);

    const { selectedUser2 } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedUser2',
            message: 'Escolha o segundo usuário:',
            choices: usersRemaining.map(user => ({
                name: `${user.display_name} (${user.genero})`,
                value: user,
            })),
        },
    ]);

    await createDuoInRound(round, selectedUser1, selectedUser2);
}

main().catch(console.error);