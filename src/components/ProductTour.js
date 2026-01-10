import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';
import '../ProductTour.css';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to HR Robots! 🎉',
    content: 'Let us show you around! This quick tour will help you get started with our platform.',
    target: null,
    page: '/list',
    position: 'center'
  },
  {
    id: 'create-jd',
    title: 'Create Job Description',
    content: 'Start by creating a professional job description. Our AI helps you generate role-specific JDs based on job title, skills, and experience level.',
    target: '[data-tour="create-jd"]',
    page: '/list',
    position: 'bottom'
  },
  {
    id: 'candidate-profiler',
    title: 'Candidate Profiler',
    content: 'Upload a resume and job description to generate a comprehensive report highlighting skill matches and role suitability.',
    target: '[data-tour="candidate-profiler"]',
    page: '/list',
    position: 'bottom'
  },
  {
    id: 'screening-test',
    title: 'Screening Test',
    content: 'Create customized MCQ assessments. Click here to create your first test template!',
    target: '[data-tour="screening-test"]',
    page: '/list',
    position: 'bottom',
    action: 'navigate',
    actionTarget: '/createTemplate'
  },
  {
    id: 'add-question-manual',
    title: 'Add Questions Manually',
    content: 'Use this form to add questions one by one. Enter the question, options, and select the correct answer.',
    target: '[data-tour="add-question-form"]',
    page: '/createTemplate',
    position: 'left'
  },
  {
    id: 'generate-ai',
    title: 'Generate with AI',
    content: 'Let AI generate questions for you! Enter a topic, select difficulty level, and click "Generate 20 Questions" to auto-create questions.',
    target: '[data-tour="ai-section"]',
    page: '/createTemplate',
    position: 'left'
  },
  {
    id: 'template-from-jd',
    title: 'Template from JD',
    content: 'Have a Job Description? Upload it here to automatically extract keywords and generate relevant MCQ questions based on the JD requirements.',
    target: '[data-tour="jd-template-section"]',
    page: '/createTemplate',
    position: 'left'
  },
  {
    id: 'edit-question',
    title: 'Edit Questions',
    content: 'Click the "Edit" button on any question card to modify it. You can change the question text, options, or correct answer.',
    target: '[data-tour="question-list"]',
    page: '/createTemplate',
    position: 'right'
  },
  {
    id: 'delete-question',
    title: 'Delete Questions',
    content: 'Click the "Remove" button to delete any question you don\'t need. The question will be removed from your template.',
    target: '[data-tour="question-list"]',
    page: '/createTemplate',
    position: 'right'
  },
  {
    id: 'back-to-list',
    title: 'Back to Dashboard',
    content: 'Let\'s go back to the dashboard to see more features. Click the back button or we\'ll navigate for you.',
    target: '.template-back-btn',
    page: '/createTemplate',
    position: 'right',
    action: 'navigate',
    actionTarget: '/list'
  },
  {
    id: 'edit-template',
    title: 'Edit Template',
    content: 'Click the pencil icon to edit an existing template. You can add, modify, or remove questions from your templates.',
    target: '[data-tour="edit-template-btn"]',
    page: '/list',
    position: 'right'
  },
  {
    id: 'assign-template',
    title: 'Assign Template',
    content: 'Share your template with other recruiters by clicking the assign icon. Enter their email to give them access.',
    target: '[data-tour="assign-template-btn"]',
    page: '/list',
    position: 'right'
  },
  {
    id: 'config-template',
    title: 'Configuration',
    content: 'Configure test settings like number of questions, duration, and proctoring sensitivity using the settings icon.',
    target: '[data-tour="config-template-btn"]',
    page: '/list',
    position: 'right'
  },
  {
    id: 'delete-template',
    title: 'Delete Template',
    content: 'Remove templates you no longer need by clicking the trash icon. This will also delete all associated questions.',
    target: '[data-tour="delete-template-btn"]',
    page: '/list',
    position: 'right'
  },
  {
    id: 'generate-link',
    title: 'Generate Test Link',
    content: 'Click "Generate Test Link" to create a unique URL for each candidate. After generating, you can copy the link to share with candidates.',
    target: '[data-tour="generate-link-btn"]',
    page: '/list',
    position: 'right'
  },
  {
    id: 'check-results',
    title: 'View Results',
    content: 'After candidates complete their tests, check their results here. Paste the test link to view detailed performance summaries.',
    target: '[data-tour="check-results"]',
    page: '/list',
    position: 'bottom'
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    content: 'Get detailed analytics on candidate performance, including score breakdowns, time taken, and topic-wise analysis.',
    target: '[data-tour="check-results"]',
    page: '/list',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    content: 'You now know the basics of HR Robots. Start creating your first screening test and streamline your hiring process!',
    target: null,
    page: '/list',
    position: 'center'
  }
];

