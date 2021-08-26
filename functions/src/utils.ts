import * as admin from "firebase-admin";
import { put, putFiles } from "./storage";

const WHITELIST: string[] = [
  /*"^(surveys/\\w+/results)$"*/
];

export const queryValue = (value: any) => {
  switch (value) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      return value;
  }
};

export const getUserFavorites = async (favoritesIdList: any[]) => {
  const favorites = [];
  for (const { favoriteId, isEvent } of favoritesIdList) {
    const collectionPath = isEvent ? "events" : "surveys";
    try {
      const f = await admin
        .firestore()
        .collection(collectionPath)
        .doc(favoriteId)
        .get();
      favorites.push(f.data());
    } catch (error) {
      return { status: 500, favorites: error };
    }
  }
  return { status: 200, favorites };
};

export const getDocWithSubcollections = async (doc: any) => {
  const item: any = { id: doc.id, ...doc.data() };
  const subcollections = await doc.ref.listCollections();
  for (const sub of subcollections) {
    item[sub.id] = (await sub.get()).docs.map((s: any) => ({
      id: s.id,
      ...s.data(),
    }));
  }
  return item;
};

export const getDocWithSubcollectionsRecursive = async (doc: any) => {
  const item: any = { id: doc.id, ...doc.data() };
  const subcollections = await doc.ref.listCollections();
  for (const sub of subcollections) {
    const arr = [];
    const subDocs = (await sub.get()).docs;
    for (const d of subDocs) {
      arr.push(await getDocWithSubcollectionsRecursive(d));
    }
    item[sub.id] = arr;
  }
  return item;
};

export const getSubcollectionFromDoc = async (
  doc: any,
  subcollection: string
) => {
  const sub = await doc.ref.collection(subcollection).get();
  return sub.docs.map((s: any) => ({ id: s.id, ...s.data() }));
};

export const isPathWhitelisted = (path: string) => {
  for (const regex of WHITELIST) {
    if (RegExp(regex).test(path)) {
      return true;
    }
  }
  return false;
};

export const addFilesToStorage = async (data: object) => {
  const x = Object.entries(data).filter(([_, v]) => typeof v === "object");
  for (const [field, value] of x) {
    if (value.length > 0 && !!value[0].base64 && !!value[0].name) {
      // @ts-ignore
      data[field] = await putFiles(value);
    } else if (!!value.base64 && !!value.name) {
      // @ts-ignore
      data[field] = await put(value);
    }
  }
  return data;
};
