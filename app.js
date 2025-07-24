// Google Drive API Configuration
const CLIENT_ID = '990821029800-tigg8d64h1os8l8l1bkih161m462qjpi.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCZmaZBl5yxH-6gEO9xKvKoQmADWJxANzE';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_ID = '152QjFIP6B5MLkBN_DrumNJzAh8PwvlqV'; // BP25

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
    // Show and reset progress bar
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressBar) {
        progressBar.style.display = 'block';
        progressBar.value = 0;
    }
    const metadata = {
        name: fileName
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    const accessToken = gapi.client.getToken().access_token;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable && progressBar) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressBar.value = percent;
        }
    };
    xhr.onload = function() {
        document.getElementById('loadingState').classList.remove('active');
        if (progressBar) progressBar.style.display = 'none';
        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data && data.id) {
                    document.getElementById('successMessage').classList.add('active');
                    setTimeout(() => {
                        document.getElementById('successMessage').classList.remove('active');
                    }, 2500);
                } else {
                    alert('Upload failed. No file ID returned.');
                }
            } catch (e) {
                alert('Upload complete, but could not parse response.');
            }
        } else {
            let errorMsg = 'Upload failed. Error code: ' + xhr.status;
            try {
                const errData = JSON.parse(xhr.responseText);
                if (errData && errData.error && errData.error.message) {
                    errorMsg += '\n' + errData.error.message;
                }
            } catch (e) {}
            alert(errorMsg);
        }
    };
    xhr.onerror = function() {
        document.getElementById('loadingState').classList.remove('active');
        if (progressBar) progressBar.style.display = 'none';
        alert('Upload failed due to a network error.');
    };
    xhr.send(form);
}
