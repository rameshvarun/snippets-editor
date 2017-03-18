'use babel';
/** @jsx etch.dom */

import {CompositeDisposable, File} from 'atom';
import path from 'path';
import SnippetsEditorView from './SnippetsEditorView';

const disposable = new CompositeDisposable();

export function activate() {
  disposable.add(atom.workspace.addOpener(uri => {
    if (uri === 'atom://.atom/snippets') {
      return new SnippetsEditorView(getUserSnippetsPath());
    }
  }));
  disposable.add(atom.contextMenu.add({
    '.snippets-editor .select-scope li' : [
      {label: 'Rename Scope', command: 'snippets-editor:rename-scope'},
      {label: 'Delete Scope', command: 'snippets-editor:delete-scope'}],
    '.snippets-editor .select-snippet li' : [
      {label: 'Rename Snippet', command: 'snippets-editor:rename-snippet'},
      {label: 'Delete Snippet', command: 'snippets-editor:delete-snippet'}]
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
