import * as admin from "firebase-admin";

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
