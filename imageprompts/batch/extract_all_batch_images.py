import os
import base64
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(dotenv_path="apps/api/.env")
client = genai.Client()

OUTPUT_DIR = 'apps/client/public/assets/items'

# Let's list all batch jobs and extract ANY that have succeeded and have images
def main():
    print("Listing all batch jobs...")
    jobs = client.batches.list()
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for job in jobs:
        print(f"Checking Job {job.name} - Status: {job.state.name}")
        if job.state.name == 'JOB_STATE_SUCCEEDED':
            responses = job.dest.inlined_responses
            if responses:
                print(f"  Found {len(responses)} inlined responses.")
                for idx, resp in enumerate(responses):
                    # In Gemini Image batch, metadata usually has something
                    filename = None
                    if resp.metadata:
                         filename = resp.metadata.get('filename')
                    if not filename:
                        filename = f"{job.name.replace('/', '_')}_{idx}.png"

                    # If it's an image, save it
                    # Inlined responses can contain parts
                    for part in resp.parts:
                        if getattr(part, 'inline_data', None) and part.inline_data.mime_type.startswith('image'):
                            out_path = os.path.join(OUTPUT_DIR, filename)
                            if not os.path.exists(out_path):
                                print(f"  -> Saving {filename}")
                                with open(out_path, 'wb') as f:
                                    f.write(base64.b64decode(part.inline_data.data))
            else:
                print("  No inlined responses.")

if __name__ == '__main__':
    main()
