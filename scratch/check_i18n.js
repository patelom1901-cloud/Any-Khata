const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/acer/OneDrive/Desktop/Any-Khata/any-khata-app/constants/i18n.ts';
const content = fs.readFileSync(filePath, 'utf-8');

const enSection = content.split('en: {')[1].split('},')[0];
const guSection = content.split('gu: {')[1].split('}')[0];

const missingKeys = [
    "home.recent_customers", "GAVE", "GOT", "Day Net",
    "Record what the customer purchased today.", "Description",
    "e.g., 6 cups tea, Parle G packet", "Quantity (Optional)",
    "e.g., 6", "e.g., 30", "Enter the amount received from the customer.",
    "e.g., 500", "e.g., Partial payment, Full settlement",
    "linked shops", "Manage your credit and payments across all local shops.",
    "Share Statement", "New Entry", "AMOUNT",
    "What is this for? (e.g. 2kg Sugar)", "Save Transaction", "e.g. 123456",
    "Discover local businesses", "Business Account", "Advertisements",
    "Preferences", "Change Photo", "Notifications are enabled",
    "When a new transaction is added to your khata", "Payment Received",
    "When a customer makes a payment", "Balance Reminders",
    "Periodic reminders for outstanding balances", "App Updates",
    "News about new features and improvements",
    "Notification preferences are saved locally on this device. To manage system-level notification permissions, go to your device Settings → Any Khata → Notifications."
];

console.log("Checking keys in en...");
missingKeys.forEach(key => {
    if (!enSection.includes(`'${key}':`) && !enSection.includes(`"${key}":`)) {
        console.log(`MISSING in en: ${key}`);
    } else {
        // console.log(`Found in en: ${key}`);
    }
});

console.log("\nChecking keys in gu...");
missingKeys.forEach(key => {
    if (!guSection.includes(`'${key}':`) && !guSection.includes(`"${key}":`)) {
        console.log(`MISSING in gu: ${key}`);
    } else {
        // console.log(`Found in gu: ${key}`);
    }
});
