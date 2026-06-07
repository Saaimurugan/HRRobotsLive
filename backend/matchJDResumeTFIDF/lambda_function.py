import json
import spacy
import string
import boto3
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Load the SpaCy NLP model
nlp = spacy.load("en_core_web_sm")

def preprocess_text(text):
    text = text.lower().translate(str.maketrans("", "", string.punctuation))
    return text

def extract_skills(text):
    doc = nlp(text)
    skills = set()
    for token in doc:
        if token.pos_ in ["PROPN", "NOUN"] and len(token.text) > 2:
            skills.add(token.text.lower())
    return skills

def extract_name(text):
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text
    return "Not Found"

def generate_summary(text):
    doc = nlp(text)
    sentences = [sent.text for sent in doc.sents]
    return " ".join(sentences[:2])

def extract_additional_strengths(text):
    additional_strengths = []
    keywords = ["leadership", "communication", "problem-solving", "teamwork", "analytical"]
    for keyword in keywords:
        if keyword in text.lower():
            additional_strengths.append(keyword.capitalize())
    return additional_strengths if additional_strengths else ["Not Mentioned"]

def generate_conclusion(score):
    if score > 85:
        return "The candidate is an excellent match for the role, with most required skills and strong alignment."
    elif score > 70:
        return "The candidate is a good fit for the role but may require some upskilling in a few areas."
    elif score > 50:
        return "The candidate has potential but lacks some key skills for the role."
    else:
        return "The candidate is not a suitable match for the given job description."

def lambda_handler(event, context):
    # Extract input data
    body = json.loads(event["body"])
    job_description = body.get("job_description", "")
    resume = body.get("resume", "")

    if not job_description or not resume:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Job description and resume are required."})
        }
    
    # Preprocess texts
    jd_cleaned = preprocess_text(job_description)
    resume_cleaned = preprocess_text(resume)
    
    # TF-IDF Vectorization and Cosine Similarity
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([jd_cleaned, resume_cleaned])
    similarity_score = cosine_similarity(tfidf_matrix[0], tfidf_matrix[1])[0][0] * 100
    
    # Extract skills from JD and Resume
    jd_skills = extract_skills(job_description)
    resume_skills = extract_skills(resume)
    
    # Find Matching and Missing Skills
    matching_skills = jd_skills.intersection(resume_skills)
    missing_skills = jd_skills.difference(resume_skills)
    
    # Extract candidate's name
    candidate_name = extract_name(resume)
    
    # Generate Summary
    resume_summary = generate_summary(resume)
    
    # Extract Additional Strengths
    additional_strengths = extract_additional_strengths(resume)
    
    # Generate Conclusion
    conclusion = generate_conclusion(similarity_score)
    
    # Prepare the response
    results = {
        "Candidate Name": candidate_name,
        "Suitability Score (%)": round(similarity_score, 2),
        "Summary": resume_summary,
        "Matching Skills": list(matching_skills),
        "Missing Skills": list(missing_skills),
        "Additional Strengths": additional_strengths,
        "Conclusion": conclusion
    }
    
    return {
        "statusCode": 200,
        "body": json.dumps(results)
    }
