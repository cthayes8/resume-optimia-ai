import { offset, shift, useFloating } from '@floating-ui/react'
import { getHTMLFromFragment } from '@tiptap/core'
import { getNextWord, getPreviousWord } from '@tiptap-pro/extension-ai-suggestion'
import React from 'react'
import { createPortal } from 'react-dom'

export function SuggestionTooltip({ element, editor }) {
  const suggestion = editor.extensionStorage.aiSuggestion.getSelectedSuggestion()
  const isOpen = Boolean(element && suggestion)

  const { refs, floatingStyles } = useFloating({
    open: Boolean(suggestion),
    middleware: [offset(8), shift({ padding: 8 })],
  })

  return (
    <>
      {element && createPortal(<span ref={refs.setReference}></span>, element)}
      {isOpen && (
        <div className="suggestion-tooltip-parent" ref={refs.setFloating} style={floatingStyles}>
          <div className="suggestion-tooltip">
            <div className="top">
              {suggestion.replacementOptions.map((option, index) => {
                const { previousWord } = getPreviousWord(editor, suggestion.deleteRange.from)
                const { nextWord, punctuationMark } = getNextWord(
                  editor,
                  suggestion.deleteRange.to,
                )

                return (
                  <div className="replacement-option" key={index}>
                    <p className="text">
                      {previousWord}
                      <span
                        className="add-text"
                        style={{
                          '--ai-suggestion-background-color': suggestion.rule.backgroundColor,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: getHTMLFromFragment(
                            option.addSlice.content,
                            editor.schema,
                          ),
                        }}
                      ></span>
                      {nextWord ? ` ${nextWord}...` : punctuationMark}
                    </p>
                    <div className="button-group">
                      <button
                        type="button"
                        onClick={() => {
                          editor
                            .chain()
                            .applyAiSuggestion({
                              suggestionId: suggestion.id,
                              replacementOptionId: option.id,
                              format: 'rich-text',
                            })
                            .focus()
                            .run()
                        }}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="destructive"
                        onClick={() => {
                          editor.chain().rejectAiSuggestion(suggestion.id).focus().run()
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="bottom">
              <p className="label-small">
                {suggestion.rule.title}: {suggestion.rule.prompt}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}