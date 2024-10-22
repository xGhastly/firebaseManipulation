const admin = require('firebase-admin');


const sourceServiceAccount = require('../credentials/source-credentials.json');
const sourceApp = admin.initializeApp({
    credential: admin.credential.cert(sourceServiceAccount),
}, 'sourceApp');

const sourceFirestore = sourceApp.firestore();


const destinationServiceAccount = require('../credentials/destination-credentials.json');
const destinationApp = admin.initializeApp({
    credential: admin.credential.cert(destinationServiceAccount),
}, 'destinationApp');

const destinationFirestore = destinationApp.firestore();


async function migrateCollections() {
    try {
        const collections = await sourceFirestore.listCollections();

        for (const collection of collections) {
            console.log(`Migrating collection: ${collection.id}`);
            const documents = await collection.get();


            const destinationCollection = destinationFirestore.collection(collection.id);


            const batch = destinationFirestore.batch();
            documents.forEach(doc => {
                const data = doc.data();
                const docRef = destinationCollection.doc(doc.id);
                batch.set(docRef, data);
            });

            await batch.commit();
            console.log(`Migrated ${documents.size} documents from ${collection.id}`);
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {

        await sourceApp.delete();
        await destinationApp.delete();
    }
}


migrateCollections();