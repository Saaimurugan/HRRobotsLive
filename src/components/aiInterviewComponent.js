import React, { useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

const AIInterviewComponent = () => {
  const [resume, setResume] = useState("Suraj Pandey, Data Scientist/ML Engineer  Lucknow, 226010, India, +91-8077405103, soorajhjcms@gmail.com  Date of birth   11/06/1995  Place of birth   Lucknow  Nationality   Indian  L I N K S   LinkedIn ,   github  P R O F I L E   I am truly enthusiastic about Data science, Machine learning, Deep learning, and AI. Passionate about applying  data science to real world problem and deliver valuable insights via data analytics and data driven methods.  ML Engineer by profession, proficient in building ML pipelines,major inclination towards sequencing  models.My field of expertise comprises of Machine Learning,Deep Learning,Natural Language Processing. Love  building ML pipeline from scratch, from discovery till delivery. Also experienced in building ML and NLP  pipeline in cloud using AWS sagemaker and comprehend. Extensive experience in building and fine-tuning  Language Model(LLM) using state-of-the-art AI technologies.  E M P L OY M E N T H I S TO RY  Apr 2023 — Present   Senior Machine Learning Engineer, Quantiphi Inc.   Bengaluru  Project: Jungle scout(product clustering and recommendation)  Technology: Sagemaker, Bedrock,S3, Cloudwatch, Opensearch  1 .   Currently the client has a SaaS tool which had a collection of dashboards for helping advertisers better  sell and market their products on the online marketplace Amazon.com. Their existing customer base was  spending a significant amount of time and effort to interpret and analyze the dashboards and figure out  the meaningful insights for their business. The client was looking to decrease the time to value for their  customers by generating proactive suggestions leveraging Large language models.  2 .   Product clustering using K-Means and Hierarchical Clustering .  3 .   Designed and implemented scalable recommendation engine using LLMs and OpenSearch  4 .   Enabled personalized recommendations for advertisers.  Jun 2021 — Apr 2023   Machine Learning Engineer, Quantiphi Inc.   Bengaluru  Project Name:   Dental Exchange  Technology: AWS EC2, Gitlab, Sage maker, AWS Lambda, ECR, AWS Textract  1 .   Developed cloud-agnostic document processing pipelines.  2 .   Worked directly with clients and stakeholders to build end-to-end demos and showcase AI/ML capabilities  across multiple verticals for business acquisition.  3 .   Delivered a Dental Claims Processing Solution handling over 1 million claims monthly as a part of the  QDox team. Reduced the need for human review from 40% to just 1% by utilizing AWS   Textract's OCR  output to train machine learning models to extract key-value pairs, checkboxes, and tabular data from  documents.  Project Name: Washington State University (Data Extraction)  Technology:   Sagemaker, AWS Lambda, ECR,Docker, Hugging Face,AWS Textract  1 .   Improved efficiency and accuracy in obtaining critical data from transcripts by leading the  experimentation and deployment of machine learning models as part of the QDox team.  2 .   Designed an internal SaaS platform for NLP based tasks such as document classification, information  extraction, named entity recognition, and object detection, reducing the turnaround time for  proof-of-concept projects.  3 .   Cultivated a robust portfolio of successful projects, leveraging the power of AWS cloud to deploy ML  models at scale.  4 .   I have hands-on experience in fine-tuning encoder-based LLMs for custom applications, effectively  addressing specific business challenges. Jun 2020 — Apr 2021   Research trainee, CSIR-CSIO   Chandigarh  Project: Hand Gesture Classifiction  Technology:   KNN, Accuracy, Precision, Recall, F1-score, Confusion Matrix, Multicollinearity, Naive Bayes,  Robotics, XGBoost, IQR, Exploratory Data Analysis (EDA) , Statistics, Bais  1 .   Used KNN, Naive Bayes, and XGBoost algorithm to come up with a model that can help in classifying  the hand gesture of below-elbow amputee using Electromyogram (EMG) signal from the seven fore-arm  muscles  2 .   Used GridSearchCV to perform Hyperparameter tuning for getting the best value of hyperparameter K  and leaf size of the KNN algorithm. Achieved the classification accuracy o f 96%");
  const [jobDescription, setJobDescription] = useState("Job description for an AI/ML Data Scientist specializing in areas such as Natural  Language Processing (NLP), Convolutional Neural Networks (CNN), Large  Language Models (LLM), OpenCV, YOLO, PIL, and ResNet 50 with a focus on  projects like Alt Text Generatio n would typically include the following  responsibilities and requirements:  Responsibilities:  Research and Development: Engage in cutting - edge research in machine learning,  NLP, CNN, and computer vision to develop solutions that can be applied to alt text  generation.  Data Analysis and Modeling: Build and implement models using techniques such  as LLMs, CNNs (especially ResNet 50), and other deep learning frameworks.  Algorithm Development: Design and develop efficient algorithms for image and  language processing using OpenCV, YOLO, and similar technologies.  Project Management: Lead projects on alt text generation, overseeing the project  from data collection to model deployment.  Collaboration: Work closely with other data scientists, engineers, and stakeholders  to integrate systems and solutions into the larger infrastructure.  Requirements:  Education: Typically a masters or Ph.D. in Computer Science, Mathematics, or a  related field.  Technical Expertise: Profound knowledge in AI/ML, NLP, CNNs, LLMs,  OpenCV, YOLO, PIL, and specifically experience with ResNet 50 architecture.  Experience: Demonstrated experience in machine learning projects, particularly  those involving alt text generation or similar applications.  Programming Skills: Proficiency in programming languages such as Python or R,  and familiarity with libraries and frameworks relevant to the fields mentioned.  Problem - Solving: Strong analytical and problem - solving skills with a creative  approach to overcoming technical challenges.  Communication: Excellent communication skills to effectively collaborate with  team members and present findings and solutions to non - technical stakeholders.");
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const updatedAnswers = [];
  const updatedQuestions = [];
  const newAnswers = [...answers]; 
  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const [text, setText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!browserSupportsSpeechRecognition) {
   return <span>Browser does not support speech recognition.</span>;
   }

   const speakText = () => {
   if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(interviewQuestions);
      setIsSpeaking(true);

      // Stop speaking once done
      utterance.onend = () => setIsSpeaking(false);

      // Speak the text
      window.speechSynthesis.speak(utterance);
   } else {
      alert("Sorry, your browser does not support Text-to-Speech.");
   }
   };

   const stopSpeaking = () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };

   // Function to start the interview
   const startInterview = async () => {
   try {
      //console.log(resume);
      //console.log(jobDescription);
      //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
      //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
      //gpt-4o-mini
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",            
            Authorization: `Bearer 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`, 
         },
         body: JSON.stringify({
            model: "gpt-4o-mini", 
                  messages: [
                        {
                           role: 'system',
                           content: 'You are a intervier who should check the job description and candidates profile and ask relavent question'
                        },
                        {
                           role: 'user',
                           content: `Check the job description and candidates profile and and generate one relavent question:\n\n 
                           Candidates Profile: ${resume}.\n                         
                           Job Description: ${jobDescription}\n\n
                           Don't repeat the same question again in Previously asked questions is avaiable:\n
                           Previously asked questions: ${updatedQuestions}\n\n
                           Ask the questions based on the previously answered questiosn:\n
                           Answers Given for the previous question: ${updatedAnswers}\n\n
                           Output format\n
                           Only Generated Question not with any sufix and prefix\n\n
                           `
                        }
                     ],
            max_tokens: 2000,
            temperature: 0.7,
         }),
      });

    // Parse the JSON response
    const data = await response.json();

    // Validate the response structure
    if (data.choices && data.choices.length > 0) {
      const question = data.choices[0]?.message?.content || "No question generated.";
      setInterviewQuestions(question); // Set the questions
      //console.log("question:", question);
      setInterviewComplete(true);
      setInterviewStarted(true);
    } else {
      //console.error("Unexpected API response structure:", data);
    }
   } catch (error) {
      //console.error("Error fetching interview questions:", error);
   }
  };

  // Function to handle submitting resume and job description
  const handleSubmit = (event) => {
    event.preventDefault();
    startInterview();
  };

  // Function to handle answering questions
  const handleAnswerSubmit = (answer) => {
   newAnswers[currentQuestionIndex] = answer; 
   updatedQuestions[currentQuestionIndex] = interviewQuestions;
   setAnswers(newAnswers); // Update the state with the new array   
   startInterview();
   setCurrentQuestionIndex(updatedQuestions.length);
  };

  return (
    <div className="app">
      <div className="container" style={{ marginTop: '70px' }}>
         {!interviewStarted ?
        <div>
            <button onClick={(e) => handleSubmit(e)}>Start Interview</button>
        </div>
        :
        <div>
          <h2>Interview Questions</h2>
          <div style={{ marginTop: "10px" }}>
            <button onClick={speakText} disabled={isSpeaking}>
               Speak
            </button>
            <button onClick={stopSpeaking} disabled={!isSpeaking}>
               Stop
            </button>
         </div>
          <div>
            <p>Question {currentQuestionIndex + 1}: {interviewQuestions}</p>
            <textarea style={{minHeight: "200px"}}
              value={transcript}
            />
         </div>
         <button onClick={SpeechRecognition.startListening}>Start Listening</button>
         <button onClick={SpeechRecognition.stopListening}>Stop Listening</button>
         <button onClick={resetTranscript}>Reset</button>
         <button onClick={() => handleAnswerSubmit()}>Next Question</button>
         </div>
         }
      </div>
    </div>
  );
};

export default AIInterviewComponent;
