from flask import Flask, jsonify, request
import json

app = Flask(__name__)

# Load app data once at startup
with open("apps.json", "r", encoding="utf-8") as f:
    data = json.load(f)

@app.route("/")
def home():
    return jsonify({"message": "Welcome to the TrackFree.me API"}), 200

@app.route("/apps", methods=["GET"])
def get_all_apps():
    apps = [app["name"] for app in data["apps"]]
    return jsonify({"apps": apps}), 200

@app.route("/apps/<string:app_name>", methods=["GET"])
def get_app_details(app_name):
    app_info = next((app for app in data["apps"] if app["name"].lower() == app_name.lower()), None)
    if not app_info:
        return jsonify({"error": "App not found"}), 404
    return jsonify(app_info), 200

if __name__ == "__main__":
    app.run(debug=True)
