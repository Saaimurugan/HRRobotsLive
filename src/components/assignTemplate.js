import React, { useState } from "react";
import '../confirmationBox.css';

const AssignTemplate = ({ text, title, onAssign, onCancel, currentAssignedTo }) => {
    const [email, setEmail] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onAssign(email);
    };

    const handleRevoke = () => {
        onAssign(""); // Send empty email to revoke
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
                <label htmlFor="email">{text}</label>
                <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    placeholder="Enter the recruiter's email to assign" 
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

// import React, { useState, useEffect } from "react";
// import '../confirmationBox.css';

// const AssignTemplate = ({ text, title, onAssign, onCancel }) => {
//    const [email, setEmail] = useState("");

//   return (
//    <div className="overlay">
//         <div className="confirmation-box">
//             <h1>{title}</h1>
//             <div className="form-group">
//                 <label htmlFor="email">{text}</label>
//                 <input 
//                     type="email" 
//                     id="email" 
//                     name="email" 
//                     placeholder="Enter the recruiter's email to assign" 
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     required 
//                 />
//             </div>
//             <div className="buttons">
//                 <button onClick={onAssign(email)} type="submit">Assign</button>
//                 <button onClick={onCancel}>Cancel</button>
//             </div>
//         </div>
//     </div>
//   );
// };

// export default AssignTemplate;