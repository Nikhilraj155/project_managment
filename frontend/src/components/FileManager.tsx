import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { toast } from 'react-toastify'
import { HiUpload, HiDownload, HiDocument, HiTrash, HiPencil } from 'react-icons/hi'

interface FileManagerProps {
  projectId: string
}

export default function FileManager({ projectId }: FileManagerProps) {
  const [files, setFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) {
      fetchFiles()
    }
  }, [projectId])

  const fetchFiles = async () => {
    if (!projectId) return
    try {
      const response = await api.get(`/files/project/${projectId}`)
      setFiles(response.data || [])
    } catch (error) {
      console.error('Failed to fetch files:', error)
      setFiles([])
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restrict allowed extensions on frontend
    const allowed = ['.pdf', '.ppt', '.pptx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Unsupported file type. Only PDF and PowerPoint formats are allowed.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchFiles(); // Refresh the file list
      toast.success('Uploaded Successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleEditFile = async (fileId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Restrict allowed extensions on frontend
    const allowed = ['.pdf', '.ppt', '.pptx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Unsupported file type. Only PDF and PowerPoint formats are allowed.');
      return;
    }

    setEditingFileId(fileId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.put(`/files/${fileId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchFiles(); // Refresh the file list
      toast.success('File updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update file');
    } finally {
      setEditingFileId(null);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await api.delete(`/files/${fileId}`);
      await fetchFiles(); // Refresh the file list
      toast.success('File deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete file');
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await api.get(`/files/${fileId}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <h3 className="text-xl font-semibold">Files</h3>
        <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
          <HiUpload size={18} />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            accept=".pdf,.ppt,.pptx"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      <div className="p-6">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <HiDocument size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No files uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={file.id || idx}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <HiDocument size={20} className="text-blue-600" />
                  <div>
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-sm text-gray-600">
                      Uploaded {file.upload_date ? new Date(file.upload_date).toLocaleDateString() : 'Unknown date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="p-2 hover:bg-gray-100 rounded transition-colors"
                    title="Download"
                  >
                    <HiDownload size={18} />
                  </button>
                  <label className="p-2 hover:bg-blue-100 rounded text-blue-600 cursor-pointer transition-colors" title="Edit/Replace">
                    <HiPencil size={18} />
                    <input
                      type="file"
                      accept=".pdf,.ppt,.pptx"
                      className="hidden"
                      onChange={(e) => handleEditFile(file.id, e)}
                      disabled={editingFileId === file.id}
                    />
                  </label>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                    title="Delete"
                    disabled={editingFileId === file.id}
                  >
                    <HiTrash size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

