'use client';

import { useState } from 'react';

export default function TestUploadPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'aadhaar_front');
      formData.append('userId', 'test_user_123');

      console.log('📤 Uploading file:', file.name, file.size, 'bytes');

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response status:', response.status);

      const result = await response.json();
      console.log('📋 Response data:', result);

      setResult(result);
    } catch (error) {
      console.error('❌ Upload error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug?check=all');
      const data = await response.json();
      setDebugInfo(data);
      console.log('🔧 Debug info:', data);
    } catch (error) {
      console.error('❌ Debug error:', error);
      setDebugInfo({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Document Upload Test Page</h1>
      
      {/* Debug Info Section */}
      <div className="mb-8 p-6 bg-slate-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">🔧 Debug Information</h2>
        <button 
          onClick={checkDebugInfo}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check System Status
        </button>
        
        {debugInfo && (
          <pre className="bg-slate-800 text-white p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </div>

      {/* File Upload Test */}
      <div className="mb-8 p-6 bg-white border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">📄 File Upload Test</h2>
        
        <input 
          type="file" 
          onChange={testUpload}
          accept="image/*,.pdf"
          disabled={loading}
          className="mb-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {loading && (
          <div className="text-blue-600">
            ⏳ Uploading file...
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="mb-8 p-6 bg-white border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            📊 Upload Result 
            <span className={`ml-2 text-sm px-2 py-1 rounded ${
              result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {result.success ? '✅ SUCCESS' : '❌ ERROR'}
            </span>
          </h2>
          
          <pre className="bg-slate-800 text-white p-4 rounded text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>

          {/* Show extracted data if available */}
          {result.success && result.data?.extractedData && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800 mb-2">🔍 Extracted Data:</h3>
              <pre className="text-sm text-blue-700">
                {JSON.stringify(result.data.extractedData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Usage Instructions */}
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">📋 Test Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
          <li>First click "Check System Status" to verify API is working</li>
          <li>Select a test image or PDF file to upload</li>
          <li>Check the console (F12) for detailed logging</li>
          <li>Verify the upload result shows success with extracted data</li>
          <li>Test different file types: JPEG, PNG, PDF</li>
          <li>Test file size limits (try files over 5MB)</li>
        </ol>
      </div>
    </div>
  );
}
