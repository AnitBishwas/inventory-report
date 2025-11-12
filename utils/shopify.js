import fetch from "node-fetch";

/**
 * @param {string} query - shopify graphql query
 * @param {object} variables - query payload
 */
const shopifyClientProvider = async (query,variables={}) =>{
    try{
        const url = `${process.env.SHOP_URL}/admin/api/2025-10/graphql.json`;
        const request = await fetch(url,{
            method: 'POST',
            headers: {
                'Content-Type':'application/json',
                "X-Shopify-Access-Token": process.env.ACCESS_TOKEN,
            },
            body: JSON.stringify({query,variables})
        });
        const {data,extensions,errors} = await request.json();
        return {
            data,extensions,errors
        }
    }catch(err){
        console.log("Failed to provide shopify client provider reason -->" + err.message);
    }
};

export {
    shopifyClientProvider
}