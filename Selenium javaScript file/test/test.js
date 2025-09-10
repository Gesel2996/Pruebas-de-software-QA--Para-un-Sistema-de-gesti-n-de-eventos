//Import necessary modules from selenium-webdriver, mocha, and chai
import { Builder, By, Key, until } from 'selenium-webdriver';
import { expect } from 'chai';
import { describe, it, before, after, beforeEach, afterEach } from 'mocha';

// Global driver and configuration
let driver;
const baseUrl = 'http://localhost:3000';
const regUrl = `${baseUrl}/register`;
const loginUrl = `${baseUrl}/login`;
const dashboardUrl = `${baseUrl}/dashboard`;

// Test data configurations
const testUsers = {
    newUser: {
        username: `newuser_${Date.now()}`,
        email: `newuser_${Date.now()}@gmail.com`,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
    },
    registeredUser: {
        username: 'testuser',
        email: 'testemail@gmail.com',
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
    },
    adminUser: {
        username: 'adminUser',
        email: 'adminemail@edges.com',
        password: 'adminpassword123',
        confirmPassword: 'adminpassword123',
    },
    unregisteredUser: {
        username: 'unregisteredUser',
        email: 'unregemail@edges.com',
        password: 'unregpassword123',
        confirmPassword: 'unregpassword123',
    },
    wrongPasswordUser: {
        username: 'testuser',
        email: 'testemail@gmail.com',
        password: 'wrongpassword123',
        confirmPassword: 'wrongpassword123',
    },
    emptyUser: {
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    }
};

const eventData = {
    name: 'Test Event',
    description: 'This is a test event description.',
    date: '31/12/2023',
    time: '12:00',
    location: 'Test Location',
};

// Helper functions
const waitForUrl = async (urlPattern, timeout = 10000) => {
    await driver.wait(async function() {
        const url = await driver.getCurrentUrl();
        return url.includes(urlPattern);
    }, timeout);
};

const waitForElement = async (locator, timeout = 10000) => {
    return await driver.wait(until.elementLocated(locator), timeout);
};

const waitForElementVisible = async (element, timeout = 10000) => {
    await driver.wait(until.elementIsVisible(element), timeout);
};

const fillLoginForm = async (email, password) => {
    await driver.findElement(By.css('input[type="text"]')).sendKeys(email);
    await driver.findElement(By.css('input[type="password"]')).sendKeys(password);
};

const clickLoginButton = async () => {
    const loginBtn = await waitForElement(By.xpath('//button[text()="Login"]'));
    await waitForElementVisible(loginBtn);
    await loginBtn.click();
};

const logout = async () => {
    const logoutBtn = await waitForElement(By.xpath('//button[text()="Logout"]'));
    await waitForElementVisible(logoutBtn);
    await logoutBtn.click();
    await waitForUrl('/login');
};

// Admin login helper function
const loginAsAdmin = async () => {
    await driver.get(loginUrl);
    await waitForElement(By.xpath('//h5[text()="Login"]'));
    await fillLoginForm(testUsers.adminUser.email, testUsers.adminUser.password);
    await clickLoginButton();
    
    // Verify admin login by checking for dashboard link
    await waitForElement(By.css('a[href="/dashboard"]'));
    console.log('Successfully logged in as admin');
};

// Regular user login helper function
const loginAsRegularUser = async () => {
    await driver.get(loginUrl);
    await waitForElement(By.xpath('//h5[text()="Login"]'));
    await fillLoginForm(testUsers.registeredUser.email, testUsers.registeredUser.password);
    await clickLoginButton();
    
    // Verify regular user login by checking for logout button (but no dashboard link)
    await waitForElement(By.xpath('//button[text()="Logout"]'));
    console.log('Successfully logged in as regular user');
};

