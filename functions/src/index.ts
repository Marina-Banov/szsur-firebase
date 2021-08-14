import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as user from "./user";
import * as firestore from "./firestore";
import { crudOperations } from "./crud";

admin.initializeApp();

export const newUserSignUp = user.newUserSignUp;
export const userDeleted = user.userDeleted;
export const deleteSubcollections = firestore.deleteSubcollections;
export const enums = functions.https.onRequest(crudOperations("enums"));
export const events = functions.https.onRequest(crudOperations("events"));
export const surveys = functions.https.onRequest(crudOperations("surveys"));
export const users = functions.https.onRequest(user.usersHttp());
