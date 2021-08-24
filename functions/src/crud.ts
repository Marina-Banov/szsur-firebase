import * as admin from "firebase-admin";
import { Express } from "express";
import express = require("express");
import cors = require("cors");
import { validateCrudOperations } from "./auth";
import { getSubcollectionFromDoc, queryValue } from "./utils";

export const crudOperations = (collectionPath: string): Express => {
  const app = express();
  app.use(cors());
  app.use(validateCrudOperations(collectionPath));
  const db = admin.firestore();

  app.get("/", (req, res) => {
    let snapshot: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      db.collection(collectionPath);

    for (let [fieldPath, value] of Object.entries(req.query)) {
      snapshot = snapshot.where(fieldPath, "==", queryValue(value));
    }

    snapshot
      .get()
      .then(async (querySnapshot) => {
        const arr = [];

        for (const doc of querySnapshot.docs) {
          arr.push({ id: doc.id, ...doc.data() });
          // arr.push(await getDocWithSubcollections(doc));
          // arr.push(await getDocWithSubcollectionsRecursive(doc));
        }

        console.log("GET success");
        res.status(200).send(arr);
      })
      .catch((error) => {
        console.error("GET error", error);
        res.status(500).send({ error });
      });
  });

  app.get("/:id", (req, res) => {
    db.collection(collectionPath)
      .doc(req.params.id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          console.log("GET success", req.params.id);
          res.status(200).send(doc.data());
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

  app.get("/:id/:subcollection", (req, res) => {
    db.collection(collectionPath)
      .doc(req.params.id)
      .get()
      .then(async (doc) => {
        if (doc.exists) {
          const result = await getSubcollectionFromDoc(
            doc,
            req.params.subcollection
          );
          console.log("GET success", req.params.id);
          res.status(200).send(result);
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

  app.post("/", async (req, res) => {
    try {
      const collection = db.collection(collectionPath);
      const docRef = await collection.add(req.body);
      const data = (await docRef.get()).data();
      console.log("POST success", docRef.id);
      res.status(200).send({ id: docRef.id, ...data });
    } catch (error) {
      console.error("POST error", error);
      res.status(500).send({ error });
    }
  });

  app.post("/:id/:subcollection", async (req, res) => {
    try {
      const collection = db
        .collection(collectionPath)
        .doc(req.params.id)
        .collection(req.params.subcollection);
      const docRef = await collection.add(req.body);
      const data = (await docRef.get()).data();
      console.log("POST success", docRef.id);
      res.status(200).send({ id: docRef.id, ...data });
    } catch (error) {
      console.error("POST error", error);
      res.status(500).send({ error });
    }
  });

  app.put("/:id", async (req, res) => {
    try {
      const docRef = db.collection(collectionPath).doc(req.params.id);
      await docRef.set(req.body);
      const data = (await docRef.get()).data();
      console.log("PUT success", req.params.id);
      res.status(200).send({ id: docRef.id, ...data });
    } catch (error) {
      console.error("PUT error", error);
      res.status(500).send({ error });
    }
  });

  app.delete("/:id", (req, res) => {
    db.collection(collectionPath)
      .doc(req.params.id)
      .delete()
      .then((_) => {
        console.log("DELETE success", req.params.id);
        res.status(200).send({ id: req.params.id });
      })
      .catch((error) => {
        console.error("DELETE error", error);
        res.status(500).send({ error });
      });
  });

  return app;
};
