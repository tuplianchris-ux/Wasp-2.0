import requests
import sys
import json
from datetime import datetime

class TaskFlowGamificationTester:
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

    def test_auth_flow(self):
        """Test authentication with gamification features"""
        print("\n🔐 Testing Authentication & Gamification Setup...")
        
        # Try to login with existing test user credentials first
        test_user_login = {
            "email": "testuser@taskflow.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login with Test Credentials",
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
            
            # Verify gamification fields in response
            user_data = response['user']
            has_xp = 'xp' in user_data
            has_coins = 'coins' in user_data
            has_level = 'level' in user_data
            has_premium = 'is_premium' in user_data
            
            self.log_test("Auth response includes XP field", has_xp)
            self.log_test("Auth response includes coins field", has_coins)
            self.log_test("Auth response includes level field", has_level)
            self.log_test("Auth response includes premium status", has_premium)
            
            print(f"   Logged in as: {user_data.get('name', 'Unknown')}")
            print(f"   User ID: {self.user_id}")
            
            return True
        return False

    def test_task_gamification(self):
        """Test task progress slider and XP rewards"""
        print("\n📋 Testing Task Gamification Features...")
        
        # Create a task
        task_data = {
            "title": "Test Gamified Task",
            "description": "Testing progress slider and XP rewards",
            "category": "learning"
        }
        
        success, response = self.run_test(
            "Create Task with Progress Field",
            "POST", "tasks", 200, task_data
        )
        
        if not success:
            return False
            
        task_id = response.get('task_id')
        has_progress = 'progress' in response and response['progress'] == 0
        self.log_test("Task created with progress field (0)", has_progress)
        
        # Test progress update (0-100 slider)
        progress_updates = [25, 50, 75, 100]
        for progress in progress_updates:
            success, response = self.run_test(
                f"Update Task Progress to {progress}%",
                "PUT", f"tasks/{task_id}/progress", 200, {"progress": progress}
            )
            
            if success:
                updated_progress = response.get('progress') == progress
                is_completed = response.get('completed') == (progress == 100)
                self.log_test(f"Progress correctly set to {progress}%", updated_progress)
                if progress == 100:
                    self.log_test("Task marked as completed at 100%", is_completed)
        
        return True

    def test_competitions_system(self):
        """Test competition creation, joining, and AI rewards engine"""
        print("\n🏆 Testing Competition System...")
        
        # Create competition
        comp_data = {
            "title": "Speed Math Challenge",
            "description": "Test your math skills",
            "competition_type": "speed",
            "difficulty": "medium"
        }
        
        success, response = self.run_test(
            "Create Competition",
            "POST", "competitions", 200, comp_data
        )
        
        if not success:
            return False
            
        comp_id = response.get('competition_id')
        
        # Join competition
        success, _ = self.run_test(
            "Join Competition",
            "POST", f"competitions/{comp_id}/join", 200
        )
        
        # Submit to competition (tests AI rewards engine)
        submission_data = {
            "competition_id": comp_id,
            "answer": "42",
            "time_taken": 30,
            "accuracy": 85.5
        }
        
        success, response = self.run_test(
            "Submit Competition Entry with AI Rewards",
            "POST", f"competitions/{comp_id}/submit", 200, submission_data
        )
        
        if success:
            has_rewards = 'rewards' in response
            has_xp = has_rewards and 'xp' in response['rewards']
            has_coins = has_rewards and 'coins' in response['rewards']
            has_placement = 'placement' in response
            
            self.log_test("Competition submission includes rewards", has_rewards)
            self.log_test("Rewards include XP calculation", has_xp)
            self.log_test("Rewards include coins calculation", has_coins)
            self.log_test("Submission includes placement", has_placement)
        
        return True

    def test_schools_system(self):
        """Test schools creation, joining, and leaderboards"""
        print("\n🎓 Testing Schools & Classes System...")
        
        # Create school
        school_data = {
            "name": "Test University",
            "description": "A test school for gamification",
            "school_type": "university"
        }
        
        success, response = self.run_test(
            "Create School",
            "POST", "schools", 200, school_data
        )
        
        if not success:
            return False
            
        school_id = response.get('school_id')
        
        # Get school leaderboard
        success, response = self.run_test(
            "Get School Leaderboard",
            "GET", f"schools/{school_id}/leaderboard", 200
        )
        
        # Create class
        class_data = {
            "name": "Advanced Mathematics",
            "school_id": school_id,
            "subject": "Mathematics"
        }
        
        success, response = self.run_test(
            "Create Class in School",
            "POST", "classes", 200, class_data
        )
        
        return True

    def test_missions_system(self):
        """Test daily missions and XP rewards"""
        print("\n🎯 Testing Missions & Quests System...")
        
        # Get missions (should auto-create daily missions)
        success, response = self.run_test(
            "Get Daily Missions",
            "GET", "missions", 200
        )
        
        if success:
            has_missions = len(response) > 0
            has_daily_missions = any(m.get('mission_type') == 'daily' for m in response)
            has_xp_rewards = all('xp_reward' in m for m in response)
            has_coin_rewards = all('coin_reward' in m for m in response)
            
            self.log_test("Daily missions auto-created", has_missions)
            self.log_test("Contains daily mission types", has_daily_missions)
            self.log_test("All missions have XP rewards", has_xp_rewards)
            self.log_test("All missions have coin rewards", has_coin_rewards)
            
            # Try to claim a completed mission (if any)
            completed_missions = [m for m in response if m.get('completed') and not m.get('claimed')]
            if completed_missions:
                mission_id = completed_missions[0]['mission_id']
                success, claim_response = self.run_test(
                    "Claim Mission Rewards",
                    "POST", f"missions/{mission_id}/claim", 200
                )
                
                if success:
                    has_xp_claim = 'xp' in claim_response
                    has_coins_claim = 'coins' in claim_response
                    self.log_test("Mission claim includes XP", has_xp_claim)
                    self.log_test("Mission claim includes coins", has_coins_claim)
        
        return True

    def test_store_system(self):
        """Test store items and premium subscription"""
        print("\n🛒 Testing Store & Premium System...")
        
        # Get store items
        success, response = self.run_test(
            "Get Store Items",
            "GET", "store/items", 200
        )
        
        if success:
            has_items = len(response) > 0
            has_categories = len(set(item.get('category') for item in response)) > 1
            has_coming_soon = any(item.get('coming_soon') for item in response)
            has_prices = all('price' in item for item in response)
            
            self.log_test("Store has items", has_items)
            self.log_test("Store has multiple categories", has_categories)
            self.log_test("Store has 'Coming Soon' items", has_coming_soon)
            self.log_test("All items have prices", has_prices)
        
        # Get premium status
        success, response = self.run_test(
            "Get Premium Status",
            "GET", "premium/status", 200
        )
        
        if success:
            has_benefits = 'benefits' in response and len(response['benefits']) > 0
            has_premium_status = 'is_premium' in response
            
            self.log_test("Premium status includes benefits list", has_benefits)
            self.log_test("Premium status includes subscription status", has_premium_status)
        
        # Test premium subscription (placeholder)
        success, response = self.run_test(
            "Subscribe to Premium",
            "POST", "premium/subscribe", 200
        )
        
        return True

    def test_ai_templates(self):
        """Test AI template generation"""
        print("\n🤖 Testing AI Template Builder...")
        
        # Generate AI template
        template_data = {
            "title": "Study Notes Template",
            "template_type": "notes",
            "content": "Machine learning is a subset of artificial intelligence that focuses on algorithms.",
            "is_premium": False
        }
        
        success, response = self.run_test(
            "Generate AI Template",
            "POST", "templates/generate", 200, template_data
        )
        
        if success:
            has_content = 'content' in response and len(response['content']) > 0
            has_template_id = 'template_id' in response
            has_type = response.get('template_type') == 'notes'
            
            self.log_test("AI template generated with content", has_content)
            self.log_test("Template has unique ID", has_template_id)
            self.log_test("Template type preserved", has_type)
            
            # Get all templates
            success, templates = self.run_test(
                "Get User Templates",
                "GET", "templates", 200
            )
            
            if success:
                has_generated_template = any(t.get('template_id') == response.get('template_id') for t in templates)
                self.log_test("Generated template appears in user templates", has_generated_template)
        
        return True

    def test_enhanced_community(self):
        """Test enhanced community features (resources, goals, notes)"""
        print("\n👥 Testing Enhanced Community Features...")
        
        # Create server first
        server_data = {
            "name": "Test Study Group",
            "description": "Testing enhanced features"
        }
        
        success, response = self.run_test(
            "Create Server for Enhanced Features",
            "POST", "servers", 200, server_data
        )
        
        if not success:
            return False
            
        server_id = response.get('server_id')
        
        # Test shared resources
        resource_data = {
            "server_id": server_id,
            "title": "Useful Study Link",
            "resource_type": "link",
            "url": "https://example.com/study-guide"
        }
        
        success, _ = self.run_test(
            "Add Shared Resource",
            "POST", f"servers/{server_id}/resources", 200, resource_data
        )
        
        success, resources = self.run_test(
            "Get Server Resources",
            "GET", f"servers/{server_id}/resources", 200
        )
        
        # Test group goals
        goal_data = {
            "server_id": server_id,
            "title": "Study 100 Hours Together",
            "description": "Collective study goal",
            "target": 100
        }
        
        success, goal_response = self.run_test(
            "Create Group Goal",
            "POST", f"servers/{server_id}/goals", 200, goal_data
        )
        
        if success:
            goal_id = goal_response.get('goal_id')
            
            # Contribute to goal
            success, _ = self.run_test(
                "Contribute to Group Goal",
                "POST", f"servers/{server_id}/goals/{goal_id}/contribute", 200, {"amount": 5}
            )
        
        # Test collaborative notes
        note_data = {
            "server_id": server_id,
            "title": "Meeting Notes",
            "content": "Today we discussed the study plan..."
        }
        
        success, note_response = self.run_test(
            "Create Collaborative Note",
            "POST", f"servers/{server_id}/notes", 200, note_data
        )
        
        if success:
            note_id = note_response.get('note_id')
            
            # Update note
            success, _ = self.run_test(
                "Update Collaborative Note",
                "PUT", f"servers/{server_id}/notes/{note_id}", 200, 
                {"content": "Updated content with more details..."}
            )
        
        return True

    def test_gamification_stats(self):
        """Test user gamification statistics"""
        print("\n📊 Testing Gamification Statistics...")
        
        # Get current user with gamification data
        success, response = self.run_test(
            "Get User Profile with Gamification",
            "GET", "auth/me", 200
        )
        
        if success:
            has_xp = 'xp' in response
            has_coins = 'coins' in response
            has_level = 'level' in response
            has_premium = 'is_premium' in response
            has_badges = 'badges' in response
            
            self.log_test("Profile includes XP", has_xp)
            self.log_test("Profile includes coins", has_coins)
            self.log_test("Profile includes level", has_level)
            self.log_test("Profile includes premium status", has_premium)
            self.log_test("Profile includes badges array", has_badges)
            
            print(f"   Current Stats: Level {response.get('level', 0)}, {response.get('xp', 0)} XP, {response.get('coins', 0)} coins")
        
        return True

    def test_visionary_ai_chat(self):
        """Test Visionary AI Chat endpoints"""
        print("\n🤖 Testing Visionary AI Chat System...")
        
        # Test 1: Create new chat session
        chat_data = {
            "message": "What is the capital of France?"
        }
        
        success, response = self.run_test(
            "Create New AI Chat Session",
            "POST", "ai/visionary/chat", 200, chat_data
        )
        
        if not success:
            return False
            
        # Verify new session response
        has_session_id = 'session_id' in response
        has_message = 'message' in response
        has_response = 'response' in response
        is_new_session = response.get('is_new_session') == True
        
        self.log_test("New chat includes session_id", has_session_id)
        self.log_test("New chat includes user message", has_message)
        self.log_test("New chat includes AI response", has_response)
        self.log_test("New chat marked as new session", is_new_session)
        
        if not has_session_id:
            return False
            
        session_id = response['session_id']
        print(f"   Created session: {session_id}")
        print(f"   AI Response: {response.get('response', '')[:100]}...")
        
        # Test 2: Continue conversation with existing session
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
            
            self.log_test("Followup uses same session_id", same_session)
            self.log_test("Followup has contextual response", has_contextual_response)
            self.log_test("Followup not marked as new session", is_not_new)
            
            print(f"   Followup Response: {response.get('response', '')[:100]}...")
        
        # Test 3: Get all sessions
        success, sessions = self.run_test(
            "Get All AI Chat Sessions",
            "GET", "ai/visionary/sessions", 200
        )
        
        if success:
            has_sessions = len(sessions) > 0
            session_found = any(s.get('session_id') == session_id for s in sessions)
            has_session_fields = all('session_id' in s and 'title' in s and 'created_at' in s for s in sessions)
            
            self.log_test("Sessions list not empty", has_sessions)
            self.log_test("Created session found in list", session_found)
            self.log_test("Sessions have required fields", has_session_fields)
            
            print(f"   Found {len(sessions)} total sessions")
        
        # Test 4: Get specific session
        success, session_detail = self.run_test(
            "Get Specific AI Chat Session",
            "GET", f"ai/visionary/sessions/{session_id}", 200
        )
        
        if success:
            has_messages = 'messages' in session_detail
            correct_session = session_detail.get('session_id') == session_id
            
            self.log_test("Session detail includes messages", has_messages)
            self.log_test("Session detail has correct ID", correct_session)
            
            if has_messages:
                messages = session_detail['messages']
                has_user_messages = any(m.get('role') == 'user' for m in messages)
                has_ai_messages = any(m.get('role') == 'assistant' for m in messages)
                
                self.log_test("Session has user messages", has_user_messages)
                self.log_test("Session has AI messages", has_ai_messages)
                
                print(f"   Session has {len(messages)} messages")
        
        # Test 5: Delete session
        success, delete_response = self.run_test(
            "Delete AI Chat Session",
            "DELETE", f"ai/visionary/sessions/{session_id}", 200
        )
        
        if success:
            has_delete_message = 'message' in delete_response
            self.log_test("Delete returns confirmation message", has_delete_message)
            
            # Verify session is deleted
            success, _ = self.run_test(
                "Verify Session Deleted",
                "GET", f"ai/visionary/sessions/{session_id}", 404
            )
            
            self.log_test("Deleted session returns 404", success)
        
        return True

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting TaskFlow Gamification Test Suite...")
        print(f"Testing against: {self.base_url}")
        
        # Test authentication and setup
        if not self.test_auth_flow():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Run all gamification tests
        test_methods = [
            self.test_task_gamification,
            self.test_competitions_system,
            self.test_schools_system,
            self.test_missions_system,
            self.test_store_system,
            self.test_ai_templates,
            self.test_enhanced_community,
            self.test_gamification_stats,
            self.test_visionary_ai_chat
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test method {test_method.__name__} failed with exception: {e}")
        
        # Print summary
        print(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TaskFlowGamificationTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
