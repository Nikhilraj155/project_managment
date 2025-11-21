import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { toast } from 'react-toastify'

export default function EvaluationForm() {
  const { presentationId } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    technical_implementation: 0,
    technical_comment: '',
    presentation_clarity: 0,
    clarity_comment: '',
    problem_solving: 0,
    problem_solving_comment: '',
    overall_impression: 0,
    overall_comment: '',
  })

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/feedback/evaluate', {
        presentation_id: presentationId,
        ...formData,
        comments: [
          formData.technical_comment,
          formData.clarity_comment,
          formData.problem_solving_comment,
          formData.overall_comment,
        ].filter(Boolean).join(' | ')
      })
      toast.success('Evaluation submitted successfully')
      navigate('/panel')
    } catch (error) {
      toast.error('Failed to submit evaluation')
    }
  }

  const totalScore =
    formData.technical_implementation +
    formData.presentation_clarity +
    formData.problem_solving +
    formData.overall_impression

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
      <h1 className="text-2xl font-bold mb-6">Evaluate Presentation</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Technical Implementation */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Technical Implementation</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.technical_implementation}
              onChange={(e) => handleChange('technical_implementation', parseInt(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={formData.technical_comment}
              onChange={(e) => handleChange('technical_comment', e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Presentation Clarity */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Presentation Clarity</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.presentation_clarity}
              onChange={(e) => handleChange('presentation_clarity', parseInt(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={formData.clarity_comment}
              onChange={(e) => handleChange('clarity_comment', e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Problem Solving */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Problem Solving Approach</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.problem_solving}
              onChange={(e) => handleChange('problem_solving', parseInt(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={formData.problem_solving_comment}
              onChange={(e) => handleChange('problem_solving_comment', e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Overall Impression */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Overall Impression</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Score (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.overall_impression}
              onChange={(e) => handleChange('overall_impression', parseInt(e.target.value))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={formData.overall_comment}
              onChange={(e) => handleChange('overall_comment', e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        {/* Total Score */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Score:</span>
            <span className="text-2xl font-bold text-blue-600">{totalScore}/20</span>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button type="submit" className="btn-primary flex-1">
            Submit Evaluation
          </button>
          <button
            type="button"
            onClick={() => navigate('/panel')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

