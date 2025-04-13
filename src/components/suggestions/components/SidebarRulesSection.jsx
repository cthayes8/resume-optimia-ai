export const SidebarRulesSection = ({ rules, suggestions }) => {
    return (
      <div className="sidebar-rules-section">
        {rules.map(rule => {
          const resultsCount = suggestions.filter(suggestion => !suggestion.isRejected && suggestion.rule.id === rule.id).length
  
          return (
            <div className="card" key={rule.id}>
              <div className="header label-medium">
                <span className="color" style={{ backgroundColor: rule.color }} />
                <span className="title">{rule.title}</span>
              </div>
              <div className="label-small prompt">{rule.prompt}</div>
              <div className="label-small results">{resultsCount} results</div>
            </div>
          )
        })}
      </div>
    )
  }