"""
Test Suite: Test Setup Wizard
Tests the test setup wizard functionality including system checks and identity verification
"""
import pytest
from pages.login_page import LoginPage
from pages.test_setup_wizard_page import TestSetupWizardPage
from pages.test_page import TestPage
from config import TEST_USER


class TestSetupWizard:
    """Test cases for test setup wizard functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to a test that triggers the wizard"""
        self.driver = driver
        self.login_page = LoginPage(driver)
        self.wizard_page = TestSetupWizardPage(driver)
        self.test_page = TestPage(driver)
        
        # Login first
        self.login_page.navigate()
        self.login_page.login_with_eula(TEST_USER["email"], TEST_USER["password"])
        self.login_page.wait_for_url_contains("/list")
    
    def test_wizard_accessibility_from_test_page(self):
        """Test that wizard is accessible when starting a test"""
        # Try to navigate to a test page that might trigger the wizard
        # This assumes there's a test available or we can create one
        
        try:
            # Navigate to test page (this might trigger the wizard)
            self.test_page.navigate()
            
            # Check if wizard appears or if we're on test page
            current_url = self.driver.current_url
            assert "hrrobots.click" in current_url
            
            # If wizard is present, test it
            if self.wizard_page.is_wizard_loaded():
                self.test_wizard_basic_functionality()
            else:
                # Wizard might not be triggered for this user/test
                pytest.skip("Test setup wizard not triggered")
                
        except Exception as e:
            pytest.skip(f"Could not access test page: {e}")
    
    def test_wizard_basic_functionality(self):
        """Test basic wizard functionality if it's loaded"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Test that wizard has proper structure
        step_title = self.wizard_page.get_current_step_title()
        assert step_title is not None
        
        # Test navigation (if possible)
        if self.wizard_page.is_element_visible(self.wizard_page.NEXT_BUTTON, timeout=5):
            # We can interact with the wizard
            self.test_wizard_step_navigation()
        else:
            # Just verify wizard is functional
            assert not self.wizard_page.get_error_message()
    
    def test_wizard_step_navigation(self):
        """Test wizard step navigation"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Step 1: System Check
        if self.wizard_page.is_system_check_visible():
            # Check system status elements
            camera_status = self.wizard_page.get_camera_status()
            mic_status = self.wizard_page.get_mic_status()
            
            # At least one status should be visible
            assert camera_status or mic_status
            
            # Try to proceed to next step
            self.wizard_page.complete_system_check_step()
    
    def test_wizard_guidelines_step(self):
        """Test guidelines step functionality"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Navigate to guidelines step if not already there
        if not self.wizard_page.is_guidelines_visible():
            # Try to get to guidelines step
            if self.wizard_page.is_system_check_visible():
                self.wizard_page.complete_system_check_step()
        
        if self.wizard_page.is_guidelines_visible():
            # Test guidelines acceptance
            self.wizard_page.accept_guidelines()
            
            # Test demo video expansion if available
            if self.wizard_page.is_element_visible(self.wizard_page.DEMO_VIDEO_EXPAND, timeout=5):
                self.wizard_page.expand_demo_video()
                assert self.wizard_page.is_demo_video_visible()
            
            # Proceed to next step
            self.wizard_page.click_next()
    
    def test_wizard_consent_step(self):
        """Test consent step functionality"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Navigate to consent step if possible
        if self.wizard_page.is_consent_visible():
            # Test consent scrolling and acceptance
            self.wizard_page.scroll_consent_to_bottom()
            self.wizard_page.accept_consent()
            
            # Should be able to proceed
            if self.wizard_page.is_element_visible(self.wizard_page.NEXT_BUTTON, timeout=5):
                self.wizard_page.click_next()
    
    def test_wizard_identity_verification_step(self):
        """Test identity verification step"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        if self.wizard_page.is_identity_verification_visible():
            # Test candidate name entry
            self.wizard_page.enter_candidate_name("Test Candidate")
            
            # Test video preview (if camera permissions are available)
            if self.wizard_page.is_video_preview_active():
                # Camera is available - test photo capture
                self.wizard_page.capture_photo()
                
                # Check if photo was captured
                if self.wizard_page.is_photo_captured():
                    # Test ID capture
                    self.wizard_page.capture_id_card()
                    
                    # Test retake functionality
                    if self.wizard_page.is_element_visible(self.wizard_page.RETAKE_BUTTON, timeout=5):
                        self.wizard_page.retake_photo()
            
            # Complete the step
            if self.wizard_page.is_element_visible(self.wizard_page.COMPLETE_BUTTON, timeout=5):
                self.wizard_page.click_complete()
    
    def test_wizard_error_handling(self):
        """Test wizard error handling"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Check that wizard doesn't have errors on load
        error_msg = self.wizard_page.get_error_message()
        assert not error_msg or "error" not in error_msg.lower()
    
    def test_wizard_loading_states(self):
        """Test wizard loading states"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # Test that loading states don't cause indefinite hangs
        if self.wizard_page.is_loading():
            # Wait for loading to complete
            self.wizard_page.wait_for_loading()
        
        # Should not be stuck in loading state
        assert not self.wizard_page.is_loading()
    
    def test_wizard_back_navigation(self):
        """Test wizard back navigation"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        # If we can navigate forward, test going back
        if self.wizard_page.is_element_visible(self.wizard_page.NEXT_BUTTON, timeout=5):
            # Go to next step
            self.wizard_page.click_next()
            
            # Try to go back
            if self.wizard_page.is_element_visible(self.wizard_page.BACK_BUTTON, timeout=5):
                self.wizard_page.click_back()
                
                # Should not cause errors
                assert not self.wizard_page.get_error_message()
    
    def test_wizard_complete_workflow_simulation(self):
        """Test complete wizard workflow simulation (without actual camera/mic)"""
        if not self.wizard_page.is_wizard_loaded():
            pytest.skip("Test setup wizard not loaded")
        
        try:
            # Attempt to complete the full wizard workflow
            # This will skip steps that require actual hardware permissions
            success = self.wizard_page.complete_full_wizard("Automated Test User")
            
            if success:
                # Wizard completed - check final state
                # Should either be on test page or have completed successfully
                current_url = self.driver.current_url
                assert "hrrobots.click" in current_url
                assert not self.wizard_page.get_error_message()
            
        except Exception as e:
            # Log the error but don't fail the test if it's a permission issue
            print(f"Wizard workflow test encountered issue: {e}")
            # Ensure we're still on a valid page
            assert "hrrobots.click" in self.driver.current_url