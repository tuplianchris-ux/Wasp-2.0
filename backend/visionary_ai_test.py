import requests
import sys
import json
from datetime import datetime

class VisionaryAITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            if not success:
                details += f", Expected: {expected_status}"
                if response.text:
                    try:
                        error_data = response.json()
                        details += f", Error: {error_data.get('detail', 'Unknown error')}"
                    except:
                        details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def authenticate(self):
        """Authenticate with test credentials"""
        print("\n🔐 Authenticating...")
        
        # Try to login with existing test user credentials first
        test_user_login = {
            "email": "testuser@taskflow.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Login with Test Credentials",
            "POST", "auth/login", 200, test_user_login
        )
        
        # If login fails, register the user first
        if not success:
            print("   Test user doesn't exist, registering...")
            test_user_register = {
                "email": "testuser@taskflow.com",
                "password": "TestPass123!",
                "name": "Test User"
            }
            
            success, response = self.run_test(
                "Register Test User",
                "POST", "auth/register", 200, test_user_register
            )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['user_id']
            print(f"   Authenticated as: {response['user'].get('name', 'Unknown')}")
            return True
        
        print("   ❌ Authentication failed")
        return False

    def test_visionary_ai_chat(self):
        """Test Visionary AI Chat endpoints as specified in review request"""
        print("\n🤖 Testing Visionary AI Chat System...")
        
        # Test 1: Create new chat session
        print("\n1. Testing POST /api/ai/visionary/chat - New session")
        chat_data = {
            "message": "What is the capital of France?"
        }
        
        success, response = self.run_test(
            "Create New AI Chat Session",
            "POST", "ai/visionary/chat", 200, chat_data
        )
        
        if not success:
            return False
            
        # Verify new session response structure
        has_session_id = 'session_id' in response
        has_message = 'message' in response
        has_response = 'response' in response
        is_new_session = response.get('is_new_session') == True
        
        self.log_test("✓ Response includes session_id", has_session_id)
        self.log_test("✓ Response includes user message", has_message)
        self.log_test("✓ Response includes AI response", has_response)
        self.log_test("✓ is_new_session = true", is_new_session)
        
        if not has_session_id:
            return False
            
        session_id = response['session_id']
        print(f"   📝 Created session: {session_id}")
        print(f"   🤖 AI Response: {response.get('response', '')[:100]}...")
        
        # Test 2: Continue conversation with existing session
        print("\n2. Testing POST /api/ai/visionary/chat - Multi-turn conversation")
        followup_data = {
            "message": "Tell me more about it",
            "session_id": session_id
        }
        
        success, response = self.run_test(
            "Continue AI Chat Conversation",
            "POST", "ai/visionary/chat", 200, followup_data
        )
        
        if success:
            same_session = response.get('session_id') == session_id
            has_contextual_response = 'response' in response and len(response['response']) > 0
            is_not_new = response.get('is_new_session') == False
            
            self.log_test("✓ Uses same session_id", same_session)
            self.log_test("✓ Has contextual response", has_contextual_response)
            self.log_test("✓ is_new_session = false", is_not_new)
            
            print(f"   🤖 Contextual Response: {response.get('response', '')[:100]}...")
        
        # Test 3: Get all sessions
        print("\n3. Testing GET /api/ai/visionary/sessions - Get all sessions")
        success, sessions = self.run_test(
            "Get All AI Chat Sessions",
            "GET", "ai/visionary/sessions", 200
        )
        
        if success:
            has_sessions = len(sessions) > 0
            session_found = any(s.get('session_id') == session_id for s in sessions)
            has_required_fields = all(
                'session_id' in s and 'title' in s and 'created_at' in s and 'updated_at' in s 
                for s in sessions
            )
            
            self.log_test("✓ Sessions list not empty", has_sessions)
            self.log_test("✓ Created session found in list", session_found)
            self.log_test("✓ Sessions have required fields", has_required_fields)
            
            print(f"   📊 Found {len(sessions)} total sessions")
            if sessions:
                print(f"   📋 Sample session: {sessions[0].get('title', 'No title')}")
        
        # Test 4: Get specific session
        print("\n4. Testing GET /api/ai/visionary/sessions/{session_id} - Get specific session")
        success, session_detail = self.run_test(
            "Get Specific AI Chat Session",
            "GET", f"ai/visionary/sessions/{session_id}", 200
        )
        
        if success:
            has_messages = 'messages' in session_detail
            correct_session = session_detail.get('session_id') == session_id
            
            self.log_test("✓ Session detail includes messages", has_messages)
            self.log_test("✓ Session detail has correct ID", correct_session)
            
            if has_messages:
                messages = session_detail['messages']
                has_user_messages = any(m.get('role') == 'user' for m in messages)
                has_ai_messages = any(m.get('role') == 'assistant' for m in messages)
                
                self.log_test("✓ Session has user messages", has_user_messages)
                self.log_test("✓ Session has AI messages", has_ai_messages)
                
                print(f"   💬 Session has {len(messages)} messages")
                for i, msg in enumerate(messages[:2]):  # Show first 2 messages
                    role = "👤 User" if msg['role'] == 'user' else "🤖 AI"
                    content = msg['content'][:50] + "..." if len(msg['content']) > 50 else msg['content']
                    print(f"      {role}: {content}")
        
        # Test 5: Delete session
        print("\n5. Testing DELETE /api/ai/visionary/sessions/{session_id} - Delete session")
        success, delete_response = self.run_test(
            "Delete AI Chat Session",
            "DELETE", f"ai/visionary/sessions/{session_id}", 200
        )
        
        if success:
            has_delete_message = 'message' in delete_response and delete_response['message'] == "Session deleted"
            self.log_test("✓ Delete returns correct message", has_delete_message)
            
            # Verify session is deleted
            success, _ = self.run_test(
                "Verify Session Deleted (404 expected)",
                "GET", f"ai/visionary/sessions/{session_id}", 404
            )
            
            self.log_test("✓ Deleted session returns 404", success)
        
        return True

    def run_all_tests(self):
        """Run the Visionary AI Chat test suite"""
        print("🚀 Starting Visionary AI Chat Test Suite...")
        print(f"Testing against: {self.base_url}")
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Run Visionary AI Chat tests
        try:
            self.test_visionary_ai_chat()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['details']}")
        
        return len(failed_tests) == 0

def main():
    tester = VisionaryAITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
