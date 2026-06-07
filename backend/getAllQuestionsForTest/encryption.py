import base64
import json
import hashlib
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import secrets

class QuestionEncryption:
    """
    Handles encryption and decryption of questions for secure bulk delivery
    """
    
    @staticmethod
    def generate_test_key(test_id, candidate_name):
        """
        Generate a unique encryption key for each test session
        """
        # Create a deterministic but secure key based on test and candidate
        key_material = f"{test_id}_{candidate_name}_{secrets.token_hex(16)}"
        key = hashlib.sha256(key_material.encode()).digest()
        return key
    
    @staticmethod
    def encrypt_question(question_data, key):
        """
        Encrypt a single question's sensitive data
        """
        try:
            # Extract sensitive data to encrypt
            sensitive_data = {
                'question': question_data.get('question', ''),
                'options': question_data.get('options', []),
                'correctAnswer': question_data.get('correctAnswer', '')
            }
            
            # Convert to JSON string
            json_data = json.dumps(sensitive_data, ensure_ascii=False)
            
            # Generate random IV for each encryption
            iv = get_random_bytes(16)
            
            # Create cipher and encrypt
            cipher = AES.new(key, AES.MODE_CBC, iv)
            padded_data = pad(json_data.encode('utf-8'), AES.block_size)
            encrypted_data = cipher.encrypt(padded_data)
            
            # Combine IV and encrypted data, then base64 encode
            encrypted_payload = base64.b64encode(iv + encrypted_data).decode('utf-8')
            
            # Return question with encrypted sensitive data
            encrypted_question = {
                'questionID': question_data.get('questionID'),
                'topic': question_data.get('topic', '__NO_TOPIC__'),
                'encrypted_data': encrypted_payload,
                'datetime': question_data.get('datetime')
            }
            
            return encrypted_question
            
        except Exception as e:
            print(f"Encryption error: {str(e)}")
            raise Exception(f"Failed to encrypt question: {str(e)}")
    
    @staticmethod
    def encrypt_questions_bulk(questions, key):
        """
        Encrypt multiple questions efficiently
        """
        encrypted_questions = []
        
        for question in questions:
            try:
                encrypted_question = QuestionEncryption.encrypt_question(question, key)
                encrypted_questions.append(encrypted_question)
            except Exception as e:
                print(f"Failed to encrypt question {question.get('questionID', 'unknown')}: {str(e)}")
                # Skip failed encryptions rather than failing entire batch
                continue
        
        return encrypted_questions
    
    @staticmethod
    def create_key_hint(key):
        """
        Create a hint for key verification (first 8 chars of key hash)
        """
        key_hash = hashlib.sha256(key).hexdigest()
        return key_hash[:8]

# JavaScript equivalent for frontend (to be used in React)
FRONTEND_DECRYPTION_CODE = '''
// Frontend decryption utilities (add to utils/encryption.js)
import CryptoJS from 'crypto-js';

class QuestionDecryption {
  static generateTestKey(testId, candidateName, keyHint) {
    // This would need to match the backend key generation
    // For security, the key should be provided by backend or derived securely
    return keyHint; // Placeholder - implement secure key derivation
  }
  
  static decryptQuestion(encryptedQuestion, key) {
    try {
      const encryptedData = encryptedQuestion.encrypted_data;
      
      // Decode base64
      const encryptedBytes = CryptoJS.enc.Base64.parse(encryptedData);
      
      // Extract IV (first 16 bytes) and encrypted data
      const iv = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(0, 4));
      const encrypted = CryptoJS.lib.WordArray.create(encryptedBytes.words.slice(4));
      
      // Decrypt
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted },
        CryptoJS.enc.Hex.parse(key),
        { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
      );
      
      // Convert to string and parse JSON
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
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
      throw new Error('Failed to decrypt question');
    }
  }
  
  static decryptCurrentQuestion(encryptedQuestions, currentIndex, key) {
    if (currentIndex >= 0 && currentIndex < encryptedQuestions.length) {
      return this.decryptQuestion(encryptedQuestions[currentIndex], key);
    }
    return null;
  }
}

export default QuestionDecryption;
'''