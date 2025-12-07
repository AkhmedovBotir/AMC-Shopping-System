const { exec } = require('child_process');
const cron = require('node-cron');
const path = require('path');

// Run the subscription check script daily at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Running subscription check cron job...');
    const scriptPath = path.join(__dirname, 'checkSubscriptions.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing subscription check: ${error}`);
            return;
        }
        console.log('Subscription check completed:', stdout);
        if (stderr) {
            console.error('Subscription check stderr:', stderr);
        }
    });
});

console.log('Subscription cron job scheduled to run daily at midnight');

// Keep the script running
process.stdin.resume();
