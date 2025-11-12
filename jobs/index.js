import cron from 'node-cron';
import updateSkusDataInGoogleSheet from '../controllers/index.js';
import sendEmail from '../controllers/mail.js';

const schedule = cron.schedule('1 7 * * *', async() => {
    console.log(`👉 Sheet update job started at ${new Date()}`);
    await updateSkusDataInGoogleSheet();
    console.log(`✅ Sheet update finished at ${new Date()}`);
},{
    scheduled: true,
    timezone: "Asia/Kolkata"
});

const mailSchedule = cron.schedule('1 10 * * *',async() =>{
    console.log(`📧 Sending mail at ${new Date()}`);
    await sendEmail('operationsteam@swissbeauty.in');
    console.log(`📧 Mail sent at ${new Date()}`);

},{
    scheduled: true,
    timezone: "Asia/Kolkata"
});


export {
    mailSchedule,
    schedule
}