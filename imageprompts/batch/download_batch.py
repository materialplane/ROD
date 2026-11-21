import os
import sys
from dotenv import load_dotenv
from google import genai

load_dotenv()
client = genai.Client()

batch_id = "batches/tiz95273402fhl7r4oy2vb5vocpv21p2nlf4"
if len(sys.argv) > 1:
    batch_id = sys.argv[1]

try:
    job = client.batches.get(name=batch_id)
    if hasattr(job, 'dest') and getattr(job.dest, 'inlined_responses', None):
        print(f"Found {len(job.dest.inlined_responses)} responses in batch...")
        for resp in job.dest.inlined_responses:
            filename = resp.metadata['filename'] + '.jpg'
            path = os.path.join('apps', 'client', 'public', 'assets', 'ui', filename)
            
            parts = resp.response.candidates[0].content.parts
            if parts and parts[0].inline_data:
                with open(path, 'wb') as f:
                    f.write(parts[0].inline_data.data)
                print(f"Saved {path}")
    else:
        print("No inlined_responses found on this job destination.")
except Exception as e:
    print(f"Error processing: {e}")
