const admin = require('firebase-admin');
const inquirer = require('inquirer').default;

const serviceAccount = require('../credentials/instaplay-dev-29e75-firebase-adminsdk-p3phf-b307b68a72.json');

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
        console.log(`Rodada não encontrada. Tournament ID: ${tournamentId}, Round Number: ${roundNumber}`);
        return null;
    }

    return snapshot.docs[0];
}

async function getUsersWithoutDuo(round) {
    const playersInRound = round.data().players || [];
    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const usersWithoutDuo = users.filter(user => {
        const isUserInRound = playersInRound.some(player =>
            player.user1_id === user.id || player.user2_id === user.id
        );
        return !isUserInRound;
    });

    return usersWithoutDuo;
}

async function createDuoInRound(round, user1, user2) {
    const players = round.data().players || [];

    const updatedPlayers = players.filter(player =>
        player.userId !== user1.id && player.userId !== user2.id
    );

    const duo = {
        user1_display_name: user1.display_name,
        user1_genero: user1.genero,
        user1_id: user1.id,
        user2_display_name: user2.display_name,
        user2_genero: user2.genero,
        user2_id: user2.id,
    };

    updatedPlayers.push(duo);

    await firestore.collection('Rodadas').doc(round.id).update({ players: updatedPlayers });
    console.log(`Dupla adicionada à rodada: ${user1.display_name} e ${user2.display_name}`);
}

async function createAllDuos(round, usersWithoutDuo) {
    let duos = [];

    for (let i = 0; i < usersWithoutDuo.length; i += 2) {
        if (i + 1 < usersWithoutDuo.length) {
            const duo = {
                user1_display_name: usersWithoutDuo[i].display_name,
                user1_genero: usersWithoutDuo[i].genero,
                user1_id: usersWithoutDuo[i].id,
                user2_display_name: usersWithoutDuo[i + 1].display_name,
                user2_genero: usersWithoutDuo[i + 1].genero,
                user2_id: usersWithoutDuo[i + 1].id,
            };
            duos.push(duo); // Adiciona a dupla ao array
            console.log(`Dupla criada: ${duo.user1_display_name} e ${duo.user2_display_name}`);
        }
    }

    await firestore.collection('Rodadas').doc(round.id).update({ players: duos });
    console.log("Todas as duplas foram criadas e adicionadas à rodada.");
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
        console.log('Não há usuários suficientes para formar uma dupla.');
        return;
    }

    const { selectedOption } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedOption',
            message: 'Escolha uma opção:',
            choices: [
                { name: 'Criar uma dupla manualmente', value: 'manual' },
                { name: 'Criar todas as duplas automaticamente', value: 'auto' },
            ],
        },
    ]);

    if (selectedOption === 'auto') {
        await createAllDuos(round, usersWithoutDuo);
    } else {
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
}

main().catch(console.error);
