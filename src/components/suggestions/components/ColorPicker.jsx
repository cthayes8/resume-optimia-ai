import React from 'react'

import { highlightColors } from '../constants/highlight-colors'

export const ColorPicker = ({ value, onChange }) => {
  return (
    <div className="color-picker">
      {highlightColors.map(color => (
        <button
          type="button"
          key={color.color}
          title={color.name}
          className={`color-option${value === color.color ? ' selected' : ''}`}
          style={{
            '--color-picker-color': color.color,
            '--color-picker-background-color': color.backgroundColor,
          }}
          onClick={() => onChange(color.color)}
        />
      ))}
    </div>
  )
}