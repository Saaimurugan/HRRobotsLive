import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const RichTextEditor = ({ value, onChange, placeholder = "Enter text here...", minHeight = "150px" }) => {
  const editorConfiguration = {
    toolbar: [
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      '|',
      'link',
      'bulletedList',
      'numberedList',
      '|',
      'imageUpload',
      'blockQuote',
      'insertTable',
      '|',
      'undo',
      'redo'
    ],
    placeholder: placeholder,
    // Image upload adapter
    simpleUpload: {
      // Upload URL - you can replace this with your actual upload endpoint
      uploadUrl: 'https://your-upload-endpoint.com/upload',
      
      // Optional: Headers to send with the upload request
      headers: {
        'X-CSRF-TOKEN': 'CSRF-Token',
      }
    },
    // Alternative: Use Base64 adapter for images (stores images as base64 in content)
    // This is simpler and doesn't require a server endpoint
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side'
      ]
    }
  };

  // Custom upload adapter to convert images to base64
  function uploadAdapter(loader) {
    return {
      upload: () => {
        return new Promise((resolve, reject) => {
          loader.file.then((file) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                default: reader.result
              });
            };
            reader.onerror = (error) => {
              reject(error);
            };
            reader.readAsDataURL(file);
          });
        });
      }
    };
  }

  function uploadPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return uploadAdapter(loader);
    };
  }

  return (
    <div className="rich-text-editor-wrapper" style={{ minHeight }}>
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        config={{
          ...editorConfiguration,
          extraPlugins: [uploadPlugin]
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
        onReady={(editor) => {
          // Set minimum height for editor
          editor.editing.view.change((writer) => {
            writer.setStyle(
              'min-height',
              minHeight,
              editor.editing.view.document.getRoot()
            );
          });
        }}
      />
    </div>
  );
};

export default RichTextEditor;
