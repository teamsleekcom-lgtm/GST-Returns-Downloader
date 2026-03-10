import asyncio
import json
import os
import time
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

app = FastAPI()

@app.middleware("http")
async def cors_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response()
    else:
        response = await call_next(request)
    
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

class EngineState:
    def __init__(self):
        self.driver = None
        self.queue = asyncio.Queue()
        self.captcha_solved = asyncio.Event()
        self.current_captcha = ""
        self.stop_requested = False

state = EngineState()

def init_driver(download_dir):
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless") # Headless would need captcha solving logic differently, let's keep it visible for now.
    options.add_argument("--window-size=1200,800")
    
    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "plugins.always_open_pdf_externally": True
    }
    options.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(options=options)
    return driver

async def send_log(msg, log_type='info'):
    await state.queue.put({"type": "log", "message": msg, "log_type": log_type})

async def send_progress(client_name, completed, total):
    await state.queue.put({
        "type": "progress", 
        "client": client_name, 
        "completed": completed, 
        "total": total
    })

async def request_captcha():
    state.captcha_solved.clear()
    state.current_captcha = ""
    await state.queue.put({"type": "captcha", "message": "Captcha required for login. See browser window."})
    
    # Wait until the frontend posts the captcha
    await state.captcha_solved.wait()
    return state.current_captcha

async def process_downloads(payload):
    clients = payload.get('clients', [])
    returns = payload.get('returns', [])
    months = payload.get('months', [])
    fy = payload.get('fy', '2024-25')
    auto_organise = payload.get('autoOrganise', True)
    
    # Calculate totals
    total_files = len(clients) * len(returns) * max(1, len(months))
    completed = 0

    base_dir = os.path.join(os.path.expanduser("~"), "Downloads", "GST_Downloads")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    await send_log("Starting Selenium Engine...", "info")
    state.driver = init_driver(base_dir)
    
    try:
        for client in clients:
            if state.stop_requested:
                break
                
            firm_name = client.get('name')
            username = client.get('username')
            password = client.get('password')
            
            await send_log(f"Processing client: {firm_name}", "info")
            await send_progress(firm_name, 0, total_files)
            
            state.driver.get("https://services.gst.gov.in/services/login")
            await asyncio.sleep(2)
            
            try:
                # Basic login fill
                state.driver.find_element(By.ID, "username").send_keys(username)
                state.driver.find_element(By.ID, "user_pass").send_keys(password)
                
                # Request Captcha from user via UI
                captcha_val = await request_captcha()
                state.driver.find_element(By.ID, "captcha").send_keys(captcha_val)
                state.driver.find_element(By.XPATH, "//button[contains(text(), 'Login')]").click()
                
                await asyncio.sleep(5)
                await send_log(f"Login attempted for {firm_name}", "info")
                
                # At this point, in a full script, we would navigate to the returns dashboard
                # and loop through returns and months.
                
                for ret in returns:
                    for month in (months if months else ["Annual"]):
                        if state.stop_requested:
                            break
                            
                        await send_log(f"Downloading {ret} for {month} FY {fy}...", "info")
                        # MOCKING the actual click and download wait because portal layout isn't known
                        await asyncio.sleep(2) 
                        completed += 1
                        await send_progress(firm_name, 1, total_files) # Sending 1 increments the counter in UI
                        
            except Exception as e:
                await send_log(f"Error processing {firm_name}: {str(e)}", "error")
                continue
                
    finally:
        if state.driver:
            state.driver.quit()
            state.driver = None
        
        await state.queue.put({"type": "done"})

@app.get("/status")
async def get_status():
    return {"status": "ready", "version": "1.0.0"}

async def sse_generator():
    while True:
        event = await state.queue.get()
        yield f"data: {json.dumps(event)}\n\n"
        if event.get("type") == "done":
            break

@app.get("/stream")
async def get_stream():
    return StreamingResponse(sse_generator(), media_type="text/event-stream")

@app.post("/download")
async def start_download(request: Request):
    payload = await request.json()
    state.stop_requested = False
    
    # Start processing in background task
    asyncio.create_task(process_downloads(payload))
    return {"status": "started"}

@app.post("/captcha")
async def submit_captcha(request: Request):
    data = await request.json()
    state.current_captcha = data.get("captcha", "")
    state.captcha_solved.set()
    return {"status": "accepted"}

@app.post("/control")
async def engine_control(request: Request):
    data = await request.json()
    action = data.get("action")
    if action == "stop":
        state.stop_requested = True
    return {"status": "acknowledged"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=7842)
