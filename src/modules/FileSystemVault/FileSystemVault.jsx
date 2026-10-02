import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, File as FileIcon, FilePlus2, FolderPlus, Folder, Trash2, Move } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import { INITIAL_FILE_SYSTEM, STORAGE_KEY, PERMISSION_HELP } from '../../data/fileSystemTree.js';
import {
  getNode,
  formatPath,
  sortChildren,
  createNode,
  deleteNode,
  moveNode,
  countTree,
  describeOpen
} from '../../utils/fileSystem.js';
import { bytes } from '../../utils/format.js';

/** Loads the persisted tree, or seeds it from the initial demo data. */
function loadTree() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.type === 'dir') return parsed;
    }
  } catch {
    /* corrupted storage — fall through to seed data */
  }
  return INITIAL_FILE_SYSTEM;
}

/**
 * File System Vault — a real, editable directory tree in the panel,
 * backed by localStorage persistence (toggleable).
 */
export default function FileSystemVault() {
  const [tree, setTree] = useState(loadTree);
  const [path, setPath] = useState([]);
  const [selected, setSelected] = useState(null); // name of selected child
  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [persist, setPersist] = useState(true);
  const [moveMode, setMoveMode] = useState(false);

  const node = getNode(tree, path) || tree;
  const children = sortChildren(node.children);
  const counts = useMemo(() => countTree(tree), [tree]);

  useEffect(() => {
    if (!persist) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    } catch {
      /* storage full/unavailable — non-fatal for the demo */
    }
  }, [tree, persist]);

  const say = (ok, message) => setFeedback({ ok, message });

  const handleCreate = (type) => {
    const result = createNode(tree, path, name, type);
    say(result.ok, result.message);
    if (result.ok) {
      setTree(result.tree);
      setName('');
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    const result = deleteNode(tree, [...path, selected]);
    say(result.ok, result.message);
    if (result.ok) {
      setTree(result.tree);
      setSelected(null);
    }
  };

  const handleMove = () => {
    if (!selected) return;
    const result = moveNode(tree, [...path, selected], path, `${selected} (moved)`);
    say(result.ok, result.message);
    if (result.ok) {
      setTree(result.tree);
      setSelected(null);
      setMoveMode(false);
    }
  };

  const openItem = (child) => {
    if (child.type === 'dir') {
      setPath([...path, child.name]);
      setSelected(null);
      setFeedback(null);
    } else {
      setSelected(child.name);
      say(true, describeOpen(child, [...path, child.name]));
    }
  };

  const selectedNode = selected ? children.find((child) => child.name === selected) : null;

  return (
    <>
      <ModuleSummary>
        The file system is a <b>tree</b>: directories contain files and other directories. The kernel resolves a
        <b> path</b> — absolute from <span className="mono">/</span>, or relative to the working directory — walks the
        tree, checks permissions at every step, then returns a <b>file descriptor</b> for open files.
      </ModuleSummary>

      {/* Toolbar: navigate + create */}
      <div className="fs-form">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setPath(path.slice(0, -1));
            setSelected(null);
          }}
          disabled={!path.length}
          aria-label="Go up one directory"
        >
          <ArrowLeft size={13} aria-hidden /> Up
        </button>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="new-file.txt"
          aria-label="New item name"
        />
        <button type="button" className="btn btn-accent" onClick={() => handleCreate('file')} disabled={!name.trim()}>
          <FilePlus2 size={13} aria-hidden /> File
        </button>
        <button type="button" className="btn btn-accent" onClick={() => handleCreate('dir')} disabled={!name.trim()}>
          <FolderPlus size={13} aria-hidden /> Folder
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="fs-crumb" aria-label="Current path">
        {['/', ...path].map((segment, index, all) => (
          <span key={`${segment}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {index > 0 && <span className="crumb-sep" aria-hidden>/</span>}
            {index < all.length - 1 ? (
              <button type="button" onClick={() => setPath(all.slice(1, index + 1).map((s) => (s === '/' ? '' : s)).filter(Boolean))}>
                {segment}
              </button>
            ) : (
              <span className="crumb-here">{segment}</span>
            )}
          </span>
        ))}
      </div>

      {/* Directory listing */}
      <div className="table-wrap fs-table">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Permissions</th>
              <th>Modified</th>
            </tr>
          </thead>
          <tbody>
            {children.length === 0 && (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: '18px 0' }}>
                  Empty directory.
                </td>
              </tr>
            )}
            {children.map((child) => (
              <tr key={child.name} style={selected === child.name ? { background: 'rgba(123,209,255,0.05)' } : undefined}>
                <td>
                  <button type="button" className="fs-name-btn" onClick={() => openItem(child)}>
                    {child.type === 'dir' ? <Folder size={14} aria-hidden /> : <FileIcon size={14} aria-hidden />}
                    {child.name}
                  </button>
                </td>
                <td>{child.type === 'dir' ? 'directory' : 'file'}</td>
                <td className="num">{child.type === 'dir' ? '—' : bytes(child.size)}</td>
                <td>
                  <span className="fs-perm">{child.permissions}</span>
                </td>
                <td className="num" style={{ color: 'var(--text-faint)' }}>{child.modified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Item actions */}
      <div className="control-row">
        <button type="button" className="btn" onClick={() => openItem(selectedNode)} disabled={!selectedNode}>
          Open
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setMoveMode((v) => !v)}
          disabled={!selectedNode}
          aria-pressed={moveMode}
        >
          <Move size={13} aria-hidden /> Rename / Move
        </button>
        <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={!selectedNode}>
          <Trash2 size={13} aria-hidden /> Delete selected
        </button>
        {moveMode && selectedNode && (
          <input
            type="text"
            defaultValue={selectedNode.name}
            aria-label="New name"
            onBlur={(event) => {
              const result = moveNode(tree, [...path, selected], path, event.target.value);
              say(result.ok, result.message);
              if (result.ok) {
                setTree(result.tree);
                setSelected(null);
                setMoveMode(false);
              }
            }}
            autoFocus
          />
        )}
      </div>

      {/* Feedback / open result */}
      {feedback && (
        <div className={`note ${feedback.ok ? '' : 'is-danger'}`} role="status">
          <span className="note-title mono">{formatPath(path, node.type)}</span>
          {feedback.message}
        </div>
      )}

      {/* Persistence toggle + tree summary */}
      <div className="control-row">
        <label className="legend-row" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={persist}
            onChange={(event) => setPersist(event.target.checked)}
            style={{ width: 'auto' }}
          />
          <span>Persist in localStorage</span>
        </label>
        <span className="muted mono" style={{ fontSize: 'var(--fs-10)' }}>
          {counts.files} files · {counts.directories} dirs · {bytes(counts.bytes)}
        </span>
      </div>

      {/* Paths & permissions explainer */}
      <div className="note">
        <span className="note-title">Paths &amp; permissions</span>
        <p style={{ marginBottom: 6 }}>
          <b>Absolute path</b> — starts at the root: <span className="mono">/home/student/notes/deadlock.txt</span>.
          <br />
          <b>Relative path</b> — starts at the working directory: from <span className="mono">/home/student</span>, the
          same file is <span className="mono">notes/deadlock.txt</span> (and <span className="mono">../etc/osmos.conf</span> climbs a level first).
        </p>
        <p className="mono" style={{ fontSize: 'var(--fs-10)', color: 'var(--text-faint)' }}>
          {PERMISSION_HELP.map((help) => `${help.pattern} → ${help.meaning}`).join('\n')}
        </p>
      </div>

      <Learned>
        Directories are just special files that map names to other files; <b>paths</b> are how humans address them.
        Permission strings like <span className="mono">-rwxr-xr--</span> encode type + owner/group/others rights, and
        the kernel enforces them at <b>open()</b> time — create, delete and move are all metadata operations the
        kernel performs on the directory, never on the file content itself.
      </Learned>
    </>
  );
}
