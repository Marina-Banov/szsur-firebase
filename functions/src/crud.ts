import * as admin from "firebase-admin";
import { Express } from "express";
import express = require("express");
import cors = require("cors");
import { validateCrudOperations } from "./auth";
import { queryValue } from "./utils";


export const crudOperations = (collectionPath: string): Express => {
  const app = express();
  app.use(cors());
  app.use(validateCrudOperations);

  app.get("/", (req, res) => {
    let snapshot: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        admin.firestore().collection(collectionPath);

    for (let [fieldPath, value] of Object.entries(req.query)) {
        snapshot = snapshot.where(fieldPath, "==", queryValue(value));
    }

    snapshot.get()
        .then((querySnapshot) => {
          console.log("GET success");
          const arr: unknown[] = [];
          querySnapshot.forEach((doc) => {
            arr.push({ id: doc.id, ...doc.data() });
          });
          res.send(arr);
        })
        .catch((error) => {
          console.error("GET error", error);
          res.status(500).send(error);
        });
  });

  app.get("/:id", (req, res) => {
    admin.firestore().collection(collectionPath).doc(req.params.id).get()
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

  app.post("/", (req, res) => {
    admin.firestore().collection(collectionPath).add(req.body)
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
    admin.firestore().collection(collectionPath).doc(req.params.id)
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
    admin.firestore().collection(collectionPath).doc(req.params.id).delete()
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
