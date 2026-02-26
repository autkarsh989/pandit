"""
Comprehensive Test Suite for Pandit Booking Application
Tests the complete workflow: User/Pandit registration, login, location setup,
service creation, service search, booking, and reviews.
"""

import requests
import json
from datetime import datetime, timedelta

# API Base URL
BASE_URL = "http://localhost:8000"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

# Test Data
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def print_test(status, message, details=""):
    """Print test result with color coding."""
    if status == "PASS":
        print(f"{GREEN}✓ PASS{RESET}: {message}")
        test_results["passed"] += 1
    elif status == "FAIL":
        print(f"{RED}✗ FAIL{RESET}: {message}")
        if details:
            print(f"  {RED}Error: {details}{RESET}")
        test_results["failed"] += 1
    elif status == "INFO":
        print(f"{BLUE}ℹ INFO{RESET}: {message}")
    elif status == "STEP":
        print(f"\n{YELLOW}━━ {message} ━━{RESET}")
    
    test_results["tests"].append({
        "status": status,
        "message": message,
        "details": details
    })


def test_user_registration():
    """Test 1: User Registration with Location"""
    print_test("STEP", "Test 1: USER REGISTRATION WITH LOCATION")
    
    user_data = {
        "full_name": "Rajesh Kumar",
        "phone": "9876543210",
        "password": "password123",
        "latitude": 28.7041,
        "longitude": 77.1025,
        "location_name": "Delhi"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            global user_id, user_phone, user_password
            user_id = data.get("user_id")
            user_phone = user_data["phone"]
            user_password = user_data["password"]
            print_test("PASS", "User registered successfully", f"User ID: {user_id}")
            return True
        else:
            print_test("FAIL", "User registration failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "User registration error", str(e))
        return False


def test_user_login():
    """Test 2: User Login"""
    print_test("STEP", "Test 2: USER LOGIN")
    
    login_data = {
        "phone": user_phone,
        "password": user_password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            global user_token
            user_token = data.get("access_token")
            print_test("PASS", "User login successful", f"Token: {user_token[:20]}...")
            return True
        else:
            print_test("FAIL", "User login failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "User login error", str(e))
        return False


def test_pandit_registration():
    """Test 3: Pandit User Registration"""
    print_test("STEP", "Test 3: PANDIT USER REGISTRATION")
    
    pandit_user_data = {
        "full_name": "Pandit Sharma",
        "phone": "9876543211",
        "password": "pandit123",
        "latitude": 28.7050,
        "longitude": 77.1200,
        "location_name": "South Delhi"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=pandit_user_data)
        if response.status_code == 200:
            data = response.json()
            global pandit_user_id, pandit_phone, pandit_password
            pandit_user_id = data.get("user_id")
            pandit_phone = pandit_user_data["phone"]
            pandit_password = pandit_user_data["password"]
            print_test("PASS", "Pandit user registered successfully", f"Pandit User ID: {pandit_user_id}")
            return True
        else:
            print_test("FAIL", "Pandit registration failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Pandit registration error", str(e))
        return False


def test_pandit_login():
    """Test 4: Pandit Login"""
    print_test("STEP", "Test 4: PANDIT LOGIN")
    
    login_data = {
        "phone": pandit_phone,
        "password": pandit_password
    }
    
    try:
        response = requests.post(f"{BASE_URL}/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            global pandit_token
            pandit_token = data.get("access_token")
            print_test("PASS", "Pandit login successful", f"Token: {pandit_token[:20]}...")
            return True
        else:
            print_test("FAIL", "Pandit login failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Pandit login error", str(e))
        return False


def test_pandit_onboarding():
    """Test 5: Pandit Profile Onboarding"""
    print_test("STEP", "Test 5: PANDIT PROFILE ONBOARDING")
    
    pandit_profile_data = {
        "experience_years": 10,
        "bio": "Expert in temple rituals and ceremonies",
        "region": "Delhi NCR",
        "languages": "Hindi, Sanskrit, English",
        "latitude": 28.7050,
        "longitude": 77.1200,
        "location_name": "South Delhi",
        "price_per_service": 1500
    }
    
    headers = {
        "Authorization": f"Bearer {pandit_token}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/pandit/onboard", json=pandit_profile_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            global pandit_id
            pandit_id = data.get("pandit_id")
            print_test("PASS", "Pandit profile created successfully", f"Pandit ID: {pandit_id}")
            return True
        else:
            print_test("FAIL", "Pandit onboarding failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Pandit onboarding error", str(e))
        return False


def test_create_service():
    """Test 6: Create Service"""
    print_test("STEP", "Test 6: CREATE SERVICE")
    
    service_data = {
        "name": "Wedding Ceremony",
        "category": "Rituals",
        "base_price": 5000,
        "duration_minutes": 120
    }
    
    try:
        response = requests.post(f"{BASE_URL}/services", json=service_data)
        if response.status_code == 200:
            data = response.json()
            global service_id
            service_id = data.get("service_id")
            print_test("PASS", "Service created successfully", f"Service ID: {service_id}")
            return True
        else:
            print_test("FAIL", "Service creation failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Service creation error", str(e))
        return False


def test_create_additional_services():
    """Test 7: Create Additional Services for Testing"""
    print_test("STEP", "Test 7: CREATE ADDITIONAL SERVICES")
    
    services = [
        {
            "name": "Pooja Ceremony",
            "category": "Rituals",
            "base_price": 2000,
            "duration_minutes": 60
        },
        {
            "name": "Havan Puja",
            "category": "Rituals",
            "base_price": 3000,
            "duration_minutes": 90
        },
        {
            "name": "Naming Ceremony",
            "category": "Ceremonies",
            "base_price": 2500,
            "duration_minutes": 75
        }
    ]
    
    global service_ids
    service_ids = [service_id]  # Include first service
    
    try:
        for service_data in services:
            response = requests.post(f"{BASE_URL}/services", json=service_data)
            if response.status_code == 200:
                sid = response.json().get("service_id")
                service_ids.append(sid)
                print_test("PASS", f"Service '{service_data['name']}' created", f"ID: {sid}")
            else:
                print_test("FAIL", f"Failed to create '{service_data['name']}'", response.text)
                return False
        return True
    except Exception as e:
        print_test("FAIL", "Additional services creation error", str(e))
        return False


def test_search_services_by_keyword():
    """Test 8: Search Services by Keyword"""
    print_test("STEP", "Test 8: SEARCH SERVICES BY KEYWORD")
    
    try:
        response = requests.get(f"{BASE_URL}/services/search?keyword=pooja&sort_by=price_asc")
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Service search by keyword successful", 
                      f"Found {data.get('total')} services")
            return True
        else:
            print_test("FAIL", "Service search failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Service search error", str(e))
        return False


def test_search_services_by_category():
    """Test 9: Search Services by Category"""
    print_test("STEP", "Test 9: SEARCH SERVICES BY CATEGORY")
    
    try:
        response = requests.get(f"{BASE_URL}/services/search?category=Rituals&sort_by=price_desc")
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Service search by category successful", 
                      f"Found {data.get('total')} services")
            return True
        else:
            print_test("FAIL", "Service search by category failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Service search by category error", str(e))
        return False


def test_search_services_by_price():
    """Test 10: Search Services by Price Range"""
    print_test("STEP", "Test 10: SEARCH SERVICES BY PRICE RANGE")
    
    try:
        response = requests.get(f"{BASE_URL}/services/search?min_price=2000&max_price=4000&sort_by=price_asc")
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Service search by price range successful", 
                      f"Found {data.get('total')} services in range")
            return True
        else:
            print_test("FAIL", "Service search by price range failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Service search by price range error", str(e))
        return False


def test_search_services_by_distance():
    """Test 11: Search Services by Distance"""
    print_test("STEP", "Test 11: SEARCH SERVICES BY DISTANCE")
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/services/nearby-distance?max_distance_km=50&sort_by=distance_asc", 
                               headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Service search by distance successful", 
                      f"Found {data.get('total')} services nearby")
            return True
        else:
            print_test("FAIL", "Service search by distance failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Service search by distance error", str(e))
        return False


def test_find_nearby_pandits():
    """Test 12: Find Nearby Pandits"""
    print_test("STEP", "Test 12: FIND NEARBY PANDITS")
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/pandits/nearby?max_distance_km=50&sort_by=match_score", 
                               headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Found nearby pandits successfully", 
                      f"Found {len(data)} pandits with match scores")
            return len(data) > 0
        else:
            print_test("FAIL", "Find nearby pandits failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Find nearby pandits error", str(e))
        return False


def test_create_booking():
    """Test 13: Create Booking"""
    print_test("STEP", "Test 13: CREATE BOOKING")
    
    booking_data = {
        "pandit_id": pandit_id,
        "service_id": service_id,
        "booking_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    }
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/bookings", json=booking_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Booking created successfully", f"Booking Date: {booking_data['booking_date']}")
            return True
        else:
            print_test("FAIL", "Booking creation failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Booking creation error", str(e))
        return False


def test_view_user_bookings():
    """Test 14: View User Bookings"""
    print_test("STEP", "Test 14: VIEW USER BOOKINGS")
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/my-bookings", headers=headers)
        if response.status_code == 200:
            data = response.json()
            global booking_id
            if isinstance(data, list) and len(data) > 0:
                booking_id = data[0].get("id")
                print_test("PASS", "User bookings retrieved successfully", 
                          f"Total bookings: {len(data)}, Booking ID: {booking_id}")
                return True
            else:
                print_test("FAIL", "No bookings found", "")
                return False
        else:
            print_test("FAIL", "View bookings failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "View bookings error", str(e))
        return False


def test_add_review():
    """Test 15: Add Review/Rating for Service"""
    print_test("STEP", "Test 15: ADD REVIEW AND RATING")
    
    review_data = {
        "booking_id": booking_id,
        "pandit_id": pandit_id,
        "rating": 5,
        "comment": "Excellent service! Very professional and knowledgeable. Highly recommended!"
    }
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/reviews", json=review_data, headers=headers)
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Review added successfully", f"Rating: {review_data['rating']}/5")
            return True
        else:
            print_test("FAIL", "Review addition failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Review addition error", str(e))
        return False


def test_list_all_services():
    """Test 16: List All Services"""
    print_test("STEP", "Test 16: LIST ALL SERVICES")
    
    try:
        response = requests.get(f"{BASE_URL}/services")
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "All services retrieved successfully", f"Total services: {len(data)}")
            return True
        else:
            print_test("FAIL", "List services failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "List services error", str(e))
        return False


def test_list_all_pandits():
    """Test 17: List All Pandits"""
    print_test("STEP", "Test 17: LIST ALL PANDITS")
    
    try:
        response = requests.get(f"{BASE_URL}/pandits")
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "All pandits retrieved successfully", f"Total pandits: {len(data)}")
            return True
        else:
            print_test("FAIL", "List pandits failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "List pandits error", str(e))
        return False


def test_update_user_location():
    """Test 18: Update User Location"""
    print_test("STEP", "Test 18: UPDATE USER LOCATION")
    
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/user/location?latitude=28.5355&longitude=77.3910&location_name=Noida",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "User location updated successfully", 
                      f"New location: {data.get('location_name')}")
            return True
        else:
            print_test("FAIL", "Update user location failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Update user location error", str(e))
        return False


def test_update_pandit_location():
    """Test 19: Update Pandit Location"""
    print_test("STEP", "Test 19: UPDATE PANDIT LOCATION")
    
    headers = {
        "Authorization": f"Bearer {pandit_token}"
    }
    
    try:
        response = requests.put(
            f"{BASE_URL}/pandit/location?latitude=28.5500&longitude=77.2500&location_name=Ghaziabad",
            headers=headers
        )
        if response.status_code == 200:
            data = response.json()
            print_test("PASS", "Pandit location updated successfully", 
                      f"New location: {data.get('location_name')}")
            return True
        else:
            print_test("FAIL", "Update pandit location failed", response.text)
            return False
    except Exception as e:
        print_test("FAIL", "Update pandit location error", str(e))
        return False


def print_test_summary():
    """Print test summary"""
    print(f"\n{YELLOW}{'='*60}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")
    print(f"{GREEN}✓ Tests Passed: {test_results['passed']}{RESET}")
    print(f"{RED}✗ Tests Failed: {test_results['failed']}{RESET}")
    print(f"{BLUE}Total Tests: {test_results['passed'] + test_results['failed']}{RESET}")
    
    if test_results['failed'] == 0:
        print(f"\n{GREEN}🎉 ALL TESTS PASSED! 🎉{RESET}")
    else:
        print(f"\n{RED}⚠️  SOME TESTS FAILED{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}\n")


def run_all_tests():
    """Run all tests in sequence"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}PANDIT BOOKING APP - COMPREHENSIVE TEST SUITE{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Define test sequence
    tests = [
        test_user_registration,
        test_user_login,
        test_pandit_registration,
        test_pandit_login,
        test_pandit_onboarding,
        test_create_service,
        test_create_additional_services,
        test_search_services_by_keyword,
        test_search_services_by_category,
        test_search_services_by_price,
        test_list_all_services,
        test_list_all_pandits,
        test_search_services_by_distance,
        test_find_nearby_pandits,
        test_update_user_location,
        test_update_pandit_location,
        test_create_booking,
        test_view_user_bookings,
        test_add_review,
    ]
    
    # Run tests
    for test_func in tests:
        try:
            test_func()
        except Exception as e:
            print_test("FAIL", f"Test {test_func.__name__} crashed", str(e))
    
    # Print summary
    print_test_summary()


if __name__ == "__main__":
    print("\n⏳ Make sure your FastAPI server is running on http://localhost:8000")
    print("   Start it with: python main.py\n")
    
    try:
        # Check if server is running
        response = requests.get(f"{BASE_URL}/services", timeout=2)
        run_all_tests()
    except requests.exceptions.ConnectionError:
        print(f"{RED}✗ ERROR: Cannot connect to server at {BASE_URL}{RESET}")
        print(f"{RED}Please make sure the FastAPI server is running.{RESET}")
        print(f"{YELLOW}Start the server with: python main.py{RESET}\n")
    except Exception as e:
        print(f"{RED}✗ ERROR: {str(e)}{RESET}\n")
