const admin = require('firebase-admin');
const inquirer = require('inquirer').default;

const serviceAccount = require('../credentials/instaplay-dev-29e75-firebase-adminsdk-p3phf-b307b68a72.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function listCollections() {
    const collections = await firestore.listCollections();
    return collections.map(collection => collection.id);
}

async function createDocument(collectionName, fields) {
    const document = {};
    for (const field of fields) {
        const { type } = await inquirer.prompt([{
            type: 'list',
            name: 'type',
            message: `Selecione o tipo para o campo "${field}":`,
            choices: ['string', 'number', 'boolean', 'image path', 'list <video path>', 'list <string>'],
        }]);

        let value;
        if (type === 'list <video path>') {
            const { videoPaths } = await inquirer.prompt([{
                type: 'input',
                name: 'videoPaths',
                message: `Digite os caminhos dos vídeos, separados por vírgula:`,

            }]);
            value = videoPaths.split(',').map(val => val.trim());
        } else if (type === 'list <string>') {
            const { listValues } = await inquirer.prompt([{
                type: 'input',
                name: 'listValues',
                message: `Digite os valores para a lista, separados por vírgula:`,
            }]);
            value = listValues.split(',').map(val => val.trim());
        } else if (type === 'image path') {
            const { imagePath } = await inquirer.prompt([{
                type: 'input',
                name: 'imagePath',
                message: `Digite o caminho da imagem para o campo "${field}":`,
            }]);
            value = imagePath;
        } else {
            const { fieldValue } = await inquirer.prompt([{
                type: 'input',
                name: 'fieldValue',
                message: `Digite o valor para o campo "${field}":`,
            }]);

            value = type === 'number' ? parseFloat(fieldValue) : fieldValue;

            if (type === 'boolean') {
                value = fieldValue.toLowerCase() === 'true';
            }
        }

        document[field] = value;
    }

    const documentId = firestore.collection(collectionName).doc().id;
    document.uid = documentId; // Atribui o ID gerado ao campo `uid`.

    await firestore.collection(collectionName).doc(documentId).set(document);
    console.log(`Documento criado na coleção "${collectionName}".`);
}

async function main() {
    try {
        const collections = await listCollections();

        const { newCollectionName } = await inquirer.prompt([{
            type: 'input',
            name: 'newCollectionName',
            message: 'Digite o nome da nova coleção (ou escolha uma existente):',
            default: collections.length > 0 ? collections[0] : '',
        }]);

        const { fields } = await inquirer.prompt([{
            type: 'input',
            name: 'fields',
            message: 'Digite os nomes dos campos para o documento, separados por vírgula:',
            validate: input => input.split(',').length > 0 ? true : 'Você deve fornecer pelo menos um campo.',
        }]);

        const fieldsArray = fields.split(',').map(field => field.trim());

        await createDocument(newCollectionName, fieldsArray);
    } catch (error) {
        console.error('Erro durante o processo:', error.message);
    }
}

main();
