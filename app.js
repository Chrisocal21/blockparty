// Google Drive API Configuration
const CLIENT_ID = '400845283574-nlq9pjn99s13962jlusaktnqcmc6vmsv.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCZmaZBl5yxH-6gEO9xKvKoQmADWJxANzE';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '1gNXv8LlG2tUzvbAWy9Ru-BnX7HPF5Hl7'; // Replace with your actual folder ID

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize Google APIs when page loads
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('authSection').style.display = 'flex';
    initializeGoogleAPIs();
});

async function initializeGoogleAPIs() {
    try {
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });
        await gapi.client.init({
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.access_token) {
                    showUploadSection();
                }
            }
        });
    } catch (error) {
        console.error('Error initializing Google APIs:', error);
    }
}

window.signInWithGoogle = function() {
    if (!gapiInited) {
        alert('Google API not initialized. Try again in a moment.');
        return;
    }
    tokenClient.requestAccessToken();
};

function showUploadSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('uploadSection').classList.add('active');
}

window.openCamera = function() {
    const cameraModal = document.getElementById('cameraModal');
    cameraModal.classList.add('active');
    const video = document.getElementById('cameraPreview');
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        });
};

window.closeCamera = function() {
    const cameraModal = document.getElementById('cameraModal');
    cameraModal.classList.remove('active');
    const video = document.getElementById('cameraPreview');
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
};

window.capturePhoto = function() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
        uploadFile(blob, 'photo.jpg');
        closeCamera();
    }, 'image/jpeg', 0.9);
};

window.handleFileUpload = function(event) {
    const files = event.target.files;
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
        uploadFile(files[i], files[i].name);
    }
};

function uploadFile(file, fileName) {
    document.getElementById('loadingState').classList.add('active');
    const metadata = {
        name: fileName,
        parents: [FOLDER_ID]
    };
    const accessToken = gapi.client.getToken().access_token;
    console.log('Access token:', accessToken);
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
    const headers = new Headers({ 'Authorization': 'Bearer ' + accessToken });
    console.log('Uploading to URL:', url);
    console.log('Request headers:', headers);
    fetch(url, {
        method: 'POST',
        headers: headers,
        body: form
    })
    .then(async (res) => {
        console.log('Upload status:', res.status);
        let data;
        let text = await res.text();
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { error: 'Failed to parse JSON', text };
        }
        if (!res.ok) {
            console.error('Upload failed with status', res.status, data);
        }
        return data;
    })
    .then((data) => {
        console.log('Upload response:', data);
        document.getElementById('loadingState').classList.remove('active');
        if (data && data.id) {
            document.getElementById('successMessage').classList.add('active');
            setTimeout(() => {
                document.getElementById('successMessage').classList.remove('active');
            }, 2500);
        } else {
            alert('Upload failed. See console for details.');
        }
    })
    .catch((err) => {
        document.getElementById('loadingState').classList.remove('active');
        alert('Upload failed. Please try again.');
        console.error('Upload error:', err);
    });
}
