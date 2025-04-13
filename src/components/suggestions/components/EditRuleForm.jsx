import { useState } from 'react'

import { highlightColors } from '../constants/highlight-colors'
import { ColorPicker } from './ColorPicker'

export const EditRuleForm = ({ rule, onSave, onCancel }) => {
  const [title, setTitle] = useState(rule.title)
  const [prompt, setPrompt] = useState(rule.prompt)
  const [color, setColor] = useState(rule.color || highlightColors[0].color)

  const handleSubmit = event => {
    event.preventDefault()
    const selectedColor = highlightColors.find(c => c.color === color)
    const backgroundColor = selectedColor.backgroundColor

    onSave({
      ...rule, title, prompt, color, backgroundColor,
    })
  }

  function validateForm() {
    return title.length > 0 && prompt.length > 0
  }

  const handleColorChange = newColor => {
    setColor(newColor)
  }

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="edit-rule-form">
        <div className="label-medium">Edit Rule {rule.id}</div>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input"
        />
        <textarea
          placeholder="Prompt for the AI model"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="textarea"
        />
        <ColorPicker value={color} onChange={handleColorChange} />
        <div className="button-group">
          <button disabled={!validateForm()} type="submit" className="secondary">
            Save
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}