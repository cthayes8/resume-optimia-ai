import { useRef, useState } from 'react'

import { CreateRuleForm } from './CreateRuleForm'
import { EditRuleForm } from './EditRuleForm'
import { RulesModalCard } from './RulesModalCard'

function useUniqueId(initialId) {
  const id = useRef(initialId)

  return () => {
    id.current += 1
    return id.current
  }
}

export const RulesModal = props => {
  const [rules, setRules] = useState(props.rules)
  const [editingRuleId, setEditingRuleId] = useState(null)

  const getUniqueId = useUniqueId(rules.length + 1)

  if (!props.isOpen) {
    return null
  }

  return (
    <div className="dialog" data-state="open">
      <div className="dialog-content">
        <div className="main">
          {rules.map(rule => {
            if (rule.id === editingRuleId) {
              return (
                <EditRuleForm
                  key={rule.id}
                  rule={rule}
                  onSave={newRule => {
                    setRules(rules.map(r => (r.id === rule.id ? newRule : r)))
                    setEditingRuleId(null)
                  }}
                  onCancel={() => setEditingRuleId(null)}
                />
              )
            }
            return (
              <RulesModalCard
                key={rule.id}
                onDelete={() => setRules(rules.filter(r => r.id !== rule.id))}
                onEdit={() => setEditingRuleId(rule.id)}
                rule={rule}
              />
            )
          })}
          <CreateRuleForm
            onSubmit={newRule => {
              setRules([
                ...rules,
                {
                  ...newRule,
                  id: getUniqueId().toString(),
                },
              ])
            }}
          />
        </div>
        <div className="button-group bottom">
          <button type="button" onClick={() => {
            props.onClose()
            setRules(props.rules)
          }}>
            Close
          </button>
          <button
            className="primary"
            type="button"
            disabled={props.rules === rules}
            onClick={() => props.onSave(rules)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}