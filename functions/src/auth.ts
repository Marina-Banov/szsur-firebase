import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { isPathWhitelisted } from "./utils";

/**
 * Validation middleware for basic CRUD operations.
 * For now, all GET requests are allowed and other requests are limited to admins.
 *
 * NOTE develop a more strategic business logic
 *
 * **Error codes:**
 *   - 401 Unauthorized: No authorization header present OR token not valid
 *   - 403 Forbidden: User doesn't have the necessary permission to access data
 *   - 500 : Internal error
 */
export const validateCrudOperations = (collectionPath: string) =>
    (req: Request, res: Response, next: () => void) => {
    if (!req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")) {
        console.error("Unauthorized");
        res.status(401).send("Unauthorized");
        return;
    }

    const idToken = req.headers.authorization.split("Bearer ")[1];

    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            if (req.method === "GET" || isPathWhitelisted(collectionPath + req.path)) {
                next();
                return;
            } else {
                admin.firestore().collection("users").doc(decodedToken.uid).get()
                    .then((doc) => {
                        if (doc.data()?.isAdmin) {
                            next();
                        } else {
                            res.status(403).send("Forbidden");
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                        res.status(500).send(error);
                    });
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(401).send("Unauthorized");
        });
};

/**
 * Validation middleware for sensitive operations performed on the User model.
 * Only the user himself can access and modify his own data.
 *
 * NOTE think about how users would be granted admin permissions
 *
 * **Error codes:**
 *   - 401 Unauthorized: No authorization header present
 *   - 403 Forbidden: User doesn't have the necessary permission to access data
 *   - 500 : Internal error OR token not valid
 */
export const validateUserOperations = (req: Request, res: Response, next: () => void) => {
    if (!req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ")) {
        console.error("Unauthorized");
        res.status(401).send("Unauthorized");
        return;
    }

    const idToken = req.headers.authorization.split("Bearer ")[1];
    const userId = req.params.id

    if (!userId || userId.length == 0) {
        console.error("Forbidden 1");
        res.status(403).send("Forbidden");
        return;
    }

    admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
            if (decodedToken.uid === userId) {
                next()
            } else {
                console.error("Forbidden 2");
                res.status(403).send("Forbidden");
            }
        })
        .catch((error) => {
            console.error(error);
            res.status(500).send(error);
        });
};