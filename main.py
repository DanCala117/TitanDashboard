import datetime
from flask import Flask, render_template, jsonify, request
from testrail import *
import redis
import json
import threading
import time
import os
import requests
from dotenv import load_dotenv
import re
from testrail import APIClient


PROJECT_ID = 5

# Load environment variables from .env file
load_dotenv()

def get_dotenv_secret(key):
    """Retrieve a secret from environment variables"""
    value = os.environ.get(key)
    if not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value

app = Flask(__name__, static_folder='static')

#---------------------------------------------------------------
# Important: Don't Write/Delete any key from the redis server
#---------------------------------------------------------------

# Configuration
testrail_api_key = '6cACQhmWJyZu2iEQK51i-jtRh0SFiwwQy01dXBo94'
SERVER_ADDRESS = 'titan.zebra.lan'
TESTRAIL_EMAIL = 'daniel.calabrese@zebra.com'
TESTRAIL_API_KEY = testrail_api_key
 
# TUSC_Unit class to represent a unit
class TUSC_Unit:
    def __init__(self, data):
        self.cradle_address = data.get('cradle_address', data.get('cradleaddress', '-'))
        self.status = data.get('status', '-')
        self.debugging = data.get('debugging', '-')
        self.customparameters = data.get('customparameters', '-')
        self.testrail_status = data.get('testrail_status', '-')
        self.tag = data.get('tag', '-')
        self.address = data.get('address', None)
        self.last_checked = data.get('last_checked', '-')
        self.redis_key = data.get('redis_key', '-')

    def is_target_address(self):
        # Only match addresses starting with '10.61.214.'
        return self.address is not None and self.address.startswith('10.61.214.')

# Configure Redis connection (adjust host/port/db as needed)
redis_client = redis.Redis(host='titan.zebra.lan', port=6379, db=1, decode_responses=True)
client = APIClient('http://titan.zebra.lan/testrail')
client.user = 'daniel.calabrese@zebra.com'
client.password = TESTRAIL_API_KEY

# Global cache for units
units_cache = []
cache_lock = threading.Lock()
is_initial_load = True

# dan
def get_test_plans():
    url = f'http://{SERVER_ADDRESS}/testrail/index.php?/api/v2/get_plans/{PROJECT_ID}'
    auth = (TESTRAIL_EMAIL, TESTRAIL_API_KEY)
    headers = {'Content-Type': 'application/json'}
    response = requests.get(url, auth=auth)
    
    if response.status_code != 200:
        return response.json()
    else:
        return None

def load_units_to_cache():
    global is_initial_load
    
    while True:
        if is_initial_load:
            # Only clear on initial load
            with cache_lock:
                units_cache.clear()
        
        keys = redis_client.keys('*')
        unique_units = set(k.split('.')[0] for k in keys)
        
        # idk, it just works
        yesterday_timestamp = 1660587200
        
        test_run = client.send_get(f'get_runs/{PROJECT_ID}&created_after={yesterday_timestamp}')
        
        for unit in unique_units:
            address = redis_client.get(f'{unit}.address')
            if address and address.startswith('10.61.214.'):
                tag = redis_client.get(f'{unit}.tag')
                status = redis_client.get(f'{unit}.status')
                
                today = datetime.date.today()
                
                run_status_data = None
                if len(test_run.get('runs', [])):
                    for run in test_run.get('runs', []):
                        description = run.get('description') or ''
                        match = re.search(r'\btusc_id:\s*([A-Za-z0-9_-]+)', description)
                        tusc_id = match.group(1) if match else None

                        if tusc_id == unit:
                            in_progress_count = run.get('in_progress_count', 0) or 0
                            passed_count = run.get('passed_count', 0) or 0
                            failed_count = run.get('failed_count', 0) or 0
                            untested_count = run.get('untested_count', 0) or 0
                            retest_count = run.get('retest_count', 0) or 0
                            blocked_count = run.get('blocked_count', 0) or 0
                            unexpected_reset_count = run.get('unexpected_reset_count', 0) or 0
                            error_count = run.get('error_count', 0) or 0
                            setup_issue_count = run.get('setup_issue_count', 0) or 0
                            total_count = passed_count + failed_count + untested_count + retest_count + blocked_count
                            passed_percentage = (passed_count / total_count * 100) if total_count > 0 else 0
                            run_status_data = {
                                "id": run.get('id'),
                                "name": run.get('name'),
                                "state": run.get('state'),
                                "in_progress_count": in_progress_count,
                                "passed_count": passed_count,
                                "failed_count": failed_count,
                                "untested_count": untested_count,
                                "error_count" : error_count,
                                "setup_issue_count" : setup_issue_count,
                                "retest_count": retest_count,
                                "blocked_count": blocked_count,
                                "unexpected_reset_count": unexpected_reset_count,
                                "passed_percentage": round(passed_percentage, 2),
                                "total_count": total_count
                            }
                            # print(f"Status Data: {status_data}")

                
                # print(f"Fetched {len(test_run.get('runs', []))} test runs from TestRail")

                
                # Check if unit already exists in cache
                with cache_lock:
                    unit_exists = any(u.redis_key == unit for u in units_cache)
                    
                if not unit_exists:
                    obj_unit = TUSC_Unit({
                        'address': address,
                        'tag': tag,
                        'status': status,
                        'redis_key': unit,
                        'testrail_status': '' if run_status_data is None else run_status_data
                    })

                    
                    
                    # Add unit to cache immediately
                    with cache_lock:
                        units_cache.append(obj_unit)
                        
                    print(f"Loaded TUSC: {unit} | Address: {address} | Tag: {tag} | Status: {status} | Test")
                    
                # In subsequent refreshes, also update existing units
                elif not is_initial_load:
                    with cache_lock:
                        for cached_unit in units_cache:
                            if cached_unit.redis_key == unit:
                                cached_unit.address = address
                                cached_unit.tag = tag
                                cached_unit.status = status
        
        is_initial_load = False  # After first loop, we're no longer in initial load
        time.sleep(10)  # Refresh every 10 seconds

@app.route('/api/units')
def api_units():
    with cache_lock:
        all_units = list(units_cache)

    
    # Convert objects to dicts
    units_dict = [unit.__dict__ for unit in all_units]
    return jsonify(units_dict)

@app.route('/api/unit-details/<unit_id>')
def unit_details(unit_id):
    # Get basic info from Redis
    with cache_lock:
        unit = next((u for u in units_cache if u.redis_key == unit_id), None)
    
    if not unit:
        return jsonify({"error": "Unit not found"}), 404
    
    # Basic info from Redis
    unit_data = unit.__dict__
    
    # Get additional details from Redis
    try:
        # Get all keys for this unit
        pattern = f"{unit_id}.*"
        all_keys = redis_client.keys(pattern)
        all_keys = [key for key in all_keys if "customparameters" not in key]

        print(pattern, all_keys)
        
        # Extract all available data
        extended_data = {}
        for key in all_keys:
            field = key.replace(f"{unit_id}.", "")
            value = redis_client.get(key)
            extended_data[field] = value
        
        unit_data["extended_data"] = extended_data
        
        # Try to get TestRail data if available
        try:
            testrail_data = testrail_client.get_unit_details(unit_id)
            unit_data["testrail_data"] = testrail_data
        except Exception as e:
            unit_data["testrail_error"] = str(e)
            
        return jsonify(unit_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    # Start background thread to load units
    threading.Thread(target=load_units_to_cache, daemon=True).start()
    app.run(debug=True, host="0.0.0.0")