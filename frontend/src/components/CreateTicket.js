import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './CreateTicket.css';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const CreateTicket = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    descriptionHtml: '',
    priority: 'medium',
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const quillRef = useRef(null);

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: async function () {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            try {
              const token = localStorage.getItem('token');
              const form = new FormData();
              form.append('image', file);
              const res = await axios.post(`${API_BASE_URL}/api/tickets/upload-image`, form, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              });
              const url = res.data.url.startsWith('http') ? res.data.url : `${API_BASE_URL}${res.data.url}`;
              const quill = quillRef.current?.getEditor();
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', url);
              quill.setSelection(range.index + 1);
            } catch (err) {
              console.error('Image upload failed:', err);
              alert('Image upload failed');
            }
          };
        }
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEditorChange = (content, delta, source, editor) => {
    setFormData(prev => ({
      ...prev,
      descriptionHtml: content,
      description: editor.getText()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create a ticket.');
        return;
      }

      await axios.post(`${API_BASE_URL}/api/tickets`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      alert('Ticket created successfully!');
      setFormData({
        title: '',
        description: '',
        descriptionHtml: '',
        priority: 'medium',
        category: '',
      });
    } catch (error) {
      console.error('Error creating ticket:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please log in again.');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        alert('Error creating ticket. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-ticket">
      <h1>Create New Ticket</h1>
      
      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter ticket title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select Category</option>
            <option value="hardware">Hardware</option>
            <option value="network">Network</option>
            <option value="software">Software</option>
            <option value="printing">Printing</option>
            <option value="login">Login</option>
            <option value="email">Email</option>
            <option value="access-request">Access Request</option>
            <option value="system-error">System Error</option>
            <option value="system-config">System Config</option>
            <option value="security">Security</option>
            <option value="others">Others</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority *</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description *</label>
          <ReactQuill
            ref={quillRef}
            value={formData.descriptionHtml}
            onChange={handleEditorChange}
            modules={modules}
            theme="snow"
            placeholder="Describe your issue in detail"
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
};

export default CreateTicket;