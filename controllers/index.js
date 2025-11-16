import generateGoogeSheetToken from "../utils/google.js";
import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  appendVariantRowInSheet,
  getCurrentListedSkusInGoogleSheet,
  updateExistingRowInSheet,
} from "./googleSheets.js";
import { generateProductsData } from "./shopify.js";

const updateSkusDataInGoogleSheet = async () => {
  try {
    const googleToken = generateGoogeSheetToken();
    // current sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, googleToken);
    await doc.loadInfo();
    console.log(doc)
    const sheet = await doc.sheetsById[process.env.GOOGLE_SHEET_INVENTORY_ID];
    await sheet.clear();
    const { variantLevelData, productLevelData } = await generateProductsData();
    console.log('👉 updating inventory data for variants');
    await updateInventorySheet(sheet,variantLevelData);
    console.log('✅ updated inventory data for variants');
    console.log('👉 updating overall sheet data');
    await updateOverallSheetData(variantLevelData, productLevelData);
    console.log('✅ updated overall sheet data');
    console.log('👉 updating variant level data');
    await updateVariantOverallSheetData(productLevelData);
    console.log('✅ updated variant level data');
    return;
  } catch (err) {
    console.log(
      "Failed to update skus data in google sheet reason -->" + err.message
    );
  }
};
const updateInventorySheet = async (sheet, skusList) => {
  try {
    const currentGoogleSheetSkus = await getCurrentListedSkusInGoogleSheet(
      sheet
    );
    for (let i = 0; i < skusList.length; i++) {
      let item = skusList[i];
      let sku =
        item.sku?.split("-").length < 3 ? item.sku + "-01" : item.sku || "";
      const isSkuRegisteredInSheet = currentGoogleSheetSkus.find(
        (el) => el == sku
      );
      console.log(sku,isSkuRegisteredInSheet);
      if (isSkuRegisteredInSheet) {
        let updateIndex = i;
        await updateExistingRowInSheet(sheet, updateIndex, item);
      } else {
        await appendVariantRowInSheet(sheet, item);
      }
    }
  } catch (err) {
    throw new Error(
      "Failed to update invenotry sheet reason -->" + err.message
    );
  }
};
const updateOverallSheetData = async (skusData, productLevelData) => {
  try {
    const groups = [
      {
        Priority: "P0",
        "OOS Day Bracket": "<=0",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
      {
        Priority: "P1",
        "OOS Day Bracket": "<3",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
      {
        Priority: "P2",
        "OOS Day Bracket": "3 - 7",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
      {
        Priority: "P3",
        "OOS Day Bracket": "7 - 15",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
      {
        Priority: "P4",
        "OOS Day Bracket": "15 - 30",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
      {
        Priority: "P5",
        "OOS Day Bracket": "30+",
        "No. of products": 0,
        "Daily Revenue Loss": 0,
        "% of total sku count": 0,
      },
    ];
    for (let i = 0; i < skusData.length; i++) {
      let item = skusData[i];
      let daysCovered = Number(item.days_of_inventory_remaining) || 0;
      let allocatedGroup = null;
      if (daysCovered <= 0) {
        allocatedGroup = 0;
      } else if (daysCovered > 0 && daysCovered < 3) {
        allocatedGroup = 1;
      } else if (daysCovered >= 3 && daysCovered < 7) {
        allocatedGroup = 2;
      } else if (daysCovered >= 7 && daysCovered < 15) {
        allocatedGroup = 3;
      } else if (daysCovered >= 15 && daysCovered < 30) {
        allocatedGroup = 4;
      } else if (daysCovered >= 30) {
        allocatedGroup = 5;
      }
      groups[allocatedGroup]["No. of products"] += 1;
      groups[allocatedGroup]["Daily Revenue Loss"] +=
        Number(item.price) * Number(item.inventory_units_sold_per_day);
      groups[allocatedGroup]["% of total sku count"] =
        (groups[allocatedGroup]["No. of products"] / skusData.length) * 100;
    }
    let topOOSProducts = productLevelData
      .sort(
        (a, b) =>
          b.productLevelLossOnOssVariants - a.productLevelLossOnOssVariants
      )
      .splice(0, 20);

    const googleToken = generateGoogeSheetToken();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, googleToken);
    await doc.loadInfo();

    // setting up priority columns
    const sheet = doc.sheetsById[process.env.GOOGLE_SHEET_OVERALL_ID];
    await sheet.clear();
    await sheet.setHeaderRow(Object.keys(groups[0]));
    await sheet.addRows(groups.map((el) => Object.values(el)));

    // filling up top 20 products data
    await sheet.loadCells();
    const productTitleCell = sheet.getCellByA1("A09");
    const productHeadingTitleCell = sheet.getCellByA1("A10");
    const productHeadingSkuCell = sheet.getCellByA1("B10");
    const productHeadingLossCell = sheet.getCellByA1("C10");

    productTitleCell.value = "Top 20 OOS products";
    productHeadingTitleCell.value = "Product Title";
    productHeadingSkuCell.value = "Sku";
    productHeadingLossCell.value = "Daily Revenue Loss";
    for (let i = 0; i < topOOSProducts.length; i++) {
      let startIndex = 11;
      let updateIndex = startIndex + i;
      let item = topOOSProducts[i];
      let productSku = item.variants[0].sku.split("-");
      const productTitleCell = sheet.getCellByA1(`A${updateIndex}`);
      const productSkuCell = sheet.getCellByA1(`B${updateIndex}`);
      const productLossCell = sheet.getCellByA1(`C${updateIndex}`);
      productTitleCell.value = item.productTitle;
      productSkuCell.value =
        productSku.length > 2
          ? productSku.slice(0, 2).join("-")
          : productSku.join("-");
      productLossCell.value = item.productLevelLossOnOssVariants;
    }
    await sheet.saveUpdatedCells();
  } catch (err) {
    console.log("Failed to update overall sheet data reason -->" + err.message);
  }
};

const updateVariantOverallSheetData = async (productLevelData) => {
  try {
    const googleToken = generateGoogeSheetToken();
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, googleToken);
    await doc.loadInfo();

    const sheet = doc.sheetsById[process.env.GOOGLE_SHEET_VARIANT_ID];
    await sheet.clear();
    await sheet.setHeaderRow(["Product Title", "SKU", "Daily Revenue Loss"]);
    let topOOSProductsVariantLevel = productLevelData
      .sort(
        (a, b) =>
          b.productLevelLossOnOssVariants - a.productLevelLossOnOssVariants
      )
      .splice(0, 20)
      .map((el) => el.variants)
      .flat()
      .filter((el) => el.inventory_quantity <= 0);
    await sheet.addRows(
      topOOSProductsVariantLevel
        .filter((el) => el.inventory_quantity <= 0)
        .map((el) => ({
          "Product Title": el.title,
          SKU: el.sku,
          "Daily Revenue Loss":
            Number(el.price) * Number(el.inventory_units_sold_per_day),
        }))
    );
  } catch (err) {
    console.log(
      "Failed to update variant level overall sheet data reason -->" +
        err.message
    );
  }
};
export default updateSkusDataInGoogleSheet;
