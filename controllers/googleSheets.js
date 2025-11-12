import { GoogleSpreadsheet } from "google-spreadsheet";

/**
 *
 * @param {object} sheet - google sheet object
 */
const getCurrentListedSkusInGoogleSheet = async (sheet) => {
  try {
    await sheet.loadCells("A:A");
    const cellsA1 = await sheet.getCellsInRange("A:A");
    const skusList = cellsA1.flat();
    return skusList;
  } catch (err) {
    throw new Error(
      "Failed to get current listed skus in google sheet reason -->" +
        err.message
    );
  }
};

/**
 * @param {object} sheet - google sheet object
 * @param {typedef} payload
 * @property {string} sku - shopify variant sku
 * @property {string} ean - shopify variant barcode
 * @property {string} product_variant_id - shopify variant id
 * @property {string} productId - shopify product id
 * @property {string} total_sales - number of variant sold in the past 30 days
 * @property {string} days_of_inventory_remaining - number of days covered
 * @property {string} inventory_units_sold_per_day - number of variants sold in a daily basis
 * @property {string} days_out_of_stock - number of days variant was out of stock in past 30 days
 */
const appendVariantRowInSheet = async (sheet, payload) => {
  try {
    let makeRequest = true;
    let sku =
        payload.sku?.split("-").length < 3 ? payload.sku + "-01" : payload.sku || "";
    while (makeRequest) {
      try {
        const insertRow = await sheet.addRow({
          Sku: sku,
          "EAN code": payload.ean,
          "Variant Id": payload.product_variant_id,
          "Product Id": payload.productId,
          Title: payload.title,
          "Past 30 Days Sale": payload.total_sales,
          "Past 90 Days Sale": payload.past90dSale,
          "Days Covered": Math.round(
            Number(payload.days_of_inventory_remaining)
          ),
          DRR: Math.round(Number(payload.inventory_units_sold_per_day)),
          "Revenue loss": Math.round(
            Number(payload.inventory_units_sold_per_day) *
              Number(payload.days_out_of_stock)
          ),
          "Current Inventory": payload.inventory_quantity,
        });
        makeRequest = false;
        return await insertRow.save();
      } catch (err) {
        await new Promise((res, rej) => {
          setTimeout(() => {
            console.log("waited one minute to finish the throttle");
            res(true);
          }, 60000);
        });
      }
    }
  } catch (err) {
    throw new Error(
      "Failed to append variant row in sheet reason -->" + err.message
    );
  }
};

/**
 * 
 * @param {object} sheet - google sheet object
 * @param {number} rowIndex - index of the row 
 * @param {object} payload - variant details
 */
const updateExistingRowInSheet = async(sheet,rowIndex,payload) =>{
  try{
    const rows = await sheet.getRows();
    rows[rowIndex].assign({
      'Past 30 Days Sale':payload.total_sales,
      "Past 90 Days Sale": payload.past90dSale,
      'Days Covered':Math.round(Number(payload.days_of_inventory_remaining)),
      'DRR':Math.round(Number(payload.inventory_units_sold_per_day)),
      'Revenue loss':Math.round(Number(payload.inventory_units_sold_per_day) * Number(payload.days_out_of_stock)),
      'Current Inventory':payload.inventory_quantity
    });
    await rows[rowIndex].save();
  }catch(err){
    throw new Error("Failed to update existing row in sheet reason -->" + err.message)
  }
}
export { getCurrentListedSkusInGoogleSheet, appendVariantRowInSheet,updateExistingRowInSheet };
