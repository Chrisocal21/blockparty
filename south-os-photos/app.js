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
            },
        });
        
        gisInited = true;
        console.log('Google Identity Services initialized');
        
    } catch (error) {
        console.error('Error initializing Google APIs:', error);
        alert('Failed to initialize Google services. Please refresh the page and try again.');
    }
}

// Sign in with Google
function signInWithGoogle() {
    if (!gapiInited || !gisInited) {
        alert('Google services are still loading. Please wait a moment and try again.');
        return;
    }
    
    try {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed. Please try again.');
    }
}

// Show upload section after authentication
function showUploadSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('infoSection').innerHTML = `
        <h3>🎉 Ready to Upload!</h3>
        <p>You're all set! Take photos or upload from your phone. Everything goes straight to our party album.</p>
    `;
}

// Handle file upload from input
async function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    for (const file of files) {
        await uploadToDrive(file);
    }
    
    // Clear the input so same file can be uploaded again
    event.target.value = '';
}

// Upload file to Google Drive
async function uploadToDrive(file) {
    try {
        // Show loading state
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('successMessage').style.display = 'none';
        
        // Compress image if it's too large
        const compressedFile = await compressImageIfNeeded(file);
        
        // Create unique filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileExtension = file.name.split('.').pop();
        const newFileName = `SouthOs_${timestamp}.${fileExtension}`;
        
        // Prepare metadata
        const metadata = {
            name: newFileName,
            parents: [FOLDER_ID],
        };
        
        // Create form data for upload
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', compressedFile);
        
        // Get access token
        const token = gapi.auth.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        // Upload to Google Drive
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${token.access_token}`
            }),
            body: form,
        });
        
        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }
        
        // Show success message
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
        
        console.log('File uploaded successfully!');
        
        // Hide success message after 3 seconds
        setTimeout(() => {
            document.getElementById('successMessage').style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Upload error:', error);
        document.getElementById('loadingState').style.display = 'none';
        
        let errorMessage = 'Upload failed. Please try again.';
        if (error.message.includes('401')) {
            errorMessage = 'Please sign in again and try uploading.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Permission denied. Please check your Google Drive access.';
        }
        
        alert(errorMessage);
    }
}

// Compress image if needed (keep under 10MB)
async function compressImageIfNeeded(file) {
    // If file is not an image or already small enough, return as-is
    if (!file.type.startsWith('image/') || file.size < 10 * 1024 * 1024) {
        return file;
    }
    
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions (max 1920px)
            const maxDimension = 1920;
            let { width, height } = img;
            
            if (width > height && width > maxDimension) {
                height = (height * maxDimension) / width;
                width = maxDimension;
            } else if (height > maxDimension) {
                width = (width * maxDimension) / height;
                height = maxDimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob(
                (blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                },
                'image/jpeg',
                0.8 // 80% quality
            );
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Camera functionality
let cameraStream = null;

async function openCamera() {
    try {
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        const video = document.getElementById('cameraPreview');
        video.srcObject = cameraStream;
        
        // Show camera modal
        document.getElementById('cameraModal').style.display = 'block';
        
    } catch (error) {
        console.error('Camera error:', error);
        
        let errorMessage = 'Camera access denied. Please use "Upload from Phone" instead.';
        if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please use "Upload from Phone" instead.';
        } else if (error.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please enable camera access and try again.';
        }
        
        alert(errorMessage);
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Convert to blob and upload
    canvas.toBlob(async (blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `SouthOs_Camera_${timestamp}.jpg`, { type: 'image/jpeg' });
        
        closeCamera();
        await uploadToDrive(file);
    }, 'image/jpeg', 0.8);
}

function closeCamera() {
    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Hide camera modal
    document.getElementById('cameraModal').style.display = 'none';
}

// Close camera modal when clicking outside
document.getElementById('cameraModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCamera();
    }
});

// Handle errors globally
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
});

console.log('South O\'s Photo App loaded successfully!');