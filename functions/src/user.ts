import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Express, Request, Response } from "express";
import express = require("express");
import cors = require("cors");
import { validateUserOperations } from "./auth";
// import { getUserFavorites } from "./utils";

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
  const db = admin.firestore();
  const batch = db.batch();
  const uid = user.uid;
  const userDocRef = db.collection("users").doc(uid);
  batch.delete(userDocRef);
  return batch.commit();
});

export const usersHttp = (): Express => {
  const app = express();
  app.use(cors());
  const db = admin.firestore();

  app.get("/:id", validateUserOperations, (req: Request, res: Response) => {
    db.collection("users")
      .doc(req.params.id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          console.log("GET success", req.params.id);
          res.status(200).send(doc.data());
          /*
                NOTE do we want to send event/survey entities along with the user?
                const user = doc.data() || {};
                const { status, favorites } = await getUserFavorites(user.favorites);
                if (status === 500) {
                    console.error("GET error", favorites);
                } else {
                    console.log("GET success", req.params.id);
                    user.favorites = favorites;
                }
                res.status(status).send(user);
            */
        } else {
          console.log("GET undefined", req.params.id);
          res.status(404).send({ error: "Not found" });
        }
      })
      .catch((error) => {
        console.error("GET error", error);
        res.status(500).send({ error });
      });
  });

  app.put(
    "/:id/favorites",
    validateUserOperations,
    async (req: Request, res: Response) => {
      const userId = req.params.id;
      const { liked, isEvent, favoriteId } = req.body;

      let subscribers, favorites;
      if (liked) {
        subscribers = admin.firestore.FieldValue.arrayUnion(userId);
        favorites = admin.firestore.FieldValue.arrayUnion({
          favoriteId,
          isEvent,
        });
      } else {
        subscribers = admin.firestore.FieldValue.arrayRemove(userId);
        favorites = admin.firestore.FieldValue.arrayRemove({
          favoriteId,
          isEvent,
        });
      }

      try {
        const collectionName = isEvent ? "events" : "surveys";
        const favoriteDocument = db.collection(collectionName).doc(favoriteId);
        await favoriteDocument.update({ subscribers });

        const userDocument = db.collection("users").doc(userId);
        await userDocument.update({ favorites });

        res.status(200).send();
      } catch (error) {
        console.error("PUT error", error);
        res.status(500).send({ error });
      }
    }
  );

  app.put(
    "/:id/surveys",
    validateUserOperations,
    async (req: Request, res: Response) => {
      const { surveyId, active, answers } = req.body;

      const userDoc = db.collection("users").doc(req.params.id);
      const solvedSurveys = admin.firestore.FieldValue.arrayUnion(surveyId);

      const surveyDoc = db.collection("surveys").doc(surveyId);
      const surveyResultsDoc = surveyDoc.collection("results").doc();
      const answersCount = admin.firestore.FieldValue.increment(1);

      if (active) {
      } else {
      }

      try {
        const batch = db.batch();
        batch.update(userDoc, { solvedSurveys });
        batch.create(surveyResultsDoc, answers);
        batch.update(surveyDoc, { answersCount });
        await batch.commit();
        res.status(200).send();
      } catch (error) {
        console.error("PUT error", error);
        res.status(500).send({ error });
      }
    }
  );

  return app;
};
