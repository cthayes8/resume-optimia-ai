export const RulesModalCard = ({ onEdit, onDelete, rule }) => {
    return (
      <div className="card">
        <div className="label-medium card-title">
          Rule {rule.id}: {rule.title}
        </div>
        <div className="label card-text">{rule.prompt}</div>
        <div className="button-group">
          <button onClick={onEdit} type="submit" className="secondary">
            Edit
          </button>
          <button onClick={onDelete} type="submit" className="secondary">
            Delete
          </button>
        </div>
      </div>
    )
  }