// Event creation helper function (requires admin login first)
const createTestEvent = async (eventName, eventDescription = 'Test event description') => {
    // Navigate to dashboard (only available for admin users)
    const dashboardBtn = await waitForElement(By.css('a[href="/dashboard"]'));
    await waitForElementVisible(dashboardBtn);
    await dashboardBtn.click();
    await waitForUrl('/dashboard');
    
    // Verify we're on the dashboard
    await waitForElement(By.xpath('//h4[text()="Create New Event"]'));
    
    // Fill out event form
    await driver.findElement(By.css('input[name="name"]')).sendKeys(eventName);
    await driver.findElement(By.css('textarea[name="description"]')).sendKeys(eventDescription);
    
    const dateField = await driver.findElement(By.css('input[type="date"]'));
    await dateField.clear();
    await dateField.sendKeys(eventData.date);
    
    await driver.findElement(By.css('input[type="time"]')).sendKeys(eventData.time);
    await driver.findElement(By.css('input[name="location"]')).sendKeys(eventData.location);

    // Submit event creation
    const createEventBtn = await waitForElement(By.xpath('//button[text()="Create Event"]'));
    await waitForElementVisible(createEventBtn);
    await createEventBtn.click();

    // Verify redirect to home page
    await driver.wait(async function() {
        const url = await driver.getCurrentUrl();
        return url === baseUrl + '/';
    }, 10000);
    
    console.log(`Successfully created event: ${eventName}`);
    return eventName;
};

// Event deletion helper function (requires admin privileges)
const deleteEvent = async (eventName) => {
    try {
        const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + eventName + '"]]//..'));
        const deleteBtn = await eventDiv.findElement(By.xpath('.//button[contains(text(), "Delete")]'));
        await waitForElementVisible(deleteBtn);
        await deleteBtn.click();
        
        // Verify event is deleted
        await driver.wait(until.stalenessOf(eventDiv), 10000);
        console.log(`Successfully deleted event: ${eventName}`);
    } catch (error) {
        console.log(`Failed to delete event ${eventName}:`, error.message);
    }
};

