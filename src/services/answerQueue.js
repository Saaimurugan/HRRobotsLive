class AnswerQueue {
  constructor() {
    this.queues = new Map(); // Map of testID -> answer queue
    this.savingPromises = new Map(); // Map of testID -> saving promise
    this.isSaving = new Map(); // Map of testID -> boolean
    this.savedAnswers = new Map(); // Map of testID -> Set of saved questionIDs
  }

  /**
   * Add an answer to the queue for background saving
   * @param {string} testID - The test ID
   * @param {string} questionID - The question ID
   * @param {string} answer - The selected answer
   * @param {number} timestamp - When the answer was selected
   */
  queueAnswer(testID, questionID, answer, timestamp = Date.now()) {
    if (!this.queues.has(testID)) {
      this.queues.set(testID, []);
    }

    const queue = this.queues.get(testID);
    
    // Check if this question already has an answer in queue
    const existingIndex = queue.findIndex(item => item.questionID === questionID);
    
    const answerData = {
      questionID,
      answer,
      timestamp,
      attempts: 0,
      maxAttempts: 3
    };

    if (existingIndex >= 0) {
      // Update existing answer
      queue[existingIndex] = answerData;
      // console.log(`Updated answer in queue for question ${questionID}`);
    } else {
      // Add new answer
      queue.push(answerData);
      // console.log(`Queued answer for question ${questionID}: "${answer}"`);
    }

    // Start background saving if not already in progress
    this._startBackgroundSaving(testID);
  }

  /**
   * Save all queued answers for a test in the background
   * @param {string} testID - The test ID
   * @returns {Promise} - Promise that resolves when all answers are saved
   */
  async saveQueuedAnswers(testID) {
    if (this.isSaving.get(testID)) {
      return this.savingPromises.get(testID);
    }

    const queue = this.queues.get(testID);
    if (!queue || queue.length === 0) {
      return Promise.resolve();
    }

    // console.log(`Starting to save ${queue.length} queued answers for test ${testID}`);
    
    this.isSaving.set(testID, true);
    
    const savingPromise = this._processSaveQueue(testID)
      .finally(() => {
        this.isSaving.set(testID, false);
        this.savingPromises.delete(testID);
      });

    this.savingPromises.set(testID, savingPromise);
    return savingPromise;
  }

  /**
   * Check if a specific answer has been saved
   * @param {string} testID - The test ID
   * @param {string} questionID - The question ID
   * @returns {boolean} - True if answer has been saved
   */
  isAnswerSaved(testID, questionID) {
    const savedSet = this.savedAnswers.get(testID);
    return savedSet ? savedSet.has(questionID) : false;
  }

  /**
   * Get the number of unsaved answers for a test
   * @param {string} testID - The test ID
   * @returns {number} - Number of unsaved answers
   */
  getUnsavedCount(testID) {
    const queue = this.queues.get(testID);
    return queue ? queue.length : 0;
  }

  /**
   * Get all saved question IDs for a test
   * @param {string} testID - The test ID
   * @returns {Set} - Set of saved question IDs
   */
  getSavedQuestionIDs(testID) {
    return this.savedAnswers.get(testID) || new Set();
  }

  /**
   * Check if background saving is in progress
   * @param {string} testID - The test ID
   * @returns {boolean} - True if saving is in progress
   */
  isSavingInProgress(testID) {
    return this.isSaving.get(testID) || false;
  }

  /**
   * Force save all queued answers immediately (for test submission)
   * @param {string} testID - The test ID
   * @returns {Promise} - Promise that resolves when all answers are saved
   */
  async flushQueue(testID) {
    // console.log(`Flushing answer queue for test ${testID}`);
    return this.saveQueuedAnswers(testID);
  }

  /**
   * Clear all data for a test (cleanup)
   * @param {string} testID - The test ID
   */
  clearTestData(testID) {
    this.queues.delete(testID);
    this.savingPromises.delete(testID);
    this.isSaving.delete(testID);
    this.savedAnswers.delete(testID);
    // console.log(`Cleared answer queue data for test ${testID}`);
  }

  /**
   * Get statistics about the answer queue
   * @param {string} testID - The test ID (optional)
   * @returns {Object} - Statistics object
   */
  getStats(testID = null) {
    if (testID) {
      return {
        queuedAnswers: this.getUnsavedCount(testID),
        savedAnswers: this.getSavedQuestionIDs(testID).size,
        isSaving: this.isSavingInProgress(testID)
      };
    }

    // Global stats
    let totalQueued = 0;
    let totalSaved = 0;
    let activeSaving = 0;

    for (const [testId] of this.queues) {
      totalQueued += this.getUnsavedCount(testId);
      totalSaved += this.getSavedQuestionIDs(testId).size;
      if (this.isSavingInProgress(testId)) activeSaving++;
    }

    return {
      totalQueued,
      totalSaved,
      activeSaving,
      activeTests: this.queues.size
    };
  }

  /**
   * Private method to start background saving
   * @param {string} testID - The test ID
   */
  _startBackgroundSaving(testID) {
    // Clear any existing timeout to debounce rapid clicks
    if (this.saveTimeouts && this.saveTimeouts.has(testID)) {
      clearTimeout(this.saveTimeouts.get(testID));
    }
    
    if (!this.saveTimeouts) {
      this.saveTimeouts = new Map();
    }
    
    // Use a small delay to batch multiple rapid answer selections
    const timeoutId = setTimeout(() => {
      this.saveTimeouts.delete(testID);
      this.saveQueuedAnswers(testID);
    }, 500); // 500ms delay to batch rapid selections
    
    this.saveTimeouts.set(testID, timeoutId);
  }

  /**
   * Private method to process the save queue
   * @param {string} testID - The test ID
   * @returns {Promise} - Promise that resolves when processing is complete
   */
  async _processSaveQueue(testID) {
    const queue = this.queues.get(testID);
    if (!queue || queue.length === 0) {
      return;
    }

    // Take a snapshot of current queue items to process
    const itemsToProcess = [...queue];
    // Clear the queue - new items added during save will go to fresh queue
    this.queues.set(testID, []);

    const results = [];
    
    // Process answers in parallel for better performance
    for (const answerData of itemsToProcess) {
      results.push(this._saveAnswer(testID, answerData));
    }

    const saveResults = await Promise.allSettled(results);
    
    // Process results
    const failedItems = [];
    const savedSet = this.savedAnswers.get(testID) || new Set();

    for (let i = 0; i < saveResults.length; i++) {
      const result = saveResults[i];
      const answerData = itemsToProcess[i];

      if (result.status === 'fulfilled' && result.value.success) {
        // Answer saved successfully
        savedSet.add(answerData.questionID);
      } else {
        // Answer failed to save
        answerData.attempts++;
        if (answerData.attempts < answerData.maxAttempts) {
          // Retry later
          failedItems.push(answerData);
        }
      }
    }

    // Update saved answers
    this.savedAnswers.set(testID, savedSet);
    
    // Get any new items that were added during save
    const newItems = this.queues.get(testID) || [];
    
    // Merge failed items and new items back to queue
    const mergedQueue = [...failedItems, ...newItems];
    this.queues.set(testID, mergedQueue);

    // If there are still items to process, continue saving
    if (mergedQueue.length > 0) {
      await this._processSaveQueue(testID);
    }
  }

  /**
   * Private method to save a single answer
   * @param {string} testID - The test ID
   * @param {Object} answerData - The answer data
   * @returns {Promise<Object>} - Promise that resolves to save result
   */
  async _saveAnswer(testID, answerData) {
    try {
      const response = await fetch(
        "https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/saveAnswerSubmitted",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testID,
            questionID: answerData.questionID,
            answer: answerData.answer,
          }),
        }
      );

      const data = await response.json();
      
      if (data.statusCode === 200) {
        return { success: true, questionID: answerData.questionID };
      } else {
        throw new Error(`API returned status ${data.statusCode}: ${data.body}`);
      }
    } catch (error) {
      // console.error(`Error saving answer for question ${answerData.questionID}:`, error);
      return { success: false, questionID: answerData.questionID, error: error.message };
    }
  }
}

// Create a singleton instance
const answerQueue = new AnswerQueue();

export default answerQueue;