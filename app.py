from flask import Flask, render_template, request, jsonify
import os
from werkzeug.utils import secure_filename
import sys
import os  # Import os again for environment variables

# --- Environment Configuration ---
# Suppress most TensorFlow logging messages for a cleaner console
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# --- Global Dependency Initialization ---
try:
    # Use standard Keras imports
    import numpy as np
    from keras.models import load_model
    from keras.preprocessing import image as keras_image_utils
except Exception as e:
    print("FATAL ERROR: Failed to load core dependencies (Keras/NumPy).")
    print(f"Error details: {e}")
    sys.exit(1)  # Exit immediately if dependencies fail

# --- Flask Configuration ---
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
app = Flask(__name__)

# Store uploads under the app static folder so they can be served directly
# Using 'static' folder is crucial for serving images to the web client
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# --- Model Configuration ---
MODEL_PATH = os.path.join(app.root_path, "plastic_classifier_model.keras")
model = None
model_load_error = None

# CRITICAL: CLASS_NAMES must match the model's output order from training
CLASS_NAMES = ["HDPE", "LDPE", "Other", "PET", "PP", "PS"]


def allowed_file(filename):
    """Checks if the file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def preprocess_image(image_path):
    """Loads, resizes, normalizes, and expands dimensions of the image."""

    # 1. Load and resize the image
    img = keras_image_utils.load_img(image_path, target_size=(128, 128))

    # 2. Convert to array and normalize (0-255 to 0-1)
    x = keras_image_utils.img_to_array(img) / 255.0

    # 3. Expand dimensions for the model (batch size)
    x = np.expand_dims(x, axis=0)

    return x

# --- Routes ---


@app.route("/")
def index():
    """Renders the main upload page (index.html)."""
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    """Handles file upload, preprocessing, and model prediction."""
    global model, model_load_error

    if model is None:
        return jsonify({"error": f"Model not loaded: {model_load_error}"}), 500

    if "file" not in request.files:
        return jsonify({"error": "No file attached"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(save_path)

        try:
            # 1. Preprocess the image
            img_array = preprocess_image(save_path)

            # 2. Predict using the model
            preds = model.predict(img_array)

            # 3. Get results
            predicted_index = np.argmax(preds)
            predicted_class = CLASS_NAMES[predicted_index]
            confidence = float(preds[0][predicted_index])

        except Exception as e:
            # Clean up the file and log error
            if os.path.exists(save_path):
                os.remove(save_path)
            import traceback
            app.logger.error(
                "Prediction/Preprocessing failed:\n" + traceback.format_exc())
            return jsonify({"error": f"Processing error: {e}. Check server logs."}), 500

        # Return JSON success response
        # The URL must match the static folder structure: /static/uploads/filename
        image_url = f"/static/uploads/{filename}"

        return jsonify({
            "success": True,
            "prediction": predicted_class,
            "confidence": f"{confidence:.2f}",
            "image_url": image_url
        })

    return jsonify({"error": "Invalid file type"}), 400


if __name__ == "__main__":

    # --- Model Loading at Startup (Only once) ---
    if not os.path.exists(MODEL_PATH):
        model_load_error = f"Model file not found at {MODEL_PATH}."
        print(f"FATAL ERROR: {model_load_error}", file=sys.stderr)
    else:
        try:
            print(f"Loading model from {MODEL_PATH}...")
            # Use the cleaner 'load_model' imported from keras.models
            model = load_model(MODEL_PATH)
            print("Model loaded successfully.")
        except Exception as e:
            model_load_error = f"Failed to load Keras model: {e}"
            print(f"FATAL ERROR: {model_load_error}", file=sys.stderr)

    # *** Deployment Fix: Set debug to False to prevent double-loading and restarting ***
    print("\n* Starting server for plastic classification...")
    app.run(host='0.0.0.0', port=5000, debug=False)
