"""
Stage 1 + 2 of the pipeline: preprocessing and the shared feature store.

Raw Kaggle files (data/raw) are cleaned here into tidy tables (data/processed)
that every module reads from:
  * students.csv  - academic records + engineered features + at_risk label
  * courses.csv   - unified course catalog (university electives + Udemy)
  * career.csv    - career-guidance training data
  * intents.json  - chatbot intents (Kaggle university intents + advisor intents)
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"

# UCI "Predict Students' Dropout and Academic Success" programme codes
PROGRAMMES = {
    33: "Biofuel Production Technologies", 171: "Animation & Multimedia Design",
    8014: "Social Service (Evening)", 9003: "Agronomy", 9070: "Communication Design",
    9085: "Veterinary Nursing", 9119: "Informatics Engineering", 9130: "Equine Studies",
    9147: "Management", 9238: "Social Service", 9254: "Tourism", 9500: "Nursing",
    9556: "Oral Hygiene", 9670: "Advertising & Marketing Management",
    9773: "Journalism & Communication", 9853: "Basic Education",
    9991: "Management (Evening)",
}

def build_students() -> pd.DataFrame:
    df = pd.read_csv(RAW / "student_dropout_academic_success.csv")
    df.columns = [c.strip().replace("﻿", "") for c in df.columns]
    ren = {
        "Course": "programme_code", "Admission grade": "admission_grade",
        "Age at enrollment": "age_at_enrollment", "Gender": "gender",
        "Scholarship holder": "scholarship_holder", "Debtor": "debtor",
        "Tuition fees up to date": "tuition_up_to_date", "Displaced": "displaced",
        "Target": "outcome",
    }
    for s, tag in (("1st", "sem1"), ("2nd", "sem2")):
        for k, v in (("enrolled", "enrolled"), ("evaluations", "evaluations"),
                     ("approved", "approved"), ("grade", "grade"),
                     ("without evaluations", "without_eval")):
            ren[f"Curricular units {s} sem ({k})"] = f"{tag}_{v}"
    df = df.rename(columns=ren)[list(ren.values())]

    # Portuguese 0-20 grades -> Indian 10-point SGPA scale; admission 0-200 -> 0-100
    for c in ("sem1_grade", "sem2_grade"):
        df[c] = (df[c] / 2).round(2)
    df["admission_grade"] = (df["admission_grade"] / 2).round(1)

    # Engineered features
    df["sem1_pass_rate"] = np.where(df.sem1_enrolled > 0, df.sem1_approved / df.sem1_enrolled.replace(0, np.nan), 0).round(3)
    df["sem2_pass_rate"] = np.where(df.sem2_enrolled > 0, df.sem2_approved / df.sem2_enrolled.replace(0, np.nan), 0).round(3)
    df[["sem1_pass_rate", "sem2_pass_rate"]] = df[["sem1_pass_rate", "sem2_pass_rate"]].fillna(0).clip(0, 1)
    df["grade_trend"] = (df.sem2_grade - df.sem1_grade).round(2)

    df["programme"] = df.programme_code.map(PROGRAMMES).fillna("Other")
    df["gender"] = df.gender.map({1: "Male", 0: "Female"})
    df["at_risk"] = (df.outcome == "Dropout").astype(int)
    df.insert(0, "student_id", [f"S{i:04d}" for i in range(1, len(df) + 1)])
    return df


# Curated catalog of university electives (B.Tech / general), written for this
# project so recommendations are relevant to an engineering student, not only
# to the four Udemy subject areas.
ELECTIVES = [
    ("Machine Learning Foundations", "AI & Data", "Intermediate", "supervised learning regression classification decision trees random forest model evaluation python scikit-learn"),
    ("Deep Learning & Neural Networks", "AI & Data", "Advanced", "neural networks backpropagation cnn rnn deep learning tensorflow pytorch computer vision"),
    ("Natural Language Processing", "AI & Data", "Advanced", "nlp text processing tokenization embeddings transformers chatbots sentiment analysis language models"),
    ("Data Science with Python", "AI & Data", "Beginner", "python pandas numpy data analysis visualization statistics data cleaning"),
    ("Probability & Statistics for AI", "AI & Data", "Intermediate", "probability bayes theorem distributions hypothesis testing statistics bayesian networks"),
    ("Computer Vision", "AI & Data", "Advanced", "image processing opencv object detection cnn computer vision deep learning"),
    ("Reinforcement Learning", "AI & Data", "Advanced", "markov decision process q-learning reward policy reinforcement learning agents"),
    ("Big Data Analytics", "AI & Data", "Intermediate", "hadoop spark big data distributed processing analytics sql"),
    ("Generative AI & Prompt Engineering", "AI & Data", "Intermediate", "generative ai llm prompt engineering gans vae text generation chatgpt"),
    ("AI Ethics & Responsible AI", "AI & Data", "Beginner", "ai ethics bias fairness privacy responsible ai explainability governance"),
    ("Data Visualization & Dashboards", "AI & Data", "Beginner", "data visualization dashboards charts power bi tableau storytelling with data"),
    ("Evolutionary Algorithms & Optimization", "AI & Data", "Intermediate", "genetic algorithms evolutionary strategies optimization search heuristics"),
    ("Programming in C", "Programming", "Beginner", "c programming basics loops arrays pointers functions problem solving"),
    ("Object Oriented Programming in Java", "Programming", "Beginner", "java oop classes objects inheritance polymorphism programming"),
    ("Python Programming", "Programming", "Beginner", "python programming basics functions lists automation scripting"),
    ("Data Structures & Algorithms", "Programming", "Intermediate", "data structures algorithms arrays linked lists trees graphs sorting searching complexity coding interviews"),
    ("Competitive Programming", "Programming", "Advanced", "competitive programming algorithms dynamic programming graphs problem solving contests"),
    ("Web Development (HTML, CSS, JavaScript)", "Web & Software", "Beginner", "web development html css javascript frontend websites responsive design"),
    ("Full Stack Development (MERN)", "Web & Software", "Intermediate", "full stack mongodb express react node javascript web apps api"),
    ("Mobile App Development", "Web & Software", "Intermediate", "android flutter mobile app development kotlin ui"),
    ("Software Engineering", "Web & Software", "Intermediate", "software engineering sdlc agile testing requirements design patterns git"),
    ("Cloud Computing", "Systems", "Intermediate", "cloud computing aws azure virtualization deployment devops"),
    ("DevOps & CI/CD", "Systems", "Intermediate", "devops docker kubernetes ci cd automation deployment linux"),
    ("Database Management Systems", "Systems", "Beginner", "dbms sql relational databases normalization queries transactions"),
    ("Operating Systems", "Systems", "Intermediate", "operating systems processes threads scheduling memory management linux"),
    ("Computer Networks", "Systems", "Intermediate", "computer networks tcp ip protocols routing network security"),
    ("Cyber Security Fundamentals", "Systems", "Beginner", "cyber security ethical hacking cryptography network security threats"),
    ("Internet of Things", "Systems", "Intermediate", "iot sensors arduino raspberry pi embedded systems hardware"),
    ("Embedded Systems & Microcontrollers", "Systems", "Intermediate", "embedded systems microcontrollers hardware electronics arduino circuits"),
    ("Blockchain Technology", "Systems", "Advanced", "blockchain cryptocurrency smart contracts ethereum distributed ledger"),
    ("Discrete Mathematics", "Mathematics", "Beginner", "discrete mathematics logic sets graph theory combinatorics proofs"),
    ("Linear Algebra for ML", "Mathematics", "Intermediate", "linear algebra matrices vectors eigenvalues pca mathematics machine learning"),
    ("Engineering Mathematics (Calculus)", "Mathematics", "Beginner", "calculus differential equations integration mathematics engineering"),
    ("UI/UX Design", "Design", "Beginner", "ui ux design figma user research wireframes prototyping graphic design"),
    ("Graphic Design & Visual Communication", "Design", "Beginner", "graphic design photoshop illustrator typography branding creativity"),
    ("Animation & Multimedia", "Design", "Intermediate", "animation multimedia video editing motion graphics 3d creativity"),
    ("Entrepreneurship & Startups", "Business & Management", "Beginner", "entrepreneurship startup business model innovation pitching leadership"),
    ("Financial Accounting", "Business & Management", "Beginner", "accounting finance balance sheet bookkeeping business finance"),
    ("Digital Marketing", "Business & Management", "Beginner", "digital marketing seo social media advertising branding analytics"),
    ("Project Management", "Business & Management", "Intermediate", "project management planning agile scrum leadership teamwork"),
    ("Business Analytics", "Business & Management", "Intermediate", "business analytics excel sql data driven decision making dashboards"),
    ("Investment & Stock Market Basics", "Business & Management", "Beginner", "investment stock market trading finance portfolio"),
    ("Technical Communication", "Soft Skills", "Beginner", "communication writing presentation public speaking english"),
    ("Research Methodology", "Soft Skills", "Intermediate", "research methodology literature review academic writing experiments critical thinking"),
    ("Leadership & Teamwork", "Soft Skills", "Beginner", "leadership teamwork collaboration management soft skills"),
    ("Study Skills & Time Management", "Soft Skills", "Beginner", "study skills time management exam preparation productivity learning strategies"),
    ("Aptitude & Logical Reasoning", "Soft Skills", "Beginner", "aptitude quantitative reasoning logical reasoning placement preparation"),
    ("Music Production Basics", "Arts", "Beginner", "music production audio guitar piano creativity sound"),
]


def build_courses() -> pd.DataFrame:
    el = pd.DataFrame(ELECTIVES, columns=["title", "category", "level", "keywords"])
    el["source"] = "University elective"
    el["url"] = ""
    el["popularity"] = 0.5
    el["course_id"] = [f"E{i:03d}" for i in range(1, len(el) + 1)]

    ud = pd.read_csv(RAW / "udemy_courses.csv").drop_duplicates("course_id")
    level_map = {"Beginner Level": "Beginner", "Intermediate Level": "Intermediate",
                 "Expert Level": "Advanced", "All Levels": "All Levels"}
    ud = pd.DataFrame({
        "course_id": "U" + ud.course_id.astype(str),
        "title": ud.course_title.str.strip(),
        "category": ud.subject,
        "level": ud.level.map(level_map).fillna("All Levels"),
        "keywords": ud.subject.str.lower(),
        "source": "Online (Udemy)",
        "url": ud.url,
        "popularity": (np.log1p(ud.num_subscribers) / np.log1p(ud.num_subscribers).max()).round(4),
        "price": ud.price,
        "is_paid": ud.is_paid,
    })
    cat = pd.concat([el, ud], ignore_index=True)
    cat["price"] = cat["price"].fillna(0)
    cat["is_paid"] = cat["is_paid"].fillna(False).astype(bool)
    cat["text"] = (cat.title + " " + cat.category + " " + cat.keywords + " " + cat.level).str.lower()
    return cat


def build_career() -> pd.DataFrame:
    df = pd.read_csv(RAW / "career_advisor_5000.csv")
    subj = ["Physics", "Chemistry", "Biology", "English", "ComputerScience", "Mathematics",
            "Accountancy", "BusinessStudies", "Economics", "History", "Geography",
            "PoliticalScience", "Sociology"]
    df[subj] = df[subj].fillna(0)  # subject not taken in that stream -> 0
    return df


# Advisor-specific intents written for this project, added to the Kaggle
# university intents so the bot also routes students into the AI modules.
ADVISOR_INTENTS = [
    {"tag": "academic_risk", "patterns": [
        "Am I at risk of failing?", "Will I fail this year?", "What is my risk level?",
        "Am I doing badly in studies?", "Check my academic risk", "Is my performance okay?",
        "Am I likely to drop out?", "How am I doing academically?", "Show my risk status",
        "Do I need to worry about my grades?", "Am I in danger of getting a backlog?",
        "Predict my academic performance"],
        "responses": ["__ROUTE_RISK__"]},
    {"tag": "course_recommendation", "patterns": [
        "Which course should I take?", "Recommend me some courses", "Suggest electives for me",
        "What should I learn next?", "Which elective is best for me?", "Give me course suggestions",
        "What courses match my interests?", "Suggest online courses", "Help me choose an elective",
        "Which subject should I study?", "Recommend courses for machine learning",
        "I want to learn web development, what course?"],
        "responses": ["__ROUTE_RECOMMEND__"]},
    {"tag": "career_guidance", "patterns": [
        "What career suits me?", "Which career should I choose?", "Help me plan my career",
        "What job can I get after this?", "Career guidance please", "What should I become?",
        "Which field has good scope?", "Guide me about my future career", "Career options for me",
        "What can I do after graduation?"],
        "responses": ["__ROUTE_CAREER__"]},
    {"tag": "study_tips", "patterns": [
        "How can I improve my grades?", "Give me study tips", "How to study better?",
        "How to score more in exams?", "I can't concentrate on studies", "How should I prepare for exams?",
        "Tips to improve my SGPA", "How to manage time for studies?", "Best way to revise?",
        "How do I study effectively?"],
        "responses": ["Some proven study habits: (1) plan your week with fixed study blocks, (2) use active recall and past papers instead of re-reading, (3) revise each topic after 1 day, 1 week and 1 month (spaced repetition), (4) attend every lecture and lab, as attendance strongly predicts results, and (5) clear doubts with faculty during office hours. Want me to check which of your subjects need the most attention?"]},
    {"tag": "backlog", "patterns": [
        "What if I fail a subject?", "How do I clear a backlog?", "What is the re-exam process?",
        "I failed an exam, what now?", "How to apply for supplementary exam?", "KT exam process",
        "Can I reappear for a failed subject?", "What happens if I get a backlog?",
        "How many backlogs are allowed?", "When is the re-exam?"],
        "responses": ["If you fail a subject you can reappear in the supplementary / re-exam session. Registration opens on the student portal after results are declared. Check the exam cell notice for dates and fees, and speak to your faculty advisor early so you can plan revision alongside current-semester work."]},
    {"tag": "stress", "patterns": [
        "I am very stressed", "I feel anxious about exams", "I feel overwhelmed",
        "I am under too much pressure", "I feel depressed", "I can't cope with studies",
        "I feel lonely in college", "I am burnt out", "Studies are too much for me",
        "I want to talk to a counsellor", "I'm not feeling okay"],
        "responses": ["__ESCALATE__"]},
    {"tag": "advisor_contact", "patterns": [
        "I want to talk to my advisor", "Connect me to a human", "How do I meet my mentor?",
        "Talk to a real person", "Who is my faculty advisor?", "I need to speak to someone",
        "Book a meeting with advisor", "Contact my mentor"],
        "responses": ["__ESCALATE__"]},
    {"tag": "gpa_calculation", "patterns": [
        "How is SGPA calculated?", "What is CGPA?", "How to calculate my GPA?",
        "Difference between SGPA and CGPA", "How are grade points calculated?",
        "What grade do I need to pass?", "How are credits counted?"],
        "responses": ["SGPA = Σ(credits × grade points) ÷ Σ credits for one semester. CGPA is the same calculation over all semesters completed so far. Each course's grade point comes from your marks band, so high-credit courses affect your SGPA the most."]},
    {"tag": "bot_capabilities", "patterns": [
        "What can you do?", "How can you help me?", "What are your features?", "Who are you?",
        "What is this app?", "Help", "What do you know?", "What questions can I ask?"],
        "responses": ["I'm your AI Academic Advisor. I can check your academic risk level, recommend electives and online courses, suggest career paths, and answer common questions about exams, attendance, fees, hostel, library and more. If I'm not sure about something, I'll connect you to a human advisor."]},
    {"tag": "thanks", "patterns": [
        "Thank you", "Thanks a lot", "Thanks for the help", "That was helpful", "Great, thanks",
        "Thank you so much", "Appreciate it", "Nice, thanks"],
        "responses": ["You're welcome! Ask me anything else whenever you need."]},
]


def build_intents() -> dict:
    base = json.load(open(RAW / "university_intents.json", encoding="utf-8"))["intents"]
    for it in base:
        it["source"] = "Kaggle university_intents"
    for it in ADVISOR_INTENTS:
        it["source"] = "Project advisor intents"
    return {"intents": base + ADVISOR_INTENTS}


def run():
    PROC.mkdir(parents=True, exist_ok=True)
    s = build_students(); s.to_csv(PROC / "students.csv", index=False)
    c = build_courses(); c.to_csv(PROC / "courses.csv", index=False)
    k = build_career(); k.to_csv(PROC / "career.csv", index=False)
    i = build_intents(); json.dump(i, open(PROC / "intents.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"students: {s.shape}, at-risk rate {s.at_risk.mean():.1%}")
    print(f"courses : {c.shape} ({(c.source=='University elective').sum()} electives)")
    print(f"career  : {k.shape}, {k.CareerOption.nunique()} careers")
    print(f"intents : {len(i['intents'])} intents, {sum(len(x['patterns']) for x in i['intents'])} patterns")


if __name__ == "__main__":
    run()
