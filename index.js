import e from 'express';
import "dotenv/config";
import "./controllers/googleSheets.js";
import { schedule } from './jobs/index.js';


const app = e();
const PORT = process.env.PORT || 8080;


app.listen(PORT,() =>{
    console.log(`Listening ton port ${PORT}`);
});


