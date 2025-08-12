// Custom configuration for your interview system
const INTERVIEW_CONFIG = {
    // Your backend API base URL
    API_BASE_URL: "https://api.v2.interviewscreener.com",
    
    // Authentication settings
    AUTH_REQUIRED: true,
    
    // Custom endpoints
    ENDPOINTS: {
        SUBMIT: "/submissions",
        LANGUAGES: "/languages",
        TESTCASES: "/testcase/execute"
    },
    
    // UI customization for interview system
    UI_CONFIG: {
        theme: "dark",
        style: "minimal",
        hideNavigation: true,
        hideFileMenu: true,
        hideHelpMenu: true,
        showRunButton: true,
        showLanguageSelector: true
    }
};

// Export for use in other files
window.INTERVIEW_CONFIG = INTERVIEW_CONFIG;
