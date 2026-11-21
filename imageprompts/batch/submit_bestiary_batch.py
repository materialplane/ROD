import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv('.env')

BATCH_FILE = 'scratch/bestiary_batch_requests.jsonl'

if not os.path.exists(BATCH_FILE):
    print(f"Error: Batch requests file not found at {BATCH_FILE}")
    sys.exit(1)

client = genai.Client()

print(f"Uploading {BATCH_FILE} to Google Gemini Batch Queue (50% discount)...")
try:
    uploaded_file = client.files.upload(
        file=BATCH_FILE,
        config=types.UploadFileConfig(mime_type="application/jsonl")
    )
    print(f"File uploaded successfully! URI: {uploaded_file.name}")

    print("Creating batch job for models/gemini-3-pro-image (1:1 4K)...")
    job = client.batches.create(
        src=uploaded_file.name,
        model="models/gemini-3-pro-image"
    )
    
    print("\n" + "="*60)
    print("SUCCESSFULLY CREATED BATCH JOB!")
    print(f"Job Name: {job.name}")
    print(f"Job State: {job.state.name}")
    print("="*60)
    print("Remember to record this Job Name in .agents/AGENTS.md under BATCH JOB RECORD.")
    
except Exception as e:
    print(f"Error submitting batch: {e}")
    sys.exit(1)
