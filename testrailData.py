from testrail import *
import requests
from dotenv import load_dotenv
import os
from pprint import pprint
import datetime, time

load_dotenv()
TESTRAIL_API_KEY = os.getenv('TESTRAIL_API_KEY')


client = APIClient('http://titan.zebra.lan/testrail')
client.user = 'daniel.calabrese@zebra.com'
client.password = '6cACQhmWJyZu2iEQK51i-jtRh0SFiwwQy01dXBo94'

project_id = 5 #automation project id is 5
cases = client.send_get(f'get_cases/{project_id}')

today = datetime.date.today()
yesterday = today - datetime.timedelta(days=1)
yesterday_timestamp = int(time.mktime(yesterday.timetuple()))
print(yesterday_timestamp)

test_run = client.send_get(f'get_runs/{project_id}')

def format_timestamp(ts):
    if ts:
        return datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    return 'N/A'

def print_test_run_info(test_run):
    runs = test_run.get('runs', [])
    for run in runs:
        print(f"ID: {run.get('id')}")
        description = run.get('description')
        # Extract tusc_id from description if present
        tusc_id = None
        if description:
            import re
            match = re.search(r"tusc_id:\s*(\S+)", description)
            if match:
                tusc_id = match.group(1)
        print(f"tusc_id: {tusc_id}")

        # Print custom status counts if present
        for key in run:
            if key.startswith('custom_status') and key.endswith('_count'):
                print(f"{key}: {run[key]}")
        print('-' * 40)

# Example usage:
print_test_run_info(test_run)