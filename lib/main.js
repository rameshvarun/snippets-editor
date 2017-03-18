'use babel';
/** @jsx etch.dom */

import {CompositeDisposable, File} from 'atom';
import path from 'path';
import SnippetsEditorView from './SnippetsEditorView';

const disposable = new CompositeDisposable();

const SCOPE_SELECTOR = '.snippets-editor .select-scope li';
const SNIPPET_SELECTOR = '.snippets-editor .select-snippet li';

export function activate() {
  disposable.add(atom.workspace.addOpener(uri => {
    if (uri === 'atom://.atom/snippets') {
      return new SnippetsEditorView(getUserSnippetsPath());
    }
  }));

  disposable.add(atom.contextMenu.add({
    [SCOPE_SELECTOR] : [
      {label: 'Rename Scope', command: 'snippets-editor:rename-scope'},
      {label: 'Delete Scope', command: 'snippets-editor:delete-scope'}],
    [SNIPPET_SELECTOR] : [
      {label: 'Rename Snippet', command: 'snippets-editor:rename-snippet'},
      {label: 'Delete Snippet', command: 'snippets-editor:delete-snippet'}]
  }));

  disposable.add(atom.commands.add(SCOPE_SELECTOR, {
    'snippets-editor:rename-scope' : function(event) {
      this['data-editor'].renameScope(this['data-scope']);
    },
    'snippets-editor:delete-scope' : function(event) {
      this['data-editor'].deleteScope(this['data-scope']);
    }
  }));

  disposable.add(atom.commands.add(SNIPPET_SELECTOR, {
    'snippets-editor:rename-snippet' : function(event) {
      this['data-editor'].renameSnippet(this['data-scope'], this['data-snippet']);
    },
    'snippets-editor:delete-snippet' : function(event) {
      this['data-editor'].deleteSnippet(this['data-scope'], this['data-snippet']);
    }
  }));
}

function getUserSnippetsPath() {
  const json = new File(path.join(atom.getConfigDirPath(), 'snippets.json'));
  const cson = new File(path.join(atom.getConfigDirPath(), 'snippets.cson'));
  return json.existsSync() ? json.getPath() : cson.getPath();
}

export function deactivate() {
  disposable.dispose();
}

export function deserialize({uri}) {
  return new SnippetsEditorView(uri);
}
