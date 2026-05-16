import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const CertificateConfigNew = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const imgRef = useRef(new Image());
  
  // State
  const [event, setEvent] = useState(null);
  const [certificateImage, setCertificateImage] = useState(null);
  // const [templateFile, setTemplateFile] = useState(null);
  const [activeField, setActiveField] = useState('name');
  const [loading, setLoading] = useState(true);
  
  // Field settings
  const [nameSettings, setNameSettings] = useState({ 
    x: 960, y: 540, fontSize: 36, color: '#000000', fontFamily: 'Arial' 
  });
  const [eventSettings, setEventSettings] = useState({ 
    x: 960, y: 780, fontSize: 28, color: '#000000', fontFamily: 'Arial' 
  });
  const [dateSettings, setDateSettings] = useState({ 
    x: 960, y: 1090, fontSize: 24, color: '#000000', fontFamily: 'Arial' 
  });

  const fontOptions = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Helvetica'];

  useEffect(() => {
    fetchEvent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    if (certificateImage) {
      imgRef.current.src = certificateImage;
      imgRef.current.onload = drawPreview;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateImage, nameSettings, eventSettings, dateSettings]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      
      const eventData = response.data;
      setEvent(eventData);
      
      // Load existing configuration
      if (eventData.certificate) {
        if (eventData.certificate.fields) {
          if (eventData.certificate.fields.name) setNameSettings(eventData.certificate.fields.name);
          if (eventData.certificate.fields.eventName) setEventSettings(eventData.certificate.fields.eventName);
          if (eventData.certificate.fields.date) setDateSettings(eventData.certificate.fields.date);
        }
        
        // Load template image if exists
        if (eventData.certificate.templateUrl) {
          // Check if it's already a full URL (Cloudinary) or a relative path (local storage)
          const imgUrl = eventData.certificate.templateUrl.startsWith('http') 
            ? eventData.certificate.templateUrl 
            : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${eventData.certificate.templateUrl}`;
          setCertificateImage(imgUrl);
        }
      }
    } catch (error) {
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid PNG or JPG image file');
      return;
    }

    // setTemplateFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCertificateImage(ev.target.result);
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('template', file);

    try {
      await api.post(`/certificates/upload-template/${eventId}`, formData);
      toast.success('Template uploaded successfully!');
      fetchEvent(); // Refresh event data
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload template');
    }
  };

  const drawPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Set text alignment to center
    ctx.textAlign = 'center';

    // Draw Name placeholder
    ctx.font = `${nameSettings.fontSize}px ${nameSettings.fontFamily}`;
    ctx.fillStyle = nameSettings.color;
    ctx.fillText('Sample Student Name', nameSettings.x, nameSettings.y);

    // Draw Event placeholder
    ctx.font = `${eventSettings.fontSize}px ${eventSettings.fontFamily}`;
    ctx.fillStyle = eventSettings.color;
    ctx.fillText(event?.title || 'Event Name', eventSettings.x, eventSettings.y);

    // Draw Date placeholder
    ctx.font = `${dateSettings.fontSize}px ${dateSettings.fontFamily}`;
    ctx.fillStyle = dateSettings.color;
    const startDate = event?.startDate ? new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Start Date';
    const endDate = event?.endDate ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'End Date';
    ctx.fillText(`${startDate} - ${endDate}`, dateSettings.x, dateSettings.y);

    // Draw markers
    drawMarker(ctx, nameSettings.x, nameSettings.y, nameSettings.color, 'Name');
    drawMarker(ctx, eventSettings.x, eventSettings.y, eventSettings.color, 'Event');
    drawMarker(ctx, dateSettings.x, dateSettings.y, dateSettings.color, 'Date');
  };

  const drawMarker = (ctx, x, y, color, label) => {
    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px Arial';
    ctx.strokeText(label, x, y - 25);
    ctx.fillText(label, x, y - 25);
  };

  const handleCanvasClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const scaleX = imgRef.current.width / rect.width;
    const scaleY = imgRef.current.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (activeField === 'name') setNameSettings({ ...nameSettings, x, y });
    else if (activeField === 'event') setEventSettings({ ...eventSettings, x, y });
    else if (activeField === 'date') setDateSettings({ ...dateSettings, x, y });

    setTimeout(drawPreview, 50);
  };

  const handleSaveConfiguration = async () => {
    try {
      await api.put(`/certificates/configure/${eventId}`, {
        fields: {
          name: nameSettings,
          eventName: eventSettings,
          date: dateSettings
        },
        autoSend: true
      });
      toast.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleTestPreview = async () => {
    try {
      const response = await api.post(`/certificates/test-preview/${eventId}`, {
        testName: 'Sample Student Name'
      }, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'image/png' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Certificate Preview - ${event?.title || 'Event'}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                background: #f3f4f6;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              .container {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 95%;
              }
              h1 {
                color: #1f2937;
                margin-bottom: 20px;
                text-align: center;
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
                border: 1px solid #e5e7eb;
                border-radius: 4px;
              }
              .buttons {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: center;
              }
              button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              }
              .download-btn {
                background: #3b82f6;
                color: white;
              }
              .download-btn:hover {
                background: #2563eb;
              }
              .close-btn {
                background: #6b7280;
                color: white;
              }
              .close-btn:hover {
                background: #4b5563;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📜 Certificate Preview</h1>
              <img src="${url}" alt="Certificate Preview" />
              <div class="buttons">
                <button class="download-btn" onclick="downloadCertificate()">📥 Download Certificate</button>
                <button class="close-btn" onclick="window.close()">✖️ Close</button>
              </div>
            </div>
            <script>
              function downloadCertificate() {
                const link = document.createElement('a');
                link.href = '${url}';
                link.download = 'Certificate_Preview_${event?.title?.replace(/\s+/g, '_') || 'Event'}.png';
                link.click();
              }
              
              // Prevent blob URL from being revoked
              window.addEventListener('beforeunload', function(e) {
                // Keep the blob URL alive
              });
            </script>
          </body>
          </html>
        `);
        newWindow.document.close();
        toast.success('Test certificate opened in new tab!');
      } else {
        toast.error('Please allow popups to view the certificate');
      }
    } catch (error) {
      console.error('Test preview error:', error);
      toast.error('Failed to generate test preview');
    }
  };

  const handleGenerateCertificates = async () => {
    if (!window.confirm('This will generate and send certificates to all participants. Continue?')) {
      return;
    }

    try {
      const response = await api.post(`/certificates/generate/${eventId}`, {});
      toast.success(`Certificates generated! ${response.data.successCount} sent successfully.`);
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Failed to generate certificates');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🎓 Certificate Generator</h1>
            <button
              onClick={() => navigate('/admin/events')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              ← Back to Events
            </button>
          </div>

          {event && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-800">{event.title}</h2>
              <p className="text-gray-600">Configure certificate template and field positions</p>
            </div>
          )}

          {/* Upload Section */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <label className="block text-lg font-semibold mb-2">📤 Upload Certificate Template (PNG/JPG):</label>
            <input 
              type="file" 
              accept="image/png,image/jpeg,image/jpg" 
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Field Selection */}
          {certificateImage && (
            <>
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <label className="block text-lg font-semibold mb-3">🖱️ Click on image to set position for:</label>
                <div className="flex space-x-6">
                  {['name', 'event', 'date'].map((field) => (
                    <label key={field} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="field"
                        value={field}
                        checked={activeField === field}
                        onChange={() => setActiveField(field)}
                        className="w-5 h-5"
                      />
                      <span className="text-lg font-medium capitalize">{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Canvas Preview */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">📋 Preview (Click to place fields):</h3>
                <div className="border-4 border-gray-300 rounded-lg overflow-auto" style={{ maxHeight: '600px' }}>
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{ maxWidth: '100%', cursor: 'crosshair', display: 'block' }}
                  />
                </div>
              </div>

              {/* Settings Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Name Settings */}
                <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50">
                  <h3 className="font-bold text-lg text-red-700 mb-3">👤 Name Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">X:</label>
                      <input type="number" value={nameSettings.x} onChange={(e) => setNameSettings({ ...nameSettings, x: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Y:</label>
                      <input type="number" value={nameSettings.y} onChange={(e) => setNameSettings({ ...nameSettings, y: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font Size:</label>
                      <input type="number" value={nameSettings.fontSize} onChange={(e) => setNameSettings({ ...nameSettings, fontSize: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Color:</label>
                      <input type="color" value={nameSettings.color} onChange={(e) => setNameSettings({ ...nameSettings, color: e.target.value })} className="flex-1 h-10 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font:</label>
                      <select value={nameSettings.fontFamily} onChange={(e) => setNameSettings({ ...nameSettings, fontFamily: e.target.value })} className="flex-1 px-2 py-1 border rounded">
                        {fontOptions.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Event Settings */}
                <div className="p-4 border-2 border-green-300 rounded-lg bg-green-50">
                  <h3 className="font-bold text-lg text-green-700 mb-3">📅 Event Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">X:</label>
                      <input type="number" value={eventSettings.x} onChange={(e) => setEventSettings({ ...eventSettings, x: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Y:</label>
                      <input type="number" value={eventSettings.y} onChange={(e) => setEventSettings({ ...eventSettings, y: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font Size:</label>
                      <input type="number" value={eventSettings.fontSize} onChange={(e) => setEventSettings({ ...eventSettings, fontSize: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Color:</label>
                      <input type="color" value={eventSettings.color} onChange={(e) => setEventSettings({ ...eventSettings, color: e.target.value })} className="flex-1 h-10 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font:</label>
                      <select value={eventSettings.fontFamily} onChange={(e) => setEventSettings({ ...eventSettings, fontFamily: e.target.value })} className="flex-1 px-2 py-1 border rounded">
                        {fontOptions.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Settings */}
                <div className="p-4 border-2 border-blue-300 rounded-lg bg-blue-50">
                  <h3 className="font-bold text-lg text-blue-700 mb-3">📆 Date Settings</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">X:</label>
                      <input type="number" value={dateSettings.x} onChange={(e) => setDateSettings({ ...dateSettings, x: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Y:</label>
                      <input type="number" value={dateSettings.y} onChange={(e) => setDateSettings({ ...dateSettings, y: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font Size:</label>
                      <input type="number" value={dateSettings.fontSize} onChange={(e) => setDateSettings({ ...dateSettings, fontSize: +e.target.value })} className="flex-1 px-2 py-1 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Color:</label>
                      <input type="color" value={dateSettings.color} onChange={(e) => setDateSettings({ ...dateSettings, color: e.target.value })} className="flex-1 h-10 border rounded" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="w-20 text-sm font-medium">Font:</label>
                      <select value={dateSettings.fontFamily} onChange={(e) => setDateSettings({ ...dateSettings, fontFamily: e.target.value })} className="flex-1 px-2 py-1 border rounded">
                        {fontOptions.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveConfiguration}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
                >
                  💾 Save Configuration
                </button>
                <button
                  onClick={handleTestPreview}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
                >
                  👁️ Test Preview
                </button>
                <button
                  onClick={handleGenerateCertificates}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700"
                >
                  📧 Generate & Send All
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateConfigNew;
