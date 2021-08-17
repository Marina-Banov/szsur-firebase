import * as admin from "firebase-admin";
import { Express } from "express";
import express = require("express");
import cors = require("cors");
import { validateCrudOperations } from "./auth";
import { getSubcollectionFromDoc, queryValue } from "./utils";


export const crudOperations = (collectionPath: string): Express => {
  const app = express();
  app.use(cors());
  app.use(validateCrudOperations);
  const db = admin.firestore();

  app.get("/", (req, res) => {
    let snapshot: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        db.collection(collectionPath);

    for (let [fieldPath, value] of Object.entries(req.query)) {
        snapshot = snapshot.where(fieldPath, "==", queryValue(value));
    }

    snapshot.get()
        .then((querySnapshot) => {
          const arr = [];

          for (const doc of querySnapshot.docs) {
            arr.push({ id: doc.id, ...doc.data() });
          }

          console.log("GET success");
          res.send(arr);
        })
        .catch((error) => {
          console.error("GET error", error);
          res.status(500).send(error);
        });
  });

  app.get("/:id", (req, res) => {
    db.collection(collectionPath).doc(req.params.id).get()
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

  app.get("/:id/:subcollection", (req, res) => {
    db.collection(collectionPath).doc(req.params.id).get()
        .then(async (doc) => {
          if (doc.exists) {
            const result = await getSubcollectionFromDoc(doc, req.params.subcollection);
            console.log("GET success", req.params.id);
            res.send(result);
          } else {
            console.log("GET undefined", req.params.id);
            res.status(404).send("Not found");
          }
        }).catch((error) => {
        console.error("GET error", error);
        res.status(500).send(error);
    });
  });

  app.post("/", (req, res) => {
    db.collection(collectionPath).add(req.body)
        .then((doc) => {
          console.log("POST success", doc.id);
          res.send(doc);
        })
        .catch((error) => {
          console.error("POST error", error);
          res.status(500).send(error);
        });
  });

  app.put("/:id", (req, res) => {
    db.collection(collectionPath).doc(req.params.id)
        .set(req.body)
        .then((doc) => {
          console.log("PUT success", req.params.id);
          res.status(200).send("Successfully updated");
        })
        .catch((error) => {
          console.error("PUT error", error);
          res.status(500).send(error);
        });
  });

  app.delete("/:id", (req, res) => {
    db.collection(collectionPath).doc(req.params.id).delete()
        .then((doc) => {
          console.log("DELETE success", req.params.id);
          res.status(200).send("Successfully deleted");
        })
        .catch((error) => {
          console.error("DELETE error", error);
          res.status(500).send(error);
        });
  });

  return app;
};
