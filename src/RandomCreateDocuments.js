const admin = require('firebase-admin');
const inquirer = require('inquirer').default;
const { faker } = require('@faker-js/faker');

const serviceAccount = require('../credentials/instaplay-dev-29e75-firebase-adminsdk-p3phf-a089fec062.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function listCollections() {
    const collections = await firestore.listCollections();
    if (!collections || collections.length === 0) {
        console.error('Nenhuma coleção foi encontrada no banco de dados.');
        return [];
    }
    return collections.map(collection => collection.id);
}

async function getCollectionSchema(collectionName) {
    if (!collectionName || collectionName.trim() === '') {
        console.error('O nome da coleção é inválido ou está vazio.');
        return [];
    }

    const snapshot = await firestore.collection(collectionName).limit(1).get();
    if (snapshot.empty) {
        console.log(`A coleção "${collectionName}" está vazia, não há campos para exibir.`);
        return [];
    }

    const document = snapshot.docs[0].data();
    return Object.keys(document);
}


async function createRandomDocument(schema, collectionName) {
    const document = {};

    schema.forEach(field => {
        if (collectionName === 'users') {
            if (field === 'Nascimento') {
                const birthDate = faker.date.birthdate({ min: 18, max: 35, mode: 'age' });
                document[field] = birthDate.toLocaleDateString('pt-BR')
            } else if (field === 'Nome') {
                document[field] = faker.person.firstName();
            } else if (field === 'Sobrenome') {
                document[field] = faker.person.lastName();
            } else if (field === 'created_time') {
                document[field] = faker.date.past()
            } else if (field === 'display_name') {
                document[field] = faker.person.firstName(); // Preenchido conforme solicitado
            } else if (field === 'email') {
                document[field] = faker.internet.email(); // Preenchido conforme solicitado
            } else if (field === 'genero') {
                document[field] = "Masculino"; // Preenchido conforme solicitado
            } else if (field === 'phone') {
                document[field] = faker.phone.number('(##) #####-####'); // Preenchido conforme solicitado
            } else if (field === 'uid') {
                document[field] = ""; // Preenchido conforme solicitado
            } else if (field === 'uniq_number') {
                document[field] = faker.number.int({ min: 100000, max: 999999 }); // Usando Faker para um número único
            }
        } else if (collectionName === 'Arenas') {
            if (field === 'adress') {
                document[field] = faker.location.streetAddress();
            } else if (field === 'logo') {
                document[field] = 'https://engenhariadocorpo.com.br/wp-content/uploads/2022/10/Imagens-Blog-2-1.png';
            } else if (field === 'name') {
                document[field] = faker.company.name();
            } else if (field === 'videos') {
                document[field] = [""];
            } else if (field === 'id') {
                document[field] = '';
            } else if (field === 'esporte') {
                document[field] = 'BeachTennis';
            } else if (field === 'replay_sis') {
                document[field] = true;
            } else if (field === 'competitivo_sis') {
                document[field] = true;
            } else if (field === 'admin_user_id') {
                document[field] = '';
            } else if (field === 'admin_comp_list') {
                document[field] = [""];
            } else if (field === 'ativo') {
                document[field] = true;
            } else if (field === 'outrosesportes') {
                document[field] = [""]
            }
        }

    });

    return document;
}

async function main() {
    try {
        const collections = await listCollections();

        if (collections.length === 0) {
            console.error('Nenhuma coleção disponível para seleção.');
            return;
        }

        const { selectedCollection } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedCollection',
                message: 'Escolha uma coleção para criar documentos:',
                choices: collections,
            },
        ]);

        if (!selectedCollection || selectedCollection.trim() === '') {
            console.error('O nome da coleção selecionada é inválido ou está vazio.');
            return;
        }
        const schema = await getCollectionSchema(selectedCollection);

        if (schema.length === 0) {
            console.log('Nenhum esquema disponível para essa coleção.');
            return;
        }

        console.log(`Esquema da coleção "${selectedCollection}":`);
        console.log(schema);

        const { numberOfDocs } = await inquirer.prompt([
            {
                type: 'input',
                name: 'numberOfDocs',
                message: 'Quantos documentos aleatórios você quer criar?',
                validate: input => {
                    const parsed = parseInt(input, 10);
                    if (isNaN(parsed) || parsed <= 0) {
                        return 'Digite um número válido.';
                    }
                    return true;
                },
            },
        ]);

        for (let i = 0; i < parseInt(numberOfDocs); i++) {
            const randomDocument = await createRandomDocument(schema, selectedCollection);
            const documentId = firestore.collection(selectedCollection).doc().id;
            randomDocument.uid = documentId;

            await firestore.collection(selectedCollection).doc(documentId).set(randomDocument);
            console.log(`Documento ${i + 1} criado na coleção "${selectedCollection}".`);
        }

        console.log(`${numberOfDocs} documentos criados com sucesso.`);
    } catch (error) {
        console.error('Erro durante o processo:', error.message);
    }
}

main();
