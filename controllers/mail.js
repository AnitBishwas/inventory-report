import AWS from "aws-sdk";
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from "google-spreadsheet";
import generateGoogeSheetToken from "../utils/google.js";
import { parse } from "csv-parse/sync";

const sesConfig = {
  accessKeyId: process.env.aws_access_key_id,
  secretAccessKey: process.env.aws_secret_access_key,
  region: process.env.aws_ses_region,
};

const AWS_SES = new AWS.SES(sesConfig);

const sendEmail = async (recipientEmail) => {
  try {
    const sheetData = await getSpreadSheets();
    let params = {
      Source: "anit.biswas@swissbeauty.in",
      Destination: {
        ToAddresses: [recipientEmail],
        CcAddresses: [
          "aditya.badoni@swissbeauty.in",
          "amit.yadav@swissbeauty.in",
          "manish.operations@swissbeauty.in",
          "aman.nigam@swissbeauty.in",
          "samridhi@swissbeauty.in",
          "divyani.singh@swissbeauty.in",
          "panshul.jaggi@swissbeauty.in"
        ],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: sheetData,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `D2C OOS _ Inventory report ${new Date().toISOString()}`,
        },
      },
    };
    return AWS_SES.sendEmail(params).promise();
  } catch (err) {
    console.log("Failed to send email reason -->", err);
  }
};

const getSpreadSheets = async () => {
  try {
    const token = await generateGoogeSheetToken();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, token);
    await doc.loadInfo();
    const sheet = await doc.sheetsById[process.env.GOOGLE_SHEET_OVERALL_ID];
    const sheetBuffer = await sheet.downloadAsCSV();
    const csvString = Buffer.from(sheetBuffer).toString("utf8");
    const html = await csvToHTML(csvString);
    return html;
  } catch (err) {
    console.log("Failed to get spreadSheets data reason -->", err);
  }
};
function csvToHTML(csvData) {
  const records = parse(csvData, { columns: false, skip_empty_lines: false });

  let html =
    '<p>Dear Operations Team,Please find the attached updated OOS % and the corresponding revenue loss.Requesting to align on fulfillment to minimize the impact and ensure smoother operations.</p><table border="1" style="border-collapse: collapse; width: 100%;">';
  records.forEach((row, index) => {
    html += "<tr>";
    row.forEach((cell) => {
      if (index === 0) {
        html += `<th style="padding: 8px; background-color: rgb(0, 255, 255);font-weight:800;">${
          cell || ""
        }</th>`;
      } else if (index == 8 || index == 9) {
        html += `<th style="padding: 8px; background-color: rgb(0, 255, 255);font-weight:800;">${
          cell || ""
        }</th>`;
      } else if (index == 1) {
        html += `<td style="padding: 8px;background-color:#f4cccc;">${
          cell || ""
        }</td>`;
      } else {
        html += `<td style="padding: 8px;">${cell || ""}</td>`;
      }
    });
    html += "</tr>";
  });

  html += "</table>";
  html += `</br></br><a href="https://docs.google.com/spreadsheets/d/1RvaywGYCGz_BDmOyX-qKyqd6QsELxcpPlXqYpRT3PsI/edit?usp=sharing">Report Link</a>`;
  return html;
}

export default sendEmail;
