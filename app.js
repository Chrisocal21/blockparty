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
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const contentType = file.type || 'application/octet-stream';
        const base64Data = btoa(String.fromCharCode.apply(null, new Uint8Array(content)));
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) + '\r\n' +
            delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' + base64Data + '\r\n' +
            close_delim;

        gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart', fields: 'id' },
            headers: {
                'Content-Type': 'multipart/related; boundary=' + boundary
            },
            body: multipartRequestBody
        }).then(function(response) {
            console.log('Upload response:', response);
            document.getElementById('loadingState').classList.remove('active');
            if (response.status === 200 && response.result && response.result.id) {
                document.getElementById('successMessage').classList.add('active');
                setTimeout(() => {
                    document.getElementById('successMessage').classList.remove('active');
                }, 2500);
            } else {
                alert('Upload failed. See console for details.');
            }
        }, function(err) {
            document.getElementById('loadingState').classList.remove('active');
            alert('Upload failed. Please try again.');
            console.error('Upload error:', err);
        });
    };
    reader.readAsArrayBuffer(file);
}
