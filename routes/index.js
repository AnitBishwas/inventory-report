import { Router } from "express";
import updateSkusDataInGoogleSheet from "../controllers/index.js";
import sendEmail from "../controllers/mail.js";

const appRoutes = Router();

appRoutes.get("/generateData", async (req, res) => {
  try {
    console.log(`👉 Sheet update job started at ${new Date()}`);
    await updateSkusDataInGoogleSheet();
    console.log(`✅ Sheet update finished at ${new Date()}`);
  } catch (err) {
    res.status(420).send({
      ok: false,
    });
  }
});

appRoutes.get("/email", async (req, res) => {
  try {
    console.log(`📧 Sending mail at ${new Date()}`);
    await sendEmail("operationsteam@swissbeauty.in");
    console.log(`📧 Mail sent at ${new Date()}`);
  } catch (err) {
    res.status(420).send({
      ok: false,
    });
  }
});
export default appRoutes;