/**
 * upload.js - Handles file upload, drag & drop, classification, and result display.
 */

// --- Global Variables ---
let selectedFile = null;

// --- DOM Elements (Defined globally for easy access) ---
const submitBtn = document.getElementById('submitBtn');

// --- Utility Functions ---

/**
 * Helper to show the classification button's loading state.
 */
function showLoading(button) {
    if (!button) return;
    button.disabled = true;
    const spinner = button.querySelector('.spinner');
    const buttonText = button.querySelector('.button-text');
    if (spinner) spinner.style.display = 'inline-block';
    if (buttonText) buttonText.textContent = 'Classifying...';
}

/**
 * Helper to hide the classification button's loading state.
 */
function hideLoading(button) {
    if (!button) return;
    button.disabled = false;
    const spinner = button.querySelector('.spinner');
    const buttonText = button.querySelector('.button-text');
    if (spinner) spinner.style.display = 'none';
    if (buttonText) buttonText.textContent = 'Classify Plastic';
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
    if (predictionText) predictionText.textContent = data.prediction; // e.g., "HDPE"
    
    // Display the results panel
    if (uploadForm) uploadForm.style.display = 'none';
    if (resultsPanel) resultsPanel.style.display = 'flex';

    // Clear the visual preview
    if (preview) {
        preview.style.backgroundImage = 'none';
        preview.setAttribute('aria-hidden', 'true');
        preview.classList.remove('active');
    }
}

// --- File Handling Functions ---

/**
 * Processes a single selected file (from drag/drop, input, or camera).
 * @param {File} file - The image file to process.
 * @param {boolean} [autoClassify=false] - If true, classification is called immediately.
 */
function handleFile(file, autoClassify = false) { 
    const dropzone = document.getElementById('dropzone');
    const preview = document.getElementById('preview');

    // Basic file validation
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
        if (preview) {
            preview.style.backgroundImage = `url('${e.target.result}')`;
            preview.classList.add('active');
            preview.setAttribute('aria-hidden', 'false');
        }

        // 🟢 HIDE TEXT: Get the text span
        const dropzoneText = dropzone ? dropzone.querySelector('.dropzone-text') : null;

        if (dropzoneText) {
            // Hide the default text
            dropzoneText.style.display = 'none';
        }

        // Explicitly ensure the submit button is enabled
        if (submitBtn) {
            submitBtn.disabled = false;
        }
        
        // Auto-classify if the flag is set (from camera)
        if (autoClassify) {
            classifyImage(null); 
        }
    };
    reader.readAsDataURL(file);
}

/**
 * Handles the classification submission.
 */
async function classifyImage(e) {
    if (e) e.preventDefault(); // Only prevent default if called by a form submit event

    if (!selectedFile) {
        alert('Please select an image first.');
        return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        showLoading(submitBtn);

        const response = await fetch('/predict', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
            displayResults(data);
        } else {
            alert(`Classification Error: ${data.error || 'Unknown error'}`);
            console.error('Prediction failed:', data.error);
        }
    } catch (error) {
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
    
    // Ensure drag-over class is removed immediately
    e.currentTarget.classList.remove('drag-over'); 
    
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
        // Pass the dropped file to the common handling function (NO auto-classify)
        handleFile(files[0]);
        
        // Scroll to the button to guide the user
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        alert('Drag & drop failed. Please click to select a file.');
    }
}

function handleFileInputChange(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // Pass the selected file to the common handling function (NO auto-classify)
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
             // Only trigger if a file isn't already selected
            if (!selectedFile && fileInput) {
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
    const resultsPanel = document.getElementById('resultsPanel');
    if (uploadForm) uploadForm.style.display = 'block';
    if (resultsPanel) resultsPanel.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', initUpload);
