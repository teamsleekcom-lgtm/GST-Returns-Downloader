import asyncio
import json
import os
import time
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException, NoSuchElementException

app = FastAPI()

# --- Static Frontend Serving ---
# Serve the built React frontend from a 'dist' folder alongside main.py
DIST_DIR = Path(__file__).parent / "dist"

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
        self.pause_requested = False
        self.skip_requested = False

state = EngineState()

def init_driver(download_dir):
    options = webdriver.ChromeOptions()
    # Instead of strict headless (which breaks JS/blob downloads on gov portals),
    # we use a massive negative window position to simulate a hidden background process
    # without triggering Chrome's headless anti-bot or download restrictions.
    options.add_argument("--window-position=-32000,-32000")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    
    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "plugins.always_open_pdf_externally": True,
        "safebrowsing.enabled": True,
        "profile.default_content_settings.popups": 0
    }
    options.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(options=options)
    # Give the page a generous load timeout to prevent early stacktraces on slow networks
    driver.set_page_load_timeout(45)
    return driver

def smart_click(driver, by, value, timeout=15):
    """Wait for element to be clickably present, with retry on stale reference."""
    end_time = time.time() + timeout
    while time.time() < end_time:
        try:
            el = WebDriverWait(driver, 2).until(EC.element_to_be_clickable((by, value)))
            el.click()
            return True
        except StaleElementReferenceException:
            continue
        except TimeoutException:
            pass # Keep trying until outer loop expires
    return False

def dismiss_gst_modals(driver):
    """Check for and dismiss common GST portal popups after login."""
    try:
        # Common text on dismiss buttons: Remind me later, Close, Later
        xpath = "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'remind me later') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'close') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'later')]"
        btns = driver.find_elements(By.XPATH, xpath)
        for btn in btns:
            if btn.is_displayed():
                try:
                    btn.click()
                    time.sleep(1)
                except:
                    pass
    except Exception:
        pass

async def send_log(msg, log_type='info'):
    await state.queue.put({"type": "log", "message": msg, "log_type": log_type})

async def send_progress(client_name, completed, total):
    await state.queue.put({
        "type": "progress", 
        "client": client_name, 
        "completed": completed, 
        "total": total
    })

async def request_captcha(base64_img=""):
    state.captcha_solved.clear()
    state.current_captcha = ""
    await state.queue.put({"type": "captcha", "message": "Please enter the characters shown below.", "image": base64_img})
    
    # Wait until the frontend posts the captcha
    await state.captcha_solved.wait()
    return state.current_captcha

