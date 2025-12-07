import React, { useState, useEffect } from "react";
import '../confirmationBox.css';

const AssignTemplate = ({ text, title, onAssign, onCancel }) => {
    const [email, setEmail] = useState("");
  return (
    <div className="overlay">
      <div className="confirmation-box">
        <h1>{title}</h1>
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
          <button onClick={(d) => onAssign(email)}>Confirm</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
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