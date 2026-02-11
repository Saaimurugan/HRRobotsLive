import React, { useState, useEffect } from "react";
import "../App.css";
import "../CreateTemplate.css";
import { useGlobalContext } from "../globalContext";
import { useNavigate } from "react-router-dom";
import { useSessionHandler } from "../useSessionHandler";

// Toast Component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
          <svg className="toast-icon" viewBox="0 0 24 24">
            {toast.type === 'error' && <path fill="#e53e3e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>}
            {toast.type === 'success' && <path fill="#38a169" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
            {toast.type === 'warning' && <path fill="#dd6b20" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>}
            {toast.type === 'info' && <path fill="#3182ce" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>}
          </svg>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

const CloneTemplates = () => {
  const { globalValue, JWTValue } = useGlobalContext();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cloningTemplates, setCloningTemplates] = useState({});
  const navigate = useNavigate();

  const showToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  const { checkUnauthorized } = useSessionHandler(showToast);

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  useEffect(() => {
    if (globalValue === "") {
      navigate("/login");
    } else {
      fetchAdminTemplates();
    }
  }, [globalValue, navigate]);

  const fetchAdminTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ globalValue: "saaimurugan@gmail.com", token: JWTValue }),
      });
      const data = await response.json();
      if (checkUnauthorized(data)) return;
      if (data.statusCode === 200) {
        setTemplates(data.body);
      } else {
        setTemplates([]);
        showToast('info', 'No Templates', 'No templates available to clone at the moment.');
      }
    } catch (error) {
      showToast('error', 'Error', 'Failed to fetch templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloneTemplate = async (templateID, templateName) => {
    setCloningTemplates(prev => ({ ...prev, [templateID]: true }));
    try {
      const response = await fetch("https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/cloneGKTemplate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateID: templateID,
          newTemplateName: `${templateName} (Cloned)`,
          email: globalValue,
          token: JWTValue
        }),
      });
      const data = await response.json();
      if (checkUnauthorized(data)) return;
      
      if (data.statusCode === 200) {
        const body = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        showToast('success', 'Template Cloned', `Successfully cloned "${templateName}". You can now find it in your templates.`);
        setTimeout(() => {
          navigate('/list');
        }, 1500);
      } else {
        showToast('error', 'Clone Failed', 'Failed to clone the template. Please try again.');
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred while cloning the template.');
    } finally {
      setCloningTemplates(prev => ({ ...prev, [templateID]: false }));
    }
  };

  const filteredTemplates = templates.filter(template => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const templateName = (template.templateName || "").toLowerCase();
      return templateName.includes(query);
    }
    return true;
  });

  // Technology icon mapping based on template name keywords
  const getTechnologyIcon = (templateName) => {
    const name = templateName.toLowerCase();
    if (name.includes('typescript') || name.includes('ts')) {
      return { bg: 'linear-gradient(135deg, #3178c6 0%, #235a97 100%)', text: 'TS', color: 'white' };
    } else if (name.includes('javascript') || name.includes('js')) {
      return { bg: 'linear-gradient(135deg, #f7df1e 0%, #e5c700 100%)', text: 'JS', color: '#000' };
    } else if (name.includes('react')) {
      return { bg: 'linear-gradient(135deg, #61dafb 0%, #21a1c4 100%)', text: '⚛', color: '#000' };
    } else if (name.includes('python') || name.includes('py')) {
      return { bg: 'linear-gradient(135deg, #3776ab 0%, #2d5d8a 100%)', text: 'Py', color: 'white' };
    } else if (name.includes('java')) {
      return { bg: 'linear-gradient(135deg, #007396 0%, #005a7a 100%)', text: 'Java', color: 'white', fontSize: '10px' };
    } else if (name.includes('git')) {
      return { bg: 'linear-gradient(135deg, #f05032 0%, #c9402d 100%)', text: 'Git', color: 'white' };
    } else if (name.includes('sql') || name.includes('mysql')) {
      return { bg: 'linear-gradient(135deg, #00758f 0%, #005f73 100%)', text: 'SQL', color: 'white' };
    } else if (name.includes('jira')) {
      return { bg: 'linear-gradient(135deg, #0052cc 0%, #003d99 100%)', text: 'Jira', color: 'white', fontSize: '10px' };
    } else {
      return { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', text: '📝', color: 'white' };
    }
  };

  return (
    <div className="app">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <div className="create-template-page">
        <div className="create-template-container">
          <div className="template-header">
            <button onClick={() => navigate(-1)} className="template-back-btn" title="Back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Clone Templates</h1>
          </div>

          <p style={{ 
            color: 'var(--color-text-muted)', 
            marginBottom: '32px',
            fontSize: 'var(--font-size-base)'
          }}>
            Browse and clone pre-built templates for popular technologies. These templates are curated by our team to help you get started quickly.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
            <div className="search-container" style={{ margin: 0 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery("")}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
            
            <span style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              marginLeft: 'auto'
            }}>
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
            </span>
          </div>

          <div className="container" style={{ marginTop: '0' }}>
          {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card template-card skeleton-card">
                <div className="skeleton skeleton-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px' }}></div>
                <div className="skeleton skeleton-text skeleton-text-lg"></div>
                <div className="skeleton skeleton-text skeleton-text-sm"></div>
                <div className="skeleton skeleton-button"></div>
              </div>
            ))}
          </>
        ) : filteredTemplates.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>{searchQuery ? `No templates found matching "${searchQuery}"` : 'No templates available at the moment.'}</p>
          </div>
        ) : (
          filteredTemplates.map((template, index) => {
            const techIcon = getTechnologyIcon(template.templateName);
            const isCloning = cloningTemplates[template.templateID];
            
            return (
              <div key={index} className="card template-card" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(249, 250, 251, 1) 100%)',
                border: '1px solid var(--color-border)'
              }}>
                <p style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
                  {template.questionCount || 0} questions
                </p>

                <div className="form-group">
                  <button 
                    onClick={() => handleCloneTemplate(template.templateID, template.templateName)}
                    disabled={isCloning}
                    style={{
                      background: isCloning ? 'var(--color-bg-secondary)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      cursor: isCloning ? 'not-allowed' : 'pointer',
                      opacity: isCloning ? 0.6 : 1,
                      color: 'white'
                    }}
                  >
                    {isCloning ? (
                      <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin-animation">
                          <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Cloning...
                      </span>
                    ) : (
                      <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Clone Template
                      </span>
                    )}
                  </button>
                </div>

                <h5 style={{marginTop: "8px", textAlign: 'center'}}>{template.templateName}</h5>
              </div>
            );
          })
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloneTemplates;
