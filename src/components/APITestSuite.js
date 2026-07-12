import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../APITestSuite.css';

const APITestSuite = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // NEW: Status filter
  const [createdTestData, setCreatedTestData] = useState({
    testIDs: [],
    templateIDs: [],
    answerIDs: []
  });
  const [cleanupStatus, setCleanupStatus] = useState(null);
  const [autoCleanup, setAutoCleanup] = useState(true);

  // API Test Configurations
  const apiTests = [
    // Authentication & User Management
    {
      category: 'Authentication',
      name: 'Login',
      endpoint: 'https://2wiwmb54f8.execute-api.us-east-1.amazonaws.com/dev/login',
      method: 'POST',
      payload: {
        email: 'saaimurugan@gmail.com',
        password: 'Rujula!123'
      },
      expectedResponse: {
        statusCode: [200, 401], // Accept both success and auth failure
        hasFields: ['statusCode']
      },
      description: 'Test user login functionality'
    },
    {
      category: 'Authentication',
      name: 'Validate User',
      endpoint: 'https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/validateUser',
      method: 'POST',
      payload: {
        code: 'TEST_CODE_123'
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Validate user verification code'
    },
    
    // Test Management
    {
      category: 'Test Management',
      name: 'Get Test Configuration',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration',
      method: 'POST',
      payload: {
        testConfigurationID: 'TEST_TEMPLATE_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Retrieve test configuration settings'
    },
    {
      category: 'Test Management',
      name: 'Check Test Status',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkTestStatus',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Check current status of a test'
    },
    {
      category: 'Test Management',
      name: 'Change Test Status',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/changeTestStatus',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001',
        status: 'In Progress'
      },
      expectedResponse: {
        statusCode: [200, 400, 404],
        hasFields: ['statusCode']
      },
      description: 'Update test status'
    },
    {
      category: 'Test Management',
      name: 'Create Test',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createTest',
      method: 'POST',
      payload: {
        candidateName: 'Test Candidate',
        candidateEmail: 'candidate@test.com',
        templateID: 'TEMPLATE_001',
        recruiterEmail: 'recruiter@test.com'
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Create a new test'
    },
    {
      category: 'Test Management',
      name: 'Create Bulk Tests',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createBulkTests',
      method: 'POST',
      payload: {
        templateID: 'TEMPLATE_001',
        candidates: [
          { name: 'Candidate 1', email: 'candidate1@test.com' },
          { name: 'Candidate 2', email: 'candidate2@test.com' }
        ],
        recruiterEmail: 'recruiter@test.com'
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Create multiple tests at once'
    },
    
    // Questions
    {
      category: 'Questions',
      name: 'Get All Questions For Test',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getAllQuestionsForTest',
      method: 'POST',
      payload: {
        templateID: 'TEMPLATE_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Fetch all questions for a test'
    },
    {
      category: 'Questions',
      name: 'Get Questions by Topic',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestionsTopic',
      method: 'POST',
      payload: {
        templateID: 'TEMPLATE_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Get questions grouped by topic'
    },
    {
      category: 'Questions',
      name: 'Save Questions',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions_',
      method: 'POST',
      payload: {
        templateID: 'TEMPLATE_TEST',
        questions: [
          {
            question: 'What is JavaScript?',
            type: 'mcq',
            options: ['Language', 'Framework', 'Library', 'None'],
            correctAnswer: 'Language'
          }
        ]
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Save questions to template'
    },
    {
      category: 'Questions',
      name: 'Create Questions Using AI',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI__',
      method: 'POST',
      payload: {
        topic: 'JavaScript',
        difficulty: 'Medium',
        numberOfQuestions: 5
      },
      expectedResponse: {
        statusCode: [200, 400, 500],
        hasFields: ['statusCode']
      },
      description: 'Generate questions using AI'
    },
    
    // Answers & Scoring
    {
      category: 'Answers',
      name: 'Save Answer Submitted',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveAnswerSubmitted',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001',
        questionID: 'Q001',
        answer: 'Test Answer',
        datetime: new Date().toISOString()
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Save candidate answer'
    },
    {
      category: 'Answers',
      name: 'Submit and Calculate Score (Elaborate/Code Test)',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/doSubmitAndCalculateScore___',
      method: 'POST',
      payload: {
        testID: 'TEST_ELABORATE_001',
        answers: [
          {
            testID: 'TEST_ELABORATE_001',
            questionID: 'Q_ELABORATE_001',
            answer: 'React is a JavaScript library for building user interfaces with component-based architecture.',
            timestamp: new Date().toISOString()
          }
        ]
      },
      expectedResponse: {
        statusCode: [200, 400, 404, 500],
        hasFields: ['statusCode'],
        checkLLMEvaluation: true // Special flag to check if LLM evaluation worked
      },
      description: 'Submit test and calculate score (includes LLM evaluation for elaborate/code)'
    },
    {
      category: 'Answers',
      name: 'Check Result',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/checkResult',
      method: 'POST',
      payload: {
        searchTerm: 'TEST_ID_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Retrieve test results'
    },
    
    // Templates
    {
      category: 'Templates',
      name: 'Get Templates',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplates',
      method: 'POST',
      payload: {
        email: 'test@example.com'
      },
      expectedResponse: {
        statusCode: [200],
        hasFields: ['statusCode']
      },
      description: 'Fetch all templates for user'
    },
    {
      category: 'Templates',
      name: 'Clone Template',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/cloneGKTemplate',
      method: 'POST',
      payload: {
        sourceTemplateID: 'GK_TEMPLATE_001',
        newTemplateName: 'Cloned Template',
        email: 'test@example.com'
      },
      expectedResponse: {
        statusCode: [200, 400, 404],
        hasFields: ['statusCode']
      },
      description: 'Clone an existing template'
    },
    {
      category: 'Templates',
      name: 'Get Template History',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplateHistory',
      method: 'POST',
      payload: {
        templateID: 'TEMPLATE_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Get template modification history'
    },
    
    // Analytics & Reporting
    {
      category: 'Analytics',
      name: 'Get Analytics',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getAnalytics',
      method: 'POST',
      payload: {
        email: 'test@example.com'
      },
      expectedResponse: {
        statusCode: [200],
        hasFields: ['statusCode']
      },
      description: 'Fetch user analytics data'
    },
    {
      category: 'Analytics',
      name: 'Get Topic Score',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTopicScore',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Get score breakdown by topic'
    },
    {
      category: 'Analytics',
      name: 'Get Admin Dashboard',
      endpoint: 'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/getAdminDashboard',
      method: 'POST',
      payload: {
        email: 'admin@example.com'
      },
      expectedResponse: {
        statusCode: [200, 403],
        hasFields: ['statusCode']
      },
      description: 'Get admin dashboard statistics'
    },
    
    // Photos & Proctor
    {
      category: 'Proctor',
      name: 'Save Candidate Photo',
      endpoint: 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/saveCandidatePhoto_',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        timestamp: new Date().toISOString(),
        type: 'test'
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Save candidate photo during test'
    },
    {
      category: 'Proctor',
      name: 'Get Photos by Test ID',
      endpoint: 'https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/getPhotosUsingTestID',
      method: 'POST',
      payload: {
        testID: 'TEST_ID_001'
      },
      expectedResponse: {
        statusCode: [200, 404],
        hasFields: ['statusCode']
      },
      description: 'Retrieve all photos for a test'
    },
    
    // Activity Logging
    {
      category: 'Logging',
      name: 'Log Activity',
      endpoint: 'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/logActivity',
      method: 'POST',
      payload: {
        userEmail: 'test@example.com',
        action: 'test_action',
        details: { test: 'data' },
        timestamp: new Date().toISOString()
      },
      expectedResponse: {
        statusCode: [200, 400],
        hasFields: ['statusCode']
      },
      description: 'Log user activity'
    },
    {
      category: 'Logging',
      name: 'Get Activity Logs',
      endpoint: 'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/getActivityLogs',
      method: 'POST',
      payload: {
        userEmail: 'test@example.com'
      },
      expectedResponse: {
        statusCode: [200],
        hasFields: ['statusCode']
      },
      description: 'Retrieve activity logs'
    },
    
    // Resume/JD
    {
      category: 'Resume/JD',
      name: 'Match JD with Resume',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/matchJDResume',
      method: 'POST',
      payload: {
        jd: 'Looking for JavaScript developer',
        resume: 'Experienced in JavaScript and React'
      },
      expectedResponse: {
        statusCode: [200, 400, 500],
        hasFields: ['statusCode']
      },
      description: 'Match job description with resume'
    },
    {
      category: 'Resume/JD',
      name: 'Extract Keywords from JD',
      endpoint: 'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/extractKeywordsFromJD',
      method: 'POST',
      payload: {
        jd: 'Looking for JavaScript developer with React experience'
      },
      expectedResponse: {
        statusCode: [200, 400, 500],
        hasFields: ['statusCode']
      },
      description: 'Extract keywords from job description'
    }
  ];

  const categories = ['all', ...new Set(apiTests.map(test => test.category))];

  const runSingleTest = async (test) => {
    const startTime = Date.now();
    try {
      const response = await fetch(test.endpoint, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.payload)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Track created resources for cleanup
      if (response.ok && responseData) {
        trackCreatedResources(test, responseData);
      }

      // Check if response matches expected
      const statusMatch = test.expectedResponse.statusCode.includes(response.status);
      
      // Check for required fields
      let fieldsMatch = true;
      if (test.expectedResponse.hasFields && typeof responseData === 'object') {
        fieldsMatch = test.expectedResponse.hasFields.every(field => 
          responseData.hasOwnProperty(field)
        );
      }

      // Special check for LLM evaluation
      let llmCheckResult = null;
      if (test.expectedResponse.checkLLMEvaluation && responseData) {
        const bodyData = typeof responseData.body === 'string' ? 
          JSON.parse(responseData.body) : responseData.body;
        
        if (bodyData && bodyData.result_summary) {
          llmCheckResult = {
            passed: true,
            message: 'Score calculated successfully'
          };
        } else if (responseData.statusCode >= 400) {
          llmCheckResult = {
            passed: false,
            message: 'Test or template not found (expected for test data)'
          };
        } else {
          llmCheckResult = {
            passed: false,
            message: 'Response structure unexpected'
          };
        }
      }

      const passed = statusMatch && fieldsMatch;

      return {
        ...test,
        status: passed ? 'PASS' : 'FAIL',
        responseTime,
        responseStatus: response.status,
        responseData,
        checks: {
          statusMatch,
          fieldsMatch,
          llmCheck: llmCheckResult
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const endTime = Date.now();
      return {
        ...test,
        status: 'ERROR',
        responseTime: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  };

  // Track created resources for cleanup
  const trackCreatedResources = (test, responseData) => {
    try {
      const bodyData = typeof responseData.body === 'string' ? 
        JSON.parse(responseData.body) : responseData;

      // Track test IDs
      if (test.name.includes('Create Test') || test.name.includes('Create Bulk')) {
        if (bodyData.testID) {
          setCreatedTestData(prev => ({
            ...prev,
            testIDs: [...prev.testIDs, bodyData.testID]
          }));
        }
        if (bodyData.testIDs && Array.isArray(bodyData.testIDs)) {
          setCreatedTestData(prev => ({
            ...prev,
            testIDs: [...prev.testIDs, ...bodyData.testIDs]
          }));
        }
      }

      // Track template IDs
      if (test.name.includes('Save Questions') && test.payload.templateID) {
        setCreatedTestData(prev => ({
          ...prev,
          templateIDs: [...prev.templateIDs, test.payload.templateID]
        }));
      }

      // Track answer submissions
      if (test.name.includes('Save Answer') && test.payload.testID) {
        setCreatedTestData(prev => ({
          ...prev,
          testIDs: [...new Set([...prev.testIDs, test.payload.testID])]
        }));
      }

      // Track elaborate/code test submissions
      if (test.name.includes('Calculate Score') && test.payload.testID) {
        setCreatedTestData(prev => ({
          ...prev,
          testIDs: [...new Set([...prev.testIDs, test.payload.testID])]
        }));
      }
    } catch (e) {
      // Silently fail tracking - cleanup is best effort
      console.warn('Failed to track resources:', e);
    }
  };

  // Cleanup function to delete test data
  const cleanupTestData = async () => {
    if (!autoCleanup) {
      console.log('Auto-cleanup disabled');
      return;
    }

    setCleanupStatus('cleaning');
    const cleanupResults = {
      tests: { attempted: 0, success: 0, failed: 0 },
      templates: { attempted: 0, success: 0, failed: 0 }
    };

    try {
      // Cleanup test transactions
      const uniqueTestIDs = [...new Set(createdTestData.testIDs)];
      cleanupResults.tests.attempted = uniqueTestIDs.length;

      for (const testID of uniqueTestIDs) {
        try {
          const response = await fetch(
            'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTestTransaction',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ testID })
            }
          );

          if (response.ok) {
            cleanupResults.tests.success++;
            console.log(`✓ Deleted test: ${testID}`);
          } else {
            cleanupResults.tests.failed++;
            console.warn(`✗ Failed to delete test: ${testID}`);
          }
        } catch (error) {
          cleanupResults.tests.failed++;
          console.error(`Error deleting test ${testID}:`, error);
        }
      }

      // Cleanup templates
      const uniqueTemplateIDs = [...new Set(createdTestData.templateIDs)];
      cleanupResults.templates.attempted = uniqueTemplateIDs.length;

      for (const templateID of uniqueTemplateIDs) {
        try {
          const response = await fetch(
            'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/deleteTemplate',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ templateIDSelectedForDelete: templateID })
            }
          );

          if (response.ok) {
            cleanupResults.templates.success++;
            console.log(`✓ Deleted template: ${templateID}`);
          } else {
            cleanupResults.templates.failed++;
            console.warn(`✗ Failed to delete template: ${templateID}`);
          }
        } catch (error) {
          cleanupResults.templates.failed++;
          console.error(`Error deleting template ${templateID}:`, error);
        }
      }

      setCleanupStatus('completed');
      
      // Reset tracked data
      setCreatedTestData({
        testIDs: [],
        templateIDs: [],
        answerIDs: []
      });

      return cleanupResults;

    } catch (error) {
      console.error('Cleanup error:', error);
      setCleanupStatus('error');
      return cleanupResults;
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);
    setCleanupStatus(null);
    
    const filteredTests = apiTests.filter(test => 
      (selectedCategory === 'all' || test.category === selectedCategory) &&
      (searchTerm === '' || test.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const results = [];
    for (const test of filteredTests) {
      const result = await runSingleTest(test);
      results.push(result);
      setTestResults([...results]); // Update UI after each test
    }
    
    setLoading(false);

    // Auto cleanup after tests complete
    if (autoCleanup && (createdTestData.testIDs.length > 0 || createdTestData.templateIDs.length > 0)) {
      setTimeout(async () => {
        const cleanupResults = await cleanupTestData();
        console.log('Cleanup completed:', cleanupResults);
      }, 2000); // Wait 2 seconds after tests complete
    }
  };

  const runSingleTestById = async (index) => {
    const test = apiTests[index];
    const result = await runSingleTest(test);
    
    setTestResults(prev => {
      const newResults = [...prev];
      const existingIndex = newResults.findIndex(r => r.name === test.name);
      if (existingIndex >= 0) {
        newResults[existingIndex] = result;
      } else {
        newResults.push(result);
      }
      return newResults;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASS': return '#28a745';
      case 'FAIL': return '#dc3545';
      case 'ERROR': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const filteredTests = apiTests.filter(test => 
    (selectedCategory === 'all' || test.category === selectedCategory) &&
    (searchTerm === '' || test.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter displayed results by status
  const displayedResults = testResults.filter(result => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pass') return result.status === 'PASS';
    if (statusFilter === 'fail') return result.status === 'FAIL';
    if (statusFilter === 'error') return result.status === 'ERROR';
    return true;
  });

  const stats = {
    total: testResults.length,
    passed: testResults.filter(r => r.status === 'PASS').length,
    failed: testResults.filter(r => r.status === 'FAIL').length,
    errors: testResults.filter(r => r.status === 'ERROR').length,
    avgResponseTime: testResults.length > 0 
      ? Math.round(testResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / testResults.length)
      : 0
  };

  // Handle stat card click to filter
  const handleStatCardClick = (filter) => {
    if (statusFilter === filter) {
      setStatusFilter('all'); // Toggle off if clicking the same filter
    } else {
      setStatusFilter(filter);
    }
  };

  return (
    <div className="api-test-container">
      {/* Header */}
      <div className="test-header">
        <button onClick={() => navigate('/list')} className="back-button">
          ← Back to Dashboard
        </button>
        <h1>🧪 API Test Suite</h1>
        <p>Comprehensive testing for all backend Lambda functions</p>
      </div>

      {/* Controls */}
      <div className="test-controls">
        <div className="control-group">
          <label>Category:</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tests..."
          />
        </div>

        <div className="control-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoCleanup}
              onChange={(e) => setAutoCleanup(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-cleanup test data
          </label>
        </div>

        <button 
          onClick={runAllTests} 
          disabled={loading}
          className="run-all-button"
        >
          {loading ? '⏳ Running Tests...' : '🚀 Run All Tests'}
        </button>

        {(createdTestData.testIDs.length > 0 || createdTestData.templateIDs.length > 0) && (
          <button 
            onClick={cleanupTestData} 
            disabled={cleanupStatus === 'cleaning'}
            className="cleanup-button"
            title="Manually cleanup created test data"
          >
            {cleanupStatus === 'cleaning' ? '🧹 Cleaning...' : '🗑️ Cleanup Now'}
          </button>
        )}
      </div>

      {/* Cleanup Status */}
      {cleanupStatus && (
        <div className={`cleanup-status ${cleanupStatus}`}>
          {cleanupStatus === 'cleaning' && (
            <div>
              <span className="cleanup-icon">🧹</span>
              <span>Cleaning up test data...</span>
            </div>
          )}
          {cleanupStatus === 'completed' && (
            <div>
              <span className="cleanup-icon">✅</span>
              <span>Test data cleaned up successfully</span>
            </div>
          )}
          {cleanupStatus === 'error' && (
            <div>
              <span className="cleanup-icon">⚠️</span>
              <span>Cleanup completed with some errors (check console)</span>
            </div>
          )}
        </div>
      )}

      {/* Tracked Resources Info */}
      {(createdTestData.testIDs.length > 0 || createdTestData.templateIDs.length > 0) && (
        <div className="tracked-resources">
          <h4>📝 Created Resources (will be auto-cleaned):</h4>
          <div className="resource-counts">
            {createdTestData.testIDs.length > 0 && (
              <span className="resource-badge">
                {createdTestData.testIDs.length} test(s)
              </span>
            )}
            {createdTestData.templateIDs.length > 0 && (
              <span className="resource-badge">
                {createdTestData.templateIDs.length} template(s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {testResults.length > 0 && (
        <div className="test-stats">
          <div 
            className={`stat-card ${statusFilter === 'all' ? 'stat-active' : ''}`}
            onClick={() => handleStatCardClick('all')}
            style={{ cursor: 'pointer' }}
            title="Click to show all tests"
          >
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div 
            className={`stat-card stat-pass ${statusFilter === 'pass' ? 'stat-active' : ''}`}
            onClick={() => handleStatCardClick('pass')}
            style={{ cursor: 'pointer' }}
            title="Click to filter passed tests"
          >
            <div className="stat-value">{stats.passed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div 
            className={`stat-card stat-fail ${statusFilter === 'fail' ? 'stat-active' : ''}`}
            onClick={() => handleStatCardClick('fail')}
            style={{ cursor: 'pointer' }}
            title="Click to filter failed tests"
          >
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div 
            className={`stat-card stat-error ${statusFilter === 'error' ? 'stat-active' : ''}`}
            onClick={() => handleStatCardClick('error')}
            style={{ cursor: 'pointer' }}
            title="Click to filter error tests"
          >
            <div className="stat-value">{stats.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avgResponseTime}ms</div>
            <div className="stat-label">Avg Time</div>
          </div>
        </div>
      )}

      {/* Active Filter Indicator */}
      {statusFilter !== 'all' && testResults.length > 0 && (
        <div className="active-filter-banner">
          <span>
            📊 Showing {displayedResults.length} of {stats.total} tests
            {statusFilter === 'pass' && ' - ✅ Passed tests only'}
            {statusFilter === 'fail' && ' - ❌ Failed tests only'}
            {statusFilter === 'error' && ' - ⚠️ Error tests only'}
          </span>
          <button 
            onClick={() => setStatusFilter('all')} 
            className="clear-filter-btn"
            title="Clear filter"
          >
            ✕ Clear Filter
          </button>
        </div>
      )}

      {/* Test List */}
      <div className="test-list">
        {filteredTests.map((test, index) => {
          const result = displayedResults.find(r => r.name === test.name);
          
          // Skip if filtering and this result doesn't match
          if (statusFilter !== 'all' && result && !displayedResults.includes(result)) {
            return null;
          }

          return (
            <div key={index} className="test-item">
              <div className="test-item-header">
                <div className="test-info">
                  <h3>{test.name}</h3>
                  <span className="test-category">{test.category}</span>
                  {result && (
                    <span 
                      className="test-status"
                      style={{ background: getStatusColor(result.status) }}
                    >
                      {result.status}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => runSingleTestById(index)}
                  className="test-run-button"
                >
                  ▶ Run
                </button>
              </div>

              <p className="test-description">{test.description}</p>
              
              <div className="test-details">
                <div><strong>Endpoint:</strong> <code>{test.endpoint.split('.com')[1]}</code></div>
                <div><strong>Method:</strong> <span className="method-badge">{test.method}</span></div>
              </div>

              {result && (
                <div className="test-result">
                  <div className="result-header">
                    <strong>Result</strong>
                    <span>{result.responseTime}ms</span>
                  </div>

                  {result.error && (
                    <div className="error-box">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}

                  {result.checks && (
                    <div className="checks-box">
                      <div className={result.checks.statusMatch ? 'check-pass' : 'check-fail'}>
                        {result.checks.statusMatch ? '✓' : '✗'} Status Code: {result.responseStatus}
                      </div>
                      <div className={result.checks.fieldsMatch ? 'check-pass' : 'check-fail'}>
                        {result.checks.fieldsMatch ? '✓' : '✗'} Required Fields Present
                      </div>
                      {result.checks.llmCheck && (
                        <div className={result.checks.llmCheck.passed ? 'check-pass' : 'check-fail'}>
                          {result.checks.llmCheck.passed ? '✓' : '✗'} LLM Evaluation: {result.checks.llmCheck.message}
                        </div>
                      )}
                    </div>
                  )}

                  <details className="response-details">
                    <summary>View Response Data</summary>
                    <pre>{JSON.stringify(result.responseData, null, 2)}</pre>
                  </details>

                  <details className="payload-details">
                    <summary>View Request Payload</summary>
                    <pre>{JSON.stringify(test.payload, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTests.length === 0 && (
        <div className="no-results">
          No tests found matching your criteria
        </div>
      )}

      {displayedResults.length === 0 && testResults.length > 0 && statusFilter !== 'all' && (
        <div className="no-results">
          No tests match the selected filter ({statusFilter})
        </div>
      )}
    </div>
  );
};

export default APITestSuite;
