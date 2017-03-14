'use babel';
/** @jsx etch.dom */

import {CompositeDisposable, File, Emitter, TextEditor} from 'atom';
import path from 'path';
import etch from 'etch';
import CSON from 'cson';
import InputDialog from '@aki77/atom-input-dialog';

const disposable = new CompositeDisposable();

class SnippetsEditorView {
  constructor (uri) {
    this.file = new File(uri)
    this.disposables = new CompositeDisposable();

    this.snippets = {};
    this.currentScope = null;
    this.currentSnippet = null;

    etch.initialize(this)
    this.file.read().then(str => {
      this.updateSnippets(CSON.parse(str));
    });
  }

  update (props, children) {
    return etch.update(this)
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
    if (scope == this.currentScope) return;

    this.currentScope = scope;
    this.currentSnippet = null;
    return etch.update(this);
  }

  selectSnippet (snippet) {
    if (snippet == this.currentSnippet) return;

    this.currentSnippet = snippet;
    return etch.update(this);
  }

  async destroy () {
    this.disposables.dispose();
    await etch.destroy(this);
  }

  newScope() {
    dialog = new InputDialog({
      prompt: "Enter the name of the new scope.",
      callback: (scope) => {
        if(scope in this.snippets) return;
        this.snippets[scope] = {};
        this.save();
        this.selectScope(scope);
      }
    });
    dialog.attach();
  }

  newSnippet() {
    dialog = new InputDialog({
      prompt: "Enter the name of the new snippet.",
      callback: (newSnippet) => {
        if(newSnippet in this.snippets[this.currentScope]) return;
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
              <li onClick={() => this.selectScope(scope)}>{scope}</li>) }
            <div className='panel-menu-separator' ref='menuSeparator'></div>
          </ul>
          <div className='button-area'>
            <button onClick={() => this.newScope()} className='btn btn-default icon icon-plus'>New Scope</button>
          </div>
        </div>
        { this.currentScope && <div className="select-snippet">
            <div className='button-area'>
              { Object.keys(this.snippets[this.currentScope]).map(snippet =>
                  <li onClick={() => this.selectSnippet(snippet)}>{snippet}</li>
                ) }
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

      this.refs.bodyEditorContainer.innerHTML = "";
      const bodyEditor = new TextEditor();
      bodyEditor.setText(snippet.body);
      bodyEditor.onDidChange(() => {
        snippet.body = bodyEditor.getText();
        this.save();
      });
      this.refs.bodyEditorContainer.appendChild(bodyEditor.element);
    }
  }

  getTitle () {
    const filePath = this.file.getPath()
    return filePath ? path.basename(filePath) : 'untitled';
  }
}

export function activate() {
  disposable.add(atom.workspace.addOpener(uri => {
    if (path.basename(uri).toLowerCase() === "snippets.cson") {
      return new SnippetsEditorView(uri);
    }
  }))
}

export function deactivate() {
  disposable.dispose();
}
