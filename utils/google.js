import { JWT } from "google-auth-library";

const generateGoogeSheetToken = () =>{
  try {
    const keysEnvVar = process.env["CREDS"];
    const keys = JSON.parse(keysEnvVar);

    const serviceAccountAuth = new JWT({
      email: keys.client_email,
      key: keys.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return serviceAccountAuth;
  } catch (err) {
    console.log("Failed to generate google sheet auth token reason -->" + err.message);
  }
};

export default generateGoogeSheetToken;