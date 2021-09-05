import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const deleteSubcollections = functions.firestore
  .document("{collection}/{id}")
  .onDelete(async (snapshot, _) => {
    const subcollections = await snapshot.ref.listCollections();
    if (subcollections.length === 0) {
      return;
    }

    const docs = [];
    for (const s of subcollections) {
      const res = await s.listDocuments();
      docs.push(...res);
    }
    console.log(
      `Found ${subcollections.length} subcollections with ${docs.length} documents\n Deleting...`
    );

    const batch = admin.firestore().batch();
    docs.map((doc) => batch.delete(doc));
    return batch.commit();
  });

export const notifySurveyPublished = functions.firestore
  .document("surveys/{id}")
  .onUpdate(async (change, _) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!before?.published && after?.published) {
      try {
        await admin.messaging().send({
          topic: change.after.id,
          notification: {
            title: "Objavljeni su rezultati ankete!",
            body: `Pogledaj najnovije rezultate ankete "${after.title}"`,
          },
          android: {
            notification: {
              sound: "default",
              defaultSound: true,
              defaultVibrateTimings: true,
              priority: "high",
              visibility: "public",
            },
          },
        });
        console.log("SEND NOTIFICATION success");
      } catch (error) {
        console.error("SEND NOTIFICATION error", error);
      }
    }
  });
