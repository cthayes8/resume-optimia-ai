import './extension-styles.css'
import './styles.scss'

import { Decoration } from '@tiptap/pm/view'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import AiSuggestion from '@tiptap-pro/extension-ai-suggestion'
import { useState } from 'react'

import { variables } from '../../../variables'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'
import { MenuBar } from './components/MenuBar'
import { RulesModal } from './components/RulesModal'
import { SidebarRulesSection } from './components/SidebarRulesSection'
import { SuggestionTooltip } from './components/SuggestionTooltip'
import { initialEditorContent } from './constants/initial-editor-content'
import { initialRules } from './constants/initial-rules'

export default () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [rules, setRules] = useState(initialRules)
  const [tooltipElement, setTooltipElement] = useState(null)
  const [content, setContent] = useState(initialEditorContent)

  const editor = useEditor({
    content,
    onUpdate({ editor: updatedEditor }) {
      setContent(updatedEditor.getHTML())
    },
    editorProps: {
      attributes: {
        spellcheck: false,
      },
    },
    extensions: [
      StarterKit,
      AiSuggestion.configure({
        appId: 'APP_ID',
        token: 'TOKEN',
        baseUrl: variables.tiptapAiBaseUrl,
        rules,
        getCustomSuggestionDecoration({ suggestion, isSelected, getDefaultDecorations }) {
          const decorations = getDefaultDecorations()

          if (isSelected && !suggestion.isRejected) {
            decorations.push(
              Decoration.widget(suggestion.deleteRange.to, () => {
                const element = document.createElement('span')

                setTooltipElement(element)
                return element
              }),
            )
          }
          return decorations
        },
      }),
    ],
  })

  if (!editor) {
    return null
  }

  return (
    <>
      <RulesModal
        rules={rules}
        onSave={newRules => {
          setRules(newRules)
          editor.chain().setAiSuggestionRules(newRules).loadAiSuggestions().run()
          setIsModalOpen(false)
        }}
        onClose={() => {
          setIsModalOpen(false)
        }}
        isOpen={isModalOpen}
      />

      <div className="col-group">
        <div className="main">
          <MenuBar editor={editor} />
          <EditorContent editor={editor} />
          <LoadingState show={editor.extensionStorage.aiSuggestion.isLoading} />
          <ErrorState
            show={
              !editor.extensionStorage.aiSuggestion.isLoading
              && editor.extensionStorage.aiSuggestion.error
            }
            onReload={() => editor.commands.loadAiSuggestions()}
          />
        </div>
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="label-large">Suggestion rules</div>
            <div className="button-group">
              <button type="button" onClick={() => setIsModalOpen(true)}>
                Manage rules
              </button>
              <button type="button" onClick={() => editor.commands.applyAllAiSuggestions()}>
                Apply all suggestions
              </button>
            </div>
          </div>
          <div className="sidebar-scroll">
            <SidebarRulesSection
              rules={rules}
              suggestions={editor.extensionStorage.aiSuggestion.getSuggestions()}
            />
          </div>
        </div>
      </div>
      <SuggestionTooltip element={tooltipElement} editor={editor} />
    </>
  )
}