import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()

job_name = "batches/j7iqrxhf5v2ghdb6obmm7hpheqwpd9ekxq06"
try:
    print(f"Attempting to delete/cancel {job_name}...")
    client.batches.delete(name=job_name)
    print("Successfully cancelled the batch job.")
except Exception as e:
    print(f"Error cancelling job: {e}")
