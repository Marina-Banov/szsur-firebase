import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const deleteSubcollections =
  functions.firestore.document("{collection}/{id}")
      .onDelete(async (snapshot, context) => {
        const subcollections = await snapshot.ref.listCollections();
        if (subcollections.length === 0) {
          return;
        }

        const docs = [];
        for (const s of subcollections) {
          const res = await s.listDocuments();
          docs.push(...res);
        }
        console.log(`Found ${subcollections.length} subcollections` +
                    ` with ${docs.length} documents\n` +
                    "Deleting...");

        const batch = admin.firestore().batch();
        docs.map((doc) => batch.delete(doc));
        return batch.commit();
      });
