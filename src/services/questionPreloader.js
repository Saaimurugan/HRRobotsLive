class QuestionPreloader {
  constructor() {
    this.preloadedQuestions = new Map(); // Map of testID -> preloaded question
    this.preloadingPromises = new Map(); // Map of testID -> preloading promise
    this.isPreloading = new Map(); // Map of testID -> boolean
  }

  /**
   * Preload the next question for a test
   * @param {string} testID - The test ID
   * @param {string} candidateName - The candidate name
   * @param {number} currentQuestionNumber - Current question number (1-based)
   * @param {number} totalQuestions - Total number of questions in the test
   * @returns {Promise} - Promise that resolves when preloading is complete
   */
  async preloadNextQuestion(testID, candidateName, currentQuestionNumber, totalQuestions) {
    // Don't preload if this is the last question
    if (currentQuestionNumber >= totalQuestions) {
      // console.log(`Not preloading: Question ${currentQuestionNumber} is the last question`);
      return null;
    }

    const preloadKey = `${testID}_${candidateName}`;
    
    // If already preloading, return the existing promise
    if (this.preloadingPromises.has(preloadKey)) {
      return this.preloadingPromises.get(preloadKey);
    }

    // If already preloaded, return immediately
    if (this.preloadedQuestions.has(preloadKey)) {
      // console.log(`Question already preloaded for ${preloadKey}`);
      return Promise.resolve(this.preloadedQuestions.get(preloadKey));
    }

    // Add a small delay to reduce concurrent API calls
    await new Promise(resolve => setTimeout(resolve, 200));

    // console.log(`Preloading next question for ${preloadKey} (current: ${currentQuestionNumber}/${totalQuestions})`);
    
    // Start preloading
    this.isPreloading.set(preloadKey, true);
    
    const preloadPromise = this._fetchQuestion(testID, candidateName)
      .then(question => {
        if (question) {
          this.preloadedQuestions.set(preloadKey, question);
          // console.log(`Successfully preloaded question for ${preloadKey}`);
        }
        return question;
      })
      .catch(error => {
        // console.warn(`Failed to preload question for ${preloadKey}:`, error);
        return null;
      })
      .finally(() => {
        this.isPreloading.set(preloadKey, false);
        this.preloadingPromises.delete(preloadKey);
      });

    this.preloadingPromises.set(preloadKey, preloadPromise);
    return preloadPromise;
  }

  /**
   * Get a preloaded question if available
   * @param {string} testID - The test ID
   * @param {string} candidateName - The candidate name
   * @returns {Object|null} - The preloaded question or null
   */
  getPreloadedQuestion(testID, candidateName) {
    const preloadKey = `${testID}_${candidateName}`;
    const question = this.preloadedQuestions.get(preloadKey);
    
    if (question) {
      // Remove from cache once consumed
      this.preloadedQuestions.delete(preloadKey);
      // console.log(`Using preloaded question for ${preloadKey}`);
    }
    
    return question || null;
  }

  /**
   * Check if a question is currently being preloaded
   * @param {string} testID - The test ID
   * @param {string} candidateName - The candidate name
   * @returns {boolean} - True if preloading is in progress
   */
  isPreloadingQuestion(testID, candidateName) {
    const preloadKey = `${testID}_${candidateName}`;
    return this.isPreloading.get(preloadKey) || false;
  }

  /**
   * Clear preloaded data for a test (cleanup)
   * @param {string} testID - The test ID
   * @param {string} candidateName - The candidate name
   */
  clearPreloadedData(testID, candidateName) {
    const preloadKey = `${testID}_${candidateName}`;
    this.preloadedQuestions.delete(preloadKey);
    this.preloadingPromises.delete(preloadKey);
    this.isPreloading.delete(preloadKey);
    // console.log(`Cleared preloaded data for ${preloadKey}`);
  }

  /**
   * Private method to fetch a question from the API
   * @param {string} testID - The test ID
   * @param {string} candidateName - The candidate name
   * @returns {Promise<Object|null>} - Promise that resolves to question data or null
   * 
   * NOTE: This service automatically handles both old format (topic embedded in question text)
   * and new format (separate topic field) since the API handles the conversion.
   */
  async _fetchQuestion(testID, candidateName) {
    try {
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getQuestionsTopic",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testID, candidateName }),
        }
      );
      
      const data = await response.json();
      
      if (data.statusCode === 200) {
        const parsedBody = JSON.parse(data.body);
        return {
          question: parsedBody.new_question,
          questionCount: parsedBody.question_count
        };
      } else if (data.statusCode === 404) {
        // console.log('No more questions available for preloading');
        return null;
      } else {
        throw new Error(`API returned status ${data.statusCode}: ${JSON.stringify(data.body)}`);
      }
    } catch (error) {
      // console.error('Error fetching question for preloading:', error);
      throw error;
    }
  }

  /**
   * Get statistics about preloading status
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      preloadedCount: this.preloadedQuestions.size,
      preloadingCount: Array.from(this.isPreloading.values()).filter(Boolean).length,
      totalCacheSize: this.preloadedQuestions.size + this.preloadingPromises.size
    };
  }
}

// Create a singleton instance
const questionPreloader = new QuestionPreloader();

export default questionPreloader;