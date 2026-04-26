import { Account, Client, OAuthProvider } from 'react-native-appwrite';

const client = new Client();
const account = new Account(client);

async function test() {
    const redirectUri = 'exp://test';
    
    // Test positional
    const url1 = await account.createOAuth2Token(
        OAuthProvider.Google,
        redirectUri,
        redirectUri
    );
    console.log(url1);

    // Test object
    const url2 = await account.createOAuth2Token({
        provider: OAuthProvider.Google,
        success: redirectUri,
        failure: redirectUri
    });
    console.log(url2);
}
