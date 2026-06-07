# Contributing to HR Robots

Thank you for your interest in contributing to HR Robots! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Your environment details (OS, browser, Node version)

### Suggesting Enhancements

We love new ideas! Please create an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Why this enhancement would be useful
- Any alternative solutions you've considered

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/HRRobotsLive.git
   cd HRRobotsLive
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm test
   npm run build
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: description of your changes"
   ```
   
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Remove:` for removing features
   - `Docs:` for documentation changes

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Describe your changes clearly
   - Reference any related issues

## 📋 Code Style Guidelines

### JavaScript/React
- Use functional components with hooks
- Use meaningful variable and function names
- Keep components small and focused
- Add PropTypes or TypeScript types
- Use async/await for asynchronous code
- Handle errors appropriately

### CSS
- Use BEM naming convention when applicable
- Keep styles modular and component-specific
- Use CSS variables for theme colors
- Ensure responsive design

### Accessibility
- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers when possible

## 🧪 Testing

- Write tests for new features
- Ensure existing tests pass
- Test on multiple browsers
- Test responsive design on different screen sizes

## 📝 Documentation

- Update README.md for major changes
- Add JSDoc comments for functions
- Update inline comments
- Include examples in documentation

## 🔒 Security

- Never commit sensitive data (API keys, passwords, credentials)
- Review `.gitignore` before committing
- Report security vulnerabilities privately
- Use environment variables for secrets

## ⚖️ Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

## 📞 Questions?

Feel free to:
- Open an issue for discussion
- Reach out to maintainers
- Join community discussions

## 🎉 Recognition

Contributors will be recognized in our README and release notes.

---

Thank you for contributing to HR Robots! Your efforts help make recruitment better for everyone.
