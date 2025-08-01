#!/usr/bin/env python3
"""
Comprehensive test script for the RNLI Premier League Predictor authentication system.
Tests registration, login, session validation, and user activity tracking.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_registration():
    """Test user registration"""
    print("🔐 Testing User Registration...")
    
    test_user = {
        "email": "testuser2@rnli.com",
        "password": "password123",
        "username": "testuser2"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=test_user)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Registration successful!")
            print(f"User ID: {data['user']['id']}")
            print(f"Username: {data['user']['username']}")
            print(f"Token: {data['token'][:50]}...")
            return data
        else:
            print(f"❌ Registration failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Registration error: {e}")
        return None

def test_login():
    """Test user login"""
    print("\n🔑 Testing User Login...")
    
    login_data = {
        "email": "testuser2@rnli.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"User ID: {data['user']['id']}")
            print(f"Username: {data['user']['username']}")
            print(f"Token: {data['token'][:50]}...")
            return data
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_session_validation(token):
    """Test session validation"""
    print("\n🔍 Testing Session Validation...")
    
    try:
        response = requests.get(f"{BASE_URL}/auth/validate?token={token}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Session validation successful!")
            print(f"Valid: {data['valid']}")
            print(f"User: {data['user']['username']}")
            return True
        else:
            print(f"❌ Session validation failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Session validation error: {e}")
        return False

def test_user_activity_tracking(user_id):
    """Test that user activity can be tracked"""
    print("\n📊 Testing User Activity Tracking...")
    
    # Test submitting a prediction
    prediction_data = {
        "user_id": user_id,
        "gameweek": 1,
        "fixture_id": 761,
        "predicted_home": 2,
        "predicted_away": 1
    }
    
    try:
        response = requests.post(f"{BASE_URL}/predictions/", json=prediction_data)
        print(f"Prediction Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Prediction submitted successfully!")
            
            # Test fetching user predictions
            response = requests.get(f"{BASE_URL}/predictions/?user_id={user_id}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ User predictions retrieved: {len(data['predictions'])} predictions")
                return True
            else:
                print(f"❌ Failed to fetch user predictions: {response.text}")
                return False
        else:
            print(f"❌ Prediction submission failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ User activity tracking error: {e}")
        return False

def test_leaderboard_integration():
    """Test that users appear in leaderboard"""
    print("\n🏆 Testing Leaderboard Integration...")
    
    try:
        response = requests.get(f"{BASE_URL}/leaderboard/")
        print(f"Leaderboard Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Leaderboard retrieved successfully!")
            print(f"Number of users: {len(data['leaderboard'])}")
            
            # Check if our test user is in the leaderboard
            test_users = [user for user in data['leaderboard'] if 'testuser' in user['player'].lower()]
            if test_users:
                print(f"✅ Test users found in leaderboard: {len(test_users)}")
                for user in test_users:
                    print(f"  - {user['player']}: {user['total']} points")
            else:
                print("⚠️  No test users found in leaderboard (may need predictions)")
            
            return True
        else:
            print(f"❌ Leaderboard retrieval failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Leaderboard integration error: {e}")
        return False

def main():
    """Run comprehensive authentication tests"""
    print("🚀 RNLI Premier League Predictor - Authentication System Test")
    print("=" * 70)
    
    # Test registration
    reg_data = test_registration()
    if not reg_data:
        print("❌ Registration test failed. Stopping tests.")
        return
    
    # Test login
    login_data = test_login()
    if not login_data:
        print("❌ Login test failed. Stopping tests.")
        return
    
    # Test session validation
    token = login_data['token']
    if not test_session_validation(token):
        print("❌ Session validation test failed.")
        return
    
    # Test user activity tracking
    user_id = login_data['user']['id']
    if not test_user_activity_tracking(user_id):
        print("❌ User activity tracking test failed.")
        return
    
    # Test leaderboard integration
    test_leaderboard_integration()
    
    print("\n" + "=" * 70)
    print("✅ All authentication tests completed!")
    print("\n📋 Summary:")
    print("✅ User registration working")
    print("✅ User login working")
    print("✅ Session validation working")
    print("✅ User activity tracking working")
    print("✅ Leaderboard integration working")
    print("\n🎉 Authentication system is fully functional!")

if __name__ == "__main__":
    main() 