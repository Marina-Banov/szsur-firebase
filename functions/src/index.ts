import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as user from "./user";
import * as firestore from "./firestore";
import * as crud from "./crud";

admin.initializeApp();

export const newUserSignUp = user.newUserSignUp;
export const userDeleted = user.userDeleted;
export const deleteSubcollections = firestore.deleteSubcollections;
export const notifySurveyPublished = firestore.notifySurveyPublished;
export const enums = functions.https.onRequest(crud.generics("enums"));
export const events = functions.https.onRequest(crud.generics("events"));
export const surveys = functions.https.onRequest(crud.surveys());
export const users = functions.https.onRequest(user.usersHttp());
