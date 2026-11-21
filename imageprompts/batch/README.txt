================================================================================
MUNDANE REALMS - GOOGLE GEMINI BATCH IMAGE QUEUE SETUP & WORKFLOW GUIDE
================================================================================

OVERVIEW
--------
This directory contains the pipeline scripts used to build, submit, monitor, 
and extract AI image generation jobs using Google Gemini's Batch API. 
Submitting via the batch queue gives a 50% discount compared to real-time 
interactive API calls and processes tasks asynchronously.

TARGET MODEL
------------
Model Name: models/gemini-3.1-flash-image
Response Modality: IMAGE


STEP-BY-STEP WORKFLOW FOR AN AI ASSISTANT
-----------------------------------------

1. BUILD PROMPTS (JSONL FORMAT)
   Each batch job requires a newline-delimited JSON (.jsonl) file where every 
   line is a complete request object containing:
   - "customId": A unique, human-readable identifier for the generation
   - "request":
     - "model": "models/gemini-3.1-flash-image"
     - "contents": [{"parts": [{"text": "<PROMPT TEXT>"}]}]
     - "generationConfig":
       - "responseModalities": ["IMAGE"]
       - "aspectRatio": "1:1" (for icons/sheets) or "16:9" (for environments)

   Reference generator scripts:
   - generate_final_batch.py: Chunks items into 4x4 sprite sheets with flat magenta backgrounds (#FF00FF).
   - build_events_batch.py: Builds landscape/scene prompts for exploration events.
   - generate_batch.py: Parses prompts directly from wiki documentation templates.

2. SUBMIT TO THE BATCH QUEUE
   To submit requests:
   a. Load environment variables from .env to initialize the Google GenAI SDK client.
   b. Upload the prepared .jsonl file using client.files.upload with mime_type "application/jsonl".
   c. Create the batch job using client.batches.create(src=file_uri, model="models/gemini-3.1-flash-image").
   
   Reference submission scripts:
   - submit_batch.py: Submits an existing JSONL file.
   - submit_events_batch.py: Uploads and submits event prompts.
   - submit_final_batch.py: Combined script that generates the file and submits in one pass.

3. MANDATORY LOGGING
   Whenever a batch job is successfully submitted:
   - Record the Job Name (e.g., batches/xxxxxxxxxxxxxxxxxxxxxxxx) in .agents/AGENTS.md 
     under the BATCH JOB RECORD section with its status (Pending / IN_PROGRESS).
   - Never skip this step; subsequent AI sessions rely on this record to track and download jobs.

4. MONITOR JOB PROGRESS
   - Check status using inspect_batch.py by providing the job name.
   - Typical completion times range from a few minutes to several hours depending on queue load.
   - When finished, the job state changes to JOB_STATE_SUCCEEDED.

5. DOWNLOAD RESULTS & EXTRACT IMAGES
   - Use download_batch.py to download the output JSONL file produced by the completed batch.
   - Run extract_all_batch_images.py to parse the returned base64 image data, decode the bytes, 
     and save individual PNG/JPG images to their designated asset destinations.

6. UTILITIES
   - cancel_batch.py: Use to abort a job if incorrect prompts or errors are identified before completion.


CRITICAL SAFETY RULES FOR ASSISTANTS
-------------------------------------
1. USER APPROVAL REQUIRED: Never invoke client.batches.create or execute live API scripts without explicit user permission.
2. NO CODE IN CHAT: The user is not a developer; communicate status and explanations in plain English summaries without displaying code snippets.
3. CONSERVE CONTEXT: Work with targeted line ranges and avoid reading entire asset files or generated image payloads into conversational memory.
================================================================================
