import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { sendNotification } from "./utils";
const { CloudTasksClient } = require("@google-cloud/tasks");

export const deleteSubcollections = functions.firestore
  .document("{collection}/{id}")
  .onDelete(async (snapshot, _) => {
    const subcollections = await snapshot.ref.listCollections();
    if (subcollections.length === 0) {
      return;
    }

    const docs = [];
    for (const s of subcollections) {
      const res = await s.listDocuments();
      docs.push(...res);
    }
    console.log(
      `Found ${subcollections.length} subcollections with ${docs.length} documents\n Deleting...`
    );

    const batch = admin.firestore().batch();
    docs.map((doc) => batch.delete(doc));
    return batch.commit();
  });

export const notifySurveyPublished = functions.firestore
  .document("surveys/{id}")
  .onUpdate(async (change, _) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!before?.published && after?.published) {
      const notification = {
        title: "Objavljeni su rezultati ankete!",
        body: `Pogledaj najnovije rezultate ankete "${after.title}"`,
      };
      try {
        await sendNotification(change.after.id, notification, "surveys");
        console.log("SEND NOTIFICATION success");
      } catch (error) {
        console.error("SEND NOTIFICATION error", error);
      }
    }
  });

export const notifyEventStartingSoon = functions.firestore
  .document("events/{id}")
  .onWrite(async (change, _) => {
    const before = change.before.data();
    const after = change.after.data();
    if (!after || (before && before.startTime === after.startTime)) {
      // the start time hasn't changed, no need to schedule a task
      return;
    }
    try {
      const tasksClient = new CloudTasksClient();

      if (before?.notificationTaskPath) {
        // a cloud task for this event has already been scheduled. delete it
        await tasksClient.deleteTask({ name: before.notificationTaskPath });
      }

      const queuePath = tasksClient.queuePath(
        project,
        "europe-west1",
        "event-notifications"
      );
      const url = `https://us-central1-${project}.cloudfunctions.net/sendEventNotification`;
      const payload = { id: change.after.id, title: after.title };
      const task = {
        httpRequest: {
          httpMethod: "POST",
          url,
          body: Buffer.from(JSON.stringify(payload)).toString("base64"),
          headers: { "Content-Type": "application/json" },
        },
        scheduleTime: { seconds: 120 + Date.now() / 1000 },
      };
      const [response] = await tasksClient.createTask({
        parent: queuePath,
        task,
      });
      await change.after.ref.update({ notificationTaskPath: response.name });
      console.log("SCHEDULE TASK success");
    } catch (error) {
      console.error("SCHEDULE TASK error", error);
    }
  });

export const sendEventNotification = async (req: Request, res: Response) => {
  const { id, title } = req.body;
  const notification = {
    title: "Danas se odvija fora događaj u gradu!",
    body: `Uskoro počinje događaj "${title}", nemoj ga propustiti`,
  };
  try {
    await sendNotification(id, notification, "events");
    console.log("SEND NOTIFICATION success");
    res.status(200).end();
  } catch (error) {
    console.error("SEND NOTIFICATION error", error);
    res.status(500).end();
  }
};
