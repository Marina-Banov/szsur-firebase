import * as admin from "firebase-admin";

const WHITELIST = [
    '^(surveys/\\w+/results)$',
];

export const queryValue = (value: any) => {
    switch(value) {
        case "true":
            return true;
        case "false":
            return false;
        default:
            return value;
    }
}

export const getUserFavorites = async (favoritesIdList: any[]) => {
    const favorites = [];
    for (const { favoriteId, isEvent } of favoritesIdList) {
        const collectionPath = isEvent ? "events" : "surveys";
        try {
            const f = await admin.firestore().collection(collectionPath).doc(favoriteId).get();
            favorites.push(f.data())
        } catch (error) {
            return { status: 500, favorites: error }
        }
    }
    return { status: 200, favorites };
}

export const getDocWithSubcollections = async (doc: any) => {
    const item: any = { id: doc.id, ...doc.data() };
    const subcollections = await doc.ref.listCollections();
    for (const sub of subcollections) {
        item[sub.id] = (await sub.get()).docs.map((s: any) => ({
            id: s.id, ...s.data()
        }));
    }
    return item;
}

export const getSubcollectionFromDoc = async (doc: any, subcollection: string) => {
    const sub = await doc.ref.collection(subcollection).get();
    return sub.docs.map((s: any) => ({ id: s.id, ...s.data() }));
}

export const isPathWhitelisted = (path: string) => {
    for (const regex of WHITELIST) {
        if (RegExp(regex).test(path)) {
            return true;
        }
    }
    return false;
}
