import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv('.env')
client = genai.Client()

print("Uploading FIXED final batch file to Google Cloud...")
try:
    uploaded_file = client.files.upload(
        file='scratch/final_images_batch_fixed.txt',
        config=types.UploadFileConfig(mime_type="application/jsonl")
    )
    print(f"File uploaded successfully! File URI: {uploaded_file.name}")

    print("Submitting the 50% Off Batch Job...")
    job = client.batches.create(
        src=uploaded_file.name,
        model="models/gemini-3.1-flash-image"
    )
    print(f"Batch Job Created!")
    print(f"Job Name: {job.name}")
    print(f"Job State: {job.state.name}")
    
except Exception as e:
    print(f"Error submitting batch: {e}")
