# Vinegar APK-ready project

This ZIP is prepared for a cloud GitHub Actions build.

## Build APK without Android Studio

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository.
3. Open the **Actions** tab.
4. Select **Build Android APK**.
5. Click **Run workflow**.
6. When it finishes, open the workflow run and download the **Vinegar-debug-APK** artifact.

The workflow installs dependencies, builds the Vite app, adds Android through Capacitor, builds a debug APK, and uploads it as an artifact.

## Important API note

If the app still uses `http://localhost:8787` as its API base, that backend address will not work on a physical phone. Replace it with a reachable HTTPS backend URL before relying on search or music features.
