import * as admin from "firebase-admin";
import { Express, Request, Response } from "express";
import express = require("express");
import cors = require("cors");
import { validateCrudOperations } from "./auth";
import {
  addFilesToStorage,
  getDocWithSubcollections,
  getDocWithSubcollectionsRecursive,
  getSubcollectionFromDoc,
  queryValue,
} from "./utils";

export const generics = (collectionPath: string): Express => {
  const app = express();
  app.use(cors());
  app.use(validateCrudOperations(collectionPath));
  const db = admin.firestore();

  app.get("/", get(db, collectionPath));
  app.get("/:id", getById(db, collectionPath));
  app.post("/", post(db, collectionPath));
  app.put("/:id", put(db, collectionPath));
  app.delete("/:id", remove(db, collectionPath));

  return app;
};

export const surveys = (): Express => {
  const collectionPath = "surveys";
  const app = express();
  app.use(cors());
  app.use(validateCrudOperations(collectionPath));
  const db = admin.firestore();

  app.get("/", get(db, collectionPath));
  app.get(
    "/w/subcollections",
    get(db, collectionPath, { subcollections: true })
  );
  app.get("/:id/:subcollection", getSubcollection(db, collectionPath));
  app.post("/", post(db, collectionPath, ["questions"]));
  app.put("/:id", put(db, collectionPath));
  app.delete("/:id", remove(db, collectionPath));

  return app;
};

export const get =
  (
    db: FirebaseFirestore.Firestore,
    collectionPath: string,
    options: any = {}
  ) =>
  async (req: Request, res: Response) => {
    try {
      let snapshot: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        db.collection(collectionPath);

      for (let [fieldPath, value] of Object.entries(req.query)) {
        snapshot = snapshot.where(fieldPath, "==", queryValue(value));
      }

      const querySnapshot = await snapshot.get();
      const arr = [];

      for (const doc of querySnapshot.docs) {
        if (!options.subcollections) {
          arr.push({ id: doc.id, ...doc.data() });
        } else if (options.recursive) {
          arr.push(await getDocWithSubcollectionsRecursive(doc));
        } else {
          arr.push(await getDocWithSubcollections(doc));
        }
      }

      console.log("GET success");
      res.status(200).send(arr);
    } catch (error) {
      console.error("GET error", error);
      res.status(500).send({ error });
    }
  };

export const getById =
  (db: FirebaseFirestore.Firestore, collectionPath: string) =>
  async (req: Request, res: Response) => {
    try {
      const doc = await db.collection(collectionPath).doc(req.params.id).get();
      if (doc.exists) {
        console.log("GET success", req.params.id);
        res.status(200).send(doc.data());
      } else {
        console.log("GET undefined", req.params.id);
        res.status(404).send({ error: "Not found" });
      }
    } catch (error) {
      console.error("GET error", error);
      res.status(500).send({ error });
    }
  };

export const getSubcollection =
  (db: FirebaseFirestore.Firestore, collectionPath: string) =>
  async (req: Request, res: Response) => {
    try {
      const doc = await db.collection(collectionPath).doc(req.params.id).get();
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
    } catch (error) {
      console.error("GET error", error);
      res.status(500).send({ error });
    }
  };

export const post =
  (
    db: FirebaseFirestore.Firestore,
    collectionPath: string,
    subcollections: string[] = []
  ) =>
  async (req: Request, res: Response) => {
    try {
      const body = await addFilesToStorage(req.body);
      const docRef = db.collection(collectionPath).doc();

      const batch = db.batch();
      for (const sub of subcollections) {
        const subcollection = docRef.collection(sub);
        // @ts-ignore
        const subcollectionData = body[sub];
        // @ts-ignore
        delete body[sub];
        for (const d of subcollectionData) {
          const subRef = subcollection.doc();
          batch.set(subRef, d);
        }
      }
      batch.set(docRef, body);
      await batch.commit();

      const doc = await docRef.get();
      const data = await getDocWithSubcollections(doc);
      console.log("POST success", docRef.id);
      res.status(200).send(data);
    } catch (error) {
      console.error("POST error", error);
      res.status(500).send({ error });
    }
  };

export const postToSubcollection =
  (db: FirebaseFirestore.Firestore, collectionPath: string) =>
  async (req: Request, res: Response) => {
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
  };

export const put =
  (db: FirebaseFirestore.Firestore, collectionPath: string) =>
  async (req: Request, res: Response) => {
    try {
      const body = await addFilesToStorage(req.body);
      const docRef = db.collection(collectionPath).doc(req.params.id);
      await docRef.update(body);
      const data = (await docRef.get()).data();
      console.log("PUT success", req.params.id);
      res.status(200).send({ id: docRef.id, ...data });
    } catch (error) {
      console.error("PUT error", error);
      res.status(500).send({ error });
    }
  };

export const remove =
  (db: FirebaseFirestore.Firestore, collectionPath: string) =>
  async (req: Request, res: Response) => {
    try {
      await db.collection(collectionPath).doc(req.params.id).delete();
      console.log("DELETE success", req.params.id);
      res.status(200).send({ id: req.params.id });
    } catch (error) {
      console.error("DELETE error", error);
      res.status(500).send({ error });
    }
  };
