import os
from dotenv import load_dotenv
from google import genai
load_dotenv('.env')
client = genai.Client()

job = client.batches.get(name='batches/ijngehgh908fwrp36p4mvdfwtj99isteldp3')

for resp in job.dest.inlined_responses:
    print(dir(resp))
    if hasattr(resp, 'custom_id'):
         print(f"custom_id: {resp.custom_id}")
    elif hasattr(resp, 'request') and hasattr(resp.request, 'custom_id'):
         print(f"req custom_id: {resp.request.custom_id}")
    break
