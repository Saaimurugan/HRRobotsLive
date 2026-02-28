# CKEditor Integration for Questions and Options

## Overview
The createTemplate and editTemplate components have been enhanced with CKEditor 5, a rich text editor that supports HTML formatting and image uploads.

## Changes Made

### 1. Installed Packages
- `@ckeditor/ckeditor5-react` - React wrapper for CKEditor
- `@ckeditor/ckeditor5-build-classic` - Classic editor build with standard features

### 2. New Components
- **RichTextEditor.js** - Reusable wrapper component for CKEditor with:
  - Image upload functionality (converts images to base64)
  - Toolbar with formatting options (bold, italic, underline, lists, links, tables, etc.)
  - Configurable minimum height
  - Custom placeholder support

### 3. Updated Components

#### createTemplate.js
- Replaced textarea for questions with RichTextEditor
- Replaced text inputs for MCQ options with RichTextEditor
- Replaced textarea for elaborate answers with RichTextEditor
- Replaced textarea for second question (rangeWithTwoQuestions) with RichTextEditor
- Added HTML rendering for question display using `dangerouslySetInnerHTML`
- Added HTML rendering for options display
- Added `stripHtml()` helper function for validation

#### editTemplate.js
- Same changes as createTemplate.js

### 4. Styling
- **RichTextEditor.css** - Comprehensive styling for:
  - Editor appearance and behavior
  - Rendered HTML content (images, tables, blockquotes, links, lists)
  - Responsive image handling
  - Consistent theming with existing design

## Features

### Rich Text Formatting
- **Text Formatting**: Bold, italic, underline
- **Headings**: H1-H6 support
- **Lists**: Bulleted and numbered lists
- **Links**: Insert and edit hyperlinks
- **Blockquotes**: For highlighting important text
- **Tables**: Insert and format tables

### Image Upload
- Images are automatically converted to base64 format
- No server-side upload endpoint required
- Images are embedded directly in the question/option content
- Supports drag-and-drop and file selection
- Automatic image resizing to fit container

### Validation
- HTML content is stripped for validation purposes
- Empty content detection works correctly with HTML
- All existing validation rules maintained

## Usage

### For Questions
```jsx
<RichTextEditor
  value={formData.question}
  onChange={(content) => setFormData({ ...formData, question: content })}
  placeholder="Enter your question here..."
  minHeight="150px"
/>
```

### For Options
```jsx
<RichTextEditor
  value={opt}
  onChange={(content) => updateOption(i, content)}
  placeholder={`Option ${i + 1}`}
  minHeight="80px"
/>
```

## Data Storage
- Questions and options are stored as HTML strings in the database
- Images are stored as base64-encoded data URLs within the HTML
- No changes required to backend APIs
- Backward compatible with existing plain text questions

## Display
Questions and options are rendered using `dangerouslySetInnerHTML`:
```jsx
<span className="rendered-html-content" dangerouslySetInnerHTML={{ __html: question }} />
```

The `rendered-html-content` class ensures proper styling of all HTML elements.

## Browser Compatibility
CKEditor 5 supports:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes
- Images are stored as base64, which increases the size of stored data
- For production use with many images, consider implementing a proper image upload service
- The current implementation is suitable for moderate image usage
- All existing functionality remains intact
