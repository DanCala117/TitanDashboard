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
#pprint(cases)

today = datetime.date.today()
yesterday = today - datetime.timedelta(days=1)
yesterday_timestamp = int(time.mktime(yesterday.timetuple()))
print(yesterday_timestamp)

#tusc200 = 54881
#test_run = client.send_get(f'get_runs/{tusc200}')

# test_run = client.send_get(f'get_runs/{project_id}&created_after={yesterday_timestamp}')
test_run = client.send_get(f'get_runs/{project_id}')
#pprint(test_run)


def format_timestamp(ts):
    if ts:
        return datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    return 'N/A'

def print_test_run_info(test_run):
    runs = test_run.get('runs', [])
    for run in runs:
        print(f"ID: {run.get('id')}")
        #print(f"Name: {run.get('name')}")
        description = run.get('description')
        #print(f"Description: {description}")
        # Extract tusc_id from description if present
        tusc_id = None
        if description:
            import re
            match = re.search(r"tusc_id:\s*(\S+)", description)
            if match:
                tusc_id = match.group(1)
        print(f"tusc_id: {tusc_id}")
        #print(f"Assigned To (ID): {run.get('assignedto_id')}")
        #print(f"Created By (ID): {run.get('created_by')}")
        #print(f"Project ID: {run.get('project_id')}")
        #print(f"Suite ID: {run.get('suite_id')}")
        #print(f"Plan ID: {run.get('plan_id')}")
        #print(f"Milestone ID: {run.get('milestone_id')}")
        #print(f"Config: {run.get('config')}")
        #print(f"Config IDs: {run.get('config_ids')}")
        #print(f"Refs: {run.get('refs')}")
        #print(f"URL: {run.get('url')}")
        #print(f"Include All: {run.get('include_all')}")
        #print(f"Is Completed: {run.get('is_completed')}")
        #print(f"Blocked Count: {run.get('blocked_count')}")
        #print(f"Failed Count: {run.get('failed_count')}")
        #print(f"Passed Count: {run.get('passed_count')}")
        #print(f"Retest Count: {run.get('retest_count')}")
        #print(f"Untested Count: {run.get('untested_count')}")
        #print(f"Created On: {format_timestamp(run.get('created_on'))}")
        #print(f"Completed On: {format_timestamp(run.get('completed_on'))}")
        #print(f"Updated On: {format_timestamp(run.get('updated_on'))}")
        #print(f"Start On: {format_timestamp(run.get('start_on'))}")
        #print(f"Due On: {format_timestamp(run.get('due_on'))}")

        # Print custom status counts if present
        for key in run:
            if key.startswith('custom_status') and key.endswith('_count'):
                print(f"{key}: {run[key]}")
        print('-' * 40)

# Example usage:
print_test_run_info(test_run)