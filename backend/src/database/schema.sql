CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_id VARCHAR(255) UNIQUE NOT NULL,
    github_username VARCHAR(255),
    github_profile_url VARCHAR(255),
    email VARCHAR(255),
    name VARCHAR(255),
    avatar VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_assistant_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_assistant_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    sources JSON,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_message_session FOREIGN KEY (session_id) REFERENCES ai_assistant_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_message_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    job_title VARCHAR(255),
    job_description TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(255) NOT NULL DEFAULT 'pdf',
    file_binary BYTEA,
    parsed_data JSONB,
    owner_id VARCHAR(100) NOT NULL,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(255) NOT NULL DEFAULT 'active',
    analysis_stage INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resume_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_id UUID NOT NULL,
    overall_score FLOAT NOT NULL DEFAULT 0,
    completeness_score FLOAT NOT NULL DEFAULT 0,
    keyword_score FLOAT NOT NULL DEFAULT 0,
    format_score FLOAT NOT NULL DEFAULT 0,
    experience_score FLOAT NOT NULL DEFAULT 0,
    skills_score FLOAT NOT NULL DEFAULT 0,
    keyword_analysis TEXT,
    content_analysis TEXT,
    job_match_analysis TEXT,
    competency_analysis TEXT,
    detailed_report TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_resume_analysis_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    scene_type VARCHAR(50) NOT NULL,
    job_type VARCHAR(50),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    resume_id UUID,
    total_score FLOAT,
    duration INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    report_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    mode VARCHAR(20) NOT NULL DEFAULT 'text',
    title VARCHAR(255),
    library_ids TEXT[],
    video_analysis_summary JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_interview_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    question_count INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    elapsed_time INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMP,
    current_question_index INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_session_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    question_type VARCHAR(50),
    evaluation JSONB,
    score FLOAT,
    timestamp TIMESTAMP NOT NULL,
    sources JSONB,
    video_analysis JSONB,
    CONSTRAINT fk_message_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interview_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID UNIQUE NOT NULL,
    overall_score FLOAT NOT NULL,
    dimension_scores JSONB NOT NULL,
    video_behavior_scores JSONB,
    strengths TEXT NOT NULL,
    weaknesses TEXT NOT NULL,
    suggestions TEXT NOT NULL,
    video_behavior_feedback TEXT,
    learning_suggestions JSONB,
    summary TEXT,
    question_analysis JSONB,
    knowledge_document_id UUID,
    synced_to_knowledge_at TIMESTAMP,
    note_id UUID,
    synced_to_note_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    description VARCHAR(255),
    summary TEXT,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(255) NOT NULL DEFAULT 'draft',
    deleted BOOLEAN NOT NULL DEFAULT false,
    is_public BOOLEAN NOT NULL DEFAULT false,
    owner_id UUID NOT NULL,
    knowledge_document_id UUID,
    synced_to_knowledge_at TIMESTAMP,
    needs_sync BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_comment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    parent_id UUID,
    note_id UUID NOT NULL,
    author_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_note FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES note_comment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    note_id UUID NOT NULL,
    updated_by_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_version_note FOREIGN KEY (note_id) REFERENCES note(id) ON DELETE CASCADE,
    CONSTRAINT fk_version_user FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_libraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id VARCHAR(100) NOT NULL,
    color VARCHAR(255) DEFAULT '#6366F1',
    icon VARCHAR(255) DEFAULT 'database',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),
    metadata JSONB,
    vector_id VARCHAR(255),
    document_type VARCHAR(255) NOT NULL DEFAULT 'text',
    is_processed BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    processing_error VARCHAR(255),
    owner_id VARCHAR(100) NOT NULL,
    library_id UUID,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_mime_type VARCHAR(255),
    file_url VARCHAR(255),
    upload_type VARCHAR(255) NOT NULL DEFAULT 'input',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_library FOREIGN KEY (library_id) REFERENCES knowledge_libraries(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_interviews_user_id ON interviews(user_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interview_sessions_interview_id ON interview_sessions(interview_id);
CREATE INDEX idx_interview_messages_session_id ON interview_messages(session_id);
CREATE INDEX idx_resumes_owner_id ON resumes(owner_id);
CREATE INDEX idx_resume_analyses_resume_id ON resume_analyses(resume_id);
CREATE INDEX idx_knowledge_libraries_owner_id ON knowledge_libraries(owner_id);
CREATE INDEX idx_knowledge_documents_owner_id ON knowledge_documents(owner_id);
CREATE INDEX idx_knowledge_documents_library_id ON knowledge_documents(library_id);
CREATE INDEX idx_note_owner_id ON note(owner_id);
CREATE INDEX idx_note_comment_note_id ON note_comment(note_id);
CREATE INDEX idx_note_version_note_id ON note_version(note_id);
CREATE INDEX idx_ai_assistant_sessions_user_id ON ai_assistant_sessions(user_id);
CREATE INDEX idx_ai_assistant_messages_session_id ON ai_assistant_messages(session_id);
