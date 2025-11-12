import { shopifyClientProvider } from "../utils/shopify.js";

const getShopifyProducts = async () => {
  try {
    let productsList = [];
    let nextPage = null;
    while (nextPage || nextPage == null) {
      const cursorQuery = nextPage
        ? `first:20,after: "${nextPage}"`
        : `first:50`;
      const query = `query GetProducts{
                products(${cursorQuery},query: "status:active"){
                    pageInfo{
                        hasNextPage
                        endCursor
                    }
                    nodes{
                        id
                        title
                        variants(first:100){
                            edges{
                                node{
                                    id
                                    sku
                                    displayName
                                    barcode
                                    inventoryQuantity
                                    price
                                }
                            }
                        }
                    }
                }
            }`;
      const { data, extensions, errors } = await shopifyClientProvider(query);
      if (errors) {
        nextPage = false;
        throw new Error(errors[0].message);
      }
      let mappedProductData = data.products.nodes.map((el) => ({
        productId: el.id.replace("gid://shopify/Product/", ""),
        productTitle: el.title,
        variants: el.variants.edges.map(({ node: variant }) => ({
          id: variant.id.replace("gid://shopify/ProductVariant/", ""),
          sku: variant.sku,
          ean: variant.barcode,
          title: variant.displayName,
          inventory_quantity: variant.inventoryQuantity,
          productId: el.id.replace("gid://shopify/Product/", ""),
          price: variant.price
        })),
      }));
      productsList = [...mappedProductData, ...productsList];
      nextPage = data.products.pageInfo.hasNextPage
        ? data.products.pageInfo.endCursor
        : false;
      if (extensions.cost.throttleStatus.currentlyAvailable < 400) {
        await new Promise((res, rej) => {
          setTimeout(() => {
            res(true);
          }, 1000);
        });
      }
    }
    return productsList;
  } catch (err) {
    throw new Error("Failed to get shopify products reason -->" + err.message);
  }
};

/**
 *
 * @param {string} variantId - shopify product variant id
 * @param {string} productId - shopify product id
 */
const getVariantSaleAndDrrInfo = async (variantsList) => {
  try {
    let variantSaleData = [];
    let i = 0;
    let batchSize = 1000;
    while (i < variantsList.length) {
      let endIndex = i + batchSize;
      console.log("current batch : " + i + " to " + endIndex);
      let variantsQuery = variantsList.slice(i, endIndex).join(",");
      const query = `query{
          shopifyqlQuery(query: "FROM sales,inventory show total_sales,inventory_units_sold_per_day, days_of_inventory_remaining, days_out_of_stock WHERE product_variant_id IN (${variantsQuery}) GROUP BY product_variant_id SINCE startOfDay(-30d) COMPARE TO startOfDay(-90d) UNTIL today ORDER BY total_sales DESC"){
            tableData{
              rows
            }
            parseErrors 
          } 
      }`;
      const { data, extensions, errors } = await shopifyClientProvider(query);
      if (errors) {
        console.dir(errors, {
          depth: null,
        });
      } else {
        variantSaleData = [
          ...data.shopifyqlQuery.tableData.rows,
          ...variantSaleData,
        ];
        i += batchSize;
      }
    }
    return variantSaleData;
  } catch (err) {
    throw new Error("Failed to get variants sale and drr info " + err.message);
  }
};

const generateProductsData = async () => {
  try {
    console.log(`👉 Product data fetching started at ${new Date()}`);
    const shopifyProducts = await getShopifyProducts();

    // getting variants sale and drr infos
    let variantFlatedData = shopifyProducts
      .map((el) => el.variants.map((el) => el.id))
      .flat();
    let variantLevelSaleAndInventoryData = await getVariantSaleAndDrrInfo(
      variantFlatedData
    );
    console.log(
      "Falatted data length : " +
        variantFlatedData.length +
        " sale data length : " +
        variantLevelSaleAndInventoryData.length
    );

    // mapping variant data to variant sale data
    const variantMappedDataToSales = shopifyProducts
      .map((el) => el.variants)
      .flat()
      .map((variant) => {
        let correspondingVariantSaleData =
          variantLevelSaleAndInventoryData.find(
            (el) => el.product_variant_id == variant.id
          );
        return {
          ...variant,
          ...correspondingVariantSaleData,
          past90dSale: correspondingVariantSaleData.comparison_total_sales__startOfDay_sub_90d
        };
      });
    let productLevelMapping = shopifyProducts.map(el => ({
      ...el,
      variants: el.variants.map(variant =>{
       let correspondingVariantSaleData =
          variantLevelSaleAndInventoryData.find(
            (el) => el.product_variant_id == variant.id
          );
        return {
          ...variant,
          ...correspondingVariantSaleData,
          past90dSale: correspondingVariantSaleData.comparison_total_sales__startOfDay_sub_90d
        }; 
      })
    }));
    productLevelMapping = productLevelMapping.map(product => ({
      ...product,
      productLevelLossOnOssVariants : product.variants.filter(el => el.inventory_quantity <= 0).map(el => Number(el.inventory_units_sold_per_day) * Number(el.price)).reduce((acc,current) => acc + current , 0)
    }));
    console.log(`✅ Product data fetching ended at ${new Date()}`);
    return {
      productLevelData: productLevelMapping,
      variantLevelData: variantMappedDataToSales
    };
  } catch (err) {
    console.log("Failed to generate products data reason -->" + err.message);
  }
};

export { getShopifyProducts, generateProductsData, getVariantSaleAndDrrInfo };
