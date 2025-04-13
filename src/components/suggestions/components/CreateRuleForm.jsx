import { useState } from 'react'

import { highlightColors } from '../constants/highlight-colors'
import { ColorPicker } from './ColorPicker'

export const CreateRuleForm = ({ onSubmit }) => {
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [color, setColor] = useState(highlightColors[0].color)

  const handleSubmit = event => {
    event.preventDefault()
    const selectedColor = highlightColors.find(c => c.color === color)

    onSubmit({
      title, prompt, color, backgroundColor: selectedColor.backgroundColor,
    })
    setTitle('')
    setPrompt('')
  }

  function validateForm() {
    return title.length > 0 && prompt.length > 0