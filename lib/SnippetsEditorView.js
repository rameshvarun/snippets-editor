'use babel';
/** @jsx etch.dom */

import {CompositeDisposable, File, Emitter, TextEditor} from 'atom';
import path from 'path';
import etch from 'etch';
import CSON from 'cson';
import InputDialog from '@aki77/atom-input-dialog';

export default class SnippetsEditorView {
  constructor (uri) {
    this.uri = uri;
    this.file = new File(uri);
    this.disposables = new CompositeDisposable();

    this.snippets = {};
    this.currentScope = null;
    this.currentSnippet = null;

    etch.initialize(this)
    this.file.read().then(str => this.updateSnippets(CSON.parse(str)));
  }

  update (props, children) { return etch.update(this); }

  serialize() {
    return {
      uri: this.uri,
      currentScope: this.currentScope,
      currentSnippet: this.currentSnippet,
      deserializer: 'SnippetsEditorDeserializer'
    };
  }

  updateSnippets (snippets) {
    this.snippets = snippets;
    if (!(this.currentScope in this.snippets)) {
      this.currentScope = null;
      this.currentSnippet = null;
    }
    if(this.currentScope && !(this.currentSnippet in this.snippets[this.currentScope])) {
      this.currentSnippet = null;
    }
    return etch.update(this);
  }

  selectScope (scope) {
    if (scope != this.currentScope) {
      this.currentScope = scope;
      this.currentSnippet = null;
    }

    return etch.update(this);
  }

  selectSnippet (snippet) {
    if (snippet != this.currentSnippet) {
      this.currentSnippet = snippet;
    }
    return etch.update(this);
  }

  async destroy () {
    this.disposables.dispose();
    await etch.destroy(this);
  }

  newScope() {
    new InputDialog({
      prompt: "Enter the name of the new scope.",
      callback: (scope) => {
        if(scope in this.snippets) return;
        this.snippets[scope] = {};
        this.save();
        this.selectScope(scope);
      }
    }).attach();
  }

  renameScope(originalName) {
    new InputDialog({
      prompt: "Enter the new name of the scope.",
      defaultText: originalName,
      callback: (newName) => {
        if(newName in this.snippets) {
          // If the new scope name already exists, merge it with the scope that
          // we are renaming.
          Object.assign(this.snippets[newName], this.snippets[originalName]);
        } else {
          this.snippets[newName] = this.snippets[originalName];
        }

        delete this.snippets[originalName];
        this.selectScope(newName);
        this.save();
      }
    }).attach();
  }

  deleteScope(scope) {
    delete this.snippets[scope];
    this.selectScope(null);
    this.save();
  }

  renameSnippet(scope, originalName) {
    new InputDialog({
      prompt: "Enter the new name of the snippet.",
      defaultText: originalName,
      callback: (newName) => {
        if(newName in this.snippets[scope]) {
          atom.notifications.addError(`Snippet ${newName} already exists.`);
          return;
        }

        this.snippets[scope][newName] = this.snippets[scope][originalName];
        delete this.snippets[scope][originalName];
        this.selectSnippet(null);
        this.save();
      }
    }).attach();
  }

  deleteSnippet(scope, snippet) {
    delete this.snippets[scope][snippet];
    this.selectSnippet(null);
    this.save();
  }

  newSnippet() {
    dialog = new InputDialog({
      prompt: "Enter the name of the new snippet.",
      callback: (newSnippet) => {
        if(newSnippet in this.snippets[this.currentScope]) {
          atom.notifications.addError(`Snippet ${newSnippet} already exists.`)
          return;
        }

        this.snippets[this.currentScope][newSnippet] = { prefix: '', body: ''};
        this.save();
        this.selectSnippet(newSnippet);
      }
    });
    dialog.attach();
  }

  render () {
    return (
      <div className="snippets-editor">
        <div className="select-scope">
          <ul className='panels-menu nav nav-pills nav-stacked' ref='panelMenu'>
            { Object.keys(this.snippets).map(scope =>
              <li
                data-editor={this}
                data-scope={scope}
                className={this.currentScope == scope ? 'active' : null}
                onClick={() => this.selectScope(scope)}><a>{scope}</a></li>) }
            <div className='panel-menu-separator' ref='menuSeparator'></div>
          </ul>
          <div className='button-area'>
            <button onClick={() => this.newScope()} className='btn btn-default icon icon-plus'>New Scope</button>
          </div>
        </div>
        { this.currentScope && <div className="select-snippet">

          <ul className='panels-menu nav nav-pills nav-stacked' ref='panelMenu'>
            { Object.keys(this.snippets[this.currentScope]).map(snippet =>
                <li
                  data-editor={this}
                  data-scope={this.currentScope}
                  data-snippet={snippet}
                  className={this.currentSnippet == snippet ? 'active' : null}
                  onClick={() => this.selectSnippet(snippet)}><a>{snippet}</a></li>
              ) }
            <div className='panel-menu-separator' ref='menuSeparator'></div>
          </ul>

            <div className='button-area'>
              <button onClick={() => this.newSnippet()} className='btn btn-default icon icon-plus'>New Snippet</button>
            </div>
          </div>
        }
        {
            (this.currentScope && this.currentSnippet) && <div className="edit-snippet">
              <div class="setting-title">Prefix</div>
              <div class="setting-description">The prefix is used to trigger the expansion of the
                snippet body.</div>
              <div ref="prefixEditorContainer"></div>

              <div class="setting-title">Description</div>
              <div class="setting-description">This text will be shown in the bottom of the autocomplete box.</div>
              <div ref="descriptionEditorContainer"></div>

              <div class="setting-title">Body</div>
              <div ref="bodyEditorContainer"></div>
            </div>
        }

      </div>
    )
  }

  save() {
    this.file.write(CSON.createCSONString(this.snippets));
  }

  writeAfterUpdate() {
    if (this.currentScope && this.currentSnippet) {
      const snippet = this.snippets[this.currentScope][this.currentSnippet];

      this.refs.prefixEditorContainer.innerHTML = "";
      const prefixEditor = new TextEditor({mini: true})
      prefixEditor.setText(snippet.prefix);
      prefixEditor.onDidChange(() => {
        snippet.prefix = prefixEditor.getText();
        this.save();
      });
      this.refs.prefixEditorContainer.appendChild(prefixEditor.element);

      this.refs.descriptionEditorContainer.innerHTML = "";
      const descriptionEditor = new TextEditor({mini: true})
      descriptionEditor.setText(snippet.description ? snippet.description : "");
      descriptionEditor.onDidChange(() => {
        newDescription = descriptionEditor.getText();
        snippet.description = newDescription === "" ? undefined : newDescription;
        this.save();
      });
      this.refs.descriptionEditorContainer.appendChild(descriptionEditor.element);

      this.refs.bodyEditorContainer.innerHTML = "";
      const bodyEditor = new TextEditor();
      bodyEditor.setText(snippet.body);
      bodyEditor.onDidChange(() => {
        snippet.body = bodyEditor.getText();
        this.save();
      });

      // Try to set the grammar of the editor.
      let scope = this.currentScope.substr(1);
      if (scope == "text.html") scope = "text.html.basic"
      let grammar = atom.grammars.grammarForScopeName(scope);
      if(grammar) bodyEditor.setGrammar(grammar);

      this.refs.bodyEditorContainer.appendChild(bodyEditor.element);
    }
  }

  getTitle () {
    const filePath = this.file.getPath()
    return filePath ? path.basename(filePath) : 'untitled';
  }
}
