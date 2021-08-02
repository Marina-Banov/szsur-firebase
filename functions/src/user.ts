import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const newUserSignUp = functions.auth.user().onCreate((user) => {
  if (user.providerData?.length) {
    return admin.firestore().collection("users").doc(user.uid).set({
      email: user.email,
      isAdmin: false,
      favorites: [],
      solved_surveys: [],
    });
  }
});

export const userDeleted = functions.auth.user().onDelete((user) => {
  const batch = admin.firestore().batch();
  const uid = user.uid;
  const userDocRef = admin.firestore().collection("users").doc(uid);
  batch.delete(userDocRef);
  return batch.commit();
});

// TODO this should definitely NOT be a firestore trigger function.
//  Make this an http call (requires work on the Android app)
// When the user updates his favorites preference by directly
// accessing the database, his favorites field is getting updated
// fairly quickly, but this part of the request can take quite some time.
// So if the user tries to update his favorites preferences again, the
// subscribers field might not be up to date, which will make data inside
// the database not in sync.
// A single http call which updates both the user preferences and the
// target subscribers field would allow to display a progress indicator or
// disable a button on the Android app that would solve the above explained
// issue. Also, the http call payload could carry some data that would simplify
// this, such as the id of the target element and whether it's an event or
// a survey.
export const updatedFavorites = functions.firestore.document("users/{id}")
    .onUpdate(async (change, context) => {
      const userId = context.params.id;

      const before = change.before.data()?.favorites;
      const after = change.after.data()?.favorites;
      if (before.length === after.length) {
        return;
      }

      const docId = (before.length < after.length) ?
          getArraysDifference(after, before) :
          getArraysDifference(before, after);

      let collection = "events";
      let snapshot =
          await admin.firestore().collection(collection).doc(docId).get();
      if (!snapshot.exists) {
        collection = "surveys";
        snapshot =
            await admin.firestore().collection(collection).doc(docId).get();
      }

      const subscribers = [...snapshot.data()?.subscribers];
      if (before.length < after.length) {
        subscribers.push(userId);
      } else {
        subscribers.splice(subscribers.indexOf(userId), 1);
      }

      return admin.firestore()
          .collection(collection)
          .doc(docId)
          .update({ subscribers });
    });

const getArraysDifference = (bigArray: string[], smallArray: string[]) => {
  return bigArray.filter((item: string) => smallArray.indexOf(item) < 0)[0];
};
