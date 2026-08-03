import os
import sys
import django
import urllib.request
import json

# Setup Django environment so we can query the database for the verification code
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import EmailVerification

def make_request(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        response = urllib.request.urlopen(req)
        return response.getcode(), json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

def run_tests():
    base_url = 'http://localhost:8000/api/auth'
    test_email = 'test12345@cc.ncu.edu.tw'

    print("1. Testing Send Verification Code...")
    status_code, resp_data = make_request(f"{base_url}/send-verification/", {'email': test_email})
    
    if status_code != 200:
        print(f"FAILED: Expected 200, got {status_code}")
        print(resp_data)
        sys.exit(1)
    
    print("SUCCESS: Code sent successfully.")

    print("\n2. Retrieving code from Database...")
    record = EmailVerification.objects.filter(email=test_email).first()
    if not record:
        print("FAILED: Could not find verification record in database.")
        sys.exit(1)
    
    code = record.code
    print(f"SUCCESS: Retrieved code {code}")

    print("\n3. Testing Verify Email with WRONG code...")
    wrong_code = "000000" if code != "000000" else "111111"
    status_code, resp_data = make_request(f"{base_url}/verify-email/", {'email': test_email, 'code': wrong_code})
    if status_code != 400:
        print(f"FAILED: Expected 400 for wrong code, got {status_code}")
        sys.exit(1)
    print("SUCCESS: Wrong code was rejected correctly.")

    print("\n4. Testing Verify Email with CORRECT code...")
    status_code, resp_data = make_request(f"{base_url}/verify-email/", {'email': test_email, 'code': code})
    if status_code != 200:
        print(f"FAILED: Expected 200 for correct code, got {status_code}")
        sys.exit(1)
    print("SUCCESS: Correct code verified successfully.")

    print("\nALL TESTS PASSED!")

if __name__ == '__main__':
    run_tests()
