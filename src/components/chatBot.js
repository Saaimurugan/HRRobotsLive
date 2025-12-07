// Import necessary dependencies
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../chatBot.css'; // Optional for styling

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Function to handle sending messages
  const sendMessage = async () => {   

    if (!input.trim())     
    {
      return;
    }

    const userMessage = { sender: 'user', text: input };
    setMessages([...messages, userMessage]);

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: "Check the job description and candidates profile and conduct an interview and ask one question\n Job description for an AI/ML Data Scientist specializing in areas such as Natural  Language Processing (NLP), Convolutional Neural Networks (CNN), Large  Language Models (LLM), OpenCV, YOLO, PIL, and ResNet 50 with a focus on  projects like Alt Text Generatio n would typically include the following  responsibilities and requirements:  Responsibilities:  Research and Development: Engage in cutting - edge research in machine learning,  NLP, CNN, and computer vision to develop solutions that can be applied to alt text  generation.  Data Analysis and Modeling: Build and implement models using techniques such  as LLMs, CNNs (especially ResNet 50), and other deep learning frameworks.  Algorithm Development: Design and develop efficient algorithms for image and  language processing using OpenCV, YOLO, and similar technologies.  Project Management: Lead projects on alt text generation, overseeing the project  from data collection to model deployment.  Collaboration: Work closely with other data scientists, engineers, and stakeholders  to integrate systems and solutions into the larger infrastructure.  Requirements:  Education: Typically a masters or Ph.D. in Computer Science, Mathematics, or a  related field.  Technical Expertise: Profound knowledge in AI/ML, NLP, CNNs, LLMs,  OpenCV, YOLO, PIL, and specifically experience with ResNet 50 architecture.  Experience: Demonstrated experience in machine learning projects, particularly  those involving alt text generation or similar applications.  Programming Skills: Proficiency in programming languages such as Python or R,  and familiarity with libraries and frameworks relevant to the fields mentioned.  Problem - Solving: Strong analytical and problem - solving skills with a creative  approach to overcoming technical challenges.  Communication: Excellent communication skills to effectively collaborate with  team members and present findings and solutions to non - technical stakeholders./n Resume: Suraj Pandey, Data Scientist/ML Engineer  Lucknow, 226010, India, +91-8077405103, soorajhjcms@gmail.com  Date of birth   11/06/1995  Place of birth   Lucknow  Nationality   Indian  L I N K S   LinkedIn ,   github  P R O F I L E   I am truly enthusiastic about Data science, Machine learning, Deep learning, and AI. Passionate about applying  data science to real world problem and deliver valuable insights via data analytics and data driven methods.  ML Engineer by profession, proficient in building ML pipelines,major inclination towards sequencing  models.My field of expertise comprises of Machine Learning,Deep Learning,Natural Language Processing. Love  building ML pipeline from scratch, from discovery till delivery. Also experienced in building ML and NLP  pipeline in cloud using AWS sagemaker and comprehend. Extensive experience in building and fine-tuning  Language Model(LLM) using state-of-the-art AI technologies.  E M P L OY M E N T H I S TO RY  Apr 2023 — Present   Senior Machine Learning Engineer, Quantiphi Inc.   Bengaluru  Project: Jungle scout(product clustering and recommendation)  Technology: Sagemaker, Bedrock,S3, Cloudwatch, Opensearch  1 .   Currently the client has a SaaS tool which had a collection of dashboards for helping advertisers better  sell and market their products on the online marketplace Amazon.com. Their existing customer base was  spending a significant amount of time and effort to interpret and analyze the dashboards and figure out  the meaningful insights for their business. The client was looking to decrease the time to value for their  customers by generating proactive suggestions leveraging Large language models.  2 .   Product clustering using K-Means and Hierarchical Clustering .  3 .   Designed and implemented scalable recommendation engine using LLMs and OpenSearch  4 .   Enabled personalized recommendations for advertisers.  Jun 2021 — Apr 2023   Machine Learning Engineer, Quantiphi Inc.   Bengaluru  Project Name:   Dental Exchange  Technology: AWS EC2, Gitlab, Sage maker, AWS Lambda, ECR, AWS Textract  1 .   Developed cloud-agnostic document processing pipelines.  2 .   Worked directly with clients and stakeholders to build end-to-end demos and showcase AI/ML capabilities  across multiple verticals for business acquisition.  3 .   Delivered a Dental Claims Processing Solution handling over 1 million claims monthly as a part of the  QDox team. Reduced the need for human review from 40% to just 1% by utilizing AWS   Textract's OCR  output to train machine learning models to extract key-value pairs, checkboxes, and tabular data from  documents.  Project Name: Washington State University (Data Extraction)  Technology:   Sagemaker, AWS Lambda, ECR,Docker, Hugging Face,AWS Textract  1 .   Improved efficiency and accuracy in obtaining critical data from transcripts by leading the  experimentation and deployment of machine learning models as part of the QDox team.  2 .   Designed an internal SaaS platform for NLP based tasks such as document classification, information  extraction, named entity recognition, and object detection, reducing the turnaround time for  proof-of-concept projects.  3 .   Cultivated a robust portfolio of successful projects, leveraging the power of AWS cloud to deploy ML  models at scale.  4 .   I have hands-on experience in fine-tuning encoder-based LLMs for custom applications, effectively  addressing specific business challenges. Jun 2020 — Apr 2021   Research trainee, CSIR-CSIO   Chandigarh  Project: Hand Gesture Classifiction  Technology:   KNN, Accuracy, Precision, Recall, F1-score, Confusion Matrix, Multicollinearity, Naive Bayes,  Robotics, XGBoost, IQR, Exploratory Data Analysis (EDA) , Statistics, Bais  1 .   Used KNN, Naive Bayes, and XGBoost algorithm to come up with a model that can help in classifying  the hand gesture of below-elbow amputee using Electromyogram (EMG) signal from the seven fore-arm  muscles  2 .   Used GridSearchCV to perform Hyperparameter tuning for getting the best value of hyperparameter K  and leaf size of the KNN algorithm. Achieved the classification accuracy o f 96%" },
          ...messages.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })),
          { role: 'user', content: input },
        ],
      }, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer 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`, // Replace YOUR_API_KEY with your OpenAI API key
        },
      });

      const botMessage = { sender: 'bot', text: response.data.choices[0].message.content };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error fetching response from ChatGPT:', error);
      const errorMessage = { sender: 'bot', text: 'Sorry, I encountered an error. Please try again later.' };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }

  };  

  // Function to handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container">
        <h2 style={{marginTop: "100px"}}>AI Interview</h2>
        <div className="chat-window">
        <p>Hi, Please give an short introduction about your self.</p>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            {message.text || "Hi, Please give an short introduction about your self."}
          </div>
        ))}
      </div>

      <div className="input-container">
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatBot;