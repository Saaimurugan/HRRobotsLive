/**
 * Hashes a plain-text password using SHA-256 and returns the hex string.
 * Used before sending any password to the API so plain text never appears
 * in the browser network tab.
 *
 * @param {string} plainPassword - The raw password entered by the user
 * @returns {Promise<string>} SHA-256 hex digest
 */
export const hashPassword = async (plainPassword) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
