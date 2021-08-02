import * as admin from "firebase-admin";
import { Express, Request, Response } from "express";
import express = require("express");
import cors = require("cors");

const validate = async (req: Request, res: Response, next: () => void) => {
  if (req.method === "GET") {
    next();
    return;
  }

  if (!req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ")) {
    console.error("Unauthorized");
    res.status(401).send("Unauthorized");
    return;
  }

  const idToken = req.headers.authorization.split("Bearer ")[1];

  admin.auth().verifyIdToken(idToken)
      .then((decodedToken) => {
        admin.firestore().collection("users").doc(decodedToken.uid).get()
            .then((doc) => {
              if (doc.data()?.isAdmin) {
                next();
              } else {
                res.status(403).send("Forbidden");
              }
            }).catch((error) => {
              console.error(error);
              res.status(500).send(error);
            });
      })
      .catch((error) => {
        console.error(error);
        res.status(401).send("Unauthorized");
      });
};

export const crudOperations = (collectionPath: string): Express => {
  const app = express();
  app.use(cors());
  app.use(validate);

  app.get("/", (req, res) => {
    admin.firestore().collection(collectionPath).get()
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