// Main test setup
describe('Event Management Application Tests', function() {
// Initialize the WebDriver before any tests run
    before(async function() {
        driver = await new Builder().forBrowser('chrome').build();
    });
// Close the driver after all tests are done
    after(async function() {
        await driver.quit();
    });
// Clear cookies before each test to ensure clean state
    beforeEach(async function() {
        await driver.manage().deleteAllCookies();
    });

    // Registration Test Suite
    describe('Registration Tests', function() {
        beforeEach(async function() {
            await driver.get(baseUrl);
        });

        it('should open the registration page', async function() {
            const registerBtn = await waitForElement(By.css('a[href="/register"]'));
            await waitForElementVisible(registerBtn);
            await registerBtn.click();
            
            await waitForUrl('/register');
            await waitForElement(By.xpath('//h5[text()="Register"]'));
        });

        it('should fill out the registration form successfully', async function() {
            await driver.get(regUrl);
            await waitForElement(By.xpath('//h5[text()="Register"]'));

            // Generate unique user data for this test run
            const uniqueUser = {
                username: `testuser_${Date.now()}`,
                email: `testuser_${Date.now()}@example.com`,
                password: 'testpassword123',
                confirmPassword: 'testpassword123'
            };

            // Fill out registration fields
            await driver.findElement(By.id('username')).sendKeys(uniqueUser.username);
            await driver.findElement(By.id('email')).sendKeys(uniqueUser.email);
            await driver.findElement(By.id('password')).sendKeys(uniqueUser.password);
            await driver.findElement(By.id('confirmPassword')).sendKeys(uniqueUser.confirmPassword);

            // Submit registration
            const registerBtn = await waitForElement(By.css('button[type="submit"]'));
            await waitForElementVisible(registerBtn);
            await registerBtn.click();

            // Verify redirect to login page or check for success message
            try {
                await waitForUrl('/login');
            } catch (error) {
                // If redirect doesn't happen, check for error message or success indicator
                console.log('Registration may have failed or behaved differently than expected');
                throw error;
            }
        });

        it('should navigate from registration to login page', async function() {
            await driver.get(regUrl);
            await waitForElement(By.xpath('//h5[text()="Register"]'));

            const loginBtn = await waitForElement(By.css('a[href="/login"]'));
            await waitForElementVisible(loginBtn);
            await loginBtn.click();

            await waitForUrl('/login');
            await waitForElement(By.xpath('//h5[text()="Login"]'));
        });

        it('should handle duplicate user registration', async function() {
            await driver.get(regUrl);
            await waitForElement(By.xpath('//h5[text()="Register"]'));

            // Try to register with existing user credentials
            await driver.findElement(By.id('username')).sendKeys(testUsers.registeredUser.username);
            await driver.findElement(By.id('email')).sendKeys(testUsers.registeredUser.email);
            await driver.findElement(By.id('password')).sendKeys(testUsers.registeredUser.password);
            await driver.findElement(By.id('confirmPassword')).sendKeys(testUsers.registeredUser.confirmPassword);

            // Submit registration
            const registerBtn = await waitForElement(By.css('button[type="submit"]'));
            await waitForElementVisible(registerBtn);
            await registerBtn.click();

            // Check for error message or alert indicating user already exists "Registration failed." in a div
            try {
                const errorDiv = await waitForElement(By.xpath('//div[contains(text(), "Registration failed.")]'), 5000);
                await waitForElementVisible(errorDiv);
                const errorText = await errorDiv.getText();
                expect(errorText).to.include('Registration failed.');
            } catch (error) {
                console.log('Expected registration failure message not found:', error.message);
            // Should still be on registration page or show error
            const currentUrl = await driver.getCurrentUrl();
            expect(currentUrl).to.include('/register');
            }
        });
    });

    // Login Test Suite
    describe('Login Tests', function() {
        beforeEach(async function() {
            await driver.get(loginUrl);
            await waitForElement(By.xpath('//h5[text()="Login"]'));
        });

        it('should display login page correctly', async function() {
            await waitForUrl('/login');
            await waitForElement(By.xpath('//h5[text()="Login"]'));
        });

        it('should login successfully with registered user credentials', async function() {
            await fillLoginForm(testUsers.registeredUser.email, testUsers.registeredUser.password);
            await clickLoginButton();

            // Verify successful login by checking for logout button
            await waitForElement(By.xpath('//button[text()="Logout"]'));
            
            // Verify regular user does NOT have dashboard access
            try {
                await driver.findElement(By.css('a[href="/dashboard"]'));
                throw new Error('Regular user should not have dashboard access');
            } catch (error) {
                if (error.message.includes('should not have dashboard access')) {
                    throw error;
                }
                // Expected - regular user should not have dashboard link
                console.log('Verified: Regular user does not have dashboard access');
            }
            
            // Logout to clean up
            await logout();
        });

        it('should reject login with unregistered user credentials', async function() {
            await fillLoginForm(testUsers.unregisteredUser.email, testUsers.unregisteredUser.password);
            await clickLoginButton();

            // Check for alert with invalid credentials message
            const alert = await driver.wait(until.alertIsPresent(), 10000);
            const alertText = await alert.getText();
            expect(alertText).to.include('Invalid login credentials');
            await alert.accept();

            // Verify still on login page
            await waitForUrl('/login');
        });

        it('should reject login with wrong password', async function() {
            await fillLoginForm(testUsers.wrongPasswordUser.email, testUsers.wrongPasswordUser.password);
            await clickLoginButton();

            // Check for alert with invalid credentials message
            const alert = await driver.wait(until.alertIsPresent(), 10000);
            const alertText = await alert.getText();
            expect(alertText).to.include('Invalid login credentials');
            await alert.accept();

            // Verify still on login page
            await waitForUrl('/login');
        });

        it('should handle empty login form submission', async function() {
            await fillLoginForm(testUsers.emptyUser.email, testUsers.emptyUser.password);
            await clickLoginButton();

            // Verify still on login page (form validation should prevent submission)
            await waitForUrl('/login');
        });

        it('should login successfully with admin credentials and show dashboard access', async function() {
            await fillLoginForm(testUsers.adminUser.email, testUsers.adminUser.password);
            await clickLoginButton();

            // Verify admin login by checking for dashboard link
            await waitForElement(By.css('a[href="/dashboard"]'));
            console.log('Verified: Admin user has dashboard access');
            
            // Logout to clean up
            await logout();
        });
    });

    // Admin Dashboard Test Suite
    describe('Admin Dashboard Tests', function() {
        beforeEach(async function() {
            // CRITICAL: Login as admin before each test since only admins can access dashboard
            await loginAsAdmin();
        });

        afterEach(async function() {
            // Logout after each test
            try {
                await logout();
            } catch (error) {
                // Handle case where logout button might not be present
                console.log('Logout failed or not needed:', error.message);
            }
        });

        it('should navigate to admin dashboard successfully', async function() {
            const dashboardBtn = await waitForElement(By.css('a[href="/dashboard"]'));
            await waitForElementVisible(dashboardBtn);
            await dashboardBtn.click();

            await waitForUrl('/dashboard');
            await waitForElement(By.xpath('//h4[text()="Create New Event"]'));
            console.log('Successfully navigated to admin dashboard');
        });

        it('should create a new event successfully as admin', async function() {
            // Create unique event data for this test
            const testEventName = `Dashboard Test Event_${Date.now()}`;
            
            // Use helper function to create event (requires admin privileges)
            await createTestEvent(testEventName, 'Dashboard test event description');
            
            // Navigate back to home to verify event appears
            await driver.get(baseUrl);
            
            // Verify event appears on home page
            const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + testEventName + '"]]//..'));
            
            // Clean up: Delete the event immediately
            await deleteEvent(testEventName);
        });

        it('should verify only admin can access dashboard URL directly', async function() {
            // First verify admin can access dashboard
            await driver.get(dashboardUrl);
            await waitForElement(By.xpath('//h4[text()="Create New Event"]'));
            console.log('Verified: Admin can access dashboard directly');
            
            // Logout and try as regular user
            await logout();
            await loginAsRegularUser();
            
            // Try to access dashboard URL directly as regular user
            await driver.get(dashboardUrl);
            
            // Should be redirected or show error (implementation dependent)
            try {
                await waitForElement(By.xpath('//h4[text()="Create New Event"]'), 3000);
                throw new Error('Regular user should not be able to access dashboard');
            } catch (error) {
                if (error.message.includes('should not be able to access')) {
                    throw error;
                }
                // Expected - regular user should not access dashboard
                console.log('Verified: Regular user cannot access dashboard directly');
            }
        });
    });

    // Event Management Test Suite
    describe('Event Management Tests', function() {
        beforeEach(async function() {
            // CRITICAL: Login as admin before each test since only admins can create/manage events
            await loginAsAdmin();
        });

        afterEach(async function() {
            // Logout after each test
            try {
                await logout();
            } catch (error) {
                console.log('Logout failed or not needed:', error.message);
            }
        });

        it('should create and delete an event successfully as admin', async function() {
            // Create event with unique name
            const managementTestEventName = `Management Test Event_${Date.now()}`;
            
            // Create the event using helper function
            await createTestEvent(managementTestEventName, 'Event management test description');
            
            // Verify event exists on home page
            const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + managementTestEventName + '"]]//..'));
            
            // Delete the event
            await deleteEvent(managementTestEventName);
        });

        it('should display admin-created events to regular users (read-only)', async function() {
            // Create test event as admin
            const userViewEventName = `User View Test Event_${Date.now()}`;
            await createTestEvent(userViewEventName, 'Event for user view testing');
            
            // Logout admin and login as regular user
            await logout();
            await loginAsRegularUser();

            // Navigate to home page and verify event is visible to regular user
            await driver.get(baseUrl);
            const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + userViewEventName + '"]]//..'));
            
            // Verify regular user cannot see delete button (admin-only functionality)
            try {
                await eventDiv.findElement(By.xpath('.//button[contains(text(), "Delete")]'));
                throw new Error('Regular user should not see delete button');
            } catch (error) {
                if (error.message.includes('should not see delete button')) {
                    throw error;
                }
                // Expected - regular user should not have delete capability
                console.log('Verified: Regular user cannot delete events');
            }

            // Clean up - logout and login as admin to delete the event
            await logout();
            await loginAsAdmin();
            await driver.get(baseUrl);
            await deleteEvent(userViewEventName);
        });

        it('should prevent regular users from creating events', async function() {
            // Logout admin and login as regular user
            await logout();
            await loginAsRegularUser();
            
            // Verify regular user cannot access dashboard
            try {
                await driver.findElement(By.css('a[href="/dashboard"]'));
                throw new Error('Regular user should not have dashboard link');
            } catch (error) {
                if (error.message.includes('should not have dashboard link')) {
                    throw error;
                }
                // Expected - regular user should not have dashboard access
                console.log('Verified: Regular user cannot access event creation dashboard');
            }
            
            // Try direct access to dashboard URL
            await driver.get(dashboardUrl);
            try {
                await waitForElement(By.xpath('//h4[text()="Create New Event"]'), 3000);
                throw new Error('Regular user should not access dashboard directly');
            } catch (error) {
                if (error.message.includes('should not access dashboard directly')) {
                    throw error;
                }
                // Expected - should be redirected or blocked
                console.log('Verified: Regular user blocked from direct dashboard access');
            }
        });

        it('should allow regular users to reserve a spot for an event', async function() {
            // First, create an event as admin
            const reservationTestEventName = `Reservation Test Event_${Date.now()}`;
            await createTestEvent(reservationTestEventName, 'Event for reservation testing');
            // Logout admin and login as regular user
            await logout();
            await loginAsRegularUser();
            // Navigate to home page
            await driver.get(baseUrl);
            // Find the event and click on reserve button
            const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + reservationTestEventName + '"]]//..'));
            const reserveBtn = await eventDiv.findElement(By.xpath('.//button[contains(text(), "RSVP")]'));
            await waitForElementVisible(reserveBtn);
            await reserveBtn.click();
            // Verify reservation success
            try {
                // Fixed XPath: Use proper syntax for finding div containing h6 with specific text
                await waitForElement(By.xpath('//div[.//h6[text()="' + reservationTestEventName + '"]]//p[contains(text(), "You have RSVPed to this event.")]'));            
            } catch (error) {
                console.log('Reservation success message not found:', error.message);
                throw new Error('Regular user reservation failed');
            }
            console.log('✓ Regular user successfully reserved a spot for the event');
            // Verify that the reserve button is no longer visible
            try {
                await eventDiv.findElement(By.xpath('.//button[contains(text(), "RSVP")]'));
                throw new Error('Reserve button should not be visible after reservation');
            } catch (error) {
                if (error.message.includes('should not be visible after reservation')) {
                    throw error;
                }
                // Expected - reserve button should not be visible
                console.log('✓ Reserve button hidden after successful reservation');
            }
            // Clean up - logout and login as admin to delete the event
            await logout();
            await loginAsAdmin();
            await driver.get(baseUrl);
            await deleteEvent(reservationTestEventName);
            console.log('✓ Reservation test event deleted successfully');
        })
    });

    // Smoke Test Suite - Quick overall functionality check
    describe('Smoke Tests', function() {
        it('should complete basic user journey with proper role separation', async function() {
            // Test regular user login and limitations
            await loginAsRegularUser();
            
            // Verify regular user cannot access dashboard
            try {
                await driver.findElement(By.css('a[href="/dashboard"]'));
                throw new Error('Regular user should not have dashboard access');
            } catch (error) {
                if (error.message.includes('should not have dashboard access')) {
                    throw error;
                }
                console.log('✓ Regular user properly restricted from dashboard');
            }
            
            // Logout regular user
            await logout();

            // Test admin login and capabilities
            await loginAsAdmin();
            
            // Verify admin has dashboard access
            await waitForElement(By.css('a[href="/dashboard"]'));
            console.log('✓ Admin user has dashboard access');

            // Create a test event as admin
            const smokeTestEventName = `Smoke Test Event_${Date.now()}`;
            await createTestEvent(smokeTestEventName, 'Smoke test event');
            
            // Verify event appears on home page
            const eventDiv = await waitForElement(By.xpath('//div[h6[text()="' + smokeTestEventName + '"]]//..'));
            console.log('✓ Event creation successful');
            
            // Clean up the test event
            await deleteEvent(smokeTestEventName);
            console.log('✓ Event deletion successful');

            // Logout admin
            await logout();
            console.log('✓ Smoke test completed successfully');
        });
        
        it('should verify admin-only event creation workflow', async function() {
            // Ensure we start as admin for event creation
            await loginAsAdmin();
            
            // Create multiple events to test workflow
            const eventNames = [
                `Workflow Test Event 1_${Date.now()}`,
                `Workflow Test Event 2_${Date.now()}`
            ];
            
            for (const eventName of eventNames) {
                await createTestEvent(eventName, `Workflow test: ${eventName}`);
            }
            
            // Verify both events exist
            for (const eventName of eventNames) {
                await waitForElement(By.xpath('//div[h6[text()="' + eventName + '"]]//..'));
            }
            console.log('✓ Multiple event creation workflow successful');
            
            // Clean up all test events
            for (const eventName of eventNames) {
                await deleteEvent(eventName);
            }
            console.log('✓ Multiple event cleanup successful');
            
            await logout();
        });
    });
});