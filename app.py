from flask import Flask, render_template, request, jsonify
import os
import sys
from werkzeug.utils import secure_filename

# --- Environment Configuration ---
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress most TensorFlow logs

# --- Flask Configuration ---
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
app = Flask(__name__)

# Upload folder under static for direct serving
UPLOAD_FOLDER = os.path.join(app.root_path, "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# --- Model Configuration ---
MODEL_FILENAME = "plastic_classifier_model.keras"
MODEL_PATH = os.path.join(app.root_path, "plastic_classifier_model.keras")

model = None
model_load_error = None

# Must match your model output order
CLASS_NAMES = ["HDPE", "LDPE", "Other", "PET", "PP", "PS"]

# --- Load core dependencies ---
try:
    import numpy as np
    from keras.models import load_model
    from keras.preprocessing import image as keras_image_utils
except Exception as e:
    print("FATAL ERROR: Failed to import Keras/NumPy.")
    print(f"Details: {e}", file=sys.stderr)
    sys.exit(1)

# --- Load model at import time (works with Gunicorn) ---
if not os.path.exists(MODEL_PATH):
    model_load_error = f"Model file not found at {MODEL_PATH}"
    print(f"FATAL ERROR: {model_load_error}", file=sys.stderr)
else:
    try:
        print(f"Loading model from {MODEL_PATH}...")
        model = load_model(MODEL_PATH, compile=False)  # safer for Keras
        print("Model loaded successfully.")
    except Exception as e:
        model_load_error = f"Failed to load Keras model: {e}"
        print(f"FATAL ERROR: {model_load_error}", file=sys.stderr)


# --- Helper Functions ---
def allowed_file(filename):
    """Check if uploaded file extension is allowed."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def preprocess_image(image_path):
    """Load, resize, normalize, and expand image dimensions."""
    img = keras_image_utils.load_img(image_path, target_size=(128, 128))
    x = keras_image_utils.img_to_array(img) / 255.0
    x = np.expand_dims(x, axis=0)
    return x


# --- Routes ---
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
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
            img_array = preprocess_image(save_path)
            preds = model.predict(img_array)
            predicted_index = np.argmax(preds)
            predicted_class = CLASS_NAMES[predicted_index]
            confidence = float(preds[0][predicted_index])
        except Exception as e:
            if os.path.exists(save_path):
                os.remove(save_path)
            import traceback
            app.logger.error(
                "Prediction/Preprocessing failed:\n" + traceback.format_exc())
            return jsonify({"error": f"Processing error: {e}. Check server logs."}), 500

        image_url = f"/static/uploads/{filename}"
        return jsonify({
            "success": True,
            "prediction": predicted_class,
            "confidence": f"{confidence:.2f}",
            "image_url": image_url
        })

    return jsonify({"error": "Invalid file type"}), 400


# --- Only run server locally ---
if __name__ == "__main__":
    print("\n* Starting local Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True)
