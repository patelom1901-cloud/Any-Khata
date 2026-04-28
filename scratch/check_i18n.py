import re

def check_keys():
    with open('c:/Users/acer/OneDrive/Desktop/Any-Khata/any-khata-app/constants/i18n.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    en_match = re.search(r'en:\s*\{(.*?)\},', content, re.DOTALL)
    gu_match = re.search(r'gu:\s*\{(.*?)\}', content, re.DOTALL)

    if not en_match or not gu_match:
        print("Could not find en or gu dictionaries")
        return

    en_dict = en_match.group(1)
    gu_dict = gu_match.group(1)

    missing_keys = [
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
    ]

    print("Checking keys in en...")
    for key in missing_keys:
        if f"'{key}':" not in en_dict and f'"{key}":' not in en_dict:
            print(f"MISSING in en: {key}")
        else:
            print(f"Found in en: {key}")

    print("\nChecking keys in gu...")
    for key in missing_keys:
        if f"'{key}':" not in gu_dict and f'"{key}":' not in gu_dict:
            print(f"MISSING in gu: {key}")
        else:
            print(f"Found in gu: {key}")

if __name__ == "__main__":
    check_keys()
