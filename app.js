// Google Drive API Configuration
const CLIENT_ID = '400845283574-nlq9pjn99s13962jlusaktnqcmc6vmsv.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCZmaZBl5yxH-6gEO9xKvKoQmADWJxANzE'; // You need to replace this with your actual API key
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1gNXv8LlG2tUzvbAWy9Ru-BnX7HPF5Hl7';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize Google APIs when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeGoogleAPIs();
                        });

    } catch (error) {
        console.error('Error initializing Google APIs:', error);
    }
}

async function initializeGoogleAPIs() {
    try {
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });
        
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        
        gapiInited = true;
        console.log('Google API initialized');
        
        // Initialize Google Identity Services
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
                            callback: (tokenResponse) => {
                                if (tokenResponse.access_token) {
                                    console.log('Successfully authenticated!');
                                    showUploadSection();
                                }
                            }
                        });
