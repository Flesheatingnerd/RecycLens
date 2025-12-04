/**
 * upload.js - Handles file upload, drag & drop, classification, and result display.
 * * Note: Based on your index.html, some IDs from the combined script 
 * (like uploadArea, classifyBtn, resultsSection, etc.) have been renamed 
 * to match your existing HTML structure (e.g., #dropzone, #submitBtn, #resultsPanel).
 */

// --- Global Variables ---
// Shared variable to hold the file selected from drag/drop, input, or camera
let selectedFile = null;

// --- Utility Functions ---

/**
 * Helper to show the classification button's loading state.
 */
function showLoading(button) {
    if (!button) return;
    button.disabled = true;
    button.querySelector('.spinner').style.display = 'inline-block';
    button.querySelector('.button-text').textContent = 'Classifying...';
}

/**
 * Helper to hide the classification button's loading state.
 */
function hideLoading(button) {
    if (!button) return;
    button.disabled = false;
    button.querySelector('.spinner').style.display = 'none';
    button.querySelector('.button-text').textContent = 'Classify Plastic';
}

/**
 * Displays the results panel and hides the form.
 * @param {object} data - The prediction data from the server.
 */
function displayResults(data) {
    const uploadForm = document.getElementById('uploadForm');
    const resultsPanel = document.getElementById('resultsPanel');
    const predictionText = document.getElementById('predictionText');
    const preview = document.getElementById('preview');

    // Update UI elements
    predictionText.textContent = data.prediction; // e.g., "HDPE"
    
    // Display the results panel
    uploadForm.style.display = 'none';
    resultsPanel.style.display = 'flex';

    // Clear the visual preview
    preview.style.backgroundImage = 'none';
    preview.setAttribute('aria-hidden', 'true');
    preview.classList.remove('active');
}

// --- File Handling Functions ---

/**
 * Processes a single selected file (from drag/drop, input, or camera).
 * @param {File} file - The image file to process.
 */
function handleFile(file) {
    const dropzone = document.getElementById('dropzone');
    const preview = document.getElementById('preview');
    const submitBtn = document.getElementById('submitBtn');

    // Basic file validation (only accepts what the input accepts)
    const allowedExtensions = ["png", "jpg", "jpeg"];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
        alert('Invalid file type. Please upload a PNG, JPG, or JPEG image.');
        return;
    }

    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        preview.style.backgroundImage = `url('${e.target.result}')`;
        preview.classList.add('active');
        preview.setAttribute('aria-hidden', 'false');

        // Update dropzone text (optional, but good feedback)
        dropzone.querySelector('.dropzone-text').textContent = `File: ${file.name}`;
    };
    reader.readAsDataURL(file);

    // Enable the submit button
    submitBtn.disabled = false;
}

/**
 * Handles the classification submission.
 * This is called by the form submit event listener in initEventListeners.
 */
async function classifyImage(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const dropzone = document.getElementById('dropzone');

    if (!selectedFile) {
        alert('Please select an image first.');
        return;
    }

    const formData = new FormData();
    // CRITICAL: The 'file' key must match the Flask route's expectation
    formData.append('file', selectedFile);

    try {
        showLoading(submitBtn);

        // Fetch API is used to handle the form submission asynchronously
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
            displayResults(data);
        } else {
            // Handle server-side errors
            alert(`Classification Error: ${data.error || 'Unknown error'}`);
            console.error('Prediction failed:', data.error);
        }
    } catch (error) {
        // Handle network or script errors
        alert('A network error occurred during classification. Check console.');
        console.error('Fetch error:', error);
    } finally {
        hideLoading(submitBtn);
    }
}

// --- Event Handlers (File Input & Drag/Drop) ---

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        // Pass the dropped file to the common handling function
        handleFile(files[0]);
    }
}

function handleFileInputChange(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // Pass the selected file to the common handling function
        handleFile(files[0]);
    }
}

// --- Initialization ---

function initUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const resetBtn = document.getElementById('resetBtn');

    // Drag and drop events
    if (dropzone) {
        dropzone.addEventListener('dragover', handleDragOver);
        dropzone.addEventListener('dragleave', handleDragLeave);
        dropzone.addEventListener('drop', handleDrop);
        
        // Click dropzone to trigger hidden file input
        dropzone.addEventListener('click', () => {
             // Only trigger if a file isn't already selected and preview isn't active
            if (!selectedFile) {
                fileInput.click();
            }
        });
    }

    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', handleFileInputChange);
    }

    // Form submission
    if (uploadForm) {
        uploadForm.addEventListener('submit', classifyImage);
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.reload(); // Simple refresh to reset state
        });
    }

    // Export the file handler function so camera.js can use it
    window.handleFile = handleFile; 
    
    // Ensure the form is visible on load and results are hidden
    if (uploadForm) uploadForm.style.display = 'block';
    const resultsPanel = document.getElementById('resultsPanel');
    if (resultsPanel) resultsPanel.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', initUpload);