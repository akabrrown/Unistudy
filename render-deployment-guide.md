# Render Deployment Guide

Here is a step-by-step guide on how to deploy both your Node.js Backend and your Python Converter to Render.

Since both of your projects are inside the same repository (in the `backend` and `converter` folders respectively), you will create **two separate Web Services** on Render, pointing to the exact same GitHub repository but using different **Root Directories**.

### Step 0: Push to GitHub
Make sure all your latest code is committed and pushed to your GitHub repository on the `main` branch.

---

### Step 1: Deploy the Node.js Backend

1. Log into your [Render Dashboard](https://dashboard.render.com/) and click **New** -> **Web Service**.
2. Connect your GitHub account and select your `Unistudy` repository.
3. Configure the Web Service exactly like this:
   * **Name**: `unistudy-backend` *(or whatever you prefer)*
   * **Root Directory**: `backend` *(⚠️ Critical step so Render knows where to look!)*
   * **Environment**: `Node`
   * **Region**: Choose the one closest to you (e.g., US East, Frankfurt).
   * **Branch**: `main`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
4. **Environment Variables**: Scroll down and click **Advanced** -> **Add Environment Variable**. You need to copy all the variables from your local `backend/.env` file here (e.g., Supabase keys, API keys).
5. Click **Create Web Service**.

---

### Step 2: Deploy the Python Converter

1. Go back to the Render Dashboard and click **New** -> **Web Service** again.
2. Select the **exact same** `Unistudy` repository.
3. Configure this Web Service like this:
   * **Name**: `unistudy-converter`
   * **Root Directory**: `converter` *(⚠️ Critical step!)*
   * **Environment**: `Python 3`
   * **Region**: Choose the same one you picked for the backend.
   * **Branch**: `main`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000` *(Render routes traffic to port 10000 by default for Python apps)*
4. **Environment Variables**: Open the **Advanced** section and add all the variables from your local `converter/.env` file.
5. Click **Create Web Service**.

---

### Step 3: Update your Frontend
Once both services are successfully deployed, Render will give you public URLs for both (e.g., `https://unistudy-backend.onrender.com` and `https://unistudy-converter.onrender.com`).

You will need to go into your frontend code and your `.env.local` file, and replace your local URLs (like `http://localhost:3000` and `http://localhost:8000`) with the new production URLs provided by Render.
