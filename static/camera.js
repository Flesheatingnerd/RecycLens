/**
 * camera.js - Handles camera access, streaming, and capturing a photo.
 * * It relies on window.handleFile being defined in upload.js to process the captured image.
 */

// --- Camera Variables ---
let cameraStream = null;
let cameraCanvas = document.createElement('canvas'); // Use an off-screen canvas for capture

// --- DOM Elements ---
const cameraFeed = document.getElementById('cameraFeed');
const btnScan = document.querySelector('.btn-scan'); // The button to start the camera interface
const snapBtn = document.getElementById('snapBtn');
const cameraInterface = document.getElementById('cameraInterface');
const dropzone = document.getElementById('dropzone');

// --- Utility Functions (Local) ---

/**
 * Starts the camera stream.
 */
async function startCamera() {
    if (!cameraFeed) return;
    
    try {
        // Request camera access, preferring the back camera ('environment')
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });

        // Set video stream and play
        cameraFeed.srcObject = cameraStream;
        await cameraFeed.play();

        // Update UI
        if (cameraInterface) cameraInterface.style.display = 'flex';
        if (dropzone) dropzone.style.display = 'none';
        if (btnScan) btnScan.style.display = 'none';

    } catch (error) {
        alert('Unable to access camera. Please check permissions.');
        console.error('Camera error:', error);
        // Clean up on error
        stopCamera();
    }
}

/**
 * Stops the camera stream.
 */
function stopCamera() {
    if (cameraStream) {
        // Stop all tracks
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    // Reset UI state
    if (cameraFeed) cameraFeed.srcObject = null;
    if (cameraInterface) cameraInterface.style.display = 'none';
    if (dropzone) dropzone.style.display = 'flex';
    if (btnScan) btnScan.style.display = 'block';
}

/**
 * Captures a photo from the camera feed.
 */
function capturePhoto() {
    if (!cameraStream || !cameraFeed) return;

    try {
        const context = cameraCanvas.getContext('2d');

        // Set canvas size to match video's current resolution
        cameraCanvas.width = cameraFeed.videoWidth;
        cameraCanvas.height = cameraFeed.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);

        // Convert canvas to a File object
        cameraCanvas.toBlob((blob) => {
            if (blob) {
                const timestamp = new Date().getTime();
                const capturedFile = new File(
                    [blob],
                    `camera_capture_${timestamp}.jpg`,
                    { type: 'image/jpeg' }
                );

                // Stop the camera preview
                stopCamera(); 
                
                // CRITICAL: Pass the captured file to the main upload script's handler
                // Pass 'true' to auto-classify immediately after processing
                if (window.handleFile) {
                    window.handleFile(capturedFile, true); // CHANGED: Added 'true'
                } else {
                    alert('Error: Classification logic not loaded. Cannot process image.');
                }
            } else {
                alert('Failed to create image file from capture.');
            }
        }, 'image/jpeg', 0.9); // Use JPEG format with quality 0.9

    } catch (error) {
        alert('Failed to capture photo. Check console for details.');
        console.error('Capture error:', error);
    }
}

// --- Initialization ---

function initCamera() {
    // Start camera when 'Scan using camera' button is clicked
    if (btnScan) {
        btnScan.addEventListener('click', startCamera);
    }

    // Capture photo when 'Take Photo' button is clicked
    if (snapBtn) {
        snapBtn.addEventListener('click', capturePhoto);
    }
}

document.addEventListener('DOMContentLoaded', initCamera);
