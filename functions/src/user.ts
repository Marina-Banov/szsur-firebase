import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Express, Request, Response } from "express";
import express = require("express");
import cors = require("cors");
import { validateUserOperations } from "./auth";

export const newUserSignUp = functions.auth.user().onCreate((user) => {
  if (user.providerData?.length) {
    return admin.firestore().collection("users").doc(user.uid).set({
      email: user.email,
      isAdmin: false,
      favorites: [],
      solvedSurveys: [],
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

export const usersHttp = (): Express => {
    const app = express();
    app.use(cors());
    app.use(validateUserOperations);

    app.get("/:id", (req: Request, res: Response) => {
        admin.firestore().collection("users").doc(req.params.id).get()
            .then((doc) => {
                if (doc.exists) {
                    console.log("GET success", req.params.id);
                    res.send(doc.data());
                } else {
                    console.log("GET undefined", req.params.id);
                    res.status(404).send("Not found");
                }
            }).catch((error) => {
            console.error("GET error", error);
            res.status(500).send(error);
        });
    });

    app.put("/:id/favorites", async (req: Request, res: Response) => {
        const userId = req.params.id;
        const { liked, isEvent, favoriteId } = req.body;

        let subscribers, favorites;
        if (liked) {
            subscribers = admin.firestore.FieldValue.arrayUnion(userId);
            favorites = admin.firestore.FieldValue.arrayUnion({ favoriteId, isEvent });
        } else {
            subscribers = admin.firestore.FieldValue.arrayRemove(userId);
            favorites = admin.firestore.FieldValue.arrayRemove({ favoriteId, isEvent });
        }

        try {
            const collectionName = isEvent ? "events" : "surveys";
            const favoriteDocument = admin.firestore().collection(collectionName).doc(favoriteId);
            await favoriteDocument.update({ subscribers });

            const userDocument = admin.firestore().collection("users").doc(userId);
            await userDocument.update({ favorites });

            // NOTE optimistic update on client side
            res.status(200).send("Successfully updated");
        } catch (error) {
            console.error("PUT error", error);
            res.status(500).send(error);
        }
    });

    return app;
}
