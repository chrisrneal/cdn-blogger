from playwright.sync_api import sync_playwright

def verify_navbar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to homepage
        page.goto("http://localhost:3000")

        # Check Navbar elements
        page.wait_for_selector("text=CDN Blogger")

        # Take screenshot of homepage with Navbar
        page.screenshot(path="verification/homepage_navbar.png")
        print("Homepage screenshot taken.")

        # Check for profile icon (UserX when logged out)
        # The icon is rendered by lucide-react which creates SVG
        # We can check if the button exists
        page.locator("button[aria-label='User menu']").click()

        # Check if menu opens and shows Log In
        page.wait_for_selector("text=Log In")

        # Take screenshot of open menu
        page.screenshot(path="verification/menu_open.png")
        print("Menu open screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_navbar()
