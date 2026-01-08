import CryptoJS from 'crypto-js';

/**
 * Frontend decryption utilities for handling encrypted questions
 */
class QuestionDecryption {
  
  /**
   * Decrypt a single encrypted question
   * @param {Object} encryptedQuestion - The encrypted question object
   * @param {string} keyHex - The encryption key as hex string
   * @returns {Object} - Decrypted question object
   */
  static decryptQuestion(encryptedQuestion, keyHex) {
    try {
      const encryptedData = encryptedQuestion.encrypted_data;
      
      // Convert hex key to WordArray
      const key = CryptoJS.enc.Hex.parse(keyHex);
      
      // Decode base64 encrypted data
      const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
      
      // Extract IV (first 16 bytes) and encrypted content
      const iv = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(0, 4));
      const encrypted = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(4));
      
      // Decrypt using AES-CBC
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted },
        key,
        { 
          iv: iv, 
          mode: CryptoJS.mode.CBC, 
          padding: CryptoJS.pad.Pkcs7 
        }
      );
      
      // Convert to string and parse JSON
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Decryption resulted in empty string - invalid key or corrupted data');
      }
      
      const questionData = JSON.parse(decryptedText);
      
      // Return complete question object
      return {
        questionID: encryptedQuestion.questionID,
        topic: encryptedQuestion.topic,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        datetime: encryptedQuestion.datetime
      };
      
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error(`Failed to decrypt question: ${error.message}`);
    }
  }
  
  /**
   * Decrypt the current question based on index
   * @param {Array} encryptedQuestions - Array of encrypted questions
   * @param {number} currentIndex - Current question index
   * @param {string} keyHex - The encryption key as hex string
   * @returns {Object|null} - Decrypted question or null if invalid index
   */
  static decryptCurrentQuestion(encryptedQuestions, currentIndex, keyHex) {
    if (currentIndex >= 0 && currentIndex < encryptedQuestions.length) {
      return this.decryptQuestion(encryptedQuestions[currentIndex], keyHex);
    }
    return null;
  }
  
  /**
   * Validate encryption key by attempting to decrypt first question
   * @param {Array} encryptedQuestions - Array of encrypted questions
   * @param {string} keyHex - The encryption key as hex string
   * @returns {boolean} - True if key is valid
   */
  static validateKey(encryptedQuestions, keyHex) {
    if (!encryptedQuestions || encryptedQuestions.length === 0) {
      return false;
    }
    
    try {
      this.decryptQuestion(encryptedQuestions[0], keyHex);
      return true;
    } catch (error) {
      console.warn('Key validation failed:', error.message);
      return false;
    }
  }
  
  /**
   * Decrypt multiple questions (use sparingly - decrypt on demand is preferred)
   * @param {Array} encryptedQuestions - Array of encrypted questions
   * @param {string} keyHex - The encryption key as hex string
   * @returns {Array} - Array of decrypted questions
   */
  static decryptAllQuestions(encryptedQuestions, keyHex) {
    const decryptedQuestions = [];
    
    for (let i = 0; i < encryptedQuestions.length; i++) {
      try {
        const decrypted = this.decryptQuestion(encryptedQuestions[i], keyHex);
        decryptedQuestions.push(decrypted);
      } catch (error) {
        console.error(`Failed to decrypt question ${i}:`, error);
        // Add placeholder for failed decryption to maintain array indices
        decryptedQuestions.push({
          questionID: encryptedQuestions[i].questionID,
          topic: encryptedQuestions[i].topic,
          question: 'Error: Failed to decrypt question',
          options: ['Error loading options'],
          correctAnswer: 'Error',
          error: true
        });
      }
    }
    
    return decryptedQuestions;
  }
  
  /**
   * Get question metadata without decrypting sensitive content
   * @param {Object} encryptedQuestion - The encrypted question object
   * @returns {Object} - Question metadata
   */
  static getQuestionMetadata(encryptedQuestion) {
    return {
      questionID: encryptedQuestion.questionID,
      topic: encryptedQuestion.topic,
      datetime: encryptedQuestion.datetime,
      hasEncryptedData: !!encryptedQuestion.encrypted_data
    };
  }
}

/**
 * Answer encryption utilities for secure answer submission
 */
class AnswerEncryption {
  
  /**
   * Encrypt an answer before submission
   * @param {Object} answerData - The answer data to encrypt
   * @param {string} keyHex - The encryption key as hex string
   * @returns {string} - Encrypted answer as base64 string
   */
  static encryptAnswer(answerData, keyHex) {
    try {
      // Convert answer data to JSON
      const jsonData = JSON.stringify(answerData);
      
      // Convert hex key to WordArray
      const key = CryptoJS.enc.Hex.parse(keyHex);
      
      // Generate random IV
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // Encrypt using AES-CBC
      const encrypted = CryptoJS.AES.encrypt(jsonData, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Combine IV and encrypted data
      const combined = iv.concat(encrypted.ciphertext);
      
      // Return as base64 string
      return CryptoJS.enc.Base64.stringify(combined);
      
    } catch (error) {
      console.error('Answer encryption error:', error);
      throw new Error(`Failed to encrypt answer: ${error.message}`);
    }
  }
  
  /**
   * Encrypt multiple answers for batch submission
   * @param {Array} answers - Array of answer objects
   * @param {string} keyHex - The encryption key as hex string
   * @returns {Array} - Array of encrypted answers
   */
  static encryptAnswers(answers, keyHex) {
    return answers.map((answer, index) => {
      try {
        return {
          index: index,
          encrypted_answer: this.encryptAnswer(answer, keyHex),
          questionID: answer.questionID,
          timestamp: answer.timestamp || new Date().toISOString()
        };
      } catch (error) {
        console.error(`Failed to encrypt answer ${index}:`, error);
        return {
          index: index,
          error: error.message,
          questionID: answer.questionID,
          timestamp: answer.timestamp || new Date().toISOString()
        };
      }
    });
  }
}

export { QuestionDecryption, AnswerEncryption };