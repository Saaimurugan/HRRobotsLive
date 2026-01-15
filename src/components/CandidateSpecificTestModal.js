import { useState, useCallback } from "react";
import * as pdfjsLib from 'pdfjs-dist';
import { useGlobalContext } from "../globalContext";
import { useNavigate, useLocation } from "react-router-dom";
import "../CreateTemplate.css";
import "../createTemplateFromJD.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

const CandidateSpecificTestModal = ({ isOpen, onClose, showToast, template, onTemplateCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [extractedKeywords, setExtractedKeywords] = useState([]);
  const [templateTopics, setTemplateTopics] = useState([]);
  const [matchingKeywords, setMatchingKeywords] = useState([]);
  const [nonMatchingKeywords, setNonMatchingKeywords] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [customizedQuestions, setCustomizedQuestions] = useState([]);
  const [testLink, setTestLink] = useState("");
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentKeyword: "" });
  const [templateName, setTemplateName] = useState("");
  const [newTemplateID, setNewTemplateID] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const { globalValue, JWTValue, setRedirectPath, logout } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Session handler
  const checkUnauthorized = useCallback((data) => {
    if (data?.message === "Unauthorized" || 
        data?.body === '{"message": "Unauthorized"}' ||
        (typeof data?.body === 'string' && data.body.includes('"message": "Unauthorized"')) ||
        data?.statusCode === 401) {
      setRedirectPath(location.pathname);
      showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
      logout();
      setTimeout(() => navigate('/login'), 1500);
      return true;
    }
    if (data?.body) {
      try {
        const parsedBody = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        if (parsedBody?.message === "Unauthorized") {
          setRedirectPath(location.pathname);
          showToast('error', 'Session Expired', 'Your session has timed out. Please log in again.');
          logout();
          setTimeout(() => navigate('/login'), 1500);
          return true;
        }
      } catch (e) {}
    }
    return false;
  }, [location.pathname, logout, navigate, setRedirectPath, showToast]);

  // Reset modal state
  const resetModal = () => {
    setCurrentStep(1);
    setResumeFile(null);
    setResumeText("");
    setCandidateName("");
    setExtractedKeywords([]);
    setTemplateTopics([]);
    setMatchingKeywords([]);
    setNonMatchingKeywords([]);
    setCustomizedQuestions([]);
    setTestLink("");
    setTemplateName("");
    setNewTemplateID("");
    setIsExtracting(false);
    setIsGenerating(false);
    setIsCreatingTest(false);
    setIsSavingName(false);
    setShowCustomize(false);
    setSelectedOption(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  // PDF text extraction
  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedText = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      extractedText.push(pageText);
    }
    return extractedText.join(' ');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      try {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
      } catch (error) {
        showToast('error', 'Error', 'Failed to extract text from PDF.');
      }
    } else if (file) {
      showToast('error', 'Invalid File', 'Please upload a valid PDF file.');
    }
  };

  const handleTextChange = (e) => {
    setResumeText(e.target.value);
  };

  // Extract candidate name from resume text
  const extractCandidateName = (text) => {
    // Try to extract name from the first few lines of the resume
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Common patterns: Name is usually in the first 3 lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip lines that look like headers, emails, phones, or addresses
      if (line.toLowerCase().includes('resume') || 
          line.toLowerCase().includes('curriculum') ||
          line.toLowerCase().includes('cv') ||
          line.includes('@') ||
          /^\d/.test(line) ||
          line.length > 50) {
        continue;
      }
      
      // Check if line looks like a name (2-4 words, capitalized, reasonable length)
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && line.length <= 40) {
        // Check if words are capitalized (likely a name)
        const isCapitalized = words.every(word => /^[A-Z]/.test(word));
        if (isCapitalized) {
          return line;
        }
      }
    }
    
    // Fallback: return first non-empty line if nothing found
    return lines.length > 0 ? lines[0].substring(0, 40) : "Candidate";
  };

  // Fetch template topics (existing questions)
  const fetchTemplateTopics = async () => {
    try {
      console.log('Fetching topics for template:', template.templateID);
      
      // Use the new getTemplateQuestions endpoint
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplateQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateID: template.templateID,
          token: JWTValue 
        })
      });
      
      const data = await response.json();
      console.log('getTemplateQuestions response:', data);
      
      if (checkUnauthorized(data)) return [];
      
      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        const topics = parsedBody.topics || [];
        const questionCount = parsedBody.questionCount || 0;
        
        console.log(`Found ${questionCount} questions with ${topics.length} unique topics:`, topics);
        return topics;
      }
      
      console.warn('Failed to fetch template questions:', data);
      return [];
      
    } catch (error) {
      console.error('Error fetching template topics:', error);
      showToast('error', 'Error', 'Failed to fetch template topics.');
      return [];
    }
  };

  // Extract keywords from resume and match with template
  const extractAndMatchKeywords = async () => {
    if (!resumeText.trim()) {
      showToast('warning', 'No Content', 'Please upload a resume or paste the text.');
      return;
    }

    setIsExtracting(true);
    try {
      // Extract candidate name from resume
      const extractedName = extractCandidateName(resumeText);
      setCandidateName(extractedName);
      
      // Fetch template topics first
      const topics = await fetchTemplateTopics();
      console.log('Fetched template topics:', topics);
      setTemplateTopics(topics);

      // Show warning if template has no topics
      if (topics.length === 0) {
        showToast('warning', 'No Template Topics', 'This template has no questions with topics. All keywords from the resume will be treated as new.');
      }

      // Extract keywords from resume
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/extractKeywordsFromJD", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: resumeText, token: JWTValue })
      });
      const data = await response.json();
      
      if (checkUnauthorized(data)) {
        setIsExtracting(false);
        return;
      }

      const parsedBody = JSON.parse(data.body);
      const keywords = parsedBody.keywords || [];
      const complexity = parsedBody.complexity || "intermediate";
      
      console.log('Extracted keywords from resume:', keywords);
      
      // Normalize for matching (case-insensitive)
      const normalizedTopics = topics.map(t => t.toLowerCase());
      console.log('Normalized template topics:', normalizedTopics);
      
      // Separate matching and non-matching keywords
      const matching = [];
      const nonMatching = [];
      
      keywords.forEach(kw => {
        const keyword = kw.keyword || kw;
        const normalizedKeyword = keyword.toLowerCase();
        
        const isMatch = normalizedTopics.some(topic => 
          topic.includes(normalizedKeyword) || normalizedKeyword.includes(topic)
        );
        
        console.log(`Keyword "${keyword}" matches template:`, isMatch);
        
        const keywordObj = {
          keyword: keyword,
          questionCount: kw.suggestedCount || 5,
          complexity: complexity,
          selected: true,
          action: isMatch ? 'keep' : 'add' // 'keep' for matching, 'add' for new
        };
        
        if (isMatch) {
          matching.push(keywordObj);
        } else {
          nonMatching.push(keywordObj);
        }
      });
      
      // Add template topics not in resume as removable
      const toRemove = [];
      topics.forEach(topic => {
        const normalizedTopic = topic.toLowerCase();
        const inResume = keywords.some(kw => {
          const keyword = (kw.keyword || kw).toLowerCase();
          return normalizedTopic.includes(keyword) || keyword.includes(normalizedTopic);
        });
        
        console.log(`Template topic "${topic}" found in resume:`, inResume);
        
        if (!inResume) {
          toRemove.push({
            keyword: topic,
            questionCount: 0,
            complexity: complexity,
            selected: false,
            action: 'remove' // Mark for removal
          });
        }
      });
      
      console.log('Matching keywords:', matching);
      console.log('Non-matching keywords:', nonMatching);
      console.log('Topics to remove:', toRemove);
      
      setExtractedKeywords([...matching, ...nonMatching, ...toRemove]);
      setMatchingKeywords(matching);
      setNonMatchingKeywords(nonMatching);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error in extractAndMatchKeywords:', error);
      showToast('error', 'Error', 'Failed to extract keywords from resume.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleKeyword = (index) => {
    setExtractedKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, selected: !kw.selected } : kw
    ));
  };

  const updateQuestionCount = (index, count) => {
    const newCount = Math.max(0, Math.min(20, parseInt(count) || 0));
    setExtractedKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, questionCount: newCount } : kw
    ));
  };

  const updateComplexity = (index, newComplexity) => {
    setExtractedKeywords(prev => prev.map((kw, i) => 
      i === index ? { ...kw, complexity: newComplexity } : kw
    ));
  };

  const getTotalQuestions = () => {
    return extractedKeywords.filter(kw => kw.selected && kw.action !== 'remove').reduce((sum, kw) => sum + kw.questionCount, 0);
  };

  // Generate questions for new keywords
  const generateCustomizedQuestions = async () => {
    const selectedKeywords = extractedKeywords.filter(kw => kw.selected && kw.action === 'add' && kw.questionCount > 0);
    
    // Initialize template name
    const initialTemplateName = candidateName 
      ? `${template.templateName} - ${candidateName}`
      : `${template.templateName} - Candidate Specific`;
    setTemplateName(initialTemplateName);
    
    if (selectedKeywords.length === 0) {
      showToast('info', 'No New Questions', 'No new keywords selected for question generation. Proceeding to review.');
      setCurrentStep(3);
      return;
    }

    const totalQuestions = selectedKeywords.reduce((sum, kw) => sum + kw.questionCount, 0);
    if (totalQuestions > 60) {
      showToast('warning', 'Too Many Questions', 'Maximum 60 new questions allowed. Please reduce question counts.');
      return;
    }

    setIsGenerating(true);
    setCustomizedQuestions([]);
    setCurrentStep(3);

    const allQuestions = [];
    
    for (let i = 0; i < selectedKeywords.length; i++) {
      const kw = selectedKeywords[i];
      setGenerationProgress({
        current: i + 1,
        total: selectedKeywords.length,
        currentKeyword: kw.keyword
      });

      try {
        let questionsForKeyword = [];
        let remaining = kw.questionCount;
        
        while (remaining > 0) {
          const batchSize = Math.min(20, remaining);
          const existingQuestions = [...allQuestions, ...questionsForKeyword].map(q => q.question).join(", ");
          
          const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createQuestionsUsingAI_", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              topic: kw.keyword, 
              level: kw.complexity, 
              formattedQuestions: existingQuestions,
              questionCount: batchSize,
              token: JWTValue 
            })
          });

          const data = await response.json();
          if (checkUnauthorized(data)) {
            setIsGenerating(false);
            return;
          }

          const parsedBody = JSON.parse(data.body);
          const responseContent = parsedBody.data;
          const generatedBatch = JSON.parse(responseContent);

          const questionsWithTopic = generatedBatch.slice(0, batchSize).map(q => ({
            type: "mcq",
            topic: kw.keyword,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            correctAnswerIndex: q.options ? q.options.indexOf(q.correctAnswer) : -1
          }));

          questionsForKeyword = [...questionsForKeyword, ...questionsWithTopic];
          remaining -= batchSize;
        }

        allQuestions.push(...questionsForKeyword.slice(0, kw.questionCount));
        setCustomizedQuestions([...allQuestions]);
        
      } catch (error) {
        showToast('error', 'Error', `Failed to generate questions for "${kw.keyword}".`);
      }
    }

    setIsGenerating(false);
    showToast('success', 'Complete', `Generated ${allQuestions.length} new questions successfully!`);
  };

  const deleteQuestion = (index) => {
    setCustomizedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // Create candidate-specific test
  const createCandidateTest = async () => {
    setIsCreatingTest(true);
    try {
      // Get all questions from the original template
      const questionsResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passedTemplateID: template.templateID, token: JWTValue })
      });
      
      const questionsData = await questionsResponse.json();
      console.log('Questions API response:', questionsData);
      
      if (checkUnauthorized(questionsData)) {
        setIsCreatingTest(false);
        return;
      }

      const parsedQuestionsBody = JSON.parse(questionsData.body);
      console.log('Parsed questions body:', parsedQuestionsBody);
      const allTemplateQuestions = parsedQuestionsBody.questions || [];
      console.log('All template questions count:', allTemplateQuestions.length);
      
      console.log('extractedKeywords:', extractedKeywords);
      console.log('extractedKeywords with action keep:', extractedKeywords.filter(kw => kw.action === 'keep'));
      console.log('extractedKeywords selected:', extractedKeywords.filter(kw => kw.selected));
      
      // Get selected keywords to keep (matching keywords that are checked)
      const keywordsToKeep = extractedKeywords
        .filter(kw => kw.selected && kw.action === 'keep')
        .map(kw => kw.keyword.toLowerCase());
      
      // Get keywords to remove (topics marked for removal that are NOT selected to keep anyway)
      const keywordsToRemove = extractedKeywords
        .filter(kw => !kw.selected && kw.action === 'remove')
        .map(kw => kw.keyword.toLowerCase());
      
      // Get unselected matching keywords (should also be removed)
      const unselectedMatchingKeywords = extractedKeywords
        .filter(kw => !kw.selected && kw.action === 'keep')
        .map(kw => kw.keyword.toLowerCase());
      
      // Get all non-matching keywords that are not selected (should also be removed)
      const unselectedNewKeywords = extractedKeywords
        .filter(kw => !kw.selected && kw.action === 'add')
        .map(kw => kw.keyword.toLowerCase());
      
      // Combine all keywords to remove
      const allKeywordsToRemove = [...keywordsToRemove, ...unselectedMatchingKeywords, ...unselectedNewKeywords];
      
      console.log('Keywords to keep:', keywordsToKeep);
      console.log('Keywords to remove:', allKeywordsToRemove);
      console.log('Total template questions:', allTemplateQuestions.length);
      console.log('Sample question topics:', allTemplateQuestions.slice(0, 5).map(q => q.topic));
      
      // Filter questions: keep only those matching selected keywords
      const filteredQuestions = allTemplateQuestions.filter(q => {
        const questionTopic = (q.topic || '').toLowerCase().trim();
        
        // Skip questions without topics
        if (!questionTopic || questionTopic === '__no_topic__') {
          return false;
        }
        
        // Remove if in remove list (more flexible matching)
        const shouldRemove = allKeywordsToRemove.some(keyword => {
          const keywordLower = keyword.toLowerCase().trim();
          // Check if keyword is part of topic or topic is part of keyword
          return questionTopic.includes(keywordLower) || 
                 keywordLower.includes(questionTopic) ||
                 // Also check word boundaries
                 questionTopic.split(/[\s\-_]+/).some(word => word === keywordLower) ||
                 keywordLower.split(/[\s\-_]+/).some(word => word === questionTopic);
        });
        
        if (shouldRemove) {
          return false;
        }
        
        // Keep if in keep list (or if keep list is empty, keep all not in remove list)
        if (keywordsToKeep.length > 0) {
          const shouldKeep = keywordsToKeep.some(keyword => {
            const keywordLower = keyword.toLowerCase().trim();
            // Check if keyword is part of topic or topic is part of keyword
            return questionTopic.includes(keywordLower) || 
                   keywordLower.includes(questionTopic) ||
                   // Also check word boundaries
                   questionTopic.split(/[\s\-_]+/).some(word => word === keywordLower) ||
                   keywordLower.split(/[\s\-_]+/).some(word => word === questionTopic);
          });
          return shouldKeep;
        }
        
        // If no keywords selected to keep, keep questions not in remove list
        return true;
      });
      
      console.log('Filtered questions:', filteredQuestions.length);
      console.log('Customized questions:', customizedQuestions.length);
      
      // Combine filtered existing questions with new generated questions
      const allQuestions = [...filteredQuestions, ...customizedQuestions];
      
      console.log('Total questions for test:', allQuestions.length);
      
      // Validate that we have questions
      if (allQuestions.length === 0) {
        showToast('warning', 'No Questions', 'No questions available for the test. Please select at least one matching keyword to keep existing questions, or generate new questions from resume keywords.');
        setIsCreatingTest(false);
        return;
      }
      
      // Use the templateName state (which can be edited by user in Step 4)
      const finalTemplateName = templateName || (candidateName 
        ? `${template.templateName} - ${candidateName}`
        : `${template.templateName} - Candidate Specific`);
      
      // Save questions (this will create a new template)
      const saveResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions_", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateID: "",  // Empty templateID creates a new template
          templateName: finalTemplateName,
          globalValue: globalValue,
          questions: allQuestions,
          token: JWTValue 
        })
      });
      
      const saveData = await saveResponse.json();
      if (checkUnauthorized(saveData)) {
        setIsCreatingTest(false);
        return;
      }

      const newTemplateID = saveData.templateID;
      setNewTemplateID(newTemplateID); // Store the new template ID for later updates

      // Copy test configuration from original template
      const configResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTestConfiguration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateID: template.templateID, token: JWTValue })
      });
      
      const configData = await configResponse.json();
      if (!checkUnauthorized(configData) && configData.statusCode === 200) {
        const parsedConfigBody = JSON.parse(configData.body);
        const config = parsedConfigBody.config || {};
        
        // Set configuration for new template
        await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/setTestConfiguration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            templateID: newTemplateID,
            allowedDefaults: config.allowedDefaults || '10',
            numberOfQuestions: Math.min(allQuestions.length, parseInt(config.numberOfQuestions || '10')).toString(),
            testDuration: config.testDuration || '60',
            sensitivityLevel: config.sensitivityLevel || '5',
            token: JWTValue 
          })
        });
      }

      // Create test link
      const testResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/createTest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          globalValue, 
          templateID: newTemplateID, 
          token: JWTValue 
        })
      });

      const testData = await testResponse.json();
      if (checkUnauthorized(testData)) {
        setIsCreatingTest(false);
        return;
      }

      if (testData.statusCode === 200) {
        const parsedTestBody = JSON.parse(testData.body);
        const testID = parsedTestBody.message;
        const link = `https://www.hrrobots.click/test/${testID}`;
        setTestLink(link);
        setCurrentStep(4);
        showToast('success', 'Test Created', 'Candidate-specific test link generated successfully!');
        
        // Refresh the templates list
        if (onTemplateCreated) {
          onTemplateCreated();
        }
      } else {
        showToast('error', 'Error', 'Failed to create test link.');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred while creating the test.');
    } finally {
      setIsCreatingTest(false);
    }
  };

  const copyToClipboard = () => {
    if (testLink) {
      navigator.clipboard.writeText(testLink)
        .then(() => {
          showToast('success', 'Copied!', 'Test link copied to clipboard.');
        })
        .catch(() => {
          showToast('error', 'Copy Failed', 'Failed to copy link to clipboard.');
        });
    }
  };

  const saveTemplateName = async () => {
    if (!newTemplateID || !templateName.trim()) {
      showToast('warning', 'Invalid Name', 'Please enter a valid template name.');
      return;
    }

    setIsSavingName(true);
    try {
      // Fetch existing questions first
      const questionsResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passedTemplateID: newTemplateID, token: JWTValue })
      });
      
      const questionsData = await questionsResponse.json();
      if (checkUnauthorized(questionsData)) {
        setIsSavingName(false);
        return;
      }

      const parsedQuestionsBody = JSON.parse(questionsData.body);
      const existingQuestions = parsedQuestionsBody.questions || [];

      // Update template with new name
      const updateResponse = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveQuestions_", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          templateID: newTemplateID,
          templateName: templateName.trim(),
          globalValue: globalValue,
          questions: existingQuestions,
          token: JWTValue 
        })
      });
      
      const updateData = await updateResponse.json();
      if (checkUnauthorized(updateData)) {
        setIsSavingName(false);
        return;
      }

      if (updateData.statusCode === 200) {
        showToast('success', 'Saved', 'Template name updated successfully!');
        // Refresh the templates list
        if (onTemplateCreated) {
          onTemplateCreated();
        }
      } else {
        showToast('error', 'Error', 'Failed to update template name.');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred while updating the template name.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Apply quick option selection
  const applyQuickOption = (option) => {
    setSelectedOption(option);
    
    // Update extractedKeywords based on selected option
    setExtractedKeywords(prev => {
      return prev.map(kw => {
        if (option === 'common-only') {
          // Option 1: Only common keywords - keep matching, deselect non-matching and remove
          if (kw.action === 'keep') {
            return { ...kw, selected: true };
          } else {
            return { ...kw, selected: false, questionCount: 0 };
          }
        } else if (option === 'add-resume') {
          // Option 2: Keep matching + add new from resume
          if (kw.action === 'keep' || kw.action === 'add') {
            return { ...kw, selected: true, questionCount: kw.action === 'add' ? (kw.questionCount || 5) : kw.questionCount };
          } else {
            return { ...kw, selected: true }; // Keep topics not in resume too
          }
        } else if (option === 'add-resume-remove-others') {
          // Option 3: Keep matching + add new from resume + remove topics not in resume
          if (kw.action === 'keep' || kw.action === 'add') {
            return { ...kw, selected: true, questionCount: kw.action === 'add' ? (kw.questionCount || 5) : kw.questionCount };
          } else {
            return { ...kw, selected: false }; // Remove topics not in resume
          }
        }
        return kw;
      });
    });
  };

  // Proceed with selected option
  const proceedWithOption = () => {
    if (!selectedOption) {
      showToast('warning', 'Select Option', 'Please select an option to proceed.');
      return;
    }
    generateCustomizedQuestions();
  };

  if (!isOpen) return null;

  return (
    <div className="jd-modal-overlay" onClick={handleClose}>
      <div className="jd-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="jd-modal-header">
          <h2>Create Candidate-Specific Test</h2>
          <button className="jd-modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="jd-modal-body">
          {/* Step Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--color-border, #e0e0e0)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: currentStep >= 1 ? 'var(--color-primary, #2563eb)' : 'var(--color-bg-secondary, #f5f5f5)',
                border: '2px solid ' + (currentStep >= 1 ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e0e0e0)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentStep >= 1 ? 'white' : 'var(--color-text-muted)',
                fontSize: '11px', fontWeight: '600'
              }}>1</div>
              <span style={{ fontSize: '11px', color: currentStep >= 1 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>Upload</span>
            </div>
            <div style={{ width: '30px', height: '2px', background: currentStep > 1 ? 'var(--color-primary)' : 'var(--color-border, #e0e0e0)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: currentStep >= 2 ? 'var(--color-primary, #2563eb)' : 'var(--color-bg-secondary, #f5f5f5)',
                border: '2px solid ' + (currentStep >= 2 ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e0e0e0)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentStep >= 2 ? 'white' : 'var(--color-text-muted)',
                fontSize: '11px', fontWeight: '600'
              }}>2</div>
              <span style={{ fontSize: '11px', color: currentStep >= 2 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>Keywords</span>
            </div>
            <div style={{ width: '30px', height: '2px', background: currentStep > 2 ? 'var(--color-primary)' : 'var(--color-border, #e0e0e0)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: currentStep >= 3 ? 'var(--color-primary, #2563eb)' : 'var(--color-bg-secondary, #f5f5f5)',
                border: '2px solid ' + (currentStep >= 3 ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e0e0e0)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentStep >= 3 ? 'white' : 'var(--color-text-muted)',
                fontSize: '11px', fontWeight: '600'
              }}>3</div>
              <span style={{ fontSize: '11px', color: currentStep >= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>Review</span>
            </div>
            <div style={{ width: '30px', height: '2px', background: currentStep > 3 ? 'var(--color-primary)' : 'var(--color-border, #e0e0e0)', margin: '0 6px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: currentStep >= 4 ? 'var(--color-primary, #2563eb)' : 'var(--color-bg-secondary, #f5f5f5)',
                border: '2px solid ' + (currentStep >= 4 ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e0e0e0)'),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentStep >= 4 ? 'white' : 'var(--color-text-muted)',
                fontSize: '11px', fontWeight: '600'
              }}>4</div>
              <span style={{ fontSize: '11px', color: currentStep >= 4 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>Done</span>
            </div>
          </div>

          {/* Step 1: Upload Resume */}
          {currentStep === 1 && (
            <div className="jd-step-content">
              <div className="jd-input-row">
                <div className="upload-section-jd">
                  <div className={`upload-card-jd ${resumeFile ? 'has-file' : ''}`}>
                    <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <h3>Upload Resume</h3>
                    <p>Upload candidate's resume (PDF format)</p>
                    <div className="file-input-wrapper">
                      <input type="file" accept="application/pdf" onChange={handleFileChange} id="resume-upload-modal" />
                      <label htmlFor="resume-upload-modal" className="file-input-label">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Choose PDF File
                      </label>
                    </div>
                    {resumeFile && (
                      <div className="file-name">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        {resumeFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="jd-divider">
                  <span>OR</span>
                </div>

                <div className="jd-text-section">
                  <label>Paste Resume text:</label>
                  <textarea value={resumeText} onChange={handleTextChange} placeholder="Paste the resume content here..." rows={8} />
                </div>
              </div>

              <div className="step-actions">
                <button className="btn-primary" onClick={extractAndMatchKeywords} disabled={isExtracting || !resumeText.trim()}>
                  {isExtracting ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      Extract & Match Keywords
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Match Keywords */}
          {currentStep === 2 && (
            <div className="jd-step-content">
              {!showCustomize ? (
                /* Quick Options View */
                <div className="keywords-section" style={{ padding: '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', padding: '0 5px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px' }}>Choose Test Configuration</h3>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {candidateName && <strong style={{ color: 'var(--color-primary)' }}>{candidateName}</strong>}
                      {candidateName && ' • '}
                      {matchingKeywords.length} matching, {nonMatchingKeywords.length} new keywords
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '5px' }}>
                    {/* Option 1 */}
                    <div 
                      onClick={() => applyQuickOption('common-only')}
                      style={{
                        padding: '10px 12px',
                        border: selectedOption === 'common-only' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedOption === 'common-only' ? 'var(--color-primary-light)' : 'var(--color-bg-primary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: selectedOption === 'common-only' ? '5px solid var(--color-primary)' : '2px solid var(--color-border)',
                          background: 'white'
                        }} />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Common Keywords Only</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            — Questions for keywords in both resume & template
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Option 2 */}
                    <div 
                      onClick={() => applyQuickOption('add-resume')}
                      style={{
                        padding: '10px 12px',
                        border: selectedOption === 'add-resume' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedOption === 'add-resume' ? 'var(--color-primary-light)' : 'var(--color-bg-primary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: selectedOption === 'add-resume' ? '5px solid var(--color-primary)' : '2px solid var(--color-border)',
                          background: 'white'
                        }} />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Add Resume Keywords</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            — Generate additional questions for resume keywords
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Option 3 */}
                    <div 
                      onClick={() => applyQuickOption('add-resume-remove-others')}
                      style={{
                        padding: '10px 12px',
                        border: selectedOption === 'add-resume-remove-others' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedOption === 'add-resume-remove-others' ? 'var(--color-primary-light)' : 'var(--color-bg-primary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                          border: selectedOption === 'add-resume-remove-others' ? '5px solid var(--color-primary)' : '2px solid var(--color-border)',
                          background: 'white'
                        }} />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>Resume-Focused Test</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            — Add resume keywords + remove unmatched topics
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customize Option */}
                    <div 
                      onClick={() => setShowCustomize(true)}
                      style={{
                        padding: '10px 12px',
                        border: '1px dashed var(--color-border)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: 'var(--color-bg-secondary)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Customize</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
                            — Manually select keywords and question counts
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="step-actions" style={{ marginTop: '12px', paddingTop: '12px' }}>
                    <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                    <button className="btn-primary" onClick={proceedWithOption} disabled={!selectedOption}>
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                /* Full Customize View */
                <div className="keywords-section" style={{ padding: 0 }}>
                  {matchingKeywords.length > 0 && (
                    <>
                      <h4 style={{ marginTop: '0', marginBottom: '6px', color: 'var(--color-success)', fontSize: '12px' }}>
                        ✓ Matching Keywords (Already in Template)
                      </h4>
                      <table className="keywords-table">
                        <thead>
                          <tr>
                            <th className="col-select"></th>
                            <th className="col-keyword">Keyword</th>
                            <th className="col-action">Action</th>
                            <th className="col-complexity">Complexity</th>
                            <th className="col-count">Questions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchingKeywords.filter(kw => kw.action === 'keep').map((kw, index) => {
                            const globalIndex = extractedKeywords.findIndex(k => k.keyword === kw.keyword);
                            const currentKeyword = extractedKeywords[globalIndex];
                            return (
                              <tr key={index} className={currentKeyword?.selected ? 'selected' : ''}>
                                <td className="col-select">
                                  <input type="checkbox" checked={currentKeyword?.selected || false} onChange={() => toggleKeyword(globalIndex)} />
                                </td>
                                <td className="col-keyword">{kw.keyword}</td>
                                <td className="col-action">
                                  <span className="action-badge keep">Keep Existing</span>
                                </td>
                                <td className="col-complexity">
                                  <select value={currentKeyword?.complexity || 'beginner'} onChange={(e) => updateComplexity(globalIndex, e.target.value)} disabled={!currentKeyword?.selected}>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                  </select>
                                </td>
                                <td className="col-count">
                                  <span style={{ color: 'var(--color-text-muted)' }}>Existing</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}

                  {nonMatchingKeywords.length > 0 && (
                    <>
                      <h4 style={{ marginTop: '12px', marginBottom: '6px', color: 'var(--color-info)', fontSize: '12px' }}>
                        + New Keywords (From Resume)
                      </h4>
                      <table className="keywords-table">
                        <thead>
                          <tr>
                            <th className="col-select"></th>
                            <th className="col-keyword">Keyword</th>
                            <th className="col-action">Action</th>
                            <th className="col-complexity">Complexity</th>
                            <th className="col-count">Questions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nonMatchingKeywords.map((kw, index) => {
                            const globalIndex = extractedKeywords.findIndex(k => k.keyword === kw.keyword);
                            const currentKeyword = extractedKeywords[globalIndex];
                            return (
                              <tr key={index} className={currentKeyword?.selected ? 'selected' : ''}>
                                <td className="col-select">
                                  <input type="checkbox" checked={currentKeyword?.selected || false} onChange={() => toggleKeyword(globalIndex)} />
                                </td>
                                <td className="col-keyword">{kw.keyword}</td>
                                <td className="col-action">
                                  <span className="action-badge add">Generate New</span>
                                </td>
                                <td className="col-complexity">
                                  <select value={currentKeyword?.complexity || 'beginner'} onChange={(e) => updateComplexity(globalIndex, e.target.value)} disabled={!currentKeyword?.selected}>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="expert">Expert</option>
                                  </select>
                                </td>
                                <td className="col-count">
                                  <div className="question-count-input">
                                    <button className="count-btn" onClick={() => updateQuestionCount(globalIndex, currentKeyword?.questionCount - 1)} disabled={!currentKeyword?.selected}>-</button>
                                    <input type="number" value={currentKeyword?.questionCount || 0} onChange={(e) => updateQuestionCount(globalIndex, e.target.value)} min="0" max="20" disabled={!currentKeyword?.selected} />
                                    <button className="count-btn" onClick={() => updateQuestionCount(globalIndex, kw.questionCount + 1)} disabled={!kw.selected}>+</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}

                  {extractedKeywords.filter(kw => kw.action === 'remove').length > 0 && (
                    <>
                      <h4 style={{ marginTop: '12px', marginBottom: '6px', color: 'var(--color-warning)', fontSize: '12px' }}>
                        ⚠ Topics Not in Resume — Uncheck to remove
                      </h4>
                      <table className="keywords-table">
                        <thead>
                          <tr>
                            <th className="col-select"></th>
                            <th className="col-keyword">Topic</th>
                            <th className="col-action">Action</th>
                            <th className="col-complexity">Complexity</th>
                            <th className="col-count">Questions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractedKeywords.filter(kw => kw.action === 'remove').map((kw, index) => {
                            const globalIndex = extractedKeywords.findIndex(k => k.keyword === kw.keyword);
                            const currentKeyword = extractedKeywords[globalIndex];
                            return (
                              <tr key={index} className={currentKeyword?.selected ? 'selected' : 'unselected'}>
                                <td className="col-select">
                                  <input type="checkbox" checked={currentKeyword?.selected || false} onChange={() => toggleKeyword(globalIndex)} />
                                </td>
                                <td className="col-keyword">{kw.keyword}</td>
                                <td className="col-action">
                                  <span className="action-badge remove">
                                    {currentKeyword?.selected ? 'Keep Anyway' : 'Will Remove'}
                                </span>
                              </td>
                              <td className="col-complexity">
                                <span style={{ color: 'var(--color-text-muted)' }}>N/A</span>
                              </td>
                              <td className="col-count">
                                <span style={{ color: 'var(--color-text-muted)' }}>Existing</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}

                  <div className="step-actions">
                    <button className="btn-secondary" onClick={() => setShowCustomize(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                      Back to Options
                    </button>
                    <button className="btn-primary" onClick={generateCustomizedQuestions}>
                      Continue to Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Customize */}
          {currentStep === 3 && (
            <div className="jd-step-content">
              {isGenerating && (
                <div className="generation-progress">
                  <div className="progress-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    <span>Generating questions for: <strong>{generationProgress.currentKeyword}</strong></span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }} />
                  </div>
                  <div className="progress-text">Keyword {generationProgress.current} of {generationProgress.total}</div>
                </div>
              )}

              <div className="generated-questions-section">
                <div className="questions-header">
                  <h3>Review Customized Test</h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    {customizedQuestions.length > 0 
                      ? `${customizedQuestions.length} new questions generated. Review and create the test.`
                      : 'No new questions generated. The test will use existing template questions based on your selections.'}
                  </p>
                </div>

                {customizedQuestions.length > 0 && (
                  <div className="questions-list-modal">
                    {customizedQuestions.map((q, index) => {
                      const topic = q.topic || '__NO_TOPIC__';
                      return (
                        <div key={index} className="qcard">
                          {topic && topic !== '__NO_TOPIC__' && <span className="question-topic-tag">{topic}</span>}
                          <h4>{index + 1}. {q.question}</h4>
                          <ul>
                            {q.options.map((opt, optIndex) => (
                              <li key={optIndex} className={optIndex === q.correctAnswerIndex ? 'correct-answer' : ''}>{opt}</li>
                            ))}
                          </ul>
                          <div className="qcard-actions">
                            <button className="btn-danger" onClick={() => deleteQuestion(index)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isGenerating && (
                  <div className="step-actions">
                    <button className="btn-secondary" onClick={() => setCurrentStep(2)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                      </svg>
                      Back to Keywords
                    </button>
                    <button className="btn-primary" onClick={createCandidateTest} disabled={isCreatingTest}>
                      {isCreatingTest ? (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Creating Test...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.479 3.53087C19.552 2.60383 18.2979 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.46997L11.75 5.17997" />
                            <path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60706C11.7642 9.26329 11.0684 9.05886 10.3533 9.00765C9.63816 8.95643 8.92037 9.05966 8.24861 9.3102C7.57685 9.56074 6.96684 9.95296 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82" />
                          </svg>
                          Create Test Link
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Get Test Link */}
          {currentStep === 4 && (
            <div className="jd-step-content">
              <div className="test-link-section">
                <div className="success-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 style={{ textAlign: 'center', marginTop: '20px' }}>Test Link Generated!</h3>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                  Your candidate-specific test is ready. Copy the link below and share it with the candidate.
                </p>
                
                <div className="template-name-section">
                  <label>Template Name</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter template name"
                      style={{ flex: 1 }}
                    />
                    <button 
                      className="btn-secondary" 
                      onClick={saveTemplateName}
                      disabled={isSavingName}
                      style={{ minWidth: '100px' }}
                    >
                      {isSavingName ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                            <path d="M21 12a9 9 0 11-6.219-8.56" />
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="test-link-box">
                  <input type="text" value={testLink} readOnly className="test-link-input" />
                  <button className="btn-copy" onClick={copyToClipboard}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                </div>

                <div className="step-actions" style={{ marginTop: '30px' }}>
                  <button className="btn-primary" onClick={handleClose}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateSpecificTestModal;