async def process_downloads(payload):
    clients = payload.get('clients', [])
    returns = payload.get('returns', [])
    months = payload.get('months', [])
    fy = payload.get('fy', '2024-25')
    auto_organise = payload.get('autoOrganise', True)
    save_location = payload.get('saveLocation', os.path.join(os.path.expanduser("~"), "Downloads", "GST_Downloads"))
    download_format = payload.get('format', 'All')
    
    # Calculate totals
    total_files = len(clients) * len(returns) * max(1, len(months))
    completed = 0

    if not os.path.exists(save_location):
        os.makedirs(save_location)

    await send_log(f"Starting Engine. Target Format: {download_format}", "info")
    state.driver = init_driver(save_location)
    
    try:
        for client in clients:
            if state.stop_requested:
                break
            
            # Reset skip flag for each client
            state.skip_requested = False
                
            firm_name = client.get('name')
            username = client.get('username')
            password = client.get('password')
            
            # Setup dynamic download directory if auto_organise is checked
            client_dir = os.path.join(save_location, firm_name, fy) if auto_organise else save_location
            if auto_organise and not os.path.exists(client_dir):
                os.makedirs(client_dir)
            
            # Update Chrome pref on the fly for the active session
            state.driver.execute_cdp_cmd("Page.setDownloadBehavior", {
                "behavior": "allow",
                "downloadPath": client_dir
            })
            # Also use Browser level to ensure Blob/JS initiated downloads work
            try:
                state.driver.execute_cdp_cmd("Browser.setDownloadBehavior", {
                    "behavior": "allow",
                    "downloadPath": client_dir,
                    "eventsEnabled": True
                })
            except:
                pass
            
            await send_log(f"Processing client: {firm_name} (Saving to: {client_dir})", "info")
            await send_progress(firm_name, 0, total_files)
            
            state.driver.get("https://services.gst.gov.in/services/login")
            
            try:
                # Wait for the login page to fully load and expose the username field (up to 30 seconds)
                user_field = WebDriverWait(state.driver, 30).until(
                    EC.presence_of_element_located((By.ID, "username"))
                )
                
                # Basic login fill
                user_field.send_keys(username)
                state.driver.find_element(By.ID, "user_pass").send_keys(password)
                
                # Get Captcha Image B64
                captcha_b64 = ""
                try:
                    # Wait for image to actively load, not just be present
                    cap_img = WebDriverWait(state.driver, 10).until(
                        EC.visibility_of_element_located((By.XPATH, "//img[contains(@src, 'captcha') or contains(@id, 'captcha') or contains(@id, 'imgCaptcha')]"))
                    )
                    await asyncio.sleep(1) # Give it a second to render fully
                    
                    # Try native screenshot first
                    captcha_b64 = cap_img.screenshot_as_base64
                    
                    # If blank or extremely small, fallback to JavaScript canvas extraction
                    if not captcha_b64 or len(captcha_b64) < 1000:
                        captcha_b64 = state.driver.execute_script("""
                            var img = arguments[0];
                            var canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            var ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            return canvas.toDataURL('image/png').substring(22);
                        """, cap_img)
                        
                except Exception as e:
                    await send_log(f"Could not extract Captcha image visually: {str(e)}", "warning")
                
                # Request Captcha from user via UI
                captcha_val = await request_captcha(captcha_b64)
                state.driver.find_element(By.ID, "captcha").send_keys(captcha_val)
                state.driver.find_element(By.XPATH, "//button[contains(text(), 'Login')]").click()
                
                await send_log(f"Login submitted for {firm_name}. Waiting for dashboard...", "info")
                
                # Smart wait for dashboard to load & handle popups
                dashboard_loaded = False
                for _ in range(30): # Increased from 15 to 30 (seconds) for slow logins
                    if state.stop_requested:
                        break
                    
                    # Dismiss intersitials if they appear
                    dismiss_gst_modals(state.driver)
                    
                    try:
                        # Look for common dashboard indicator
                        elements = state.driver.find_elements(By.XPATH, "//a[contains(text(), 'Return Dashboard')] | //a[contains(text(), 'Logout')] | //button[contains(text(), 'Return Dashboard')]")
                        if any(e.is_displayed() for e in elements):
                            dashboard_loaded = True
                            break
                    except StaleElementReferenceException:
                        pass
                        
                    await asyncio.sleep(1)
                    
                if not dashboard_loaded and not state.stop_requested:
                    await send_log(f"Dashboard did not load in expected time for {firm_name}. Proceeding...", "warning")
                else:
                    await send_log(f"Login successful for {firm_name}", "success")
                
                for ret in returns:
                    if state.skip_requested or state.stop_requested:
                        break
                    for month in (months if months else ["Annual"]):
                        if state.skip_requested or state.stop_requested:
                            break
                        
                        # Respect pause
                        while state.pause_requested and not state.stop_requested:
                            await asyncio.sleep(1)
                            
                        format_str = f" [{download_format}]" if download_format != 'All' else ""
                        await send_log(f"Navigating to Returns Dashboard for {ret} - {month} FY {fy}{format_str}...", "info")
                        
                        # Navigate to Returns Dashboard
                        state.driver.get("https://services.gst.gov.in/services/returnsdashboard")
                        
                        try:
                            # Wait for FY dropdown to be present (increased to 30s)
                            WebDriverWait(state.driver, 30).until(EC.presence_of_element_located((By.ID, "finYear")))
                            
                            # Select Financial Year
                            fy_select = state.driver.find_element(By.ID, "finYear")
                            options = fy_select.find_elements(By.TAG_NAME, "option")
                            for option in options:
                                try:
                                    if fy in option.text:
                                        option.click()
                                        break
                                except StaleElementReferenceException:
                                    pass # Ignore stale options during iteration
                                    
                            await asyncio.sleep(3) # Wait for page/period dropdown to update via Ajax (slightly increased)
                            
                            # Select Month/Quarter
                            # Need to handle exact matching carefully because portal might refresh the dropdown
                            period_select_id = "taxPeriod"
                            WebDriverWait(state.driver, 30).until(EC.presence_of_element_located((By.ID, period_select_id)))
                            
                            month_long = {"Apr": "April", "May": "May", "Jun": "June", "Jul": "July", "Aug": "August", "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December", "Jan": "January", "Feb": "February", "Mar": "March"}.get(month, month)
                            
                            found_period = False
                            period_select = state.driver.find_element(By.ID, period_select_id)
                            period_options = period_select.find_elements(By.TAG_NAME, "option")
                            
                            for option in period_options:
                                try:
                                    # Use JS to get text safely to avoid some stale ref issues on rapid dropdown updates
                                    opt_text = state.driver.execute_script("return arguments[0].textContent;", option)
                                    if not opt_text: opt_text = option.text
                                    
                                    if month_long.lower() in opt_text.lower() or month.lower() in opt_text.lower():
                                        option.click()
                                        found_period = True
                                        break
                                except StaleElementReferenceException:
                                    continue
                                    
                            if not found_period:
                                await send_log(f"Could not find period {month} for {fy}. Skipping.", "warning")
                                continue
                                
                            await asyncio.sleep(1)
                            # Click Search
                            smart_click(state.driver, By.XPATH, "//button[contains(text(), 'Search')]", timeout=20)
                            
                            # Look for the specific Return box (e.g., GSTR-1, GSTR-3B) dynamically instead of blind sleeping
                            card_xpath = f"//div[contains(@class, 'col-sm-') and contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'gstr-{ret.lower()}')]"
                            
                            return_cards = []
                            try:
                                # Wait up to 20 seconds for the cards to actually render on the dashboard
                                WebDriverWait(state.driver, 20).until(EC.presence_of_element_located((By.XPATH, card_xpath)))
                                return_cards = state.driver.find_elements(By.XPATH, card_xpath)
                            except TimeoutException:
                                pass
                            
                            if not return_cards:
                                await send_log(f"Return {ret} not found on dashboard for {month} {fy}. Skipping.", "warning")
                                continue
                                
                            target_card = return_cards[0]
                            
                            # --- EXCEL DOWNLOAD ONLY ---
                            try:
                                # Look for "Prepare Offline" or "Download" using smart_click to ensure it's interactable
                                btn_xpath = ".//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'prepare offline') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'download')]"
                                smart_click(target_card, By.XPATH, btn_xpath, timeout=15)
                                
                                # Wait dynamically for the offline page to load (look for generation/download links)
                                dl_link_xpath = "//a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'click here to download') and contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'excel') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'click here to download - file')]"
                                gen_btn_xpath = "//a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'generate excel')] | //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'generate excel')]"
                                
                                try:
                                    # Wait up to 15 seconds for EITHER the download link OR the generate button to appear
                                    WebDriverWait(state.driver, 15).until(
                                        EC.presence_of_element_located((By.XPATH, f"{dl_link_xpath} | {gen_btn_xpath}"))
                                    )
                                except:
                                    pass # Might still be loading, logic below will handle it
                                
                                download_link = None
                                try:
                                    download_link = state.driver.find_element(By.XPATH, dl_link_xpath)
                                except:
                                    pass
                                    
                                if not download_link:
                                    # Click generate excel if no direct download link is there yet
                                    try:
                                        excel_btn = WebDriverWait(state.driver, 10).until(EC.element_to_be_clickable((By.XPATH, gen_btn_xpath)))
                                        excel_btn.click()
                                        await send_log(f"Requested Excel generation for {ret}. Waiting for file...", "info")
                                    except:
                                        # It might be a direct 'DOWNLOAD EXCEL' button without a 'click here' hyperlink later (like GSTR-2B sometimes)
                                        pass
                                    
                                    # Poll for the download link to appear (Wait up to 45 seconds)
                                    target_time = time.time() + 45
                                    while time.time() < target_time:
                                        try:
                                            # Also check if it instantly downloaded and there's no link
                                            link = state.driver.find_element(By.XPATH, dl_link_xpath)
                                            if link.is_displayed():
                                                download_link = link
                                                break
                                        except:
                                            pass
                                            
                                        # Wait a few seconds before checking again
                                        await asyncio.sleep(3)
                                
                                if download_link:
                                    # Use JS click to avoid 'element not interactable' errors if it's slightly hidden
                                    state.driver.execute_script("arguments[0].click();", download_link)
                                    await send_log(f"Triggered Excel file download for {ret}", "success")
                                    await asyncio.sleep(12)  # Wait for file to physically download to disk (Increased for larger zipped returns)
                                else:
                                    # Try a fallback blind click on 'Download Excel' if it's one of those immediate buttons
                                    try:
                                        fallback_btn = state.driver.find_element(By.XPATH, "//a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'download excel')] | //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'download excel')]")
                                        state.driver.execute_script("arguments[0].click();", fallback_btn)
                                        await send_log(f"Triggered direct Excel download for {ret}", "success")
                                        await asyncio.sleep(12)
                                    except:
                                        await send_log(f"Excel generation for {ret} is taking too long or file not found. Skipping.", "warning")
                                    
                            except Exception as e:
                                await send_log(f"Could not prepare offline Excel for {ret}: {str(e)}", "warning")
                                
                        except Exception as e:
                            await send_log(f"Navigation error for {ret} - {month}: {str(e)}", "error")
                            
                        # Wait a bit before next file to ensure downloads trigger and complete
                        await asyncio.sleep(3) 
                        completed += 1
                        await send_progress(firm_name, 1, total_files)
                        
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
    state.pause_requested = False
    state.skip_requested = False
    
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
        state.pause_requested = False  # Unpause if paused so the loop can exit
    elif action == "pause":
        state.pause_requested = not state.pause_requested  # Toggle pause
    elif action == "skip":
        state.skip_requested = True
    return {"status": "acknowledged", "action": action}

# --- Serve built React frontend (SPA catch-all) ---
# Mount static assets ONLY if dist folder exists
if DIST_DIR.exists() and DIST_DIR.is_dir():
    # Serve static assets (JS, CSS, images)
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")
    
    # SPA catch-all: serve index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try to serve actual files first
        file_path = DIST_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        # Fall back to index.html for SPA routing
        index_path = DIST_DIR / "index.html"
        if index_path.exists():
            return HTMLResponse(index_path.read_text())
        return Response("Frontend not built yet. Please run 'npm run build' in the frontend directory.", status_code=404)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7842)
