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
            if (field === 'created_time') {
                document[field] = faker.date.past();
            } else if (field === 'display_name') {
                document[field] = faker.person.fullName();
            } else if (field === 'email') {
                document[field] = faker.internet.email();
            } else if (field === 'uid') {
                document[field] = '';
            } else if (field === 'uniq_number') {
                document[field] = faker.number.int({ min: 100000, max: 999999 });
            }
        } else {
            // Para outras coleções
            if (field.includes('name')) {
                document[field] = faker.person.fullName();
            } else if (field.includes('email')) {
                document[field] = faker.internet.email();
            } else if (field.includes('phone')) {
                document[field] = faker.phone.number();
            } else if (field.includes('address')) {
                document[field] = faker.address.streetAddress();
            } else if (field.includes('created')) {
                document[field] = faker.date.past();
            } else if (field.includes('number')) {
                document[field] = faker.number.int({ min: 100000, max: 999999 });
            } else {
                document[field] = faker.lorem.word();
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
