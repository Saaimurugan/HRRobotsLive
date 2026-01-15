import React, { useState } from "react";
import '../confirmationBox.css';

const AssignTemplate = ({ text, title, onAssign, onCancel, currentAssignedTo, currentRole }) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("recruiter");

    const handleSubmit = (e) => {
        e.preventDefault();
        onAssign({ email, role });
    };

    const handleRevoke = () => {
        onAssign({ email: "", role: "" }); // Send empty to revoke
    };

    const getRoleDisplayName = (roleValue) => {
      if (roleValue === 'hiring_manager') return 'Reviewer';
      return 'Recruiter';
    };

  return (
    <div className="overlay">
      <div className="confirmation-box">
        <h2>{title}</h2>
        {currentAssignedTo ? (
          <>
            <div className="form-group">
              <p style={{
                background: 'var(--color-info-light, #e0f2fe)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: 'var(--font-size-sm, 14px)',
                color: 'var(--color-info-text, #0369a1)',
                marginBottom: '16px'
              }}>
                Currently assigned to: <strong>{currentAssignedTo}</strong>
                {currentRole && <span> as <strong>{getRoleDisplayName(currentRole)}</strong></span>}
              </p>
            </div>
            <div className="buttons">
              <button type="button" onClick={handleRevoke} style={{
                background: 'var(--color-error, #ef4444)',
              }}>Revoke Assignment</button>
              <button type="button" onClick={onCancel}>Cancel</button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label style={{ marginBottom: '12px', display: 'block', fontWeight: '500' }}>Select Role & Permissions</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {/* Recruiter Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  border: role === 'recruiter' ? '2px solid var(--color-primary, #2563eb)' : '1px solid var(--color-border, #e0e0e0)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: role === 'recruiter' ? 'var(--color-primary-light, #eff6ff)' : 'white',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="recruiter"
                    checked={role === 'recruiter'}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                    border: role === 'recruiter' ? '5px solid var(--color-primary, #2563eb)' : '2px solid var(--color-border, #ccc)',
                    background: 'white'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={role === 'recruiter' ? 'var(--color-primary, #2563eb)' : '#666'} strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: role === 'recruiter' ? 'var(--color-primary, #2563eb)' : 'var(--color-text-primary, #333)' }}>Recruiter</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted, #666)', lineHeight: '1.4' }}>
                      Can generate test links and share with candidates. Cannot modify the template content.
                    </p>
                  </div>
                </label>

                {/* Reviewer Option */}
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  border: role === 'hiring_manager' ? '2px solid var(--color-primary, #2563eb)' : '1px solid var(--color-border, #e0e0e0)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: role === 'hiring_manager' ? 'var(--color-primary-light, #eff6ff)' : 'white',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="hiring_manager"
                    checked={role === 'hiring_manager'}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
                    border: role === 'hiring_manager' ? '5px solid var(--color-primary, #2563eb)' : '2px solid var(--color-border, #ccc)',
                    background: 'white'
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={role === 'hiring_manager' ? 'var(--color-primary, #2563eb)' : '#666'} strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span style={{ fontWeight: '600', fontSize: '14px', color: role === 'hiring_manager' ? 'var(--color-primary, #2563eb)' : 'var(--color-text-primary, #333)' }}>Reviewer</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted, #666)', lineHeight: '1.4' }}>
                      Can review and edit template questions, approve the template, and generate test links. Ideal for subject matter experts or hiring managers who need to validate content.
                    </p>
                  </div>
                </label>
              </div>
            </div>
            <div className="form-group">
                <label htmlFor="email">{text}</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder={`Enter the ${role === 'hiring_manager' ? "reviewer's" : "recruiter's"} email`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                />
            </div>
            <div className="buttons">
              <button type="submit">Confirm</button>
              <button type="button" onClick={onCancel}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AssignTemplate;