const ProductTour = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState({});
  const navigate = useNavigate();
  const { globalValue, JWTValue } = useGlobalContext();

  const step = TOUR_STEPS[currentStep];

  const positionTooltip = useCallback((retryCount = 0) => {
    if (!step) return;

    if (step.position === 'center' || !step.target) {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      setHighlightStyle({ display: 'none' });
      return;
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // Retry up to 10 times with 300ms intervals (3 seconds total)
      if (retryCount < 10) {
        setTimeout(() => positionTooltip(retryCount + 1), 300);
        return;
      }
      // After retries, show tooltip in center
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
      setHighlightStyle({ display: 'none' });
      return;
    }

    // Scroll element into view with offset for header
    const headerOffset = 80;
    const elementRect = targetElement.getBoundingClientRect();
    const absoluteElementTop = elementRect.top + window.pageYOffset;
    const offsetPosition = absoluteElementTop - headerOffset - 100;
    
    // Only scroll if element is not fully visible
    if (elementRect.top < headerOffset || elementRect.bottom > window.innerHeight - 50) {
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }

    // Wait a bit for scroll to complete, then position
    setTimeout(() => {
      // Re-query the element after scroll
      const targetEl = document.querySelector(step.target);
      if (!targetEl) {
        // Target not found - show tooltip in center with a message
        setTooltipStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        });
        setHighlightStyle({ display: 'none' });
        return;
      }

      const rect = targetEl.getBoundingClientRect();
      const padding = 10;

      setHighlightStyle({
        display: 'block',
        position: 'fixed',
        top: `${rect.top - padding}px`,
        left: `${rect.left - padding}px`,
        width: `${rect.width + padding * 2}px`,
        height: `${rect.height + padding * 2}px`,
        borderRadius: '8px',
        pointerEvents: 'none',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        border: '3px solid #1cbbb4',
        zIndex: 9999
      });

      const tooltipWidth = 340;
      const tooltipHeight = 220;
      const gap = 20; // Gap between tooltip and target
      let top, left;

      // Calculate available space on each side
      const spaceAbove = rect.top - headerOffset;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      // Find the best position that doesn't overlap with the target
      // Priority: preferred position > opposite > sides
      const canFitTop = spaceAbove >= tooltipHeight + gap;
      const canFitBottom = spaceBelow >= tooltipHeight + gap;
      const canFitLeft = spaceLeft >= tooltipWidth + gap;
      const canFitRight = spaceRight >= tooltipWidth + gap;

      let bestPosition = step.position;

      // Check if preferred position works, otherwise find alternative
      if (step.position === 'bottom' && !canFitBottom) {
        if (canFitTop) bestPosition = 'top';
        else if (canFitRight) bestPosition = 'right';
        else if (canFitLeft) bestPosition = 'left';
      } else if (step.position === 'top' && !canFitTop) {
        if (canFitBottom) bestPosition = 'bottom';
        else if (canFitRight) bestPosition = 'right';
        else if (canFitLeft) bestPosition = 'left';
      } else if (step.position === 'left' && !canFitLeft) {
        if (canFitRight) bestPosition = 'right';
        else if (canFitBottom) bestPosition = 'bottom';
        else if (canFitTop) bestPosition = 'top';
      } else if (step.position === 'right' && !canFitRight) {
        if (canFitLeft) bestPosition = 'left';
        else if (canFitBottom) bestPosition = 'bottom';
        else if (canFitTop) bestPosition = 'top';
      }

      // Position tooltip based on best position - ensuring no overlap
      switch (bestPosition) {
        case 'top':
          top = rect.top - tooltipHeight - gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - gap;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          break;
        default:
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
      }

      // Keep tooltip within viewport bounds
      const minLeft = 16;
      const maxLeft = window.innerWidth - tooltipWidth - 16;
      const minTop = headerOffset + 10;
      const maxTop = window.innerHeight - tooltipHeight - 16;

      left = Math.max(minLeft, Math.min(left, maxLeft));
      top = Math.max(minTop, Math.min(top, maxTop));

      // Final check: ensure tooltip doesn't overlap with target
      const tooltipRect = {
        top: top,
        bottom: top + tooltipHeight,
        left: left,
        right: left + tooltipWidth
      };

      const targetRect = {
        top: rect.top - padding,
        bottom: rect.bottom + padding,
        left: rect.left - padding,
        right: rect.right + padding
      };

      // Check for overlap
      const overlaps = !(tooltipRect.right < targetRect.left || 
                         tooltipRect.left > targetRect.right || 
                         tooltipRect.bottom < targetRect.top || 
                         tooltipRect.top > targetRect.bottom);

      if (overlaps) {
        // Force tooltip to a non-overlapping position
        // Priority: right > left > bottom > top
        if (spaceRight >= tooltipWidth + gap) {
          left = rect.right + gap;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else if (spaceLeft >= tooltipWidth + gap) {
          left = rect.left - tooltipWidth - gap;
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
        } else if (spaceBelow >= tooltipHeight + gap) {
          top = rect.bottom + gap;
          left = Math.max(minLeft, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, maxLeft));
        } else {
          top = rect.top - tooltipHeight - gap;
          left = Math.max(minLeft, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, maxLeft));
        }
        
        // Re-apply bounds
        left = Math.max(minLeft, Math.min(left, maxLeft));
        top = Math.max(minTop, Math.min(top, maxTop));
      }

      setTooltipStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`
      });
    }, 100);
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    // Navigate to the correct page if needed
    if (step && step.page && window.location.pathname !== step.page) {
      navigate(step.page);
      // Wait longer for navigation and data loading to complete
      const timer = setTimeout(() => positionTooltip(0), 800);
      return () => clearTimeout(timer);
    }

    // Position tooltip after a short delay to allow DOM updates
    const timer = setTimeout(() => positionTooltip(0), 200);
    
    const handleReposition = () => positionTooltip(0);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition);
    };
  }, [isOpen, currentStep, step, navigate, positionTooltip]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      // If current step has an action, perform it
      if (step.action === 'navigate' && step.actionTarget) {
        navigate(step.actionTarget);
      }
      
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    // Mark user as not new
    try {
      await fetch("https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/userDetailsCURD", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: globalValue, 
          newUser: "no",
          action: "update",
          token: JWTValue 
        })
      });
    } catch (error) {
      //console.error("Error updating user status:", error);
    }
    
    onComplete?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="product-tour-overlay">
      <div className="product-tour-highlight" style={highlightStyle} />
      
      <div className="product-tour-tooltip" style={tooltipStyle}>
        <div className="tour-header">
          <span className="tour-step-indicator">
            Step {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button className="tour-close-btn" onClick={handleSkip} title="Skip tour">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="tour-actions">
          <button 
            className="tour-btn tour-btn-secondary" 
            onClick={handleSkip}
          >
            Skip Tour
          </button>
          <div className="tour-nav-buttons">
            {currentStep > 0 && (
              <button className="tour-btn tour-btn-outline" onClick={handlePrev}>
                Previous
              </button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={handleNext}>
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
        
        <div className="tour-content">
          <h3>{step?.title}</h3>
          <p>{step?.content}</p>
        </div>
        
        <div className="tour-progress">
          {TOUR_STEPS.map((_, index) => (
            <div 
              key={index} 
              className={`tour-progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductTour;
